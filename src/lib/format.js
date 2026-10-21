const n0 = (n) => Math.abs(Math.round(n)).toLocaleString('en-IN');
export const inr = (n) => (n == null ? '—' : `${n < 0 ? '−' : ''}₹${n0(n)}`);
export const inrSigned = (n) => (n == null ? '—' : `${Math.round(n) < 0 ? '−' : '+'}₹${n0(n)}`);
export const pct = (x, d = 0) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`);
/** "₹750–2,000"; a range that is all loss reads "−₹2,450 to −₹1,050". */
export const inrRange = (r) => {
  if (!r) return '—';
  if (r.hi <= 0 && r.lo < 0) return `${inr(r.lo)} … ${inr(r.hi)}`;
  if (r.lo < 0) return `${inr(r.lo)} … ${inr(r.hi)}`;
  return `₹${n0(r.lo)}–${n0(r.hi)}`;
};
export const ordersRange = (o) => (o ? `${o[0]}–${o[1]}` : '—');
/** Counts (views, clicks, orders) in Indian digit grouping: 4,250 · 1,20,000. */
export const num = (n) => (n == null ? '—' : `${Math.round(n) < 0 ? '−' : ''}${n0(n)}`);
export const numSigned = (n) => (n == null ? '—' : `${Math.round(n) < 0 ? '−' : '+'}${n0(n)}`);
/** Orders per 100 views: 1.2, 1.35, 0.7 (value is already per 100). */
export const per100 = (v) => (v == null ? '—' : String(Math.round(v * 100) / 100));
export const pctSigned = (x) => (x == null ? '—' : `${x < 0 ? '−' : '+'}${Math.abs(Math.round(x * 100))}%`);
