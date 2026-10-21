import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../data/products.js';
import { buildCoach } from './coach.js';
import { adsCurve, priceAdsPlan, spendZone, curvePoints } from './ads.js';
import { peakRuns, timing, evaluateIdea, ideasFor, topSellersFor } from './launch.js';
import { IDEAS } from '../data/launch.js';

const kurti = PRODUCTS.find((p) => p.id === 'SKU-1001');
const coachOf = (p) => buildCoach(p);

// ---- ads ----
test('ads: the best budget is where the next ₹1 brings back exactly ₹1', () => {
  const c = coachOf(kurti);
  const cv = adsCurve({ product: kurti, coach: c, price: 406 });
  assert.ok(cv.pays);
  assert.ok(Math.abs(cv.best.nextRupee - 1) < 1e-9);
  // nothing on either side beats it
  assert.ok(cv.at(cv.bestSpend - 100).gain < cv.best.gain);
  assert.ok(cv.at(cv.bestSpend + 100).gain < cv.best.gain);
});

test('ads: the sweet spot holds the best budget and earns at least 80% of the best', () => {
  const c = coachOf(kurti);
  const cv = adsCurve({ product: kurti, coach: c, price: 406 });
  assert.ok(cv.sweet.lo < cv.bestSpend && cv.bestSpend < cv.sweet.hi);
  assert.ok(Math.abs(cv.at(cv.sweet.lo).gain - 0.8 * cv.best.gain) < 0.5);
  assert.ok(Math.abs(cv.at(cv.sweet.hi).gain - 0.8 * cv.best.gain) < 0.5);
  assert.ok(Math.abs(cv.at(cv.breakEven).gain) < 0.5);
  assert.equal(spendZone(cv, 0), 'none');
  assert.equal(spendZone(cv, cv.bestSpend), 'sweet');
  assert.equal(spendZone(cv, cv.breakEven + 500), 'loss');
});

test('ads: total profit = all orders × profit per order − budget, and ads raise the no-loss price', () => {
  const c = coachOf(kurti);
  const cv = adsCurve({ product: kurti, coach: c, price: 406 });
  const x = cv.at(800);
  assert.ok(Math.abs(x.totalProfit - ((cv.organic + x.adOrders) * cv.E - 800)) < 1e-6);
  assert.ok(cv.floorWith(800) > cv.floorNoAds);
  assert.equal(cv.at(0).adOrders, 0);
});

test('ads: below the no-loss price ads never pay', () => {
  const p = PRODUCTS.find((x) => x.id === 'SKU-1004'); // steel bottle, priced under its no-loss price
  const cv = adsCurve({ product: p, coach: coachOf(p), price: p.listedPrice });
  assert.ok(cv.belowFloor);
  assert.equal(cv.pays, false);
  assert.equal(cv.bestSpend, 0);
  assert.equal(curvePoints(cv).length, 61);
});

test('ads: with ads the most profitable price can sit higher than without (kurti: ₹389 → ₹406)', () => {
  const plan = priceAdsPlan({ product: kurti, coach: coachOf(kurti) });
  assert.equal(plan.bestNoAds.price, 389);
  assert.equal(plan.bestWithAds.price, 406);
  assert.ok(plan.bestWithAds.withAds.totalProfit > plan.bestNoAds.noAds.totalProfit);
  for (const r of plan.rows) if (!r.loss) assert.ok(r.withAds.totalProfit >= r.noAds.totalProfit - 25); // ₹50 rounding of the budget
});

// ---- launch ----
const D = (m, d) => new Date(2026, m, d);

test('launch: peak runs join across December → January', () => {
  const runs = peakRuns([122, 106, 92, 86, 80, 86, 92, 96, 104, 114, 124, 130]);
  assert.deepEqual(runs.map((r) => [r.start, r.len]), [[9, 4]]);
});

test('launch: timing says now, late, plan or later', () => {
  const kurtis = IDEAS.kurtis[0].season ?? [95, 90, 112, 120, 116, 96, 85, 95, 114, 135, 128, 104];
  assert.equal(timing(kurtis, D(9, 22)).status, 'late');            // festive peak ends in ~5 weeks
  assert.equal(timing(kurtis, D(9, 22)).listByLabel, 'Feb');        // plan summer: list by Feb
  assert.equal(timing(kurtis, D(8, 1)).status, 'now');              // early September: festive peak is on
  assert.equal(timing(kurtis, D(0, 10)).status, 'plan');            // January: summer is 2 months away
  assert.equal(timing(kurtis, D(5, 20)).status, 'plan');            // late June: festive starts in Sep
  const winter = [122, 106, 92, 86, 80, 86, 92, 96, 104, 114, 124, 130];
  assert.equal(timing(winter, D(9, 22)).status, 'now');
  assert.equal(timing(winter, D(4, 1)).status, 'later');
});

test('launch: an idea is priced like Price Coach and its profit adds up', () => {
  const e = evaluateIdea(IDEAS.kurtis[0], 'kurtis', { today: D(9, 22) });
  assert.ok(e.price >= e.bucket.lo && e.price <= (e.bucket.hi ?? e.bucket.lo + 29));
  assert.ok(e.price >= e.floor);
  assert.equal(e.keywords.length, 5);
  assert.ok(e.orders[0] < e.orders[1]);
  assert.equal(e.monthlyProfit[0], Math.round((e.profit * e.orders[0]) / 50) * 50);
  // a higher making cost lowers profit
  const dear = evaluateIdea(IDEAS.kurtis[0], 'kurtis', { today: D(9, 22), cost: 250, price: e.price });
  assert.ok(dear.profit < e.profit);
});

test('launch: every group has ideas and top sellers ranked by revenue', () => {
  for (const cat of Object.keys(IDEAS)) {
    assert.ok(ideasFor(cat, { today: D(9, 22) }).length >= 5);
    const ts = topSellersFor(cat);
    assert.equal(ts[0].rank, 1);
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i - 1].revenueMonth >= ts[i].revenueMonth);
    for (const s of ts) assert.equal(s.revenueMonth, s.price * s.ordersMonth);
  }
});
