/**
 * Final price-decision layer. Pure, UI-free.
 *
 * Given the seller's floor, target margin and the group band, decide what situation they are in and what
 * listing price (if any) Farsh recommends. The recommended price is computed, never looked up:
 *
 *      price = floor + target margin ÷ (k(1 − t))          (the price that earns the target per shipped order)
 *
 *  room  = group median − that price          ₹ you can sit under the median and still keep your margin
 *
 *  CASE 4  best floor (after every reasonable lever) is above P75 → not a pricing problem: pack / offer / SKU
 *  CASE 3  room < 0                → floor + margin is above the median: lower the floor before the price
 *  CASE 2  0 ≤ room < tight band   → floor is close to the median: limited pricing headroom
 *  CASE 1  room ≥ tight band       → floor comfortably below the median: room to price competitively
 *
 * Cases 1 and 2 recommend floor + margin, but never below the group's P25: under the bottom quarter of the group
 * there is no ranking benefit, so extra room is kept as margin (basis 'p25').
 */
import { calculate } from './calculator.js';

/** "Close to the median" = less than 5% of the median between floor + margin and the median. */
export const TIGHT_HEADROOM = 0.05;

export const CASES = {
  1: { id: 1, key: 'room',     tone: 'green', label: 'Room to price competitively' },
  2: { id: 2, key: 'limited',  tone: 'amber', label: 'Limited pricing headroom' },
  3: { id: 3, key: 'lower',    tone: 'amber', label: 'Lower the floor before the price' },
  4: { id: 4, key: 'reconsider', tone: 'red', label: 'Not a pricing problem' },
};

export function decidePrice({ calc, band, bestFloor, bestPrice = null }) {
  if (!calc.valid || calc.priceWithTargetMargin == null) return null;
  const { floor, priceWithTargetMargin: exact, inputs } = calc;
  const margin = inputs.targetMargin;
  const best = bestFloor ?? floor;
  const room = band.median - exact;
  const tight = TIGHT_HEADROOM * band.median;

  const steps = {
    floor, margin, slope: calc.priceSlope, keepRate: calc.keepRate, t: inputs.gstTds,
    marginUplift: exact - floor, exactPrice: exact,
    median: band.median, p25: band.p25, p75: band.p75, room,
  };

  let c, headline, detail, recommended = null;
  if (best > band.p75) {
    c = CASES[4];
    headline = 'This is not simply a pricing problem.';
    detail = `Even after every lever your floor is about ${rupee(best)}, above the top of your group (P75 ${rupee(band.p75)}). Any price buyers will see loses money or earns almost nothing. Reconsider the pack, the offer (a bundle or cheaper variant) or the SKU itself.`;
  } else if (room < 0) {
    c = CASES[3];
    headline = 'Lower the floor before you reduce the price.';
    detail = `Your floor + margin (${rupee(exact)}) sits above the median (${rupee(band.median)}). Discounting to compete would put you below your margin, or below your floor. ${bestPrice != null ? `The levers above could bring the price to ${rupee(bestPrice)}.` : ''}`.trim();
  } else {
    c = room < tight ? CASES[2] : CASES[1];
    const price = Math.round(exact), basis = price < band.p25 ? 'p25' : 'floor+margin';
    const listed = basis === 'p25' ? band.p25 : price;
    const at = calculate({ ...inputs, price: listed });
    recommended = { price: listed, contribution: at.contributionPerShippedOrder, basis, aboveMedian: listed > band.median };
    headline = c.id === 1 ? 'You have room to price competitively.' : 'You have limited pricing headroom.';
    detail = c.id === 1
      ? `Your floor (${rupee(floor)}) is well below the median (${rupee(band.median)}). ${rupee(listed)} keeps your ${rupee(margin)} target and sits ${rupee(band.median - listed)} under the median.`
      : `Your floor + margin (${rupee(exact)}) is only ${rupee(Math.max(0, room))} under the median (${rupee(band.median)}). You can hold your margin, but there is little room to go lower.`;
  }
  return { case: c, headline, detail, recommended, holdPrice: c.id === 3 ? Math.round(exact) : null, room, steps };
}

/** Check ANY price the seller chooses (their own, or the recommendation) against floor, margin and band. */
export function assessPrice(inputs, band, price) {
  const c = calculate({ ...inputs, price });
  if (!c.valid) return null;
  const e = c.contributionPerShippedOrder, margin = inputs.targetMargin ?? 0;
  let level, message;
  if (price < c.floor) { level = 'red'; message = `Below your floor: you lose ${rupee(-e)} on every shipped order.`; }
  else if (e < margin - 0.5) { level = 'amber'; message = `Above your floor, but you earn ${rupee(e)} per shipped order, under your ${rupee(margin)} target.`; }
  else if (price > band.p75) { level = 'amber'; message = `Above the top of your group (P75 ${rupee(band.p75)}): few buyers will see it.`; }
  else if (price > band.median) { level = 'amber'; message = `Above the group median (${rupee(band.median)}): likely to rank below cheaper look-alikes.`; }
  else { level = 'green'; message = `Inside your group and earns ${rupee(e)} per shipped order, at or above your target.`; }
  return { level, message, contribution: e, floor: c.floor, aboveFloor: price >= c.floor, position: position(price, band) };
}

export function position(price, band) {
  if (price < band.p25) return 'below P25';
  if (price <= band.median) return 'P25 to median';
  if (price <= band.p75) return 'median to P75';
  return 'above P75';
}

const rupee = (n) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
