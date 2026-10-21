import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wrench, AlertTriangle, AlertOctagon, CheckCircle2, Lightbulb } from 'lucide-react';
import { buildCoach, adviceFor } from '../../engine/coach.js';
import { useProducts } from '../../state/ProductsContext.jsx';
import { useT } from '../../i18n/LanguageContext.jsx';
import { StatusBadge } from '../ui/Badge.jsx';
import { STATUS } from '../../engine/position.js';
import { ZoneBar } from './ZoneBar.jsx';
import { MoveImpact, moveHeadline } from './MoveImpact.jsx';
import { inr } from '../../lib/format.js';

/** Words for an advice object, shared by the Dashboard card and Price Coach. */
export function adviceText(ad, c, t) {
  const zone = c.zone?.label ?? '';
  const title = {
    keep: t('adv.keep'), set: t('adv.set', { price: inr(ad.target) }),
    change: t(ad.dir === 'lower' ? 'adv.lower' : 'adv.raise', { price: inr(ad.target) }),
    fix_then: t('adv.fix_then', { price: inr(ad.target) }), fix_then_above: t('adv.fix_then_above', { price: inr(ad.target) }),
    reconsider: t('adv.reconsider'), invalid: '—',
  }[ad.kind];
  const why = [];
  if (ad.kind === 'reconsider') why.push(t('adv.reconsider.body'));
  else if (ad.kind === 'keep') why.push(t('adv.keep.body'));
  else {
    if (ad.now.price != null && ad.now.profit < 0) why.push(t('adv.why.loss', { price: inr(ad.now.price), loss: inr(-ad.now.profit) }));
    else if (ad.now.position === 'above_zone') why.push(t('adv.why.above', { price: inr(ad.now.price) }));
    else if (ad.now.position === 'below_zone') why.push(t('adv.why.below', { price: inr(ad.now.price) }));
    else if (ad.now.price != null && ad.now.profit < c.targetMargin - 0.5) why.push(t('adv.why.thin', { price: inr(ad.now.price), profit: inr(ad.now.profit), target: inr(c.targetMargin) }));
    why.push(t('adv.why.zone', { zone }));
    if (ad.kind === 'fix_then_above') why.push(t('adv.fix_then_above.body', { price: inr(ad.target) }));
  }
  return { title, why };
}

const STATUS_ICON = { red: AlertOctagon, amber: AlertTriangle, green: CheckCircle2, grey: AlertTriangle };

/**
 * Product-level recommendation card. Reads top to bottom as: what is happening → the numbers → what to do and why
 * → what you get → one button.
 */
export function AdviceCard({ item }) {
  const t = useT();
  const nav = useNavigate();
  const { select } = useProducts();
  const c = useMemo(() => buildCoach(item, { status: item.a.status }), [item]);
  const ad = useMemo(() => adviceFor(c, item.a.status), [c, item.a.status]);
  if (!c.valid) return null;
  const { title, why } = adviceText(ad, c, t);
  const open = () => { select(item.id); nav('/price-coach'); };
  const needsFixes = ad.kind === 'fix_then' || ad.kind === 'fix_then_above';
  const tone = STATUS[item.a.status].tone;
  const Icon = STATUS_ICON[tone];
  return (
    <article className={`advice adv-${tone}`} data-testid={`advice-${item.id}`}>
      <header className="advice-head">
        <div style={{ minWidth: 0 }}><h3>{item.name}</h3><div className="tiny muted">{c.cat.group} · {item.status === 'live' ? t('common.orders', { n: item.orders }) : t('prod.draft')}</div></div>
        <StatusBadge status={item.a.status} />
      </header>
      <p className={`advice-what tone-text-${tone}`}><Icon size={15} aria-hidden />{t(`status.${item.a.status}.short`)}</p>

      <div className={`advice-facts ${ad.target != null ? 'four' : ''}`}>
        <div><span>{t('adv.yourPrice')}</span><b className="num">{inr(item.listedPrice)}</b></div>
        <div className="f-floor"><span>{t('adv.floor')}</span><b className="num">{inr(c.now.floor)}</b></div>
        <div className="f-zone"><span>{t('adv.zone')}</span><b className="num">{c.zone?.label}</b></div>
        {ad.target != null && <div className="f-sugg"><span>{t('s4.compare.suggested')}</span><b className="num">{inr(ad.target)}</b></div>}
      </div>
      <ZoneBar buckets={c.demand.buckets} zone={c.zone} floor={c.now.floor} price={item.listedPrice} suggested={ad.target} t={t} />

      <div className="advice-do">
        <div className="advice-title">{needsFixes ? <Wrench size={16} aria-hidden /> : <Lightbulb size={16} aria-hidden />}{title}</div>
        <ul className="advice-why">{why.map((w, i) => <li key={i}>{w}</li>)}</ul>
      </div>
      {ad.move && (
        <div className="advice-impact" data-testid={`impact-${item.id}`}>
          <p className="mv-lead small">{moveHeadline(ad.move, t, ad.target).map((line, i) => <span key={i}>{line}</span>)}</p>
          <MoveImpact move={ad.move} t={t} compact />
        </div>
      )}
      <footer className="advice-foot">
        <span className="tiny muted">{needsFixes ? t('adv.fixes', { n: ad.pending.length }) : ''}</span>
        <button type="button" className="btn primary" onClick={open} data-testid={`review-${item.id}`}>{t('adv.review')}<ArrowRight size={15} aria-hidden /></button>
      </footer>
    </article>
  );
}
