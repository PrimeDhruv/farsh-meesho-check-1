/**
 * COMPETITORS — the algorithm suggests, the seller decides. Pure, UI-free.
 *
 * Suggestion: look-alikes in the product's group, ranked by how many attributes they share with the seller's
 * product (material, price within 10%, a good rating). Nothing is "verified": the reason lines say what matched
 * and what to check. The seller's selection then drives the comparison and the floor check. Competitor ORDER
 * numbers are never shown (the group's order ranges stay group-level).
 *
 * Floor check: before any price cut is suggested to match a competitor, the seller's no-loss price comes first.
 * Matching a rival below the floor is flagged as a loss; Farsh never lowers a price on its own.
 */
import { contributionAt } from './calculator.js';

/** why a listing was suggested, in plain reasons the UI can translate: [{ key, vars }] */
export function suggestionReasons(comp, product, sellerPrice) {
  const out = [{ key: 'group', vars: {} }];
  if (product?.attrs?.material && comp.material === product.attrs.material) out.push({ key: 'material', vars: { material: comp.material } });
  if (sellerPrice != null && Math.abs(comp.price - sellerPrice) / sellerPrice <= 0.10) out.push({ key: 'price', vars: {} });
  if (comp.rating >= 4.0) out.push({ key: 'rating', vars: { rating: comp.rating.toFixed(1) } });
  return out;
}

/** What to double-check before treating it as a real competitor. */
export function checkItems(comp, product) {
  const out = [];
  if (product?.attrs?.material && comp.material !== product.attrs.material) out.push({ key: 'diffMaterial', vars: { theirs: comp.material, yours: product.attrs.material } });
  if (product?.attrs?.feature && comp.feature !== product.attrs.feature) out.push({ key: 'diffFeature', vars: { theirs: comp.feature } });
  return out;
}

/** Rank the suggestions: more shared attributes first, then the closest price to the seller's. */
export function rankSuggestions(list, product, sellerPrice) {
  const score = (c) => suggestionReasons(c, product, sellerPrice).length - checkItems(c, product).length * 0.5;
  return [...list].sort((a, b) => score(b) - score(a) || Math.abs(a.price - (sellerPrice ?? a.price)) - Math.abs(b.price - (sellerPrice ?? b.price)));
}

/** Weekly price change of one listing: first → last, and the biggest single-week move. */
export function priceMove(history) {
  if (!history || history.length < 2) return { total: null, pct: null, last: null, lastPct: null };
  const first = history[0], last = history[history.length - 1], prev = history[history.length - 2];
  return { total: last - first, pct: (last - first) / first, last: last - prev, lastPct: (last - prev) / prev };
}

/**
 * Should the seller follow this competitor's price? Always checks the floor first.
 *   below_floor  matching it loses money on every order shipped (`loss` ₹ per shipped order)
 *   thin         above the floor, but under the target profit
 *   safe         matching it keeps the target profit
 */
export function matchCheck({ inputs, price, floor, floorPlusMargin, target }) {
  const profit = contributionAt(inputs, price);
  if (profit == null) return null;
  if (price < floor) return { verdict: 'below_floor', profit, loss: -profit, gapToFloor: floor - price };
  if (price < floorPlusMargin - 0.5 || profit < target - 0.5) return { verdict: 'thin', profit, gapToFloor: price - floor };
  return { verdict: 'safe', profit, gapToFloor: price - floor };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Seller vs the listings she picked: the middle price, the lowest and highest, and where she sits. */
export function compareWithSelected(sellerPrice, selected) {
  if (!selected.length || sellerPrice == null) return null;
  const prices = selected.map((c) => c.price);
  const mid = median(prices), lo = Math.min(...prices), hi = Math.max(...prices);
  return { mid, lo, hi, gap: sellerPrice - mid, position: sellerPrice > hi ? 'above_all' : sellerPrice < lo ? 'below_all' : 'between', count: selected.length };
}
