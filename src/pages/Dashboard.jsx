import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, TrendingDown, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, Button, InfoTip } from '../components/ui/index.js';
import { AdviceCard } from '../components/seller/AdviceCard.jsx';
import { FIX_ICON } from '../components/seller/FixCard.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { SELLER } from '../data/seller.js';
import { STATUS } from '../engine/position.js';
import { buildCoach, portfolioImpact } from '../engine/coach.js';
import { MoveImpact } from '../components/seller/MoveImpact.jsx';
import { ASSUMPTIONS } from '../data/assumptions.js';
import { inr, inrSigned } from '../lib/format.js';

export function Tagline() {
  const t = useT();
  return <div className="tagline" data-testid="tagline">{t('tag.pre')}<b>{t('tag.floor')}</b>{t('tag.mid')}<b>{t('tag.price')}</b>{t('tag.post')}</div>;
}

/** The chain behind every price (deck: cost → no-loss price → where buyers buy → lower cost → price). */
export function HowItWorks() {
  const t = useT();
  const steps = [['🧾', 'how.1', 'how.1s'], ['🛡️', 'how.2', 'how.2s'], ['🛍️', 'how.3', 'how.3s'], ['📦', 'how.4', 'how.4s'], ['🏷️', 'how.5', 'how.5s']];
  return (
    <Card title={t('dash.how')}>
      <ol className="chain" data-testid="chain">
        {steps.map(([ic, k, s], i) => (
          <li key={k}><span className="chain-ic" aria-hidden>{ic}</span><span className="chain-n">{i + 1}</span><b>{t(k)}</b><span className="tiny muted">{t(s)}</span></li>
        ))}
      </ol>
    </Card>
  );
}

export default function Dashboard() {
  const { items, summary, select } = useProducts();
  const t = useT();
  const nav = useNavigate();
  const urgent = useMemo(() => items.filter((p) => p.a.needsAttention).sort((a, b) => STATUS[a.a.status].rank - STATUS[b.a.status].rank), [items]);

  // quick wins: for each product that needs attention, its single most valuable cost fix (biggest ₹ per order first)
  const savings = useMemo(() => urgent.flatMap((p) => {
    const c = buildCoach(p, { status: p.a.status });
    if (!c.valid) return [];
    const best = c.fixes.filter((f) => !f.applied && f.gain > 0.5).sort((a, b) => b.gain - a.gain)[0];
    return best ? [{ ...best, product: p, focus: c.focusPrice }] : [];
  }).sort((a, b) => b.gain - a.gain), [urgent]);

  // views, clicks, orders and total profit a month: now vs if the advice is followed (estimates)
  const month = useMemo(() => portfolioImpact(items), [items]);
  const monthMove = useMemo(() => {
    const { now, after } = month;
    const row = (a, b) => ({ views: a.views, clicks: a.clicks, orders: a.orders, monthlyProfit: a.monthlyProfit, ...b });
    const opv = (x) => (x.views ? (x.orders / x.views) * 100 : 0);
    const n = { ...row(now, {}), opv100: opv(now) }, a = { ...row(after, {}), opv100: opv(after) };
    return { now: n, after: a, baseline: { source: 'mixed' },
      delta: { views: a.views - n.views, clicks: a.clicks - n.clicks, orders: a.orders - n.orders, opv100: a.opv100 - n.opv100, monthlyProfit: a.monthlyProfit - n.monthlyProfit } };
  }, [month]);

  const tiles = [
    { key: 'losing', n: summary.losing, icon: AlertOctagon, tone: 'red', filter: 'losing' },
    { key: 'fewer', n: summary.fewerOrders, icon: TrendingDown, tone: 'amber', filter: 'fewer' },
    { key: 'small', n: summary.smallFix, icon: Wrench, tone: 'amber', filter: 'small' },
    { key: 'ok', n: summary.onTrack, icon: CheckCircle2, tone: 'green', filter: 'ok' },
  ];

  return (
    <>
      <Tagline />
      <div className="page-head">
        <div><h1>{t('dash.hello', { name: SELLER.name.split(' ')[0] })} 👋</h1><p>{t('dash.sub')}</p></div>
        <Button to="/price-coach" size="lg">{t('dash.open')}<ArrowRight size={16} aria-hidden /></Button>
      </div>

      <div className="stack">
        <section aria-labelledby="todo-h">
          <h2 id="todo-h" className="section-h">{t('dash.todo')}</h2>
          <div className="grid cols-4 todo-grid">
            {tiles.map(({ key, n, icon: Icon, tone, filter }) => (
              <button key={key} type="button" className={`todo tone-${tone} ${n === 0 ? 'zero' : ''}`} onClick={() => nav(`/products?filter=${filter}`)} data-testid={`tile-${key}`}>
                <span className="todo-ic"><Icon size={22} aria-hidden /></span>
                <span className="todo-n num">{n}</span>
                <span className="todo-l">{t(`tile.${key}`)}</span>
                <span className="todo-s">{t(`tile.${key}Sub`)}</span>
                <span className="todo-go">{t('common.view')} <ArrowRight size={13} aria-hidden /></span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid main-side">
          <section aria-labelledby="fix-h">
            <div className="row between" style={{ marginBottom: 10 }}>
              <div><h2 id="fix-h">{t('dash.fixFirst')}</h2><p className="small muted">{t('dash.fixFirstSub')}</p></div>
              <Button variant="ghost" size="sm" to="/products?filter=attention">{t('dash.more', { n: urgent.length })}<ArrowRight size={14} aria-hidden /></Button>
            </div>
            {urgent.length ? (
              <div className="advice-list">{urgent.slice(0, 4).map((p) => <AdviceCard key={p.id} item={p} />)}</div>
            ) : <Card><div className="banner tone-green">{t('dash.allGood')}</div></Card>}
          </section>

          <div className="stack">
            <Card title={t('dash.month')} subtitle={t('dash.monthSub', { n: month.count, m: month.moved })} action={<InfoTip align="right">{t('dash.monthHelp')}</InfoTip>}>
              <div data-testid="month-glance"><MoveImpact move={monthMove} t={t} compact /></div>
              <p className="small muted" style={{ marginTop: 8 }} data-testid="avg-profit">{t('dash.avgSub2', { avg: inr(summary.avgContribution), target: inr(ASSUMPTIONS.targetContribution) })}</p>
            </Card>
            {savings.length > 0 && <Card flush title={t('dash.savings')} subtitle={t('dash.savingsSub')}>
              <ul className="savings" data-testid="savings">
                {savings.map((s) => (
                  <li key={`${s.product.id}-${s.id}`}>
                    <button type="button" onClick={() => { select(s.product.id); nav('/price-coach'); }}>
                      <span className="sv-ic" aria-hidden>{FIX_ICON[s.id]}</span>
                      <span className="sv-body"><b>{s.product.name}</b><span className="tiny muted">{t(`fix.${s.id}`)}</span></span>
                      <span className="sv-gain"><b className="num">{inrSigned(s.gain)}</b><span className="tiny muted">{t('fix.gain')} @ {inr(s.focus)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>}
            <HowItWorks />
          </div>
        </div>
      </div>
    </>
  );
}
