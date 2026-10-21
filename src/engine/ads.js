/**
 * ADS PLANNER — how much to spend on ads a month, and at what price.  (Oct 2026 addition)
 * Pure, UI-free. Builds on the funnel (views → clicks → orders) and the calculator (profit per order).
 *
 * WHY. A big share of a supplier's cost is performance marketing inside Meesho. Too little ad spend leaves orders on
 * the table; too much buys clicks that cost more than they earn. Between the two there is a range of monthly budgets
 * that earns the most total profit. Farsh shows that range, what it buys and what it adds to each order's cost.
 *
 * THE MODEL (per listing, per month, at one price p):
 *   E        profit per shipped order at p WITHOUT the ₹ per order ads average Price Coach uses: here ads are the
 *            seller's own monthly budget S instead, so we do not count them twice.
 *   organic  orders the listing gets on its own at p (funnel.js, "as seen now")
 *   cvr      orders per click at p (the listing's own click → order rate at that price)
 *   most     the most extra clicks ads can bring at p = reach × clicks a typical similar listing gets there
 *   cpc      ₹ per click at the start
 *
 *   ad clicks(S) = most × (1 − e^(−S/B)),  B = most × cpc
 *   ad orders(S) = ad clicks × cvr
 *   total profit(S) = (organic + ad orders) × E − S
 *   extra profit(S) = ad orders × E − S = A(1 − e^(−S/B)) − S,  A = most × cvr × E
 *
 *   The first ₹1 of ads brings back  r0 = E × cvr ÷ cpc  of profit. If r0 ≤ 1, ads cannot pay at this price.
 *   Best budget  S* = B × ln(r0)  (where one more ₹ brings back exactly ₹1)
 *   Sweet spot   every budget whose extra profit is at least 80% of the best (ADS.sweetShare)
 *   Break-even   the budget where extra profit falls back to zero: spend beyond it and ads lose money.
 *
 * Every number is an estimate from simulated data, never a promise.
 */
import { calculate, contributionAt } from './calculator.js';
import { funnelAt, typicalClicks } from './funnel.js';
import { top } from './demand.js';
import { ADS } from '../data/ads.js';

const r50 = (n) => Math.round(n / 50) * 50 + 0;

/** Inputs with the per-order ads average taken out (the planner counts ads as a monthly budget instead). */
export const withoutAdsAverage = (inputs) => ({ ...inputs, advertisingCost: 0 });

/** Solve f(x) = 0 on [lo, hi] by bisection (f(lo) and f(hi) have opposite signs). */
function bisect(f, lo, hi, steps = 60) {
  let a = lo, b = hi, fa = f(a);
  for (let i = 0; i < steps; i++) {
    const m = (a + b) / 2, fm = f(m);
    if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

/**
 * The ads curve for one listing at one price.
 * @param product   catalogue product (for its own last-30-day numbers)
 * @param coach     buildCoach(product) view-model (demand buckets, baseline, inputs)
 * @param price     price to plan at
 * @param inputs    calculator inputs (defaults to coach.inputs, i.e. with the fixes applied so far)
 */
export function adsCurve({ product, coach, price, inputs = coach.inputs }) {
  if (price == null) return null;
  const inp = withoutAdsAverage(inputs);
  const f = funnelAt({ product, buckets: coach.demand.buckets, baseline: coach.baseline, price, inputs: inp });
  if (!f) return null;
  const E = contributionAt(inp, price);
  const cpc = ADS.cpc[product.categoryId] ?? ADS.defaultCpc;
  const most = ADS.reach * typicalClicks(f.bucket);
  const cvr = f.ctr > 0 ? f.opv / f.ctr : 0;          // orders per click at this price
  const organic = f.views * f.opv;                      // unrounded organic orders
  const A = most * cvr * E, B = most * cpc;
  const r0 = E > 0 ? (E * cvr) / cpc : 0;
  const pays = r0 > 1;

  const at = (S) => {
    const adClicks = most * (1 - Math.exp(-S / B));
    const adOrders = adClicks * cvr;
    const orders = organic + adOrders;
    const gain = adOrders * E - S;
    return {
      spend: S, perDay: S / 30,
      adClicks, adViews: f.ctr > 0 ? adClicks / f.ctr : 0, adOrders,
      views: f.views + (f.ctr > 0 ? adClicks / f.ctr : 0), clicks: f.clicks + adClicks, orders,
      gain, totalProfit: orders * E - S,
      adCostPerOrder: orders > 0 ? S / orders : 0,
      roas: S > 0 ? (adOrders * price) / S : null,           // ₹ of sales from ads per ₹1 spent
      nextRupee: E > 0 ? (E * cvr * Math.exp(-S / B)) / cpc : 0, // profit the next ₹1 of ads brings back
    };
  };

  const bestSpend = pays ? B * Math.log(r0) : 0;
  const best = at(bestSpend);
  let sweet = null, breakEven = null;
  if (pays && best.gain > 0) {
    const g = (S) => at(S).gain;
    breakEven = bisect(g, bestSpend, B * Math.max(4, r0 + 2) + bestSpend);
    const bar = ADS.sweetShare * best.gain;
    sweet = { lo: bisect((S) => g(S) - bar, 0, bestSpend), hi: bisect((S) => g(S) - bar, bestSpend, breakEven) };
  }
  const maxSpend = Math.max(1000, r50((breakEven ?? B) * 1.35));

  /** No-loss price once each order also carries `S ÷ orders` of ad cost. */
  const floorWith = (S) => {
    const per = at(S).adCostPerOrder;
    const c = calculate({ ...inp, advertisingCost: per, price: undefined });
    return c.valid ? c.floor : null;
  };

  return {
    price, bucket: f.bucket, label: f.label, source: f.source,
    E, cpc, most, cvr, organic, r0, pays, belowFloor: E <= 0,
    none: at(0), best, bestSpend, sweet, breakEven, maxSpend,
    at, floorWith, floorNoAds: calculate({ ...inp, price: undefined }).floor,
  };
}

/** Points along the curve for the chart: extra profit a month at each budget from 0 to maxSpend. */
export function curvePoints(curve, n = 60) {
  if (!curve) return [];
  return Array.from({ length: n + 1 }, (_, i) => {
    const S = (curve.maxSpend * i) / n;
    return { spend: S, gain: curve.at(S).gain };
  });
}

/** Which zone a budget sits in: none · low (too little) · sweet · high (too much, profit falls) · loss. */
export function spendZone(curve, S) {
  if (!curve || !curve.sweet) return S > 0 ? 'loss' : 'none';
  if (S <= 0) return 'none';
  if (S < curve.sweet.lo) return 'low';
  if (S <= curve.sweet.hi) return 'sweet';
  if (S <= curve.breakEven) return 'high';
  return 'loss';
}

/** Rounded budget figures for display (₹50 steps, never shown as a false-precise number). */
export const roundSpend = r50;

/**
 * Price and ads together: for each price range, the price Price Coach would ask there and the best ads budget at that
 * price. The price is the same rule as the price ladder (the lowest price in the range that earns the target profit,
 * else the top of the range), so this table lines up with Price Coach. Returns the rows and the best one.
 */
export function priceAdsPlan({ product, coach, inputs = coach.inputs }) {
  const want = Math.ceil(calculate({ ...inputs, price: undefined }).priceWithTargetMargin);
  const rows = coach.demand.buckets.map((b) => {
    const hi = top(b);
    const price = want <= hi ? Math.max(b.lo, want) : hi;
    const cv = adsCurve({ product, coach, price, inputs });
    const spend = roundSpend(cv.bestSpend);
    const withAds = cv.at(spend);
    return {
      bucket: b, price, curve: cv, spend,
      noAds: cv.none, withAds,
      loss: cv.belowFloor,
    };
  });
  const ok = rows.filter((r) => !r.loss);
  const pick = (key) => (ok.length ? ok.reduce((a, b) => (b[key].totalProfit > a[key].totalProfit ? b : a)) : null);
  const bestNoAds = pick('noAds'), bestWithAds = pick('withAds');
  return { rows, bestNoAds, bestWithAds };
}
