/**
 * Farsh pricing model (deck, appendix).
 *
 *   E = k(p(1 − t) − c) − F − r·Lr − q·Lq      expected contribution per SHIPPED order
 *   k = 1 − r − q                               keep rate
 *   True floor = the price where E = 0
 *          P = [ c + (F + r·Lr + q·Lq) ÷ k ] ÷ (1 − t)
 *
 * Pure functions, no UI or data imports. `m` is a model-inputs object:
 *   { c, t, F, r, Lr, q, Lq }   (built from a product by ./model.js)
 */

export const keepRate = (r, q) => 1 - r - q;

/** Blend COD / prepaid RTO by the seller's COD share. */
export const blendedRto = (codShare, rtoCod, rtoPrepaid) =>
  codShare * rtoCod + (1 - codShare) * rtoPrepaid;

/** Expected contribution per shipped order at price p. */
export function expectedContribution(m, p) {
  const k = keepRate(m.r, m.q);
  return k * (p * (1 - m.t) - m.c) - m.F - m.r * m.Lr - m.q * m.Lq;
}

/** The price where expected contribution per shipped order is exactly zero. */
export function trueFloor(m) {
  const k = keepRate(m.r, m.q);
  return (m.c + (m.F + m.r * m.Lr + m.q * m.Lq) / k) / (1 - m.t);
}

/** ₹ of contribution earned per ₹1 of price: k(1 − t). */
export const priceSlope = (m) => keepRate(m.r, m.q) * (1 - m.t);

/** Lowest price that earns `target` ₹ per shipped order ("floor + margin"). */
export const priceForContribution = (m, target) =>
  trueFloor(m) + target / priceSlope(m);

/** ₹ the floor moves per ₹1 change in a per-shipment cost (deck: ₹1 → ₹1.61). */
export const floorPerRupeeOfShipmentCost = (m) => 1 / priceSlope(m);
