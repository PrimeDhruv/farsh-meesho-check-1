/**
 * Farsh Watch mock history — SIMULATED. Eight weekly points per live SKU (oldest → newest) for the
 * metrics a seller would actually watch, plus a changelog of input/shipping edits. Not live Meesho data.
 * Ratings are grouped into two-week "review cycles" (the deck's unit for the conversion+rating signal).
 */
const weeks = (n, f) => Array.from({ length: n }, (_, i) => f(i));

export const WATCH_HISTORY = {
  'SKU-1002': { // Straight kurta set — healthy, nothing fires
    impressions: weeks(8, (i) => 900 + i * 40), clicks: weeks(8, (i) => 54 + i * 3), conversionPp: weeks(8, () => 0.06),
    rating: weeks(8, (i) => 4.2 + (i > 4 ? 0.05 : 0)), ownRto: 0.20, ownReturns: 0.14, orders: 41,
    stockCover: weeks(8, (i) => 40 - i * 0.7), groupMedian: weeks(8, () => 499),
    changelog: [{ when: '3 weeks ago', what: 'Shipping ₹90 (no change)' }],
  },
  'SKU-1003': { // Flat sandals — healthy
    impressions: weeks(8, (i) => 1100 + i * 30), clicks: weeks(8, (i) => 70 + i * 2), conversionPp: weeks(8, () => 0.03),
    rating: weeks(8, (i) => 4.0 + (i > 5 ? 0.1 : 0)), ownRto: 0.21, ownReturns: 0.11, orders: 62,
    stockCover: weeks(8, (i) => 58 - i), groupMedian: weeks(8, () => 259),
    changelog: [],
  },
  'SKU-1004': { // Steel bottle — SIGNAL 3: conversion above group, rating ≥4 for two review cycles
    impressions: weeks(8, (i) => 500 + i * 60), clicks: weeks(8, (i) => 40 + i * 6), conversionPp: weeks(8, (i) => 0.05 + i * 0.007),
    rating: weeks(8, (i) => (i < 4 ? 3.8 + i * 0.05 : 4.1 + (i - 4) * 0.05)), ownRto: 0.15, ownReturns: 0.08, orders: 18,
    stockCover: weeks(8, (i) => 30 - i), groupMedian: weeks(8, () => 279),
    changelog: [{ when: '5 weeks ago', what: 'Advertising ₹8 → ₹8 (no change)' }],
  },
  'SKU-1005': { // Cotton sling bag — SIGNAL 4: group median moved > 5%
    impressions: weeks(8, (i) => 700 - i * 5), clicks: weeks(8, (i) => 22 - i * 0.3), conversionPp: weeks(8, () => -0.01),
    rating: weeks(8, () => 4.0), ownRto: 0.19, ownReturns: 0.10, orders: 27,
    stockCover: weeks(8, (i) => 34 + i), groupMedian: weeks(8, (i) => Math.round(345 + i * ((369 - 345) / 7))),
    changelog: [{ when: '2 weeks ago', what: 'Category shipping slab reviewed by Meesho — no seller action' }],
  },
  'SKU-1007': { // Palazzo pants — SIGNAL 1 (no impressions, price above median) + SIGNAL 5 (stock cover > 60)
    impressions: weeks(8, (i) => (i < 6 ? 0 : 15)), clicks: weeks(8, (i) => (i < 6 ? 0 : 1)), conversionPp: weeks(8, () => -0.04),
    rating: weeks(8, () => null), ownRto: 0.27, ownReturns: 0.17, orders: 9,
    stockCover: weeks(8, (i) => 40 + i * 4), groupMedian: weeks(8, () => 329),
    changelog: [{ when: '9 days ago', what: 'Listed at ₹345 (product cost + usual margin)' }],
    daysLive: 9,
  },
  'SKU-1008': { // Leggings — SIGNAL 2: own RTO differs a lot from the borrowed category average
    impressions: weeks(8, (i) => 1400 + i * 50), clicks: weeks(8, (i) => 95 + i * 4), conversionPp: weeks(8, () => 0.05),
    rating: weeks(8, () => 4.3), ownRto: 0.12, ownReturns: 0.12, orders: 88,
    stockCover: weeks(8, (i) => 34 - i * 0.6), groupMedian: weeks(8, () => 209),
    changelog: [{ when: '6 weeks ago', what: 'Crossed 30 orders — own RTO/returns now used instead of category average' }],
  },
};

export const REVIEW_CYCLE_WEEKS = 2;
/** Average rating over each two-week review cycle, most recent first; skips weeks with no rating yet. */
export function reviewCycles(rating) {
  const cycles = [];
  for (let i = rating.length; i > 0; i -= REVIEW_CYCLE_WEEKS) {
    const slice = rating.slice(Math.max(0, i - REVIEW_CYCLE_WEEKS), i).filter((r) => r != null);
    if (slice.length) cycles.unshift(slice.reduce((s, r) => s + r, 0) / slice.length);
  }
  return cycles.reverse(); // most recent first
}
