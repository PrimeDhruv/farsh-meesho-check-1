import { curvePoints } from '../../engine/ads.js';
import { inr } from '../../lib/format.js';

const W = 680, H = 270, L = 62, R = 16, T = 18, B = 40;

/** Nice round tick step for a range (₹50, 100, 250, 500, 1,000 …). */
function step(span, n) {
  const raw = span / n, p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
}
const short = (v) => (Math.abs(v) >= 1000 ? `₹${(v / 1000).toFixed(Math.abs(v) % 1000 ? 1 : 0)}k` : inr(v));

/**
 * Extra profit a month (after paying for the ads) at every monthly ads budget. The sweet-spot range is shaded green,
 * "too much" amber and "losing money" red, so the zones read without the colours too: each one is labelled.
 */
export function AdsCurveChart({ curve, spend, t }) {
  const pts = curvePoints(curve, 80);
  const xMax = curve.maxSpend;
  const gains = pts.map((p) => p.gain);
  const yTop = Math.max(...gains, 1) * 1.18;
  const yBot = Math.min(0, Math.max(Math.min(...gains), -yTop * 0.9)) * 1.1 || -yTop * 0.12;
  const X = (s) => L + (s / xMax) * (W - L - R);
  const Y = (g) => T + ((yTop - Math.max(yBot, g)) / (yTop - yBot)) * (H - T - B);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.spend).toFixed(1)} ${Y(p.gain).toFixed(1)}`).join(' ');
  const xs = step(xMax, 5), ys = step(yTop - yBot, 4);
  const xTicks = []; for (let v = 0; v <= xMax + 1; v += xs) xTicks.push(v);
  const yTicks = []; for (let v = Math.ceil(yBot / ys) * ys; v <= yTop; v += ys) yTicks.push(v);
  const sw = curve.sweet, be = curve.breakEven;
  const zone = (a, b, cls, label) => (b > a ? (
    <g key={cls}>
      <rect x={X(a)} y={T} width={X(b) - X(a)} height={H - T - B} className={`ac-zone ${cls}`} />
      {X(b) - X(a) > 56 && <text x={(X(a) + X(b)) / 2} y={T + 14} textAnchor="middle" className={`ac-zl ${cls}`}>{label}</text>}
    </g>
  ) : null);
  const best = curve.best;
  const cur = curve.at(spend);

  return (
    <figure className="ac" data-testid="ads-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="ac-svg" role="img"
        aria-label={t('ad.chartAria', { lo: inr(sw?.lo ?? 0), hi: inr(sw?.hi ?? 0), best: inr(curve.bestSpend) })}>
        {sw && zone(0, sw.lo, 'low', t('ad.z.low'))}
        {sw && zone(sw.lo, sw.hi, 'sweet', t('ad.z.sweet'))}
        {sw && zone(sw.hi, Math.min(be, xMax), 'high', t('ad.z.high'))}
        {zone(be ?? 0, xMax, 'loss', t('ad.z.loss'))}
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className={v === 0 ? 'ac-zero' : 'trend-grid'} />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end" className="trend-tick">{short(v)}</text>
          </g>
        ))}
        {xTicks.map((v) => <text key={`x${v}`} x={X(v)} y={H - B + 18} textAnchor="middle" className="trend-tick">{short(v)}</text>)}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="ac-axis">{t('ad.xAxis')}</text>
        <text x={14} y={(T + H - B) / 2} textAnchor="middle" className="ac-axis" transform={`rotate(-90 14 ${(T + H - B) / 2})`}>{t('ad.yAxis')}</text>
        <path d={d} className="ac-line" />
        {curve.pays && (
          <g>
            <circle cx={X(curve.bestSpend)} cy={Y(best.gain)} r="6" className="ac-best" />
            <text x={X(curve.bestSpend)} y={Y(best.gain) + 22} textAnchor="middle" className="ac-best-l">{t('ad.bestPt', { amt: inr(Math.round(curve.bestSpend / 50) * 50) })}</text>
          </g>
        )}
        <line x1={X(spend)} x2={X(spend)} y1={T} y2={H - B} className="ac-you" />
        <circle cx={X(spend)} cy={Y(cur.gain)} r="5" className="ac-you-dot" />
      </svg>
    </figure>
  );
}
