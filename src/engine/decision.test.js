// Tests for the price-decision layer and group data. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePrice, assessPrice, position, TIGHT_HEADROOM } from './decision.js';
import { applyLevers } from './levers.js';
import { diagnose } from './diagnosis.js';
import { calculate } from './calculator.js';
import { DEMO_CASE } from './demo.js';
import { toLeverContext, toCalcInputs } from './model.js';
import { groupFor, percentile } from '../data/groups.js';
import { CATEGORIES } from '../data/categories.js';
import { PRODUCTS } from '../data/products.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const ctx = toLeverContext(PRODUCTS[0]);
const band = { p25: 349, median: 379, p75: 429 };
const ALL = ['repack', 'prepaid', 'size'];
const run = (inputs, b = band) => {
  const calc = calculate(inputs);
  const best = calculate(applyLevers(inputs, ctx, ALL));
  return decidePrice({ calc, band: b, bestFloor: best.floor, bestPrice: Math.round(best.priceWithTargetMargin) });
};

// ---- the four cases ---------------------------------------------------------------------------
test('CASE 3: kurti today (floor ₹365, floor + margin ₹406 > median ₹379) → lower the floor, no price recommended', () => {
  const d = run(DEMO_CASE);
  assert.equal(d.case.id, 3); assert.equal(d.recommended, null);
  assert.equal(d.holdPrice, 406);
  assert.match(d.detail, /could bring the price to ₹351/);       // computed from the levers, not typed in
});
test('CASE 1: kurti after all three levers → floor ₹314, recommends ₹351 with ≈ ₹25', () => {
  const d = run(applyLevers(DEMO_CASE, ctx, ALL));
  assert.equal(d.case.id, 1);
  assert.equal(d.recommended.price, 351); assert.equal(d.recommended.basis, 'floor+margin');
  near(d.recommended.contribution, 25, 0.6);
  near(d.steps.floor, 314.26, 0.01);
});
test('CASE 2: floor + margin only just under the median → limited headroom', () => {
  const d = run(applyLevers(DEMO_CASE, ctx, ['repack']));        // floor ₹333 → floor + margin ≈ ₹373
  assert.equal(d.case.id, 2);
  assert.ok(d.room >= 0 && d.room < TIGHT_HEADROOM * band.median);
  assert.equal(d.recommended.price, Math.round(d.steps.exactPrice));
});
test('CASE 4: floor still above P75 after every lever → not a pricing problem', () => {
  const d = run({ ...DEMO_CASE, productCost: 260 });
  assert.equal(d.case.id, 4); assert.equal(d.recommended, null);
  assert.match(d.detail, /pack|offer|SKU/);
});
test('CASE 4 is judged on the best reachable floor: a high floor the levers can fix is CASE 3, not 4', () => {
  const inputs = { ...DEMO_CASE, productCost: 210 };             // floor ≈ ₹434 today (above P75), ≈ ₹382 after the levers
  const now = calculate(inputs); assert.ok(now.floor > band.p75);
  const best = calculate(applyLevers(inputs, ctx, ALL)); assert.ok(best.floor <= band.p75);
  assert.equal(run(inputs).case.id, 3);
  assert.notEqual(diagnose(now, band, { bestFloor: best.floor }).code, 'D');
  assert.equal(diagnose(now, band).code, 'D');                    // legacy behaviour without bestFloor
});

// ---- the price is computed, not hard-coded ------------------------------------------------------
test('recommended price = round(floor + margin ÷ (k(1−t))) and earns the margin', () => {
  const inputs = applyLevers(DEMO_CASE, ctx, ALL), c = calculate(inputs), d = run(inputs);
  near(d.steps.exactPrice, c.floor + 25 / (c.keepRate * (1 - c.inputs.gstTds)));
  assert.equal(d.recommended.price, Math.round(d.steps.exactPrice));
});
test('a different target margin gives a different price', () => {
  const inputs = applyLevers(DEMO_CASE, ctx, ALL);
  const p25 = run({ ...inputs, targetMargin: 25 }).recommended.price, p40 = run({ ...inputs, targetMargin: 40 }).recommended.price;
  assert.ok(p40 > p25); assert.equal(p40, Math.round(calculate({ ...inputs, targetMargin: 40 }).priceWithTargetMargin));
});
test('a different group band changes the case and the price basis', () => {
  const inputs = applyLevers(DEMO_CASE, ctx, ALL);
  assert.equal(run(inputs, { p25: 300, median: 340, p75: 400 }).case.id, 3);                // median now below floor + margin
  const high = run(inputs, { p25: 380, median: 420, p75: 480 });                             // floor + margin under P25
  assert.equal(high.recommended.basis, 'p25'); assert.equal(high.recommended.price, 380);
  assert.ok(high.recommended.contribution > 25);
});
test('recommended price is never below the floor and never above the median', () => {
  for (const p of PRODUCTS) {
    const cx = toLeverContext(p), inputs = toCalcInputs(p), b = CATEGORIES[p.categoryId].band;
    const d = decidePrice({ calc: calculate(inputs), band: b, bestFloor: calculate(applyLevers(inputs, cx, ALL)).floor });
    if (d.recommended) { assert.ok(d.recommended.price >= calculate(inputs).floor, p.id); assert.ok(d.recommended.price <= b.median + 1, p.id); }
  }
});
test('invalid inputs → no decision', () => assert.equal(decidePrice({ calc: calculate({ ...DEMO_CASE, rtoRate: 0.7, returnRate: 0.4 }), band }), null));

// ---- seller override --------------------------------------------------------------------------
test('assessPrice: below floor is red and says how much is lost', () => {
  const a = assessPrice(DEMO_CASE, band, 299);
  assert.equal(a.level, 'red'); assert.ok(a.contribution < 0); assert.match(a.message, /lose ₹41/);
});
test('assessPrice: above floor but under target is amber', () => assert.equal(assessPrice(DEMO_CASE, band, 380).level, 'amber'));
test('assessPrice: above median is amber, above P75 says few buyers', () => {
  assert.match(assessPrice(DEMO_CASE, band, 406).message, /median/);
  assert.match(assessPrice(DEMO_CASE, band, 500).message, /P75/);
});
test('assessPrice: inside the group at target margin is green', () => {
  const inputs = applyLevers(DEMO_CASE, ctx, ALL);
  assert.equal(assessPrice(inputs, band, 351).level, 'green');
  assert.equal(assessPrice(inputs, band, 351).position, 'P25 to median');
});
test('assessPrice lets any price through (override is never blocked)', () => {
  assert.ok(assessPrice(DEMO_CASE, band, 1) && assessPrice(DEMO_CASE, band, 99999));
});
test('position labels', () => {
  assert.equal(position(300, band), 'below P25'); assert.equal(position(379, band), 'P25 to median');
  assert.equal(position(400, band), 'median to P75'); assert.equal(position(500, band), 'above P75');
});

// ---- mock group data --------------------------------------------------------------------------
test('every group: example listings reproduce the P25 / median / P75', () => {
  for (const id of Object.keys(CATEGORIES)) {
    const g = groupFor(id), sorted = g.listings.map((l) => l.price).sort((a, b) => a - b), b = CATEGORIES[id].band;
    near(percentile(sorted, 0.25), b.p25, 0.5); near(percentile(sorted, 0.5), b.median, 0.5); near(percentile(sorted, 0.75), b.p75, 0.5);
    assert.equal(g.listings.length, 9); assert.equal(g.simulated, true);
  }
});
test('kurti group is the deck band ₹349 / ₹379 / ₹429', () => assert.deepEqual(groupFor('kurtis').band, band));
