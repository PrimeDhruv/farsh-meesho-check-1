import { ASSUMPTIONS } from '../data/assumptions.js';
import { CATEGORIES } from '../data/categories.js';
import { blendedRto } from './floor.js';
import { applyLevers } from './levers.js';

/**
 * Turn a product record into model inputs for floor.js, and record where the
 * rates came from (borrowed category averages vs the seller's own data).
 * Own data replaces borrowed averages once the seller has enough orders.
 */
export function buildModel(product, A = ASSUMPTIONS) {
  const cat = CATEGORIES[product.categoryId];
  const useOwn = !!product.own && product.orders >= A.ownDataThreshold;
  const shipping = product.shipping ?? cat.shipping;
  const r = useOwn ? product.own.rto : blendedRto(cat.codShare, cat.rtoCod, cat.rtoPrepaid);
  const q = useOwn ? product.own.returns : cat.returnRate;
  const c = product.cost;

  return {
    c, t: A.gstTds, r, q,
    packaging: product.packaging, shipping, ads: cat.ads,
    F: product.packaging + shipping + cat.ads,
    Lr: A.rtoHandling + A.rtoStockLost * c,
    Lq: A.returnReverseLeg + A.returnUnsellable * c,
    codShare: cat.codShare,
    source: useOwn ? 'own' : 'borrowed',
    slab: cat.slab,
  };
}

/**
 * Adapter: a product record → flat inputs for calculator.js (the UI-free engine).
 * These are the DEFAULTS shown in Price Coach; the seller can override any of them.
 */
export function toCalcInputs(product, A = ASSUMPTIONS) {
  const mo = buildModel(product, A);
  return {
    productCost: mo.c, packagingCost: mo.packaging, shippingCost: mo.shipping, advertisingCost: mo.ads,
    gstTds: mo.t, rtoRate: mo.r, rtoHandlingCost: A.rtoHandling, rtoStockLossShare: A.rtoStockLost,
    returnRate: mo.q, returnReverseCost: A.returnReverseLeg, returnUnsellableShare: A.returnUnsellable,
    targetMargin: A.targetContribution, price: product.listedPrice ?? undefined,
  };
}

/** Situation the "Lower my floor" levers need for a product (category mix, box sizes). */
export function toLeverContext(product) {
  const cat = CATEGORIES[product.categoryId];
  return { codShare: cat.codShare, rtoCod: cat.rtoCod, rtoPrepaid: cat.rtoPrepaid, pack: cat.pack ?? null };
}

/**
 * The inputs the seller is actually on today: the defaults above, with any cost fixes she has applied
 * (product.fixes, e.g. ['repack']) patched in by the lever engine. Fixes only ever change inputs
 * (shipping, RTO rate, return rate); every ₹ result is then recomputed by calculator.js.
 */
export function effectiveInputs(product, A = ASSUMPTIONS) {
  const base = toCalcInputs(product, A);
  const fixes = product.fixes ?? [];
  return fixes.length ? applyLevers(base, toLeverContext(product), fixes) : base;
}
