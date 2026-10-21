import { useState } from 'react';
import { ChevronUp, HelpCircle, ArrowRight } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext.jsx';

/**
 * One Farsh Watch alert, read top to bottom: what we noticed → likely reason → ONE thing to do → what it's worth.
 * Never "cut your price"; the action is a cost fix, a recompute or a planned step.
 */
export function SignalCard({ signal, productName, onOpenCoach }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <article className="signal" data-testid={`signal-${signal.key ?? signal.id}`}>
      <div className="sig-stage">{signal.icon && <span aria-hidden>{signal.icon}</span>}{signal.stage}</div>
      {productName && <div className="tiny muted" style={{ fontWeight: 700 }}>{productName}</div>}
      <h3>{signal.title}</h3>
      <p className="sig-reason">{signal.cause}</p>
      <div className="sig-do"><span className="sig-k">👉 {t('watch.do')}</span><b>{signal.lever}</b></div>
      <div className="sig-worth"><span className="sig-k">💰 {t('watch.worth')}</span><span>{signal.effect}</span></div>
      <div className="row between wrap" style={{ marginTop: 10, gap: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronUp size={14} aria-hidden /> : <HelpCircle size={14} aria-hidden />}{open ? t('watch.hideWhy') : t('watch.whyTrig')}
        </button>
        {onOpenCoach && <button type="button" className="btn secondary sm" onClick={onOpenCoach}>{t('watch.openCoach')}<ArrowRight size={13} aria-hidden /></button>}
      </div>
      {open && (
        <div className="banner tone-amber" style={{ marginTop: 8, flexDirection: 'column' }} data-testid={`why-${signal.key ?? signal.id}`}>
          <span>{signal.why}</span>
          {signal.ladder && (
            <table className="tbl compact" style={{ marginTop: 6 }}>
              <thead><tr><th>Step</th><th className="r">Price</th><th className="r">Profit / order</th></tr></thead>
              <tbody>{signal.ladder.map((r, i) => <tr key={i}><td>{i === 0 ? 'Now' : i === signal.ladder.length - 1 ? 'No-loss price' : `Step ${i}`}</td><td className="r num">₹{r.price}</td><td className="r num">₹{r.contribution.toFixed(0)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
    </article>
  );
}
