/**
 * "Lower my floor" — the recommendation engine. Pure, UI-free.
 *
 * A lever never carries a hard-coded ₹ result. Each lever turns the seller's CURRENT inputs into a
 * patch on those inputs (shipping, RTO rate, return rate). Its ₹ impact is then measured by running
 * the pricing engine (calculator.js) on the patched inputs and subtracting the two floors.
 *
 * Deck levers (worked example): repack 28×20×10 → 24×16×8 cm (1.12 → 0.61 kg volumetric, one slab down,
 * ₹20 off shipping); prepaid nudge COD 72% → 54%; size chart + true-colour photos, returns 14% → 12%.
 */
import { calculate } from './calculator.js';
import { blendedRto } from './floor.js';

/** Volumetric weight in kg for L×W×H cm (÷ 5000). */
export const volumetricKg = ([l, w, h]) => (l * w * h) / 5000;

/** Simulated shipping slab card (₹ per shipment, zonal). Not live Meesho rates. */
export const SLABS = [
  { upToKg: 0.5, label: '0–0.5 kg', rate: 64 },
  { upToKg: 1,   label: '0.5–1 kg', rate: 70 },
  { upToKg: 2,   label: '1–2 kg',   rate: 90 },
  { upToKg: 5,   label: '2–5 kg',   rate: 104 },
];
export const slabFor = (kg) => SLABS.find((s) => kg <= s.upToKg) ?? SLABS[SLABS.length - 1];

export const LEVER_DEFAULTS = {
  codShareFactor: 0.75,   // prepaid nudge moves COD share to 75% of today's (72% → 54%)
  returnsDropPp: 0.02,    // size chart + true-colour photos: −2 percentage points (14% → 12%)
};

const P = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
const dims = (d) => d.join('×');

/**
 * Lever definitions. `ctx` describes the product's situation:
 *   { codShare, rtoCod, rtoPrepaid, pack: { current:[l,w,h], proposed:[l,w,h] } | null }
 * `patch(inputs)` returns ONLY the input fields the lever changes.
 */
export function buildLevers(ctx) {
  const levers = [];

  if (ctx.pack) {
    const from = slabFor(volumetricKg(ctx.pack.current)), to = slabFor(volumetricKg(ctx.pack.proposed));
    const saving = from.rate - to.rate;
    if (saving > 0) levers.push({
      id: 'repack', title: 'Repack', icon: 'repack',
      inputs: ['shippingCost'],
      patch: (i) => ({ shippingCost: Math.max(0, i.shippingCost - saving) }),
      current: (i) => `${dims(ctx.pack.current)} cm · ${volumetricKg(ctx.pack.current).toFixed(2)} kg volumetric · ${from.label} slab · shipping ₹${i.shippingCost}`,
      action: `${dims(ctx.pack.current)} → ${dims(ctx.pack.proposed)} cm (${volumetricKg(ctx.pack.proposed).toFixed(2)} kg, ${to.label} slab): shipping −₹${saving}`,
      why: (perRupee) => `Shipping is billed by volumetric weight slab, and a smaller box drops you one slab. Every ₹1 off shipping lowers the floor by about ₹${perRupee.toFixed(2)}, because the orders you keep also pay for the shipping on the ones that RTO or come back.`,
    });
  }

  const codNow = ctx.codShare, codNew = Math.round(codNow * LEVER_DEFAULTS.codShareFactor * 100) / 100;
  const rtoAt = (cod) => blendedRto(cod, ctx.rtoCod, ctx.rtoPrepaid);
  levers.push({
    id: 'prepaid', title: 'Prepaid nudge', icon: 'prepaid',
    inputs: ['rtoRate'],
    // scale the seller's own RTO by the change in the COD/prepaid mix (exact blend when RTO is the category blend)
    patch: (i) => ({ rtoRate: Math.min(1, i.rtoRate * (rtoAt(codNew) / rtoAt(codNow))) }),
    current: (i) => `COD ${P(codNow)} of orders · blended RTO ${P(i.rtoRate, 1)}`,
    action: (i) => `Nudge buyers to prepay: COD ${P(codNow)} → ${P(codNew)}, blended RTO ${P(i.rtoRate, 1)} → ${P(i.rtoRate * rtoAt(codNew) / rtoAt(codNow), 1)}`,
    why: () => `COD orders come back undelivered about ${P(ctx.rtoCod)} of the time; prepaid orders only about ${P(ctx.rtoPrepaid)}. Shifting the mix cuts RTO, and every RTO costs you handling plus stock at risk, paid for by the orders that stick.`,
  });

  levers.push({
    id: 'size', title: 'Size chart + true-colour photos', icon: 'size',
    inputs: ['returnRate'],
    patch: (i) => ({ returnRate: Math.max(0, i.returnRate - LEVER_DEFAULTS.returnsDropPp) }),
    current: (i) => `Return rate ${P(i.returnRate, 1)} · mostly wrong size and colour mismatch`,
    action: (i) => `Add a size chart and true-colour photos: returns ${P(i.returnRate, 1)} → ${P(Math.max(0, i.returnRate - LEVER_DEFAULTS.returnsDropPp), 1)}`,
    why: () => `Most returns are "did not fit" or "colour looked different". Better information before the order means fewer reverse shipments, each of which costs the reverse leg plus stock that may be unsellable.`,
  });
  return levers;
}

const resolve = (v, i) => (typeof v === 'function' ? v(i) : v);

/**
 * Score each lever against the current inputs by running the pricing engine.
 * Returns levers sorted by ₹ floor reduction, biggest first. `applied` levers are excluded from scoring
 * (they are already in `inputs`).
 */
export function evaluateLevers(inputs, ctx, appliedIds = []) {
  const base = calculate(inputs);
  if (!base.valid) return [];
  return buildLevers(ctx).map((lv) => {
    const patch = lv.patch(inputs);
    const after = calculate({ ...inputs, ...patch });
    const applied = appliedIds.includes(lv.id);
    return {
      id: lv.id, title: lv.title, icon: lv.icon, applied,
      current: lv.current(inputs), action: resolve(lv.action, inputs), why: lv.why(base.floorPerRupeeOfShipmentCost),
      patch,
      floorBefore: base.floor,
      floorAfter: after.valid ? after.floor : null,
      floorReduction: after.valid ? base.floor - after.floor : 0,
    };
  }).sort((a, b) => b.floorReduction - a.floorReduction);
}

/** Apply a set of lever patches in sequence to a copy of the inputs (used for simulate / preview). */
export function applyLevers(inputs, ctx, ids) {
  let cur = { ...inputs };
  for (const lv of buildLevers(ctx)) if (ids.includes(lv.id)) cur = { ...cur, ...lv.patch(cur) };
  return cur;
}

/**
 * The listing price to use once the floor is lowered: floor + target margin ÷ k(1−t), the price that earns
 * the seller's target margin per shipped order. Rounded to the nearest whole rupee (deck: ₹351), so contribution lands within ~₹0.5 of the target.
 */
export function recommendedPrice(inputs) {
  const r = calculate(inputs);
  if (!r.valid || r.priceWithTargetMargin == null) return null;
  const price = Math.round(r.priceWithTargetMargin);
  const at = calculate({ ...inputs, price });
  return { price, contribution: at.contributionPerShippedOrder, floor: at.floor, exact: r.priceWithTargetMargin };
}
