import { inr } from '../../lib/format.js';

const COLORS = ['#0e6b7d', '#b86400', '#137a5c', '#8a2a7a', '#5f5463', '#c72b42'];
const DASHES = ['', '7 4', '2 3', '9 3 2 3', '4 3', '1 4'];
export const seriesStyle = (i) => ({ color: COLORS[i % COLORS.length], dash: DASHES[i % DASHES.length] });

/**
 * Prices over time on one simple line chart: the seller's price (thick), her no-loss price (red, dashed) and each
 * competitor she follows (thin, each with its own dash pattern and a label at the end, so meaning never depends on
 * colour alone). A listing with one data point (added today) is drawn as a dot. Always paired with a table.
 *
 * series: [{ id, label, values: number[] (aligned to the END of `labels`), kind: 'you' | 'floor' | 'comp', index }]
 */
export function PriceTrendChart({ labels, series, t, title }) {
  const W = 680, H = 280, L = 52, R = 112, T = 16, B = 34;
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  if (!all.length) return null;
  const lo0 = Math.min(...all), hi0 = Math.max(...all), pad = Math.max(8, (hi0 - lo0) * 0.12);
  const lo = Math.floor((lo0 - pad) / 10) * 10, hi = Math.ceil((hi0 + pad) / 10) * 10;
  const n = labels.length;
  const X = (i) => L + (i / (n - 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((k) => Math.round(lo + ((hi - lo) * k) / 3));
  const place = (s) => s.values.map((v, j) => [n - s.values.length + j, v]);
  // labels at the end of each line, nudged apart so they never overlap
  const ends = series.map((s) => ({ s, y: Y(s.values[s.values.length - 1]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  const endY = new Map(ends.map((e) => [e.s.id, e.y]));
  const summary = series.map((s) => `${s.label} ${inr(s.values[s.values.length - 1])}`).join(', ');
  return (
    <figure className="trend" data-testid="trend-chart">
      {title && <figcaption className="trend-title">{title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title ?? ''} ${summary}`} className="trend-svg">
        {ticks.map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="trend-grid" /><text x={L - 8} y={Y(v) + 4} textAnchor="end" className="trend-tick">₹{v}</text></g>
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => <text key={i} x={X(i)} y={H - 10} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="trend-tick">{labels[i]}</text>)}
        {series.map((s) => {
          const pts = place(s).filter(([, v]) => v != null);
          const st = s.kind === 'you' ? { color: 'var(--plum-800)', dash: '', w: 3.6 } : s.kind === 'floor' ? { color: 'var(--red)', dash: '8 5', w: 2.2 } : { ...seriesStyle(s.index ?? 0), w: 2.2 };
          const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
          const [li, lv] = pts[pts.length - 1];
          return (
            <g key={s.id}>
              {pts.length > 1 && <path d={d} fill="none" stroke={st.color} strokeWidth={st.w} strokeDasharray={st.dash} strokeLinecap="round" strokeLinejoin="round" />}
              <circle cx={X(li)} cy={Y(lv)} r={pts.length > 1 ? 3.6 : 5} fill={st.color} />
              <text x={W - R + 8} y={endY.get(s.id) + 4} className="trend-end" fill={st.color}>{s.short ?? s.label} {inr(lv)}</text>
            </g>
          );
        })}
      </svg>
      <ul className="trend-legend">
        {series.map((s) => {
          const st = s.kind === 'you' ? { color: 'var(--plum-800)', dash: '' } : s.kind === 'floor' ? { color: 'var(--red)', dash: '8 5' } : seriesStyle(s.index ?? 0);
          return (
            <li key={s.id}>
              <svg width="30" height="10" aria-hidden><line x1="1" x2="29" y1="5" y2="5" stroke={st.color} strokeWidth={s.kind === 'you' ? 3.6 : 2.2} strokeDasharray={st.dash} strokeLinecap="round" /></svg>
              <span>{s.label} · <b className="num">{inr(s.values[s.values.length - 1])}</b></span>
            </li>
          );
        })}
      </ul>
      <details className="trend-table">
        <summary>{t('chart.table')}</summary>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>{t('chart.week')}</th>{series.map((s) => <th key={s.id} className="r">{s.short ?? s.label}</th>)}</tr></thead>
            <tbody>
              {labels.map((lab, i) => (
                <tr key={lab + i}><td>{lab}</td>{series.map((s) => { const v = s.values[i - (n - s.values.length)]; return <td key={s.id} className="r num">{v != null && i >= n - s.values.length ? inr(v) : '—'}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
