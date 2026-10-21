/**
 * DEMAND MAP — "at what price do look-alikes actually get orders?"  (deck Round 2, slide 6; engine module M3)
 * Pure, UI-free. Works on bucket data from data/demandBuckets.js.
 *
 *   busy zone  = the price buckets whose typical listing gets MORE orders than the group's typical listing
 *                (group typical = listing-weighted median of the buckets' typical orders). Kurti: ₹330–389.
 *   ₹ a month  = profit per order shipped × the bucket's order range (a starting estimate; Pehla Tees refines it).
 *
 * Recommendation rule (deck decision tree): the lowest price that clears floor + target margin INSIDE the busy zone.
 *   floor + margin inside the zone  → price there
 *   above the zone                  → lower the floor first (cost fixes), do not discount
 *   still above the group's top (P75) after every fix → not a pricing problem
 *   below the zone                  → don't race to the bottom: price at the zone's lower edge and keep the margin
 *
 * Price can influence visibility, but the cheapest listing is not necessarily the one getting the most orders,
 * so the zone is read from orders, never from "who is cheapest".
 */

export const typicalOrders = (b) => (b.orders[0] + b.orders[1]) / 2;
export const bucketLabel = (b) => (b.hi == null ? `₹${b.lo}+` : `₹${b.lo}–${b.hi}`);
export const top = (b) => (b.hi == null ? b.lo + 29 : b.hi);

/** Listing-weighted median of the buckets' typical orders. */
export function groupTypicalOrders(buckets) {
  const sorted = [...buckets].sort((a, b) => typicalOrders(a) - typicalOrders(b));
  const total = sorted.reduce((s, b) => s + b.listings, 0);
  let cum = 0;
  for (const b of sorted) { cum += b.listings; if (cum >= total / 2) return typicalOrders(b); }
  return typicalOrders(sorted[sorted.length - 1]);
}

/** The busy zone: contiguous span of the buckets that beat the group's typical listing. */
export function busyZone(buckets) {
  const bar = groupTypicalOrders(buckets);
  const busy = buckets.filter((b) => typicalOrders(b) > bar);
  if (!busy.length) return null;
  const busiest = busy.reduce((a, b) => (typicalOrders(b) > typicalOrders(a) ? b : a));
  return { lo: busy[0].lo, hi: top(busy[busy.length - 1]), buckets: busy, busiest, groupTypical: bar,
    label: `₹${busy[0].lo}–${top(busy[busy.length - 1])}` };
}

export const inBucket = (price, b) => price >= b.lo && (b.hi == null || price <= b.hi);
export const bucketFor = (price, buckets) => (price == null ? null : buckets.find((b) => inBucket(price, b)) ?? null);

/** ₹ a month range for one listing at a given profit per order and an order range. Negative profit → a loss range. */
export function monthlyRange(profit, orders) {
  const a = profit * orders[0] + 0, b = profit * orders[1] + 0; // + 0 turns −0 into 0
  return { lo: Math.min(a, b), hi: Math.max(a, b) };
}

/** Where a price sits against the market: 'below_zone' | 'in_zone' | 'above_zone'. */
export function zonePosition(price, zone) {
  if (price == null || !zone) return null;
  if (price < zone.lo) return 'below_zone';
  if (price > zone.hi) return 'above_zone';
  return 'in_zone';
}

/**
 * Recommend a listing price from floor + margin and the busy zone.
 *   floorPlusMargin  exact price that earns the target margin per shipped order
 *   bestFloor        the floor reachable after every reasonable fix (for the "not a pricing problem" test)
 *   p75              the top of the group's price band
 */
export function recommendFromDemand({ floorPlusMargin, zone, p75, bestFloor }) {
  if (floorPlusMargin == null || !zone) return { kind: 'no_data', price: null };
  if (bestFloor != null && bestFloor > p75) return { kind: 'reconsider', price: null };
  if (floorPlusMargin > zone.hi) return { kind: 'fix_cost_first', price: null, hold: Math.round(floorPlusMargin) };
  if (floorPlusMargin < zone.lo) return { kind: 'below_zone', price: zone.lo };
  return { kind: 'in_zone', price: Math.round(floorPlusMargin) };
}
