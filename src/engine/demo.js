import { blendedRto } from './floor.js';

/**
 * The deck's worked example (Rekha's A-line kurti) as calculator inputs.
 *   cost ₹150; packaging ₹12 + shipping ₹90 + ads ₹8 = ₹110 per shipment;
 *   RTO = 72% COD × 26% + 28% prepaid × 2% ≈ 19.3%; returns 14%; GST + TDS 7.15%;
 *   Lr = ₹15 + 5% of cost; Lq = ₹55 + 20% of cost; target ₹25; listed at ₹406 (cost + usual margin).
 */
export const DEMO_CASE = {
  productCost: 150, packagingCost: 12, shippingCost: 90, advertisingCost: 8,
  gstTds: 0.0715,
  rtoRate: blendedRto(0.72, 0.26, 0.02), rtoHandlingCost: 15, rtoStockLossShare: 0.05,
  returnRate: 0.14, returnReverseCost: 55, returnUnsellableShare: 0.20,
  targetMargin: 25, price: 406,
};
