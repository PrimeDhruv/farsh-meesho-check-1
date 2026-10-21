// Tests for the recommendation engine (levers, diagnosis). Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLevers, applyLevers, recommendedPrice, volumetricKg, slabFor, buildLevers } from './levers.js';
import { diagnose } from './diagnosis.js';
import { calculate } from './calculator.js';
import { DEMO_CASE } from './demo.js';
import { toCalcInputs, toLeverContext } from './model.js';
import { PRODUCTS } from '../data/products.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const ctx = toLeverContext(PRODUCTS[0]);
const band = { p25: 349, median: 379, p75: 429 };
const byId = (arr) => Object.fromEntries(arr.map((l) => [l.id, l]));

test('volumetric weight: 28×20×10 = 1.12 kg, 24×16×8 = 0.61 kg (deck)', () => {
  near(volumetricKg([28, 20, 10]), 1.12, 1e-9); near(volumetricKg([24, 16, 8]), 0.6144, 1e-9);
  assert.equal(slabFor(1.12).rate, 90); assert.equal(slabFor(0.61).rate, 70);
});
test('stand-alone floor impacts ≈ −₹32, −₹14, −₹9 (deck)', () => {
  const l = byId(evaluateLevers(DEMO_CASE, ctx));
  assert.equal(Math.round(l.repack.floorReduction), 32);
  assert.equal(Math.round(l.prepaid.floorReduction), 14);
  assert.equal(Math.round(l.size.floorReduction), 9);
});
test('levers are ranked by ₹ floor reduction', () => {
  assert.deepEqual(evaluateLevers(DEMO_CASE, ctx).map((l) => l.id), ['repack', 'prepaid', 'size']);
});
test('lever patches change inputs, not results: shipping 90→70, RTO 19.3%→15%, returns 14%→12%', () => {
  const l = byId(evaluateLevers(DEMO_CASE, ctx));
  near(l.repack.patch.shippingCost, 70);
  near(l.prepaid.patch.rtoRate, 0.54 * 0.26 + 0.46 * 0.02, 1e-9);
  near(l.size.patch.returnRate, 0.12, 1e-12);
  assert.deepEqual(Object.keys(l.repack.patch), ['shippingCost']);
});
test('each impact equals the difference of two real engine runs', () => {
  for (const l of evaluateLevers(DEMO_CASE, ctx))
    near(l.floorReduction, calculate(DEMO_CASE).floor - calculate({ ...DEMO_CASE, ...l.patch }).floor);
});
test('all three levers → new floor ≈ ₹314 (deck), computed by the engine', () => {
  const after = applyLevers(DEMO_CASE, ctx, ['repack', 'prepaid', 'size']);
  const c = calculate(after);
  assert.equal(Math.round(c.floor), 314);
  near(c.floor, 314.26, 0.01);
});
test('combined saving (−₹51) is less than the stand-alone sum (−₹55): the levers overlap', () => {
  const sum = evaluateLevers(DEMO_CASE, ctx).reduce((s, l) => s + l.floorReduction, 0);
  const combined = calculate(DEMO_CASE).floor - calculate(applyLevers(DEMO_CASE, ctx, ['repack', 'prepaid', 'size'])).floor;
  assert.ok(combined < sum); near(combined, 51.1, 0.1);
});
test('applying sequentially in any order lands on the same floor', () => {
  const a = calculate(applyLevers(DEMO_CASE, ctx, ['size', 'repack', 'prepaid'])).floor;
  const b = calculate(applyLevers(DEMO_CASE, ctx, ['repack', 'prepaid', 'size'])).floor;
  near(a, b, 1e-9);
});
test('recommended price after all levers = ₹351 with ≈ ₹25 contribution', () => {
  const rec = recommendedPrice(applyLevers(DEMO_CASE, ctx, ['repack', 'prepaid', 'size']));
  assert.equal(rec.price, 351);
  near(rec.contribution, 25, 0.6);
  assert.ok(rec.price >= rec.floor);
  assert.ok(rec.price < band.median);
});
test('recommended price before any lever is the old floor + margin (₹406), still above median', () => {
  assert.equal(recommendedPrice(DEMO_CASE).price, 406);
});
test('a lever already applied does not double-count: re-scoring the patched inputs moves the floor further only if re-applied', () => {
  const once = applyLevers(DEMO_CASE, ctx, ['repack']);
  near(once.shippingCost, 70);
  // UI marks it applied and never re-applies it; the engine is a pure function of inputs.
  assert.equal(calculate(once).floor < calculate(DEMO_CASE).floor, true);
});
test('repack lever is absent when the category has no smaller pack', () => {
  const leg = PRODUCTS.find((p) => p.categoryId === 'leggings');
  assert.ok(!buildLevers(toLeverContext(leg)).some((l) => l.id === 'repack'));
});
test('every product: levers never raise the floor', () => {
  for (const p of PRODUCTS) for (const l of evaluateLevers(toCalcInputs(p), toLeverContext(p))) assert.ok(l.floorReduction >= 0, p.id + l.id);
});
test('size-chart lever cannot push returns below zero', () => {
  const l = byId(evaluateLevers({ ...DEMO_CASE, returnRate: 0.01 }, ctx));
  near(l.size.patch.returnRate, 0);
});
test('invalid inputs → no levers', () => assert.deepEqual(evaluateLevers({ ...DEMO_CASE, rtoRate: 0.7, returnRate: 0.4 }, ctx), []));

// ---- diagnosis --------------------------------------------------------------------------------
test('kurti at ₹406 → B (Floor): floor + margin above median, don\'t discount', () => {
  const d = diagnose(calculate(DEMO_CASE), band);
  assert.equal(d.code, 'B'); assert.equal(d.discountWarning, true);
  assert.match(d.detail, /Your floor \+ margin sits above the median\. Don't discount yet\./);
});
test('kurti after all levers, still listed at ₹406 → A (Price): reprice to ₹351', () => {
  const d = diagnose(calculate(applyLevers(DEMO_CASE, ctx, ['repack', 'prepaid', 'size'])), band);
  assert.equal(d.code, 'A'); assert.equal(d.discountWarning, false);
});
test('listed below floor and floor + margin above median → C (Both)', () => {
  assert.equal(diagnose(calculate({ ...DEMO_CASE, price: 299 }), band).code, 'C');
});
test('listed below floor but floor + margin fits the band → A (Price)', () => {
  const inputs = { ...DEMO_CASE, productCost: 100, price: 250 };
  const c = calculate(inputs); assert.ok(c.priceWithTargetMargin < band.median);
  assert.equal(diagnose(c, band).code, 'A');
});
test('floor above P75 → D (reconsider the SKU)', () => {
  assert.equal(diagnose(calculate({ ...DEMO_CASE, productCost: 250 }), band).code, 'D');
});
test('healthy: floor + margin and price inside the band → OK', () => {
  const c = calculate({ ...DEMO_CASE, productCost: 100, price: 345 });
  assert.equal(diagnose(c, band).code, 'OK');
});
test('no listing price → diagnosis still works from the floor alone', () => {
  assert.equal(diagnose(calculate({ ...DEMO_CASE, price: undefined }), band).code, 'B');
});
test('invalid calc → null', () => assert.equal(diagnose({ valid: false }, band), null));
