/**
 * LAUNCH IDEAS — what to launch next, when, and what it could sell.  (Oct 2026 addition)
 * Pure, UI-free. Works on data/launch.js (buyer searches, seasons, top sellers) and the same price ranges and
 * profit maths as Price Coach, so an idea's price and profit line up with the rest of Farsh.
 *
 * EXPECTED SALES for a new listing, a month, in the idea's price range:
 *   typical   orders a typical similar listing gets in that price range (demandBuckets.js)
 *   gap       how much buyer demand there is per listing for THIS keyword set, against the group's average:
 *             (searches ÷ listings) ÷ group average, kept between 0.5× and 2.5×
 *   season    that month's demand index ÷ 100
 *   expected  = typical × gap × season, shown as a range (60% – 140%), because a new listing's first months vary
 *
 * PRICE: the same rule as Price Coach's price ladder — the lowest price in the range that earns the target profit
 * per order, else the top of the range (then the idea is flagged as low profit).
 *
 * TIMING: peak months are the months whose demand index is at least 110. List about a month before a peak starts so
 * the listing has time to collect its first orders and reviews; stay stocked through the peak; clear leftover stock
 * as the peak ends (never below the no-loss price).
 */
import { calculate, contributionAt } from './calculator.js';
import { typicalOrders, bucketLabel, top } from './demand.js';
import { toCalcInputs } from './model.js';
import { demandFor } from '../data/demandBuckets.js';
import { CATEGORIES } from '../data/categories.js';
import { IDEAS, SEASON, EVENTS, TOP_SELLERS, PACKAGING, MONTHS } from '../data/launch.js';

export const PEAK = 110;
const LEAD = 1;                  // months to list before a peak
const r10 = (n) => Math.round(n / 10) * 10;
const r50 = (n) => Math.round(n / 50) * 50 + 0;

/** Contiguous runs of peak months (wrapping Dec → Jan). Falls back to the two best months if nothing reaches PEAK. */
export function peakRuns(index) {
  let peak = index.map((v) => v >= PEAK);
  if (!peak.some(Boolean)) {
    const best = [...index.keys()].sort((a, b) => index[b] - index[a]).slice(0, 2);
    peak = index.map((_, i) => best.includes(i));
  }
  if (peak.every(Boolean)) return [{ start: 0, len: 12, months: [...Array(12).keys()] }];
  const first = peak.findIndex((v) => !v);           // start scanning after a quiet month so runs don't split at Dec/Jan
  const runs = [];
  let cur = null;
  for (let k = 1; k <= 12; k++) {
    const m = (first + k) % 12;
    if (peak[m]) { if (!cur) cur = { start: m, len: 0, months: [] }; cur.len += 1; cur.months.push(m); }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/** Which buying moments a run covers (the group's own events first). */
function eventsFor(run, preferred) {
  const hit = (e) => e.months.some((m) => run.months.includes(m));
  const own = EVENTS.filter((e) => preferred?.includes(e.id) && hit(e));
  const list = own.length ? own : EVENTS.filter(hit);
  return [...new Set(list.map((e) => e.label))];
}

/**
 * When to launch, from a 12-month index and today's date.
 * status: 'now'   the peak is on with at least 1.5 months left, or the next peak starts within 1.5 months
 *         'late'  a peak is on but ends within 1.5 months: too late for a new listing to ride it, plan the next one
 *         'plan'  the next peak starts in 1.5–4.5 months
 *         'later' further away
 * For 'late', `run` is the NEXT peak and `current` the one that is ending.
 */
export function timing(index, today = new Date(), preferredEvents) {
  const pos = today.getMonth() + (today.getDate() - 1) / 31;
  const m = today.getMonth();
  const runs = peakRuns(index);
  const info = (run, status, extra = {}) => {
    const end = (run.start + run.len - 1) % 12;
    const listBy = (run.start - LEAD + 12) % 12;
    return {
      status, run, events: eventsFor(run, preferredEvents),
      start: run.start, end, len: run.len,
      startLabel: MONTHS[run.start], endLabel: MONTHS[end],
      listBy: status === 'now' ? null : listBy,
      listByLabel: status === 'now' ? null : MONTHS[listBy],
      clearBy: MONTHS[(end + 1) % 12],
      ...extra,
    };
  };
  let current = null;
  for (const run of runs) {
    if (run.months.includes(m)) {
      const left = (run.start + run.len - pos + 12) % 12 || 12;
      if (left >= LEAD + 0.5) return info(run, 'now', { monthsLeft: Math.round(left), sellFor: Math.round(left), inPeak: true });
      current = { ...run, endLabel: MONTHS[(run.start + run.len - 1) % 12], events: eventsFor(run, preferredEvents), weeksLeft: Math.max(1, Math.round(left * 4.3)) };
    }
  }
  const upcoming = runs.filter((run) => !current || run.start !== current.start)
    .map((run) => ({ run, away: (run.start - pos + 12) % 12 })).sort((a, b) => a.away - b.away)[0];
  if (!upcoming) return info(current, 'late', { current, monthsAway: 12, sellFor: current.len, inPeak: false });
  const away = upcoming.away;
  const status = current ? 'late' : away <= LEAD + 0.5 ? 'now' : away <= 4.5 ? 'plan' : 'later';
  return info(upcoming.run, status, { current, monthsAway: Math.max(0, Math.round(away)), sellFor: upcoming.run.len, inPeak: false });
}

/** The group's average searches-per-listing across its ideas (the "gap" baseline). */
function groupGap(categoryId) {
  const ideas = IDEAS[categoryId] ?? [];
  return ideas.reduce((s, i) => s + i.searches / i.listings, 0) / Math.max(1, ideas.length);
}

export function competition(idea) {
  const per1000 = idea.listings / (idea.searches / 1000);
  return { per1000, level: per1000 < 3 ? 'low' : per1000 < 6 ? 'medium' : 'high' };
}

/** The Farsh price for a product in a price range: lowest price there that earns the target, else the range top. */
export function priceInBucket(inputs, bucket) {
  const calc = calculate({ ...inputs, price: undefined });
  if (!calc.valid) return null;
  const want = Math.ceil(calc.priceWithTargetMargin), hi = top(bucket);
  return { price: want <= hi ? Math.max(bucket.lo, want) : hi, floor: calc.floor, fits: want <= hi };
}

/**
 * Everything one idea card shows.
 * @param idea        an IDEAS entry
 * @param categoryId  its group
 * @param opts.cost   making cost override (₹); opts.packaging; opts.price override; opts.today
 */
export function evaluateIdea(idea, categoryId, opts = {}) {
  const cat = CATEGORIES[categoryId];
  const buckets = demandFor(categoryId).buckets;
  const bucket = buckets[Math.min(idea.bucket, buckets.length - 1)];
  const cost = opts.cost ?? idea.cost, packaging = opts.packaging ?? PACKAGING[categoryId] ?? 12;
  const inputs = toCalcInputs({ categoryId, cost, packaging, listedPrice: null });
  const pr = priceInBucket(inputs, bucket);
  const price = opts.price ?? pr?.price ?? null;
  const index = idea.season ?? SEASON[categoryId].index;
  const when = timing(index, opts.today, SEASON[categoryId].events);

  // the month the listing sells in first: this month if it's on now, else the first peak month
  const sellMonth = when.status === 'now' && when.inPeak ? (opts.today ?? new Date()).getMonth() : when.start;
  const seasonF = index[sellMonth] / 100;
  const gap = Math.min(2.5, Math.max(0.5, (idea.searches / idea.listings) / groupGap(categoryId)));
  const base = typicalOrders(bucket) * gap * seasonF;
  const orders = [Math.max(1, Math.round(base * 0.6)), Math.max(2, Math.round(base * 1.4))];
  const profit = price != null ? contributionAt(inputs, price) : null;
  const monthlyProfit = profit == null ? null : [r50(profit * orders[0]), r50(profit * orders[1])];
  const revenue = price == null ? null : [r50(price * orders[0]), r50(price * orders[1])];
  const comp = competition(idea);
  const verdict = profit == null ? 'none' : profit < 0 ? 'loss' : profit < inputs.targetMargin - 0.5 ? 'thin' : 'good';
  const weight = { now: 1, plan: 0.85, late: 0.7, later: 0.6 }[when.status];
  const mid = monthlyProfit ? (monthlyProfit[0] + monthlyProfit[1]) / 2 : 0;

  return {
    idea, categoryId, cat, group: cat.group,
    keywords: [...idea.kw, bucketLabel(bucket)],
    title: `${idea.kw[0]} ${idea.kw[1].toLowerCase()} · ${idea.kw[2].toLowerCase()} · ${idea.kw[3].toLowerCase()}`,
    phrase: `${idea.kw[0]} ${idea.kw[2]} ${idea.kw[1]} ${idea.kw[3]}`.toLowerCase(),
    searches: idea.searches, searchesNow: r10(idea.searches * (index[(opts.today ?? new Date()).getMonth()] / 100)),
    growth: idea.growth, listings: idea.listings, comp,
    bucket, priceLabel: bucketLabel(bucket), price, floor: pr?.floor ?? null, fitsTarget: pr?.fits ?? false,
    cost, packaging, inputs, profit, verdict,
    orders, revenue, monthlyProfit, gap, seasonF, sellMonth,
    index, when,
    score: mid * weight * (1 + Math.max(-0.3, idea.growth) * 0.5),
    why: idea.why,
  };
}

/** All ideas for a group, evaluated. */
export function ideasFor(categoryId, opts = {}) {
  return (IDEAS[categoryId] ?? []).map((i) => evaluateIdea(i, categoryId, opts));
}

export const SORTS = {
  best: (a, b) => b.score - a.score,
  demand: (a, b) => b.searches - a.searches,
  growth: (a, b) => b.growth - a.growth,
  gap: (a, b) => a.comp.per1000 - b.comp.per1000,
};

/** Price-range filter: below the busy range · the busy range · above it (positions 0–6, busiest = 3). */
export const PRICE_BANDS = { low: [0, 1, 2], mid: [3], high: [4, 5, 6] };

/** Top sellers for a group with revenue a month and how their orders moved over 8 weeks. */
export function topSellersFor(categoryId) {
  const ideas = Object.fromEntries((IDEAS[categoryId] ?? []).map((i) => [i.id, i]));
  return (TOP_SELLERS[categoryId] ?? []).map((s, rank) => {
    const idea = ideas[s.idea];
    const first = s.trend[0], last = s.trend[s.trend.length - 1];
    return {
      ...s, rank: rank + 1, categoryId, idea,
      name: idea ? `${idea.kw[0]} ${idea.kw[1].toLowerCase()} — ${idea.kw[2].toLowerCase()}, ${idea.kw[3].toLowerCase()}` : s.id,
      keywords: idea ? idea.kw : [],
      revenueMonth: s.price * s.ordersMonth,
      trendPct: first ? (last - first) / first : 0,
    };
  }).sort((a, b) => b.revenueMonth - a.revenueMonth).map((s, i) => ({ ...s, rank: i + 1 }));
}

/** Season planner rows: one per group, with its peaks and what to do this month. */
export function seasonPlan(categoryIds, today = new Date()) {
  return categoryIds.map((id) => {
    const s = SEASON[id];
    return { categoryId: id, cat: CATEGORIES[id], index: s.index, runs: peakRuns(s.index), when: timing(s.index, today, s.events) };
  });
}
