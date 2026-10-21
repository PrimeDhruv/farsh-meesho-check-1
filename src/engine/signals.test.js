// Tests for Farsh Watch signals (Part 5). Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSignals, SIGNAL_DEFS } from './signals.js';
import { reviewCycles, WATCH_HISTORY } from '../data/watchHistory.js';
import { toCalcInputs, toLeverContext } from './model.js';
import { calculate } from './calculator.js';
import { CATEGORIES } from '../data/categories.js';
import { PRODUCTS } from '../data/products.js';

const byId = (id) => PRODUCTS.find((p) => p.id === id);
const evalFor = (id, over = {}) => {
  const p = byId(id), band = CATEGORIES[p.categoryId].band;
  return evaluateSignals({ inputs: toCalcInputs(p), band, history: WATCH_HISTORY[id], ctx: toLeverContext(p), categoryId: p.categoryId, convVsGroup: p.conv ?? 0, ...over });
};
const find = (list, id) => list.find((s) => s.id === id);

test('reviewCycles: most recent cycle first, averages each 2-week block', () => {
  assert.deepEqual(reviewCycles([1, 1, 2, 2, 3, 3, 4, 4]), [4, 3, 2, 1]);
  assert.deepEqual(reviewCycles([5, 5]), [5]);
});
test('reviewCycles skips weeks with no rating yet (null)', () => assert.deepEqual(reviewCycles([null, null, 4, 4]), [4]));

test('SIGNAL 1 fires for SKU-1007: no impressions after 7 days, price above median', () => {
  const s = find(evalFor('SKU-1007'), 'no_impressions');
  assert.ok(s, 'signal did not fire');
  assert.match(s.lever, /smaller box.*online-payment/i);
  assert.doesNotMatch(s.lever, /reduce your price/i);
  assert.match(s.effect, /no-loss price/i); assert.match(s.effect, /₹/);
});
test('SIGNAL 1 effect is a real recomputation, quoting the actual current floor', () => {
  const s = find(evalFor('SKU-1007'), 'no_impressions');
  const before = calculate(toCalcInputs(byId('SKU-1007'))).floor;
  assert.match(s.effect, new RegExp(`₹${Math.round(before)}`));
});
test('SIGNAL 1 does not fire once impressions pick up', () => {
  const h = { ...WATCH_HISTORY['SKU-1007'], impressions: [...WATCH_HISTORY['SKU-1007'].impressions.slice(0, -1), 500] };
  assert.equal(find(evaluateSignals({ inputs: toCalcInputs(byId('SKU-1007')), band: CATEGORIES.bottoms.band, history: h, ctx: toLeverContext(byId('SKU-1007')), categoryId: 'bottoms', convVsGroup: -0.04 }), 'no_impressions'), undefined);
});
test('SIGNAL 1 does not fire when price is at or below the median', () => {
  const inputs = { ...toCalcInputs(byId('SKU-1007')), price: 300 }; // bottoms median 329
  assert.equal(find(evaluateSignals({ inputs, band: CATEGORIES.bottoms.band, history: WATCH_HISTORY['SKU-1007'], ctx: toLeverContext(byId('SKU-1007')), categoryId: 'bottoms', convVsGroup: -0.04 }), 'no_impressions'), undefined);
});

test('SIGNAL 2 fires for SKU-1008: own RTO differs a lot from the category average', () => {
  const s = find(evalFor('SKU-1008'), 'rate_diff');
  assert.ok(s);
  assert.equal(s.lever, 'Use your own numbers for your no-loss price.');
  assert.match(s.effect, /category averages.*₹\d+.*own numbers.*₹\d+/is);
});
test('SIGNAL 2 needs at least 30 own orders', () => {
  const h = { ...WATCH_HISTORY['SKU-1008'], orders: 10 };
  assert.equal(find(evaluateSignals({ inputs: toCalcInputs(byId('SKU-1008')), band: CATEGORIES.leggings.band, history: h, ctx: toLeverContext(byId('SKU-1008')), categoryId: 'leggings', convVsGroup: 0.05 }), 'rate_diff'), undefined);
});
test('SIGNAL 2 does not fire when own rates roughly match the category average', () => {
  assert.equal(find(evalFor('SKU-1002'), 'rate_diff'), undefined); // own 0.20/0.14 vs kurtaset category ~ similar
});

test('SIGNAL 3 fires for SKU-1004: conversion above group and rating ≥4 for two review cycles', () => {
  const s = find(evalFor('SKU-1004'), 'conv_rating');
  assert.ok(s);
  assert.equal(s.lever, "You can earn a little more per order: don't cut the price.");
  assert.match(s.effect, /₹/);
  const cycles = reviewCycles(WATCH_HISTORY['SKU-1004'].rating).slice(0, 2);
  assert.ok(cycles.every((r) => r >= 4));
});
test('SIGNAL 3 does not fire when conversion is below the group', () => {
  assert.equal(find(evalFor('SKU-1004', { convVsGroup: -0.01 }), 'conv_rating'), undefined);
});
test('SIGNAL 3 does not fire on only one good review cycle', () => {
  const h = { ...WATCH_HISTORY['SKU-1004'], rating: [3, 3, 3, 3, 3, 3, 4.5, 4.5] };
  assert.equal(find(evaluateSignals({ inputs: toCalcInputs(byId('SKU-1004')), band: CATEGORIES.home.band, history: h, ctx: toLeverContext(byId('SKU-1004')), categoryId: 'home', convVsGroup: 0.09 }), 'conv_rating'), undefined);
});

test('SIGNAL 4 fires for SKU-1005: group median moved more than 5% over the window', () => {
  const s = find(evalFor('SKU-1005'), 'median_moved');
  assert.ok(s);
  assert.equal(s.lever, 'Re-check your no-loss price and suggested price before changing your price.');
});
test('SIGNAL 4 does not fire for a flat median', () => assert.equal(find(evalFor('SKU-1002'), 'median_moved'), undefined));
test('SIGNAL 4: with the old (lower) median the SKU was Case 3 (no price fits); the new median opens up Case 2', () => {
  const s = find(evalFor('SKU-1005'), 'median_moved');
  assert.match(s.effect, /Before: lower your cost first\. Now: a little room to price\./);
});
test('SIGNAL 4: when a recommendation exists under both medians, the recommended price itself is unchanged (only headroom is) — effect says so, not a fake price move', () => {
  const h = { ...WATCH_HISTORY['SKU-1008'], groupMedian: [200, 202, 205, 207, 209, 211, 213, 215] };
  const s = find(evaluateSignals({ inputs: toCalcInputs(byId('SKU-1008')), band: CATEGORIES.leggings.band, history: h, ctx: toLeverContext(byId('SKU-1008')), categoryId: 'leggings', convVsGroup: 0.05 }), 'median_moved');
  assert.ok(s);
  assert.match(s.effect, /Suggested price moves from ₹191 to ₹191 \(\+₹0\)/);
});

test('SIGNAL 5 fires for SKU-1007: stock cover over 60 days, with a markdown ladder never below the floor', () => {
  const s = find(evalFor('SKU-1007'), 'stock_cover');
  assert.ok(s);
  assert.equal(s.lever, 'Plan step-by-step price cuts, never below your no-loss price.');
  assert.ok(s.ladder.length >= 2);
  const floor = calculate(toCalcInputs(byId('SKU-1007'))).floor;
  for (const rung of s.ladder) assert.ok(rung.price >= floor - 0.5, rung.price);
  const prices = s.ladder.map((r) => r.price);
  assert.deepEqual([...prices].sort((a, b) => b - a), prices); // non-increasing
});
test('SIGNAL 5 does not fire under 60 days', () => assert.equal(find(evalFor('SKU-1002'), 'stock_cover'), undefined));

test('a healthy SKU with a flat median and normal own rates fires no red-flag signals besides conv_rating', () => {
  const list = evalFor('SKU-1003').map((s) => s.id);
  assert.ok(!list.includes('no_impressions')); assert.ok(!list.includes('rate_diff'));
  assert.ok(!list.includes('median_moved')); assert.ok(!list.includes('stock_cover'));
});
test('no history (not-yet-live SKU) → no signals, never throws', () => {
  assert.deepEqual(evaluateSignals({ inputs: toCalcInputs(byId('SKU-1001')), band: CATEGORIES.kurtis.band, history: undefined, ctx: toLeverContext(byId('SKU-1001')), categoryId: 'kurtis' }), []);
});
test('invalid inputs → no signals, never throws', () => {
  const bad = { ...toCalcInputs(byId('SKU-1007')), rtoRate: 0.7, returnRate: 0.4 };
  assert.deepEqual(evaluateSignals({ inputs: bad, band: CATEGORIES.bottoms.band, history: WATCH_HISTORY['SKU-1007'], ctx: toLeverContext(byId('SKU-1007')), categoryId: 'bottoms', convVsGroup: -0.04 }), []);
});
test('no signal ever tells the seller to reduce price directly, and no alert uses jargon', () => {
  for (const id of Object.keys(WATCH_HISTORY)) for (const s of evalFor(id)) {
    assert.doesNotMatch(s.lever, /^(reduce|lower|cut) your price/i);
    for (const txt of [s.title, s.cause, s.lever, s.effect]) assert.doesNotMatch(txt, /\bpp\b|\bRTO\b|median|\bCase \d/);
    assert.ok(SIGNAL_DEFS[s.id]);
  }
});
