import { useState } from 'react';
import { Flame, TrendingDown, MapPin, Sparkles } from 'lucide-react';
import { inr, inrSigned, num, per100 } from '../../lib/format.js';
import { inBucket } from '../../engine/demand.js';

const METRICS = ['views', 'clicks', 'orders'];
const rng = (r) => (r ? `${num(r[0])}–${num(r[1])}` : '—');

/**
 * "Where buyers look and buy": one row per price range of similar products. The bars show views, clicks or orders a
 * typical similar listing got last month (as a range; pick which with the switch), the busy range is highlighted,
 * and on the right: how many orders come from every 100 views at that price, and what THIS seller would earn per order.
 * Cheapest is shown honestly as the emptiest row: price alone does not decide where views, clicks and orders go.
 */
export function DemandChart({ coach, t, price, suggested }) {
  const { buckets, now } = coach;
  const [metric, setMetric] = useState('views');
  const max = Math.max(...buckets.map((b) => b[metric][1]), 1);
  const w = (v) => `${(v / max) * 100}%`;
  return (
    <div data-testid="demand-wrap">
      <div className="metric-seg">
        <div className="seg" role="group" aria-label={t('s2.metric')}>
          {METRICS.map((m) => (
            <button key={m} type="button" className={metric === m ? 'on' : ''} aria-pressed={metric === m} onClick={() => setMetric(m)} data-testid={`metric-${m}`}>{t(`fn.${m}`)}</button>
          ))}
        </div>
        <span className="tiny muted">{t('s2.metricHelp')}</span>
      </div>
      <div className="demand" role="table" aria-label={t('s2.title')} data-testid="demand-chart">
        <div className="d-row d-head" role="row">
          <span role="columnheader">{t('s2.col.price')}</span>
          <span role="columnheader">{t(`s2.col.${metric}`)}</span>
          <span role="columnheader" className="r">{t('s2.col.opv')}</span>
        </div>
        {buckets.map((b, i) => {
          const mine = price != null && inBucket(price, b);
          const sugg = suggested != null && inBucket(suggested, b);
          const loss = b.profitAtMid < 0;
          return (
            <div key={b.lo} role="row" className={`d-row ${b.busy ? 'busy' : ''} ${mine ? 'mine' : ''}`} data-testid={`bucket-${b.lo}`}>
              <span role="cell" className="d-price">
                <b>{b.label}</b>
                <span className="d-tags">
                  {b.busiest && <span className="d-tag hot"><Flame size={12} aria-hidden />{t('s2.most')}</span>}
                  {!b.busiest && b.busy && <span className="d-tag zone">{t('s2.busy')}</span>}
                  {i === 0 && <span className="d-tag cheap"><TrendingDown size={12} aria-hidden />{t('s2.cheap')}</span>}
                </span>
              </span>
              <span role="cell" className="d-bar">
                <span className="d-track">
                  <span className="d-hi" style={{ width: w(b[metric][1]) }} />
                  <span className="d-lo" style={{ width: w(b[metric][0]) }} />
                </span>
                <span className="d-orders num">{rng(b[metric])}</span>
                {mine && <span className="d-you"><MapPin size={12} aria-hidden />{t('s2.you')} {inr(price)}</span>}
                {sugg && !mine && <span className="d-sugg"><Sparkles size={12} aria-hidden />{inr(suggested)}</span>}
              </span>
              <span role="cell" className="d-profit num r" title={`At ${inr(b.mid)}`}>
                <b>{per100(b.opv * 100)}</b>
                <span className="tiny muted"> {t('s2.per100')}</span>
                <span className={`tiny ${loss ? 'neg' : 'muted'} d-sub`}>{loss ? `${inrSigned(b.profitAtMid)} ${t('term.loss')}` : inrSigned(b.profitAtMid)} {t('term.perOrder')} @ {inr(b.mid)}</span>
              </span>
            </div>
          );
        })}
        <p className="tiny muted" style={{ margin: 0, padding: '8px 14px 12px' }}>{t('s2.foot')} · {t('term.floor')} {inr(now.floor)}</p>
      </div>
    </div>
  );
}
