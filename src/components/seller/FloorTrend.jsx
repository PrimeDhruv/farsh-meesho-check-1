import { CalendarClock } from 'lucide-react';
import { PriceTrendChart } from './PriceTrendChart.jsx';
import { inr } from '../../lib/format.js';

const fmtDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * "This week's no-loss price": the floor is not fixed, so it carries a time label, the date it was last worked out,
 * a suggested weekly check (our suggestion, not a Meesho rule), and — only for listings with enough orders of their
 * own — an 8-week trend with the main reason for the latest moves. Earlier weeks are simulated (see engine/history.js).
 */
export function FloorTrend({ history, t }) {
  if (!history?.valid) return null;
  const { floor, updated, eligible, weeks, change, reason, periodReason, sinceStart } = history;
  const reasonText = (r) => (r ? t(`ft.r.${r.key}.${r.amount > 0 ? 'up' : 'down'}`) : null);
  return (
    <div className="floor-trend" data-testid="floor-trend">
      <div className="ft-head">
        <CalendarClock size={18} aria-hidden />
        <div>
          <b>{t('ft.title')}: <span className="num">{inr(floor)}</span></b>
          <div className="tiny muted">{t('ft.updated', { date: fmtDate(updated) })} · {t('ft.weekly')}</div>
        </div>
      </div>
      {eligible ? (
        <>
          <p className="small" data-testid="ft-week">
            {change != null && Math.abs(change) >= 1
              ? t(change > 0 ? 'ft.up' : 'ft.down', { amt: inr(Math.abs(change)), why: reasonText(reason) ?? t('ft.mixed') })
              : t('ft.flat')}
            {sinceStart != null && Math.abs(sinceStart) >= 1 && <> {t(sinceStart < 0 ? 'ft.sinceDown' : 'ft.sinceUp', { amt: inr(Math.abs(sinceStart)), date: weeks[0].label, why: reasonText(periodReason) ?? t('ft.mixed') })}</>}
          </p>
          <PriceTrendChart labels={weeks.map((w) => w.label)} t={t} title={t('ft.chart')}
            series={[{ id: 'floor', kind: 'you', label: t('term.floor'), short: t('zb.floor'), values: weeks.map((w) => Math.round(w.floor)) }]} />
          <p className="tiny muted">{t('ft.simNote')}</p>
        </>
      ) : (
        <p className="small muted" data-testid="ft-none">{t('ft.notEnough')}</p>
      )}
    </div>
  );
}
