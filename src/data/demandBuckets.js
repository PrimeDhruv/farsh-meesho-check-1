import { CATEGORIES } from './categories.js';

/**
 * DEMAND BY PRICE — SIMULATED. For each product group Meesho would supply, per price bucket, how many look-alike
 * listings sit there and how many orders a typical one got in the last 30 days, shown ONLY as a range (the middle
 * half of listings, rounded) and only for buckets with enough listings. Never one competitor's numbers.
 *
 * The A-line kurti group is the deck's illustrative example (Round 2, slide 6), reproduced exactly:
 *   ₹279–299 · 5 listings · 0–10 orders   … ₹360–389 · 25 listings · 40–100 orders … ₹450+ · 12 listings · 0–15
 * Every other group is generated around its own simulated price band with the same shape and a per-group volume
 * factor. None of this is live Meesho data.
 */

/**
 * VIEWS AND CLICKS (added Oct 2026 — SIMULATED). Sellers watch views and clicks first, and orders follow, so each
 * price range also carries a simple funnel for a typical look-alike listing in the last 30 days:
 *
 *      views  →  clicks (click rate, ctr)  →  orders (orders per 100 views, opv)
 *
 * The deck's ORDER ranges stay exactly as published. Views are worked back from them (views = orders ÷ opv) and
 * clicks = views × ctr, so every row reconciles: orders ≈ views × opv. ctr and opv are our assumptions, set so the
 * busy price range has the best click rate and the best orders-per-view, and the cheapest range the weakest
 * (few listings, low ratings). In production these would come from Meesho's group-level impression and order data.
 */
const KURTI_ROWS = [
  { lo: 279, hi: 299, listings: 5,  orders: [0, 10],   rating: 3.6, ctr: 0.040, opv: 0.008 },
  { lo: 300, hi: 329, listings: 8,  orders: [5, 20],   rating: 3.8, ctr: 0.050, opv: 0.010 },
  { lo: 330, hi: 359, listings: 20, orders: [30, 80],  rating: 4.1, ctr: 0.070, opv: 0.013 },
  { lo: 360, hi: 389, listings: 25, orders: [40, 100], rating: 4.2, ctr: 0.075, opv: 0.0135 },
  { lo: 390, hi: 419, listings: 15, orders: [20, 60],  rating: 4.2, ctr: 0.060, opv: 0.012 },
  { lo: 420, hi: 449, listings: 15, orders: [10, 30],  rating: 4.0, ctr: 0.045, opv: 0.010 },
  { lo: 450, hi: null, listings: 12, orders: [0, 15],  rating: 3.9, ctr: 0.035, opv: 0.008 },
];

const r50 = (n) => Math.round(n / 50) * 50;
const r5v = (n) => Math.round(n / 5) * 5;
/** Fill in views and clicks ranges from a row's orders, orders-per-view and click rate. */
function withFunnel(row) {
  const views = [r50(row.orders[0] / row.opv), r50(row.orders[1] / row.opv)];
  const clicks = [r5v(views[0] * row.ctr), r5v(views[1] * row.ctr)];
  return { ...row, views, clicks };
}

const KURTI = KURTI_ROWS.map(withFunnel);

/** The deck's shape, by position relative to the busiest bucket (−3 … +3). */
const SHAPE = KURTI_ROWS.map(({ listings, orders, rating, ctr, opv }) => ({ listings, orders, rating, ctr, opv }));

/** Per-group order volume vs the kurti example (invented, so groups don't all look identical). */
const VOLUME = { kurtaset: 0.6, bottoms: 0.9, leggings: 1.4, dupatta: 1.2, footwear: 1.0, home: 0.6, bags: 0.7 };

const r5 = (n) => Math.round(n / 5) * 5;
const f5 = (n) => Math.floor(n / 5) * 5;

function generated(cat) {
  const m = cat.band.median;
  const w = Math.max(10, r5(m * 0.08));          // bucket width ≈ 8% of the group median (kurti: ₹30)
  const busiestStart = f5(m - 0.63 * w);          // the median sits in the upper part of the busiest bucket (kurti: ₹360)
  const v = VOLUME[cat.id] ?? 1;
  return SHAPE.map((s, i) => {
    const lo = busiestStart + (i - 3) * w;
    return withFunnel({
      lo, hi: i === SHAPE.length - 1 ? null : lo + w - 1, listings: s.listings,
      orders: [Math.round((s.orders[0] * v) / 5) * 5, Math.max(5, Math.round((s.orders[1] * v) / 5) * 5)],
      rating: s.rating, ctr: s.ctr, opv: s.opv,
    });
  });
}

export function demandFor(categoryId) {
  const cat = CATEGORIES[categoryId];
  return {
    categoryId, group: cat.group,
    buckets: categoryId === 'kurtis' ? KURTI : generated(cat),
    source: categoryId === 'kurtis' ? 'deck' : 'mock',
  };
}
