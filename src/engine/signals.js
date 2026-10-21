/**
 * Farsh Watch — signal-based recommendations. Pure, UI-free.
 *
 * Every alert follows WHAT WE NOTICED → LIKELY REASON → ONE THING TO DO → WHAT IT'S WORTH, in plain seller words
 * (no "pp", "RTO" or "median" on screen). The ₹ effect is always computed by running calculator.js / levers.js /
 * decision.js on the seller's real inputs — never a fixed number. Farsh Watch never says "reduce your price": each
 * action is a cost fix, a recompute, or a planned step, exactly as in Price Coach.
 */
import { calculate, contributionAt } from './calculator.js';
import { buildLevers } from './levers.js';
import { decidePrice } from './decision.js';
import { blendedRto } from './floor.js';
import { busyZone } from './demand.js';
import { CATEGORIES } from '../data/categories.js';
import { reviewCycles } from '../data/watchHistory.js';
import { demandFor } from '../data/demandBuckets.js';

const rupee = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
const signed = (n) => `${Math.round(n) < 0 ? '−' : '+'}${rupee(n)}`;
const last = (arr) => arr[arr.length - 1];
const per100 = (n) => `${Math.round(n * 100)} of every 100`;

export const SIGNAL_DEFS = {
  no_impressions: { stage: 'Launch', title: 'Few buyers are seeing this product, and the price is above the middle of the group' },
  rate_diff:      { stage: 'Learn',  title: 'Your own returns and failed deliveries are different from the category average' },
  conv_rating:    { stage: 'Grow',   title: 'Selling better than similar products, with a rating of 4+ two times in a row' },
  median_moved:   { stage: 'Defend', title: 'The middle price of similar products moved more than 5%' },
  stock_cover:    { stage: 'Clear',  title: 'More than 60 days of stock' },
};

const CASE_WORDS = { 1: 'room to price competitively', 2: 'a little room to price', 3: 'lower your cost first', 4: "can't sell at a profit" };

/**
 * Evaluate all five signals for one product. `inputs` = calculator inputs (today's, incl. price);
 * `band` = group band; `history` = a WATCH_HISTORY[id] entry (may be undefined for a not-yet-live SKU);
 * `ctx` = lever context (from toLeverContext).
 * Returns an array of triggered signals only, each: { id, ...SIGNAL_DEFS, cause, lever, effect, why }.
 */
export function evaluateSignals({ inputs, band, history, ctx, categoryId, convVsGroup = 0 }) {
  const calc = calculate(inputs);
  if (!calc.valid || !history) return [];
  const out = [];
  const cat = CATEGORIES[categoryId];
  const zone = busyZone(demandFor(categoryId).buckets);
  const zoneText = zone ? ` Most orders for similar products happen at ${zone.label}.` : '';

  // 1 — no views after 7 days, price above the middle of the group
  const impr7 = history.impressions.slice(-1)[0];
  const daysLive = history.daysLive;
  if (daysLive != null && daysLive >= 7 && impr7 < 30 && inputs.price != null && inputs.price > band.median) {
    const levers = buildLevers(ctx).filter((l) => l.id === 'repack' || l.id === 'prepaid');
    let patched = { ...inputs };
    for (const lv of levers) patched = { ...patched, ...lv.patch(patched) };
    const after = calculate(patched);
    out.push({
      id: 'no_impressions', ...SIGNAL_DEFS.no_impressions,
      cause: `Live for ${daysLive} days with only ${impr7} views last week. You're at ${rupee(inputs.price)}; the middle price of similar products is ${rupee(band.median)}.${zoneText}`,
      lever: 'Lower your cost first: use a smaller box and turn on the online-payment offer.',
      effect: after.valid
        ? `Together they could take your no-loss price from ${rupee(calc.floor)} to ${rupee(after.floor)} (−${rupee(calc.floor - after.floor)}), before any price change.`
        : 'Apply the box and online-payment fixes in Price Coach to see your new no-loss price.',
      why: `Views last week: ${impr7} (Farsh needs 30+ to call a listing "seen"). Your price ${rupee(inputs.price)} vs middle price ${rupee(band.median)}.`,
    });
  }

  // 2 — own failed deliveries / returns differ from the category average
  if (history.ownRto != null && (history.orders ?? 0) >= 30) {
    const catRto = blendedRto(cat.codShare, cat.rtoCod, cat.rtoPrepaid);
    const dRto = history.ownRto - catRto, dRet = history.ownReturns - cat.returnRate;
    if (Math.abs(dRto) >= 0.03 || Math.abs(dRet) >= 0.03) {
      const borrowed = calculate({ ...inputs, rtoRate: catRto, returnRate: cat.returnRate });
      out.push({
        id: 'rate_diff', ...SIGNAL_DEFS.rate_diff,
        cause: `After ${history.orders} orders, ${per100(history.ownRto)} of your orders fail to deliver (category: ${per100(catRto)}), and ${per100(history.ownReturns)} are returned (category: ${per100(cat.returnRate)}).`,
        lever: 'Use your own numbers for your no-loss price.',
        effect: `No-loss price on category averages: ${rupee(borrowed.floor)}. On your own numbers: ${rupee(calc.floor)} (${calc.floor <= borrowed.floor ? '−' : '+'}${rupee(Math.abs(calc.floor - borrowed.floor))}).`,
        why: `${history.orders} orders is enough to trust your own numbers (30+). Farsh switched from category averages automatically.`,
      });
    }
  }

  // 3 — selling better than the group and rating ≥ 4 for two review cycles
  const cycles = reviewCycles(history.rating).slice(0, 2);
  if (convVsGroup > 0 && cycles.length === 2 && cycles.every((r) => r >= 4)) {
    const dec = decidePrice({ calc, band, bestFloor: calc.floor });
    const atMedian = contributionAt(inputs, band.median);
    const nowE = inputs.price != null ? calc.contributionPerShippedOrder : null;
    const uplift = nowE != null ? atMedian - nowE : null;
    const stillBusy = zone && band.median <= zone.hi ? ', still where buyers buy' : '';
    out.push({
      id: 'conv_rating', ...SIGNAL_DEFS.conv_rating,
      cause: `Buyers who see this listing buy it more often than similar products, and your rating held at ${cycles[1].toFixed(1)} and ${cycles[0].toFixed(1)} over the last two checks.`,
      lever: "You can earn a little more per order: don't cut the price.",
      effect: uplift != null && uplift > 0
        ? `Moving from ${rupee(inputs.price)} to ${rupee(band.median)} (the middle price) changes your profit per order from ${signed(nowE)} to ${signed(atMedian)}${stillBusy}. Try it for 7–10 days or ~30 orders.`
        : `Your suggested price is already ${rupee(dec?.recommended?.price ?? calc.floor)}; there is little extra profit to take right now.`,
      why: `Buys per view: higher than similar products. Rating by two-week check: ${[...cycles].reverse().map((r) => r.toFixed(1)).join(' → ')}.`,
    });
  }

  // 4 — the middle price of the group moved more than 5%
  const m0 = history.groupMedian[0], m1 = last(history.groupMedian);
  const moved = (m1 - m0) / m0;
  if (Math.abs(moved) > 0.05) {
    const oldBand = { p25: band.p25, median: m0, p75: band.p75 };
    const oldDec = decidePrice({ calc, band: oldBand, bestFloor: calc.floor });
    const newDec = decidePrice({ calc, band, bestFloor: calc.floor });
    out.push({
      id: 'median_moved', ...SIGNAL_DEFS.median_moved,
      cause: `It moved from ${rupee(m0)} to ${rupee(m1)} in 8 weeks (${moved > 0 ? '+' : ''}${(moved * 100).toFixed(1)}%), so the prices you compete with have shifted.`,
      lever: 'Re-check your no-loss price and suggested price before changing your price.',
      effect: (oldDec?.recommended && newDec?.recommended)
        ? `Suggested price moves from ${rupee(oldDec.recommended.price)} to ${rupee(newDec.recommended.price)} (${newDec.recommended.price >= oldDec.recommended.price ? '+' : '−'}${rupee(Math.abs(newDec.recommended.price - oldDec.recommended.price))}).`
        : `Before: ${CASE_WORDS[oldDec?.case.id] ?? '—'}. Now: ${CASE_WORDS[newDec?.case.id] ?? '—'}. Open Price Coach and re-check before touching the price.`,
      why: `Middle price 8 weeks ago: ${rupee(m0)}. Now: ${rupee(m1)}. Farsh alerts when it moves more than 5%.`,
    });
  }

  // 5 — more than 60 days of stock
  const cover = last(history.stockCover);
  if (cover > 60) {
    const price = inputs.price ?? calc.floor;
    const rungs = [1, 0.95, 0.9].map((f) => Math.max(calc.floor, Math.round(price * f)));
    const ladder = [...new Set(rungs)].map((p) => ({ price: p, contribution: contributionAt(inputs, p) }));
    if (ladder[ladder.length - 1].price > calc.floor) ladder.push({ price: Math.round(calc.floor), contribution: contributionAt(inputs, calc.floor) });
    out.push({
      id: 'stock_cover', ...SIGNAL_DEFS.stock_cover,
      cause: `${Math.round(cover)} days of stock: it is selling slower than you bought it, and it is ageing.`,
      lever: 'Plan step-by-step price cuts, never below your no-loss price.',
      effect: `Step down ${ladder.map((r) => rupee(r.price)).join(' → ')}, never below your no-loss price ${rupee(calc.floor)}. Profit per order at each step: ${ladder.map((r) => rupee(r.contribution)).join(' / ')}.`,
      why: `Days of stock: ${Math.round(cover)} (Farsh alerts above 60).`, ladder,
    });
  }

  return out;
}
