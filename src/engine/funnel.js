/**
 * FUNNEL — views → clicks → orders, per price range.  (Oct 2026 upgrade; engine module M3b)
 * Pure, UI-free. Works on the simulated price buckets from data/demandBuckets.js, which carry for a typical
 * look-alike listing, per 30 days:  views, clicks (views × ctr) and orders (views × opv, opv = orders per view).
 *
 * WHY THIS EXISTS. A Meesho seller watches views and clicks first, and it is a volume game: more people who see
 * and click the listing means more orders, and total profit (profit per order × orders) is what matters, not profit
 * per order alone. So Farsh answers "what happens to my views, clicks and orders if I move my price?".
 *
 * HOW A PRICE MOVE IS ESTIMATED ("as seen now"). The baseline is what the listing gets TODAY (its own last 30 days,
 * when it is live) or, for a product with no sales yet, what a typical look-alike gets at its price. Moving to a
 * different price range scales the baseline by how that range compares with the current one:
 *
 *      views  = baseline views  × (typical views in the new range ÷ typical views in the current range)
 *      ctr    = baseline ctr    × (new range ctr ÷ current range ctr)          clicks = views × ctr
 *      opv    = baseline opv    × (new range opv ÷ current range opv)          orders = views × opv
 *
 * So a price that sits where more buyers look and buy raises views, the click rate AND orders per view; a price
 * above the busy range does the opposite. These are estimates from simulated group data, never a promise, and the
 * floor always comes first: a price below the no-loss price is flagged as a loss however many views it would bring.
 */
import { typicalOrders, bucketFor, bucketLabel, top } from './demand.js';
import { contributionAt } from './calculator.js';

const mid = (r) => (r[0] + r[1]) / 2;
export const typicalViews = (b) => mid(b.views);
export const typicalClicks = (b) => mid(b.clicks);

/** Round for display: views to 10 (50 above 1,000), clicks to 5 (1 below 20), orders to 1, ₹ to 50. */
export const roundViews = (n) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);
export const roundClicks = (n) => (n >= 20 ? Math.round(n / 5) * 5 : Math.round(n));
export const roundOrders = (n) => Math.round(n);
const round50 = (n) => Math.round(n / 50) * 50 + 0; // + 0 turns −0 into 0

/** The bucket a price falls in; below the cheapest bucket it is treated as the cheapest bucket. */
export function bucketNear(price, buckets) {
  if (price == null || !buckets.length) return null;
  const hit = bucketFor(price, buckets);
  if (hit) return hit;
  return price < buckets[0].lo ? buckets[0] : null;
}

/**
 * What the listing gets today. `yours` = its own last-30-day stats from the supplier panel (simulated here);
 * `typical` = a typical look-alike at its price (used until it has stats of its own); null = no price yet.
 */
export function baselineFor(product, buckets, price) {
  const s = product?.last30;
  // her own stats belong to the price they were seen at (atPrice), even if she has since typed a new price
  const bucket = bucketNear(s?.atPrice ?? price, buckets);
  if (!bucket) return null;
  if (s && s.views > 0) {
    return { views: s.views, clicks: s.clicks, orders: s.orders, ctr: s.clicks / s.views, opv: s.orders / s.views, bucket, source: 'yours' };
  }
  return { views: typicalViews(bucket), clicks: typicalClicks(bucket), orders: typicalOrders(bucket), ctr: bucket.ctr, opv: bucket.opv, bucket, source: 'typical' };
}

/** Views, clicks and orders the baseline would become in another price range. */
export function projectTo(baseline, toBucket) {
  if (!toBucket) return null;
  if (!baseline) {
    return { views: typicalViews(toBucket), clicks: typicalClicks(toBucket), orders: typicalOrders(toBucket), ctr: toBucket.ctr, opv: toBucket.opv, source: 'typical' };
  }
  const from = baseline.bucket;
  const views = baseline.views * (typicalViews(toBucket) / typicalViews(from));
  const ctr = baseline.ctr * (toBucket.ctr / from.ctr);
  const opv = baseline.opv * (toBucket.opv / from.opv);
  return { views, clicks: views * ctr, orders: views * opv, ctr, opv, source: baseline.source };
}

/**
 * One price, fully worked: the range it falls in, views / clicks / orders a month, orders per 100 views, profit per
 * shipped order and TOTAL profit a month (profit per order × orders — the number that matters in a volume game).
 */
export function funnelAt({ product, buckets, baseline, price, inputs }) {
  const bucket = bucketNear(price, buckets);
  if (price == null || !bucket) return null;
  const p = projectTo(baseline, bucket);
  const views = roundViews(p.views), clicks = roundClicks(p.clicks), orders = roundOrders(p.orders);
  const profit = inputs ? contributionAt(inputs, price) : null;
  return {
    price, bucket, label: bucketLabel(bucket), source: p.source,
    views, clicks, orders,
    ctr: p.ctr, opv: p.opv,
    ctrPct: p.ctr * 100, opv100: p.opv * 100,           // clicks per 100 views, orders per 100 views
    profit, monthlyProfit: profit == null ? null : round50(profit * p.orders),
  };
}

/** Today vs a new price: the change in views, clicks, orders, orders per 100 views and total profit a month. */
export function compareMove({ product, buckets, nowPrice, nowInputs, toPrice, toInputs }) {
  const baseline = baselineFor(product, buckets, nowPrice ?? toPrice);
  const now = nowPrice != null ? funnelAt({ product, buckets, baseline, price: nowPrice, inputs: nowInputs }) : null;
  const after = funnelAt({ product, buckets, baseline, price: toPrice, inputs: toInputs });
  if (!after) return null;
  // When the seller is live, "now" is her own numbers exactly (not the rounded projection onto her own bucket).
  const base = now ?? null;
  const delta = base ? {
    views: after.views - base.views, clicks: after.clicks - base.clicks, orders: after.orders - base.orders,
    opv100: after.opv100 - base.opv100, ctrPct: after.ctrPct - base.ctrPct,
    viewsPct: base.views ? (after.views - base.views) / base.views : null,
    monthlyProfit: after.monthlyProfit != null && base.monthlyProfit != null ? after.monthlyProfit - base.monthlyProfit : null,
  } : null;
  return { baseline, now: base, after, delta, belowFloor: after.profit != null && after.profit < 0 };
}

/**
 * The price ladder: for each price range, the best price the seller could ask there and what it would bring.
 * "Best" = the lowest price in the range that still earns the target profit; if the range tops out below that, the
 * top of the range (so the loss is shown at its least bad). Verdicts:
 *   loss  the price is under the no-loss price: every order shipped loses money
 *   thin  above the no-loss price but under the target profit
 *   safe  earns the target profit
 */
export function priceLadder({ product, buckets, inputs, floor, floorPlusMargin, target, nowPrice, suggested }) {
  const baseline = baselineFor(product, buckets, nowPrice ?? suggested ?? Math.round(floorPlusMargin));
  const rows = buckets.map((b) => {
    const hi = top(b);
    const want = Math.ceil(floorPlusMargin);
    const price = want <= hi ? Math.max(b.lo, want) : hi;
    const f = funnelAt({ product, buckets, baseline, price, inputs });
    const verdict = f.profit < 0 || price < floor ? 'loss' : f.profit < target - 0.5 ? 'thin' : 'safe';
    return { ...f, lo: b.lo, hi: b.hi, verdict, isNow: nowPrice != null && bucketNear(nowPrice, buckets) === b, isSuggested: suggested != null && bucketNear(suggested, buckets) === b };
  });
  const earners = rows.filter((r) => r.verdict !== 'loss' && r.monthlyProfit != null && r.monthlyProfit > 0);
  const best = earners.length ? earners.reduce((a, b) => (b.monthlyProfit > a.monthlyProfit ? b : a)) : null;
  return { baseline, rows: rows.map((r) => ({ ...r, mostProfit: best === r })), best };
}

/** Portfolio roll-up for the Dashboard: views, clicks, orders and total profit a month, now vs if the advice is followed. */
export function sumFunnels(list) {
  const add = (k) => list.reduce((s, x) => s + (x[k] ?? 0), 0);
  return { views: add('views'), clicks: add('clicks'), orders: add('orders'), monthlyProfit: add('monthlyProfit') };
}
