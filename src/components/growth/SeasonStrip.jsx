import { MONTHS } from '../../data/launch.js';
import { PEAK } from '../../engine/launch.js';

/**
 * 12 months of buyer demand as a strip of cells. Peak months (index ≥ 110) are filled and labelled "peak" for
 * screen readers; this month has a marker; the "list by" month gets a flag. Never colour alone: every cell names
 * its month and index in the tooltip and label.
 */
export function SeasonStrip({ index, month, listBy, compact, t }) {
  const max = Math.max(...index);
  return (
    <div className={`season ${compact ? 'compact' : ''}`} role="list" aria-label={t('ln.seasonAria')}>
      {index.map((v, i) => {
        const peak = v >= PEAK, now = i === month, flag = i === listBy;
        const level = v >= 130 ? 4 : v >= PEAK ? 3 : v >= 100 ? 2 : v >= 90 ? 1 : 0;
        return (
          <div key={i} role="listitem" className={`smo ${peak ? 'peak' : ''} ${now ? 'now' : ''} ${flag ? 'flag' : ''}`}
            title={`${MONTHS[i]}: ${v}${peak ? ` · ${t('ln.peak')}` : ''}`}
            aria-label={`${MONTHS[i]} ${v}${peak ? `, ${t('ln.peak')}` : ''}${now ? `, ${t('ln.thisMonth')}` : ''}${flag ? `, ${t('ln.listByShort')}` : ''}`}>
            <span className={`smo-bar l${level}`} style={{ height: `${Math.max(14, (v / max) * 100)}%` }} />
            <span className="smo-m">{compact ? MONTHS[i][0] : MONTHS[i]}</span>
            {now && <span className="smo-now" aria-hidden>▲</span>}
          </div>
        );
      })}
    </div>
  );
}
