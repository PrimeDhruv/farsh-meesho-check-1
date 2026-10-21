/**
 * Farsh Watch across the catalogue: runs signals.js for every live SKU on the inputs the seller is actually on
 * (applied cost fixes and current price included). Shared by the shell (alert count), Dashboard and Watch.
 */
import { evaluateSignals } from './signals.js';
import { effectiveInputs, toLeverContext } from './model.js';
import { WATCH_HISTORY } from '../data/watchHistory.js';
import { CATEGORIES } from '../data/categories.js';
import { calculate } from './calculator.js';
import { blendedRto } from './floor.js';

export function signalsFor(product) {
  const history = WATCH_HISTORY[product.id];
  if (!history) return [];
  return evaluateSignals({
    inputs: { ...effectiveInputs(product), price: product.listedPrice ?? undefined },
    band: CATEGORIES[product.categoryId].band, history, ctx: toLeverContext(product),
    categoryId: product.categoryId, convVsGroup: product.conv ?? 0,
  });
}

/** Every live signal, flattened, each with a unique key (signal ids repeat across products). */
export function allSignals(items) {
  return items.flatMap((p) => signalsFor(p).map((s) => ({ ...s, key: `${p.id}:${s.id}`, productId: p.id, productName: p.name })));
}

export const countAlerts = (items) => allSignals(items).length;

/**
 * Festive stress test (deck Round 2, slide 7): in festive weeks COD failed deliveries can rise to 40% (our
 * assumption) or 58% (the reported festive high). Recompute the floor and profit at the current price.
 */
export function festiveCheck(product, codRtoLevels = [0.40, 0.58]) {
  const cat = CATEGORIES[product.categoryId];
  const inputs = effectiveInputs(product);
  const base = calculate(inputs);
  if (!base.valid) return null;
  // the COD share she is on today (the online-payment fix lowers it): recover it from her blended RTO
  const codShare = (inputs.rtoRate - cat.rtoPrepaid) / (cat.rtoCod - cat.rtoPrepaid);
  const price = product.listedPrice ?? Math.round(base.priceWithTargetMargin);
  const runs = codRtoLevels.map((lvl) => {
    const c = calculate({ ...inputs, rtoRate: blendedRto(codShare, lvl, cat.rtoPrepaid), price });
    return c.valid ? { level: lvl, floor: c.floor, profit: c.contributionPerShippedOrder } : null;
  }).filter(Boolean);
  return { floorToday: base.floor, price, runs, codShare };
}
