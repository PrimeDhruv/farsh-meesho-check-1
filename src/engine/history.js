/**
 * WEEKLY FLOOR — the no-loss price is not fixed: shipping, failed deliveries and returns change week to week, and
 * so does the floor. Pure, UI-free.
 *
 * Meesho's order history is not in this prototype, so the earlier weeks are SIMULATED: small, fixed drifts in the
 * failed-delivery rate, the return rate and the delivery charge, applied to the product's real inputs. The LAST
 * week is always the real current floor (zero drift), so the trend ends exactly on the number shown everywhere else.
 * Only products with enough orders of their own (30+) get a trend; others use category averages that do not move.
 * "Check it weekly" is Farsh's suggestion, not a Meesho rule.
 */
import { calculate } from './calculator.js';
import { costSheet } from './coach.js';

/** [failed-delivery rate, return rate, delivery ₹] above this week's values, for the 7 weeks before it (oldest first). */
export const WEEKLY_DRIFT = [
  [0.020, 0.015, 4], [0.012, 0.020, 4], [0.015, 0.010, 4], [0.008, 0.012, 0], [0.004, 0.006, 0], [0.006, 0.002, 0], [0.002, 0.003, 0],
];
export const MIN_ORDERS_FOR_TREND = 30;

const DAY = 86400000;
export const weekLabel = (date) => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** The shared driver of a floor change between two weeks, from the cost-sheet lines. null when nothing moved by ₹1. */
export function floorChangeReason(before, after) {
  const d = {
    shipping: (after.raw.shipping + after.raw.again) - (before.raw.shipping + before.raw.again),
    returns: after.raw.returns - before.raw.returns,
    rto: after.raw.rto - before.raw.rto,
  };
  const key = Object.keys(d).reduce((a, b) => (Math.abs(d[b]) > Math.abs(d[a]) ? b : a));
  return Math.abs(d[key]) >= 1 ? { key, amount: d[key] } : null;
}

export function floorHistory(inputs, product, today = new Date()) {
  const eligible = product?.status === 'live' && (product.orders ?? 0) >= MIN_ORDERS_FOR_TREND;
  const now = calculate({ ...inputs, price: undefined });
  if (!now.valid) return { valid: false };
  const base = { eligible, floor: now.floor, updated: today };
  if (!eligible) return { valid: true, ...base, weeks: [] };
  const weeks = [];
  const sheets = [];
  for (let w = 0; w < 8; w++) {
    const [dr, dq, ds] = w === 7 ? [0, 0, 0] : WEEKLY_DRIFT[w];
    const inp = { ...inputs, price: undefined, rtoRate: inputs.rtoRate + dr, returnRate: inputs.returnRate + dq, shippingCost: inputs.shippingCost + ds };
    const c = calculate(inp);
    const floor = c.valid ? c.floor : null;
    weeks.push({ week: w, label: weekLabel(new Date(today.getTime() - (7 - w) * 7 * DAY)), floor });
    sheets.push(c.valid ? costSheet(inp) : null);
  }
  const prev = weeks[6].floor, cur = weeks[7].floor;
  const change = prev != null && cur != null ? cur - prev : null;
  const reason = sheets[6] && sheets[7] ? floorChangeReason(sheets[6], sheets[7]) : null;
  const first = weeks[0].floor;
  const periodReason = sheets[0] && sheets[7] ? floorChangeReason(sheets[0], sheets[7]) : null;
  return { valid: true, ...base, weeks, change, reason, periodReason, sinceStart: first != null ? cur - first : null };
}
