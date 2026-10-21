import { buildModel, effectiveInputs, toCalcInputs, toLeverContext } from './model.js';
import { calculate } from './calculator.js';
import { applyLevers, buildLevers } from './levers.js';
import { busyZone, zonePosition } from './demand.js';
import { ASSUMPTIONS } from '../data/assumptions.js';
import { CATEGORIES } from '../data/categories.js';
import { demandFor } from '../data/demandBuckets.js';

/**
 * Where does a SKU stand? Follows the deck's decision tree (Round 2, slide 6), in this order:
 *  - floor above the group's top (P75)          → not a pricing problem: change the pack/offer, or skip the SKU
 *  - listed price below the floor               → losing money on every shipped order
 *  - floor + target margin above the busy zone  → fix the cost first; a discount would only deepen the loss
 *  - listed above the busy zone                 → priced above where buyers buy: fewer orders
 *  - under the target margin                    → low profit
 *  - otherwise                                  → on track
 * Classification only. The `key` is used for i18n; `label` / `short` are the English defaults.
 */
export const STATUS = {
  below_floor: { label: 'Losing money',            tone: 'red',   rank: 0, short: 'Every order shipped loses money at this price' },
  skip:        { label: "Can't sell at a profit",  tone: 'red',   rank: 1, short: 'Even after the fixes, no price buyers pay covers the cost' },
  wont_rank:   { label: 'Fix cost first',          tone: 'amber', rank: 2, short: 'To keep your margin you would have to price above where buyers buy' },
  above_zone:  { label: 'Above where buyers buy',  tone: 'amber', rank: 3, short: 'Priced above the busy price range: expect fewer orders' },
  thin:        { label: 'Low profit',              tone: 'amber', rank: 4, short: 'Above your no-loss price, but under your target profit' },
  unpriced:    { label: 'Needs a price',           tone: 'grey',  rank: 4, short: 'No price yet: open Price Coach' },
  healthy:     { label: 'On track',                tone: 'green', rank: 5, short: 'Makes money and sits where buyers buy' },
};

/** Pure classification from numbers — shared by the catalogue view and the live Price Coach. */
export function classify({ floor, floorPlusMargin, price, contribution, band, zone, bestFloor }, A = ASSUMPTIONS) {
  const priced = price != null;
  const ceiling = zone ? zone.hi : band.median;
  if ((bestFloor ?? floor) > band.p75) return 'skip';
  if (!priced) return 'unpriced';
  if (price < floor) return 'below_floor';
  if (floorPlusMargin > ceiling) return 'wont_rank';
  if (zone && price > zone.hi) return 'above_zone';
  if (contribution < A.targetContribution - 0.5) return 'thin';
  return 'healthy';
}

export function analyseProduct(product, A = ASSUMPTIONS) {
  const model = buildModel(product, A);
  const band = CATEGORIES[product.categoryId].band;
  const demand = demandFor(product.categoryId);
  const zone = busyZone(demand.buckets);
  const inputs = effectiveInputs(product, A);
  const calc = calculate(inputs);
  const ctx = toLeverContext(product);
  const allIds = buildLevers(ctx).map((l) => l.id);
  const best = calculate(applyLevers(toCalcInputs(product, A), ctx, allIds)); // every fix, applied once, from the base

  const floor = calc.floor;
  const floorPlusMargin = calc.priceWithTargetMargin;
  const price = product.listedPrice;
  const priced = price != null;
  const contribution = priced ? calculate({ ...inputs, price }).contributionPerShippedOrder : null;
  const status = classify({ floor, floorPlusMargin, price, contribution, band, zone, bestFloor: best.valid ? best.floor : floor }, A);

  return {
    model, band, zone, demand, floor, floorPlusMargin, price, contribution, bestFloor: best.valid ? best.floor : floor,
    marginPct: priced ? contribution / price : null, position: zonePosition(price, zone),
    fixesApplied: product.fixes ?? [],
    status, isAlert: status === 'below_floor' || status === 'skip',
    needsAttention: status !== 'healthy',
  };
}
