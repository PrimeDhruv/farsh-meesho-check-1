// Verifies the engine reproduces the deck's worked example (slides 2 & 5).  Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { trueFloor, expectedContribution, priceForContribution, floorPerRupeeOfShipmentCost, blendedRto } from './floor.js';
import { buildModel } from './model.js';
import { analyseProduct } from './position.js';
import { PRODUCTS } from '../data/products.js';

const kurti = PRODUCTS[0];
const m = buildModel(kurti);
const near = (a, b, tol = 0.6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('blended RTO at 72% COD is ~19.3%', () => near(blendedRto(0.72, 0.26, 0.02), 0.193, 0.001));
test('true floor of the worked example is ₹365', () => assert.equal(Math.round(trueFloor(m)), 365));
test('contribution is 0 at the floor', () => near(expectedContribution(m, trueFloor(m)), 0, 1e-9));
test('appendix table: ₹299 → −41, ₹280 → −53, ₹379 → +8, ₹406 → +25 per shipped order', () => {
  near(expectedContribution(m, 299), -41); near(expectedContribution(m, 280), -53);
  near(expectedContribution(m, 379), 8);   near(expectedContribution(m, 406), 25);
});
test('₹1 off a per-shipment cost takes ~₹1.61 off the floor', () => near(floorPerRupeeOfShipmentCost(m), 1.61, 0.01));
test('floor + ₹25 margin ≈ ₹406 (cost + her usual margin)', () => assert.equal(Math.round(priceForContribution(m, 25)), 406));
test('applying the deck levers by hand gives new floor ₹314, list ₹351, +₹25', () => {
  // slab saving ₹20 on shipping; COD 72→54% (RTO 19.3→15%); returns 14→12%
  const after = { ...m, F: m.F - 20, r: blendedRto(0.54, 0.26, 0.02), q: 0.12 };
  assert.equal(Math.round(trueFloor(after)), 314);
  assert.equal(Math.round(priceForContribution(after, 25)), 351);
  near(expectedContribution(after, 351), 25);
});
test('kurti is classified "will not rank" (floor + margin above median)', () =>
  assert.equal(analyseProduct(kurti).status, 'wont_rank'));
test('a floor above P75 is flagged as not a pricing problem', () =>
  assert.equal(analyseProduct(PRODUCTS.find((p) => p.id === 'SKU-1006')).status, 'skip'));
