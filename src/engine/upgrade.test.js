// Views/clicks funnel, returns & claims, weekly floor trend and competitor logic. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../data/products.js';
import { demandFor } from '../data/demandBuckets.js';
import { toCalcInputs } from './model.js';
import { calculate, contributionAt } from './calculator.js';
import { baselineFor, funnelAt, compareMove, priceLadder, bucketNear } from './funnel.js';
import { returnsAndClaims, CLAIM_DEFAULTS, validateClaimAssumptions } from './claims.js';
import { floorHistory, MIN_ORDERS_FOR_TREND } from './history.js';
import { matchCheck, priceMove, compareWithSelected } from './competitors.js';
import { competitorsFor } from '../data/competitors.js';

const kurti = PRODUCTS.find((p) => p.id === 'SKU-1001');
const live = PRODUCTS.find((p) => p.id === 'SKU-1002');
const buckets = demandFor('kurtis').buckets;
const inputs = { ...toCalcInputs(kurti), price: undefined };
const floor = calculate(inputs).floor;

test('funnel: every bucket has views >= clicks >= orders', () => {
  for (const b of buckets) {
    assert.ok(b.views[0] >= b.clicks[0], `views>=clicks in ${b.lo}`);
    assert.ok(b.clicks[1] >= b.orders[0], `clicks>=orders in ${b.lo}`);
  }
});
test('funnel: a lower price in a busier bucket gives more views and clicks, and a higher orders-per-view', () => {
  const m = compareMove({ product: kurti, buckets, nowPrice: 406, nowInputs: { ...inputs, price: 406 }, toPrice: 351, toInputs: { ...inputs, price: 351 } });
  assert.ok(m.delta.views > 0 && m.delta.clicks > 0 && m.delta.orders > 0);
  assert.ok(m.delta.opv100 > 0, 'orders per 100 views improves');
});
test('funnel: same bucket keeps views, only profit changes', () => {
  const b = bucketNear(380, buckets);
  const lo = Math.max(b.lo, Math.ceil(floor));
  const m = compareMove({ product: kurti, buckets, nowPrice: 385, nowInputs: { ...inputs, price: 385 }, toPrice: lo, toInputs: { ...inputs, price: lo } });
  assert.equal(m.delta.views, 0);
});
test('funnel: a live listing is anchored on its own last-30-day numbers', () => {
  const p = live;
  const bl = baselineFor(p, demandFor(p.categoryId ?? 'kurtis').buckets, p.listedPrice);
  assert.ok(bl && bl.views > 0);
});
test('ladder: any row priced under the no-loss price is marked loss, never the best row', () => {
  const calc = calculate({ ...inputs, price: 350 });
  const L = priceLadder({ product: kurti, buckets, inputs, floor, floorPlusMargin: calc.priceWithTargetMargin ?? floor + 20, target: 20, nowPrice: 406, suggested: 351 });
  for (const r of L.rows) if (r.price < floor) assert.equal(r.verdict, 'loss');
  assert.ok(!L.rows.some((r) => r.mostProfit && r.verdict === 'loss'));
});

test('claims: money adds up and approved recovery is added back exactly once', () => {
  const r = returnsAndClaims(inputs, 351, CLAIM_DEFAULTS);
  assert.ok(r.valid);
  const o = r.orders;
  assert.ok(Math.abs(o.kept + o.returned + o.rto - o.shipped) < 1e-6);
  assert.ok(Math.abs(r.claims.check - r.claims.claimed) < 1e-6, 'recovered+short+rejected+pending = claimed');
  assert.ok(Math.abs(r.profit.adjusted - (r.profit.initial + r.claims.recovered / r.orders.shipped)) < 1e-6);
  const sum = r.breakdown.lines.reduce((s, l) => s + l.amount, r.breakdown.sales);
  assert.ok(Math.abs(sum - r.breakdown.initial) < 1e-6, 'breakdown lines reconcile to the initial estimate');
});
test('claims: floor with claims is never above the standard floor; zero claims leaves it unchanged', () => {
  const r = returnsAndClaims(inputs, 351, CLAIM_DEFAULTS);
  assert.ok(r.floor.withClaims <= r.floor.base + 1e-9);
  const none = returnsAndClaims(inputs, 351, { ...CLAIM_DEFAULTS, raise: 0 });
  assert.ok(Math.abs(none.floor.withClaims - none.floor.base) < 1e-9);
});
test('claims: bad assumptions are rejected', () => {
  assert.ok(validateClaimAssumptions({ ...CLAIM_DEFAULTS, approved: 0.8, pending: 0.5 }).length > 0);
  assert.ok(validateClaimAssumptions({ ...CLAIM_DEFAULTS, raise: NaN }).length > 0);
  assert.equal(validateClaimAssumptions(CLAIM_DEFAULTS).length, 0);
});

test('history: weekly floor ends exactly at the real floor; no trend under 30 orders', () => {
  const h = floorHistory(inputs, { ...kurti, status: 'live', orders: 40 }, new Date('2026-10-21'));
  assert.ok(h.eligible && h.weeks.length === 8);
  assert.ok(Math.abs(h.weeks[7].floor - h.floor) < 1e-6);
  const few = floorHistory(inputs, { ...kurti, status: 'live', orders: MIN_ORDERS_FOR_TREND - 1 }, new Date('2026-10-21'));
  assert.equal(few.eligible, false);
  assert.equal(few.weeks.length, 0);
});

test('competitors: matching a price below the floor is flagged and never called safe', () => {
  const calc = calculate({ ...inputs, price: 351 });
  const args = { inputs, floor, floorPlusMargin: calc.priceWithTargetMargin ?? floor + 20, target: 20 };
  assert.equal(matchCheck({ ...args, price: Math.floor(floor) - 10 }).verdict, 'below_floor');
  assert.equal(matchCheck({ ...args, price: Math.ceil(floor) + 200 }).verdict, 'safe');
});
test('competitors: price move and comparison basics', () => {
  assert.equal(priceMove([400]).total, null);
  assert.equal(priceMove([400, 380, 360]).total, -40);
  const list = competitorsFor('kurtis');
  assert.ok(list.length >= 4 && list.every((c) => c.price > 0 && c.history.length === 8 && c.history[7] === c.price));
  const cmp = compareWithSelected(351, list.slice(0, 3));
  assert.ok(cmp.lo <= cmp.mid && cmp.mid <= cmp.hi);
});
