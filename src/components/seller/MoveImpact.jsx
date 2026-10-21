import { TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { inr, inrSigned, num, numSigned, per100, pctSigned } from '../../lib/format.js';

/**
 * Words for a price move: views and clicks first (that is what a Meesho seller watches), then orders per 100 views
 * (how many of the people who see the product order it), then orders. Every number comes from engine/funnel.js.
 * Language-neutral engine, English/Hindi sentences via t().
 */
export function moveHeadline(move, t, price) {
  if (!move) return [];
  const { now, after, delta: d } = move;
  const out = [];
  const p = inr(price ?? after.price);
  if (!d) {
    out.push(t('mv.fresh', { price: p, views: num(after.views), clicks: num(after.clicks), orders: num(after.orders), opv: per100(after.opv100) }));
    return out;
  }
  if (Math.abs(d.views) < 1 && Math.abs(d.clicks) < 1) {
    out.push(t('mv.same', { price: p }));
  } else if (d.views > 0) {
    out.push(t('mv.up1', { price: p, views: num(d.views), clicks: num(Math.max(0, d.clicks)) }));
    if (d.orders > 0) out.push(t('mv.up2', { a: per100(now.opv100), b: per100(after.opv100), orders: num(d.orders) }));
  } else {
    out.push(t('mv.down1', { price: p, views: num(-d.views), clicks: num(Math.max(0, -d.clicks)) }));
    if (d.orders < 0) out.push(t('mv.down2', { orders: num(-d.orders) }));
  }
  if (now.monthlyProfit != null && now.monthlyProfit < 0) out.push(t('mv.loseNow', { amt: inr(-now.monthlyProfit) }));
  if (move.belowFloor) out.push(t('mv.belowFloor', { price: p }));
  return out;
}

function Chip({ d, pct, unit, t }) {
  if (d == null) return null;
  const same = Math.abs(d) < (unit === 'opv' ? 0.005 : 0.5);
  const up = d > 0;
  const Icon = same ? Equal : up ? TrendingUp : TrendingDown;
  const txt = same ? t('mv.sameShort') : unit === 'opv' ? `${d > 0 ? '+' : '−'}${per100(Math.abs(d))}` : unit === 'inr' ? inrSigned(d) : numSigned(d);
  return (
    <span className={`mv-chip ${same ? 'same' : up ? 'up' : 'down'}`}>
      <Icon size={12} aria-hidden />{txt}{!same && pct != null && unit !== 'opv' ? ` (${pctSigned(pct)})` : ''}
    </span>
  );
}

/**
 * Views · clicks · orders per 100 views · orders, now → at the new price, then the total profit a month.
 * Used on the Price Coach recommendation and (compact) on the Dashboard cards. Estimates, never promises.
 */
export function MoveImpact({ move, t, compact = false }) {
  if (!move) return null;
  const { now, after, delta: d } = move;
  const pctOf = (a, b) => (a ? (b - a) / a : null);
  const cells = [
    { k: 'views', label: t('fn.views'), a: now?.views, b: after.views, d: d?.views, pct: d && now ? pctOf(now.views, after.views) : null, fmt: num },
    { k: 'clicks', label: t('fn.clicks'), a: now?.clicks, b: after.clicks, d: d?.clicks, pct: d && now ? pctOf(now.clicks, after.clicks) : null, fmt: num },
    { k: 'opv', label: t('fn.opv'), a: now?.opv100, b: after.opv100, d: d?.opv100, fmt: per100, unit: 'opv' },
    { k: 'orders', label: t('fn.orders'), a: now?.orders, b: after.orders, d: d?.orders, pct: d && now ? pctOf(now.orders, after.orders) : null, fmt: num },
  ];
  return (
    <div className={`mv ${compact ? 'compact' : ''}`} data-testid="move-impact">
      <div className="mv-grid">
        {cells.map((c) => (
          <div key={c.k} className={`mv-cell mv-${c.k}`}>
            <span className="mv-l">{c.label}</span>
            <span className="mv-v num">
              {c.a != null && <><span className="mv-from">{c.fmt(c.a)}</span><span className="mv-arrow" aria-hidden>→</span></>}
              <b>{c.fmt(c.b)}</b>
            </span>
            <Chip d={c.d} pct={c.pct} unit={c.unit} t={t} />
          </div>
        ))}
      </div>
      <div className="mv-total" data-testid="mv-total">
        <span className="mv-l">{t('fn.total')}</span>
        <span className="mv-v num">
          {now?.monthlyProfit != null && <><span className={`mv-from ${now.monthlyProfit < 0 ? 'neg' : ''}`}>{inr(now.monthlyProfit)}</span><span className="mv-arrow" aria-hidden>→</span></>}
          <b className={after.monthlyProfit < 0 ? 'neg' : 'pos'}>{inr(after.monthlyProfit)}</b>
        </span>
        <Chip d={d?.monthlyProfit} unit="inr" t={t} />
        {!compact && after.profit != null && <span className="tiny muted mv-per">{t('fn.perOrder')}: {now?.profit != null ? `${inrSigned(now.profit)} → ` : ''}{inrSigned(after.profit)}</span>}
      </div>
      <p className="tiny muted mv-note">{move.baseline?.source === 'yours' ? t('fn.noteYours') : move.baseline?.source === 'mixed' ? t('fn.noteMixed') : t('fn.noteTypical')}</p>
    </div>
  );
}
