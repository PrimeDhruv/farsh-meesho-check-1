import { Check, Undo2, ShieldCheck } from 'lucide-react';
import { inr, inrSigned } from '../../lib/format.js';

export const FIX_ICON = { repack: '📦', prepaid: '📱', size: '📏' };
const CONF_TONE = { high: 'green', medium: 'amber', low: 'grey' };

/** One cost fix: picture, the action in plain words, what it is worth per order, and Apply / Undo. */
export function FixCard({ fix, coach, t, onToggle }) {
  const pack = coach.product && coach.cat.pack;
  const detail = fix.id === 'repack' && pack
    ? t('fix.repack.detail', { from: pack.current.join('×'), to: pack.proposed.join('×'), s0: inr(coach.base.shippingCost), s1: inr(fix.patch.shippingCost) })
    : t(`fix.${fix.id}.detail`);
  return (
    <article className={`fix ${fix.applied ? 'applied' : ''}`} data-testid={`fix-${fix.id}`}>
      <div className="fix-pic" aria-hidden>{FIX_ICON[fix.id]}</div>
      <div className="fix-body">
        <h3>{t(`fix.${fix.id}`)}</h3>
        <p className="small muted">{detail}</p>
        <div className="fix-tags">
          <span className={`badge tone-${CONF_TONE[fix.confidence]}`}>{t(`fix.conf.${fix.confidence}`)}</span>
          {fix.paidBy === 'meesho' && <span className="badge tone-teal"><ShieldCheck size={12} aria-hidden />{t('fix.meeshoPays')}</span>}
          <span className="tiny muted">{t('fix.floor', { a: inr(fix.floorBefore), b: inr(fix.floorAfter) })}</span>
        </div>
        {fix.confidence === 'low' && <p className="tiny muted" style={{ marginTop: 4 }}>{t('fix.lowNote')}</p>}
      </div>
      <div className="fix-side">
        <div className="fix-gain num" data-testid={`gain-${fix.id}`}>{inrSigned(fix.gain)}</div>
        <div className="tiny muted">{t('fix.gain')}</div>
        {fix.applied
          ? <button type="button" className="btn ghost sm" onClick={onToggle} data-testid={`undo-${fix.id}`}><Undo2 size={14} aria-hidden />{t('fix.undo')}</button>
          : <button type="button" className="btn primary sm" onClick={onToggle} data-testid={`apply-${fix.id}`}>{t('fix.apply')}</button>}
        {fix.applied && <span className="badge tone-green"><Check size={12} aria-hidden />{t('fix.applied')}</span>}
      </div>
    </article>
  );
}

/** Profit per order at one price, step by step through the fixes: −₹9 → +₹11 → +₹20 → +₹25. */
export function ProfitMeter({ coach, t }) {
  const steps = [{ id: 'start', v: coach.fixes[0]?.profitBefore }, ...coach.fixes.map((f) => ({ id: f.id, v: f.profitAfter }))];
  return (
    <div className="meter" data-testid="profit-meter">
      <div className="meter-head">{t('s3.meter', { price: inr(coach.focusPrice) })}</div>
      <div className="meter-steps">
        {steps.map((s, i) => (
          <span key={s.id} className="meter-step">
            {i > 0 && <span className="meter-arrow" aria-hidden>→</span>}
            <span className={`meter-chip ${s.v < 0 ? 'neg' : 'pos'} ${i === 0 || coach.fixes[i - 1]?.applied ? 'done' : ''}`}>
              {i > 0 && <span aria-hidden>{FIX_ICON[s.id]}</span>}<b className="num">{inrSigned(s.v)}</b>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
