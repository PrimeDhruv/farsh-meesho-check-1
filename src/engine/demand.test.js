// Demand map + coach view-model reproduce the final Round 2 deck (slides 4–6, 9).  Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { busyZone, groupTypicalOrders, bucketFor, monthlyRange, recommendFromDemand, zonePosition } from './demand.js';
import { buildCoach, costSheet, roundToTotal } from './coach.js';
import { analyseProduct } from './position.js';
import { toCalcInputs } from './model.js';
import { demandFor } from '../data/demandBuckets.js';
import { CATEGORY_LIST } from '../data/categories.js';
import { PRODUCTS } from '../data/products.js';

const near = (a, b, tol = 0.6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const kurti = PRODUCTS.find((p) => p.id === 'SKU-1001');
const buckets = demandFor('kurtis').buckets;

test('kurti buckets are the deck\'s: ₹360–389 gets 40–100 orders, the cheapest ₹279–299 only 0–10', () => {
  assert.deepEqual(bucketFor(370, buckets).orders, [40, 100]);
  assert.deepEqual(bucketFor(290, buckets).orders, [0, 10]);
  assert.equal(buckets.reduce((s, b) => s + b.listings, 0), 100);
});
test('busy zone = buckets beating the group\'s typical listing = ₹330–389 (deck)', () => {
  assert.equal(groupTypicalOrders(buckets), 40);
  const z = busyZone(buckets);
  assert.equal(z.lo, 330); assert.equal(z.hi, 389); assert.equal(z.busiest.lo, 360);
});
test('cheapest ≠ best-selling: the cheapest bucket gets the fewest orders', () => {
  const minTypical = Math.min(...buckets.map((b) => (b.orders[0] + b.orders[1]) / 2));
  assert.equal((buckets[0].orders[0] + buckets[0].orders[1]) / 2, minTypical);
});
test('every group has a busy zone and the price buckets do not overlap', () => {
  for (const c of CATEGORY_LIST) {
    const bs = demandFor(c.id).buckets;
    assert.ok(busyZone(bs), c.id);
    for (let i = 1; i < bs.length; i++) assert.equal(bs[i].lo, bs[i - 1].hi + 1, `${c.id} bucket ${i}`);
  }
});
test('monthly range handles losses', () => {
  assert.deepEqual(monthlyRange(25, [30, 80]), { lo: 750, hi: 2000 });
  assert.deepEqual(monthlyRange(-41, [0, 10]), { lo: -410, hi: 0 });
});
test('decision tree: inside / above / below the zone / reconsider', () => {
  const z = busyZone(buckets);
  assert.deepEqual(recommendFromDemand({ floorPlusMargin: 351.13, zone: z, p75: 429, bestFloor: 314 }), { kind: 'in_zone', price: 351 });
  assert.equal(recommendFromDemand({ floorPlusMargin: 405.7, zone: z, p75: 429, bestFloor: 314 }).kind, 'fix_cost_first');
  assert.deepEqual(recommendFromDemand({ floorPlusMargin: 300, zone: z, p75: 429, bestFloor: 250 }), { kind: 'below_zone', price: 330 });
  assert.equal(recommendFromDemand({ floorPlusMargin: 500, zone: z, p75: 429, bestFloor: 440 }).kind, 'reconsider');
  assert.equal(zonePosition(406, z), 'above_zone'); assert.equal(zonePosition(351, z), 'in_zone');
});

test('cost sheet adds up exactly: 150 + 12 + 90 + 8 = 260, +20 tax = 280, +59 +19 +7 = 365 (deck slide 5)', () => {
  const s = costSheet({ ...toCalcInputs(kurti), price: undefined });
  assert.deepEqual(s.shown, { product: 150, packing: 12, shipping: 90, ads: 8, tax: 20, again: 59, returns: 19, rto: 7 });
  assert.equal(s.delivered, 260); assert.equal(s.safeLooking, 280); assert.equal(s.floorShown, 365);
  assert.equal(Object.values(s.shown).reduce((a, b) => a + b, 0), 365);
});
test('cost sheet after the 3 fixes: 150 + 12 + 70 + 8 + 18 + 36 + 15 + 5 = 314', () => {
  const c = buildCoach(kurti);
  assert.deepEqual(c.sheetBest.shown, { product: 150, packing: 12, shipping: 70, ads: 8, tax: 18, again: 36, returns: 15, rto: 5 });
  assert.equal(c.sheetBest.floorShown, 314);
});
test('roundToTotal always sums to the rounded total', () => {
  const r = roundToTotal([10.4, 10.4, 10.4], 31.2); assert.equal(r.reduce((a, b) => a + b, 0), 31);
});

test('coach: fixes run biggest first and add up: floor −₹32 / −₹12 / −₹7 = 365 → 314', () => {
  const c = buildCoach(kurti);
  assert.deepEqual(c.fixes.map((f) => f.id), ['repack', 'prepaid', 'size']);
  assert.deepEqual(c.fixes.map((f) => Math.round(f.floorCut)), [32, 12, 7]);
  near(c.fixes[2].floorAfter, 314.3);
});
test('coach: at ₹351 profit per order goes −₹9 → +₹11 → +₹20 → +₹25 (+₹20 / +₹9 / +₹5)', () => {
  const c = buildCoach(kurti);
  assert.equal(c.focusPrice, 351);
  near(c.fixes[0].profitBefore, -8.9); near(c.fixes[0].profitAfter, 11.1);
  near(c.fixes[1].profitAfter, 19.7); near(c.fixes[2].profitAfter, 24.9);
  assert.deepEqual(c.fixes.map((f) => Math.round(f.gain)), [20, 9, 5]);
});
test('coach: today ₹406 is above the busy zone → fix the cost first; after every fix → ₹351 in the zone', () => {
  const c = buildCoach(kurti);
  assert.equal(c.recNow.kind, 'fix_cost_first'); assert.equal(c.recNow.hold, 406);
  assert.equal(c.recAll.kind, 'in_zone'); assert.equal(c.recAll.price, 351);
  assert.equal(c.pricePosition, 'above_zone');
});
test('coach: money — today ₹406 → +₹25 × 20–60 orders ≈ ₹500–1,500; suggested ₹351 → +₹25 × 30–80 ≈ ₹750–2,000 (deck)', () => {
  const { today, suggested, suggestedNoFix } = buildCoach(kurti).scenarios;
  near(today.profit, 25.2); assert.deepEqual(today.monthly, { lo: 500, hi: 1500 });
  near(suggested.profit, 24.9); assert.deepEqual(suggested.monthly, { lo: 750, hi: 2000 });
  near(suggestedNoFix.profit, -8.9);
});
test('coach: only the box fix applied → ₹373 already fits the zone with ₹25 per order', () => {
  const c = buildCoach(kurti, { fixes: ['repack'] });
  assert.equal(c.recNow.kind, 'in_zone'); near(c.now.floor, 333.0);
});
test('catalogue status uses the busy zone; applied fixes + ₹351 put the kurti on track', () => {
  assert.equal(analyseProduct(kurti).status, 'wont_rank');
  const done = analyseProduct({ ...kurti, fixes: ['repack', 'prepaid', 'size'], listedPrice: 351 });
  near(done.floor, 314.3); assert.equal(done.status, 'healthy');
});
test('fixes are never applied twice: best floor ignores what is already applied', () => {
  const a = analyseProduct({ ...kurti, fixes: ['repack'] });
  near(a.bestFloor, 314.3); near(a.floor, 333.0);
});
