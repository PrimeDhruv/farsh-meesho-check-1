/** Small inline trend line for a metric's mock weekly history. Never the only cue: pair with a ₹/± value. */
export function Sparkline({ values, width = 140, height = 34, tone = 'plum', unit = '' }) {
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if (pts.length < 2) return <span className="small muted">Not enough data</span>;
  const xs = pts.map(([i]) => i), ys = pts.map(([, v]) => v);
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = 4;
  const X = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const Y = (v) => height - pad - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (height - pad * 2);
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const [li, lv] = pts[pts.length - 1];
  const colors = { plum: 'var(--plum-700)', green: 'var(--green)', red: 'var(--red)', amber: '#b8770a', teal: 'var(--teal)' };
  const stroke = colors[tone] || colors.plum;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={`Trend from ${ys[0].toFixed(1)}${unit} to ${lv.toFixed(1)}${unit}`}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={X(li)} cy={Y(lv)} r="3" fill={stroke} />
    </svg>
  );
}
