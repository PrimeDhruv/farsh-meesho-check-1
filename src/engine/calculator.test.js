// Unit tests for the calculation engine.  Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, validateInputs, contributionAt, keepRate } from './calculator.js';
import { DEMO_CASE } from './demo.js';
import { trueFloor, expectedContribution } from './floor.js';
import { buildModel, toCalcInputs } from './model.js';
import { PRODUCTS } from '../data/products.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const demo = calculate(DEMO_CASE);

test('demo inputs are valid', () => assert.equal(demo.valid, true));
test('keep rate = 1 − r − q', () => { near(demo.keepRate, 1 - DEMO_CASE.rtoRate - 0.14); near(demo.keepRate, 0.6672, 1e-3); });

test('true floor: hand-computed from the formula', () => {
  // r=0.1928, q=0.14, k=0.6672; Lr=15+7.5=22.5; Lq=55+30=85; F=110
  const r = 0.72 * 0.26 + 0.28 * 0.02, k = 1 - r - 0.14;
  const expected = (150 + (110 + r * 22.5 + 0.14 * 85) / k) / (1 - 0.0715);
  near(demo.floor, expected);
  assert.equal(Math.round(demo.floor), 365);     // deck: ≈ ₹365
});
test('with RTO rounded to exactly 19%, mathematical floor is ₹364 (not forced to 365)', () => {
  const f = calculate({ ...DEMO_CASE, rtoRate: 0.19 }).floor;
  assert.equal(Math.round(f), 364);
  near(f, 364.4, 0.1);
});
test('E is zero at the floor, negative below, positive above', () => {
  near(contributionAt(DEMO_CASE, demo.floor), 0);
  assert.ok(contributionAt(DEMO_CASE, demo.floor - 1) < 0);
  assert.ok(contributionAt(DEMO_CASE, demo.floor + 1) > 0);
});
test('agrees with the legacy floor.js primitives and the product model', () => {
  const m = buildModel(PRODUCTS[0]);
  near(demo.floor, trueFloor(m));
  near(demo.contributionPerShippedOrder, expectedContribution(m, 406));
});
test('adapter reproduces the catalogue floor for every product', () => {
  for (const p of PRODUCTS) near(calculate(toCalcInputs(p)).floor, trueFloor(buildModel(p)), 1e-9);
});
test('contribution at ₹406 ≈ +₹25 per shipped order (deck: cost + usual margin)', () => {
  near(demo.contributionPerShippedOrder, 25, 0.6);
});
test('contribution per kept order = E ÷ k', () => near(demo.contributionPerKeptOrder, demo.contributionPerShippedOrder / demo.keepRate));
test('order-screen contribution ignores RTO/return losses and overstates the truth', () => {
  near(demo.orderScreenContribution, 406 * (1 - 0.0715) - 150 - 110);
  assert.ok(demo.orderScreenContribution > demo.contributionPerShippedOrder);
});
test('below the floor the order screen can still look profitable while E < 0', () => {
  const r = calculate({ ...DEMO_CASE, price: 299 });
  assert.ok(r.orderScreenContribution > 0);
  assert.ok(r.contributionPerShippedOrder < 0);
  assert.equal(r.aboveFloor, false);
  near(r.contributionPerShippedOrder, -41, 0.6); // deck appendix
});
test('price with target margin = floor + margin ÷ (k(1−t))', () => {
  near(demo.priceWithTargetMargin, demo.floor + 25 / (demo.keepRate * (1 - 0.0715)));
  near(contributionAt(DEMO_CASE, demo.priceWithTargetMargin), 25);
  assert.equal(Math.round(demo.priceWithTargetMargin), 406);
});
test('cost breakdown sums to the floor and shares sum to 1', () => {
  near(demo.costBreakdown.reduce((s, x) => s + x.amount, 0), demo.floor);
  near(demo.costBreakdown.reduce((s, x) => s + x.share, 0), 1);
  assert.ok(demo.costBreakdown.every((x) => x.amount >= 0));
});
test('order economics reconcile: kept revenue = lines + contribution', () => {
  const o = demo.orderEconomics;
  near(o.keptRevenue, o.gstTds + o.productCost + o.packaging + o.shipping + o.advertising + o.rtoLosses + o.returnLosses + o.contribution);
});
test('₹1 more shipping raises the floor by ₹1/(k(1−t)) ≈ ₹1.61', () => {
  const s = demo.floorImpacts.find((x) => x.key === 'shippingCost');
  near(s.delta, 1 / (demo.keepRate * 0.9285), 1e-9);
  near(s.delta, 1.61, 0.01);
  near(demo.floorPerRupeeOfShipmentCost, 1.61, 0.01);
});
test('product cost impact is larger than packaging impact per ₹1 (goes through 1/(1−t) and loss shares)', () => {
  const get = (k) => demo.floorImpacts.find((x) => x.key === k).delta;
  assert.ok(get('productCost') > 0 && get('packagingCost') > get('productCost'));
});
test('every floor impact is positive and matches a recomputation; sorted by size', () => {
  for (const d of demo.floorImpacts) {
    assert.ok(d.delta > 0, d.key);
    near(d.delta, d.floorAfter - demo.floor);
  }
  const abs = demo.floorImpacts.map((x) => Math.abs(x.delta));
  assert.deepEqual([...abs].sort((a, b) => b - a), abs);
});
test('+1pp RTO raises the floor', () => {
  const d = demo.floorImpacts.find((x) => x.key === 'rtoRate').delta;
  const f2 = calculate({ ...DEMO_CASE, rtoRate: DEMO_CASE.rtoRate + 0.01 }).floor;
  near(d, f2 - demo.floor);
});
test('no price / no target → dependent outputs are null, floor still returned', () => {
  const r = calculate({ ...DEMO_CASE, price: undefined, targetMargin: undefined });
  assert.ok(r.floor > 0);
  for (const k of ['contributionPerShippedOrder', 'contributionPerKeptOrder', 'orderScreenContribution', 'priceWithTargetMargin', 'orderEconomics', 'aboveFloor'])
    assert.equal(r[k], null, k);
});
test('zero RTO/returns/tax/losses collapses to cost + per-shipment costs', () => {
  const r = calculate({ ...DEMO_CASE, rtoRate: 0, returnRate: 0, gstTds: 0 });
  near(r.floor, 150 + 110); near(r.keepRate, 1);
});
test('validation: negatives, NaN, t ≥ 1, r + q ≥ 1 are rejected without throwing', () => {
  assert.ok(validateInputs({ ...DEMO_CASE, productCost: -1 }).length);
  assert.ok(validateInputs({ ...DEMO_CASE, shippingCost: NaN }).length);
  assert.ok(validateInputs({ ...DEMO_CASE, gstTds: 1 }).length);
  const bad = calculate({ ...DEMO_CASE, rtoRate: 0.6, returnRate: 0.4 });
  assert.equal(bad.valid, false); assert.equal(bad.floor, undefined);
  assert.equal(contributionAt({ ...DEMO_CASE, rtoRate: 0.6, returnRate: 0.4 }, 500), null);
});
test('keepRate helper', () => near(keepRate(0.2, 0.1), 0.7));
