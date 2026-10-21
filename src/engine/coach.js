/**
 * COACH VIEW-MODEL — everything the seller-facing Price Coach shows for one product, computed in one place.
 * Pure and UI-free. Every ₹ figure comes from calculator.js; the market side comes from demand.js.
 *
 * The chain it builds (deck Round 2): your cost → your no-loss price (floor) → where similar products get orders
 * (busy zone) → where your price sits → which cost fix first → the suggested price → what it does to your money.
 */
import { calculate, contributionAt, keepRate, perShipmentCost, rtoLoss, returnLoss } from './calculator.js';
import { buildLevers, evaluateLevers, applyLevers } from './levers.js';
import { busyZone, bucketFor, monthlyRange, zonePosition, recommendFromDemand, typicalOrders, bucketLabel } from './demand.js';
import { toCalcInputs, toLeverContext } from './model.js';
import { baselineFor, funnelAt, compareMove, sumFunnels } from './funnel.js';
import { CATEGORIES } from '../data/categories.js';
import { demandFor } from '../data/demandBuckets.js';

/** Evidence grade per fix (deck Round 2, slide 8). */
export const FIX_META = {
  repack:  { confidence: 'high',   paidBy: 'seller' },
  prepaid: { confidence: 'medium', paidBy: 'meesho' },  // the online-payment offer is Meesho-funded (deck slide 9)
  size:    { confidence: 'low',    paidBy: 'seller' },  // published evidence supports a smaller effect (deck slide 8)
};

/** Round a list so the rounded parts add up exactly to round(total) (largest-remainder). */
export function roundToTotal(values, total) {
  const target = Math.round(total);
  const floors = values.map((v) => Math.floor(v));
  let short = target - floors.reduce((s, v) => s + v, 0);
  const order = values.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  const out = [...floors];
  for (let k = 0; k < order.length && short > 0; k++, short--) out[order[k][1]] += 1;
  return out;
}

/**
 * The cost sheet: every ₹ of the floor, line by line, like a spreadsheet (deck slide 5).
 * Rows add up exactly to the rounded floor. `fail` = share of orders that come back, `kept` = share that stick.
 */
export function costSheet(i) {
  const k = keepRate(i.rtoRate, i.returnRate), g = 1 - i.gstTds;
  const F = perShipmentCost(i), sub = i.productCost + F;
  const raw = {
    product: i.productCost, packing: i.packagingCost, shipping: i.shippingCost, ads: i.advertisingCost,
    tax: sub / g - sub,
    again: (F * (1 - k)) / k / g,
    returns: (i.returnRate * returnLoss(i)) / k / g,
    rto: (i.rtoRate * rtoLoss(i)) / k / g,
  };
  const keys = Object.keys(raw);
  const floor = Object.values(raw).reduce((s, v) => s + v, 0);
  const shown = Object.fromEntries(roundToTotal(Object.values(raw), floor).map((v, idx) => [keys[idx], v]));
  const delivered = shown.product + shown.packing + shown.shipping + shown.ads;
  return {
    raw, shown, floor, floorShown: Math.round(floor),
    delivered, safeLooking: delivered + shown.tax,
    perShipment: F, fail: 1 - k, kept: k, g, t: i.gstTds,
    lossPerReturn: returnLoss(i), lossPerRto: rtoLoss(i), returnRate: i.returnRate, rtoRate: i.rtoRate,
  };
}

const round50 = (n) => Math.round(n / 50) * 50;
const monthly = (profit, bucket) => {
  if (profit == null || !bucket) return null;
  const m = monthlyRange(profit, bucket.orders);
  return { lo: round50(m.lo), hi: round50(m.hi) };
};

/**
 * @param product  a catalogue product (uses product.fixes and product.listedPrice)
 * @param opts.baseInputs  optional override of the base inputs (the "All my numbers" editor)
 * @param opts.fixes       optional override of which fixes are applied
 * @param opts.price       optional override of the price being considered
 * @param opts.status      catalogue status; an on-track listing is measured at its own price (it is not re-priced)
 */
export function buildCoach(product, opts = {}) {
  const cat = CATEGORIES[product.categoryId];
  const band = cat.band;
  const demand = demandFor(product.categoryId);
  const zone = busyZone(demand.buckets);
  const ctx = toLeverContext(product);
  const base = opts.baseInputs ?? toCalcInputs(product);
  const applied = opts.fixes ?? product.fixes ?? [];
  const price = opts.price !== undefined ? opts.price : product.listedPrice ?? null;

  const baseCalc = calculate({ ...base, price: undefined });
  if (!baseCalc.valid) return { valid: false, errors: baseCalc.errors };
  const allIds = buildLevers(ctx).map((l) => l.id);
  const inputs = applyLevers({ ...base, price: undefined }, ctx, applied);
  const allFixed = applyLevers({ ...base, price: undefined }, ctx, allIds);
  const now = calculate(inputs), best = calculate(allFixed);

  // recommendation now (with the fixes applied so far) and after every fix
  const recNow = recommendFromDemand({ floorPlusMargin: now.priceWithTargetMargin, zone, p75: band.p75, bestFloor: best.floor });
  const recAll = recommendFromDemand({ floorPlusMargin: best.priceWithTargetMargin, zone, p75: band.p75, bestFloor: best.floor });
  // the price the fixes are measured at: where buyers buy, after the fixes; else the seller's own price
  // the price every ₹ on the fix cards is measured at = the price the seller is told to use: her own price when on
  // track; else today's suggestion; else the suggestion once every fix is in (kurti: ₹351); else the price that holds the margin
  const focusPrice = (opts.status === 'healthy' && price != null) ? price
    : (recNow.price ?? recAll.price ?? recAll.hold ?? price ?? Math.round(now.priceWithTargetMargin));

  // fixes, biggest first, applied one after another so the ₹ always add up (deck: −₹32 / −₹12 / −₹7)
  const order = evaluateLevers({ ...base, price: undefined }, ctx).map((l) => l.id);
  const defs = Object.fromEntries(buildLevers(ctx).map((l) => [l.id, l]));
  let cur = { ...base, price: undefined };
  const fixes = order.map((id) => {
    const lv = defs[id];
    const before = calculate(cur);
    const next = { ...cur, ...lv.patch(cur) };
    const after = calculate(next);
    const step = {
      id, applied: applied.includes(id), ...FIX_META[id],
      floorBefore: before.floor, floorAfter: after.floor, floorCut: before.floor - after.floor,
      profitBefore: contributionAt(cur, focusPrice), profitAfter: contributionAt(next, focusPrice),
      patch: lv.patch(cur), detail: lv.action instanceof Function ? lv.action(cur) : lv.action,
    };
    step.gain = step.profitAfter - step.profitBefore;
    cur = next;
    return step;
  });

  // demand table: each bucket with what YOU would make there, given the fixes applied so far
  const buckets = demand.buckets.map((b) => {
    const mid = b.hi == null ? b.lo + 15 : Math.round((b.lo + b.hi) / 2);
    const profit = contributionAt(inputs, mid);
    return {
      ...b, label: bucketLabel(b), mid, typical: typicalOrders(b),
      busy: zone ? zone.buckets.includes(b) : false, busiest: zone ? zone.busiest === b : false,
      profitAtMid: profit, belowFloor: mid < now.floor, monthlyAtMid: monthly(profit, b),
    };
  });
  const cheapest = buckets[0];
  const maxOrders = Math.max(...buckets.map((b) => b.orders[1]));

  // money at three prices: today, the suggestion (after every fix) and "copy the cheapest"
  const scenario = (p, inp) => {
    if (p == null) return null;
    const profit = contributionAt(inp, p), bk = bucketFor(p, demand.buckets);
    return { price: p, profit, bucket: bk ? bucketLabel(bk) : null, orders: bk?.orders ?? null, monthly: monthly(profit, bk), position: zonePosition(p, zone) };
  };
  const cheapestPrice = demand.buckets[0].hi ?? demand.buckets[0].lo;

  // views → clicks → orders "as seen now": the listing's own last-30-day numbers (or a typical look-alike) as the baseline
  const baseline = baselineFor(product, demand.buckets, price ?? recAll.price ?? recAll.hold ?? Math.round(now.priceWithTargetMargin));
  const funnel = (p, inp) => (p == null ? null : funnelAt({ product, buckets: demand.buckets, baseline, price: p, inputs: inp }));

  return {
    valid: true, product, cat, band, demand, zone, buckets, cheapest, maxOrders,
    base, inputs, allFixed, now, best, baseCalc,
    price, priceProfit: price != null ? contributionAt(inputs, price) : null,
    pricePosition: zonePosition(price, zone),
    sheet: costSheet(inputs), sheetBase: costSheet({ ...base, price: undefined }), sheetBest: costSheet(allFixed),
    fixes, fixesApplied: applied, allApplied: allIds.every((id) => applied.includes(id)), focusPrice,
    recNow, recAll,
    targetMargin: base.targetMargin,
    scenarios: {
      today: scenario(price, inputs),
      suggested: scenario(recAll.price, allFixed),
      suggestedNoFix: scenario(recAll.price, { ...base, price: undefined }),
      cheapest: scenario(cheapestPrice, inputs),
    },
    baseline, funnel,
    perRupee: now.floorPerRupeeOfShipmentCost,
    usingOwnData: product.own != null && (product.orders ?? 0) >= 30,
    ordersSoFar: product.orders ?? 0,
  };
}

/**
 * One plain action for the seller, from the coach view-model and the catalogue status. Language-neutral:
 * the UI turns `kind` into words.
 *   keep         on track: leave the price alone (live listings only move on a Farsh Watch signal)
 *   set          not priced yet: use `target`
 *   change       a price change alone is enough (`dir` = 'lower' | 'raise')
 *   fix_then     lower the cost first (the fixes), then use `target`, which sits where buyers buy
 *   fix_then_above  even after every fix, keeping the margin needs `target`, above where buyers buy
 *   reconsider   no price buyers pay covers the cost, even after the fixes
 */
export function adviceFor(c, status) {
  if (!c?.valid) return { kind: 'invalid' };
  const now = { price: c.price, profit: c.priceProfit, monthly: c.scenarios.today?.monthly ?? null, position: c.pricePosition };
  const at = (price, inputs) => {
    if (price == null) return null;
    const profit = contributionAt(inputs, price), bk = bucketFor(price, c.demand.buckets);
    return { price, profit, monthly: monthly(profit, bk), orders: bk?.orders ?? null, position: zonePosition(price, c.zone) };
  };
  const pending = c.fixes.filter((f) => !f.applied);
  // views / clicks / orders / total profit now vs at a target price (the target is measured with the given inputs)
  const moveTo = (target, inputs) => (target == null ? null : compareMove({
    product: c.product, buckets: c.demand.buckets, nowPrice: c.price, nowInputs: c.inputs, toPrice: target, toInputs: inputs,
  }));
  if (status === 'skip' || c.recAll.kind === 'reconsider') return { kind: 'reconsider', now, pending };
  if (status === 'healthy') return { kind: 'keep', now, pending, move: null };
  if (c.recNow.kind === 'in_zone' || c.recNow.kind === 'below_zone') {
    const target = c.recNow.price;
    const after = at(target, c.inputs);
    if (c.price == null) return { kind: 'set', target, now, after, pending, move: moveTo(target, c.inputs) };
    if (Math.abs(target - c.price) <= 1) return { kind: 'keep', now, pending };
    return { kind: 'change', dir: target < c.price ? 'lower' : 'raise', target, now, after, pending, move: moveTo(target, c.inputs) };
  }
  if (c.recNow.kind === 'fix_cost_first') {
    if (c.recAll.price != null) return { kind: 'fix_then', target: c.recAll.price, now, after: at(c.recAll.price, c.allFixed), pending, move: moveTo(c.recAll.price, c.allFixed) };
    const hold = c.recAll.hold ?? Math.round(c.best.priceWithTargetMargin);
    return { kind: 'fix_then_above', target: hold, now, after: at(hold, c.allFixed), pending, move: moveTo(hold, c.allFixed) };
  }
  return { kind: 'keep', now, pending };
}

/**
 * The whole catalogue in one line for the Dashboard: views, clicks, orders and TOTAL profit a month as they are now,
 * and if the seller follows Farsh's price advice on every product that has one. Estimates from simulated group data.
 * Drafts use a typical similar product at their price, live listings use their own last 30 days.
 * Products with no price, or "reconsider", stay as they are.
 */
export function portfolioImpact(items) {
  const now = [], after = [];
  let moved = 0;
  for (const p of items) {
    if (p.listedPrice == null) continue;
    const c = buildCoach(p, { status: p.a.status });
    if (!c.valid) continue;
    const f0 = c.funnel(c.price, c.inputs);
    if (!f0) continue;
    const ad = adviceFor(c, p.a.status);
    const f1 = ad.move?.after ?? f0;
    if (ad.move?.after) moved += 1;
    now.push(f0); after.push(f1);
  }
  return { now: sumFunnels(now), after: sumFunnels(after), count: now.length, moved };
}
