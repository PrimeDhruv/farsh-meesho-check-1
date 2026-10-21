/**
 * Farsh calculation engine — pure, UI-free, no data imports.
 *
 *   E = k(p(1 − t) − c) − F − r·Lr − q·Lq        expected contribution per SHIPPED order
 *   k = 1 − r − q                                 keep rate
 *   True floor = price where E = 0
 *          P = [ c + (F + r·Lr + q·Lq) ÷ k ] ÷ (1 − t)
 *
 * Inputs (all ₹ per unit unless a rate; rates are fractions, 0.14 = 14%):
 *   productCost         c
 *   packagingCost, shippingCost, advertisingCost      F = sum, paid on every shipment
 *   gstTds              t
 *   rtoRate             r
 *   rtoHandlingCost     ₹ handling per RTO            ┐ Lr = handling + stockLossShare × c
 *   rtoStockLossShare   share of product cost lost    ┘   (deck: ₹15 + 5% of c)
 *   returnRate          q
 *   returnReverseCost   ₹ reverse leg per return      ┐ Lq = reverse + unsellableShare × c
 *   returnUnsellableShare  share of stock unsellable  ┘   (deck: ₹55 + 20% of c)
 *   targetMargin        ₹ wanted per shipped order (optional; needed for price-with-margin)
 *   price               listing price p (optional; needed for price-dependent outputs)
 *
 * Definitions chosen for the outputs that the formula does not fix by itself:
 *   contributionPerKeptOrder = E ÷ k          (the shipped-order loss is carried by the orders that stick)
 *   orderScreenContribution  = p(1 − t) − c − F   what a naive per-order view shows: assumes the order is
 *                              delivered and kept, ignoring RTO and return losses.
 */

export const keepRate = (r, q) => 1 - r - q;

/** Fields that can be changed and that move the floor, with the step used for the impact test. */
export const FLOOR_DRIVERS = [
  { key: 'productCost',       label: 'Product cost',        unit: '₹', step: 1 },
  { key: 'packagingCost',     label: 'Packaging',           unit: '₹', step: 1 },
  { key: 'shippingCost',      label: 'Shipping',            unit: '₹', step: 1 },
  { key: 'advertisingCost',   label: 'Advertising',         unit: '₹', step: 1 },
  { key: 'gstTds',            label: 'GST + TDS',           unit: 'pp', step: 0.01 },
  { key: 'rtoRate',           label: 'RTO rate',            unit: 'pp', step: 0.01 },
  { key: 'rtoHandlingCost',   label: 'RTO handling cost',   unit: '₹', step: 1 },
  { key: 'returnRate',        label: 'Return rate',         unit: 'pp', step: 0.01 },
  { key: 'returnReverseCost', label: 'Reverse-logistics cost', unit: '₹', step: 1 },
];

const NUMERIC = ['productCost', 'packagingCost', 'shippingCost', 'advertisingCost', 'gstTds', 'rtoRate',
  'rtoHandlingCost', 'rtoStockLossShare', 'returnRate', 'returnReverseCost', 'returnUnsellableShare'];

/** Returns a list of human-readable problems; empty = inputs are usable. */
export function validateInputs(i) {
  const errors = [];
  for (const key of NUMERIC) {
    const v = i[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) errors.push(`${key} must be a number`);
    else if (v < 0) errors.push(`${key} cannot be negative`);
  }
  if (errors.length) return errors;
  if (i.gstTds >= 1) errors.push('gstTds must be below 100%');
  if (i.rtoRate > 1 || i.returnRate > 1) errors.push('rates cannot exceed 100%');
  if (keepRate(i.rtoRate, i.returnRate) <= 0) errors.push('RTO + returns must be below 100% — no orders are kept, so no price can break even');
  return errors;
}

/** Per-event loss amounts. */
export const rtoLoss = (i) => i.rtoHandlingCost + i.rtoStockLossShare * i.productCost;     // Lr
export const returnLoss = (i) => i.returnReverseCost + i.returnUnsellableShare * i.productCost; // Lq
export const perShipmentCost = (i) => i.packagingCost + i.shippingCost + i.advertisingCost;  // F

/** Bare formulas on validated inputs. */
function floorOf(i) {
  const k = keepRate(i.rtoRate, i.returnRate);
  const drag = perShipmentCost(i) + i.rtoRate * rtoLoss(i) + i.returnRate * returnLoss(i);
  return (i.productCost + drag / k) / (1 - i.gstTds);
}
function contributionOf(i, p) {
  const k = keepRate(i.rtoRate, i.returnRate);
  return k * (p * (1 - i.gstTds) - i.productCost) - perShipmentCost(i) - i.rtoRate * rtoLoss(i) - i.returnRate * returnLoss(i);
}

/**
 * Where the floor price goes: ₹ components that add up exactly to the floor.
 * floor·(1−t) = c + (F + r·Lr + q·Lq)/k — product cost plus per-shipment costs and losses spread over the k
 * orders that are kept. GST/TDS is the remaining t·floor.
 */
function floorBreakdown(i, floor) {
  const k = keepRate(i.rtoRate, i.returnRate);
  const parts = [
    { key: 'productCost',     label: 'Product cost',  amount: i.productCost },
    { key: 'packagingCost',   label: 'Packaging',     amount: i.packagingCost / k },
    { key: 'shippingCost',    label: 'Shipping',      amount: i.shippingCost / k },
    { key: 'advertisingCost', label: 'Advertising',   amount: i.advertisingCost / k },
    { key: 'rtoLoss',         label: 'RTO losses',    amount: (i.rtoRate * rtoLoss(i)) / k },
    { key: 'returnLoss',      label: 'Return losses', amount: (i.returnRate * returnLoss(i)) / k },
  ];
  // parts sum to floor·(1−t) (the price left after GST/TDS); GST/TDS is t·floor, so the lines add up to the floor.
  const tax = floor * i.gstTds;
  return [...parts, { key: 'gstTds', label: 'GST + TDS', amount: tax }].map((x) => ({ ...x, share: x.amount / floor }));
}

/** Expected ₹ per shipped order at price p, split by where the money goes. Sums to zero net: kept revenue = all lines + E. */
function orderEconomics(i, p, E) {
  const k = keepRate(i.rtoRate, i.returnRate);
  return {
    keptRevenue: k * p,
    gstTds: k * p * i.gstTds,
    productCost: k * i.productCost,
    packaging: i.packagingCost, shipping: i.shippingCost, advertising: i.advertisingCost,
    rtoLosses: i.rtoRate * rtoLoss(i),
    returnLosses: i.returnRate * returnLoss(i),
    contribution: E,
  };
}

/**
 * How much the floor moves for a small step in each input (exact recomputation, not a linear guess).
 * ₹ inputs: +₹1. Rate inputs: +1 percentage point.
 */
function floorImpacts(i, floor) {
  return FLOOR_DRIVERS.map((d) => {
    const bumped = { ...i, [d.key]: i[d.key] + d.step };
    const after = validateInputs(bumped).length ? null : floorOf(bumped);
    return {
      key: d.key, label: d.label, unit: d.unit,
      stepLabel: d.unit === '₹' ? '+₹1' : '+1 pp',
      delta: after == null ? null : after - floor,
      floorAfter: after,
    };
  }).sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
}

/**
 * Main entry point. Never throws on bad numbers: returns { valid:false, errors } instead.
 * `price` and `targetMargin` are optional.
 */
export function calculate(input) {
  const errors = validateInputs(input);
  if (errors.length) return { valid: false, errors, inputs: input };

  const i = input;
  const k = keepRate(i.rtoRate, i.returnRate);
  const floor = floorOf(i);
  const slope = k * (1 - i.gstTds); // ₹ of contribution per ₹1 of price
  const hasPrice = typeof i.price === 'number' && Number.isFinite(i.price);
  const hasTarget = typeof i.targetMargin === 'number' && Number.isFinite(i.targetMargin);

  const E = hasPrice ? contributionOf(i, i.price) : null;
  return {
    valid: true, errors: [], inputs: i,
    keepRate: k,
    losses: { perRto: rtoLoss(i), perReturn: returnLoss(i), perShipmentCost: perShipmentCost(i) },
    floor,
    priceSlope: slope,
    floorPerRupeeOfShipmentCost: 1 / slope,
    priceWithTargetMargin: hasTarget ? floor + i.targetMargin / slope : null,
    price: hasPrice ? i.price : null,
    contributionPerShippedOrder: E,
    contributionPerKeptOrder: E == null ? null : E / k,
    orderScreenContribution: hasPrice ? i.price * (1 - i.gstTds) - i.productCost - perShipmentCost(i) : null,
    aboveFloor: hasPrice ? i.price >= floor : null,
    costBreakdown: floorBreakdown(i, floor),
    orderEconomics: hasPrice ? orderEconomics(i, i.price, E) : null,
    floorImpacts: floorImpacts(i, floor),
  };
}

/** Contribution per shipped order at any price, for a validated input set (used for scenario/what-if lines). */
export function contributionAt(input, price) {
  if (validateInputs(input).length) return null;
  return contributionOf(input, price);
}
