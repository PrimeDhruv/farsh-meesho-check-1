import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown, CalendarDays, Rocket, Trophy, Eye, X, FlaskConical, Users, Star, Info, Clock } from 'lucide-react';
import { Card, Button, Select, Sparkline, InfoTip } from '../components/ui/index.js';
import { SeasonStrip } from '../components/growth/SeasonStrip.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { CATEGORIES } from '../data/categories.js';
import { EVENTS, MONTHS } from '../data/launch.js';
import { ideasFor, evaluateIdea, topSellersFor, seasonPlan, SORTS, PRICE_BANDS } from '../engine/launch.js';
import { busyZone } from '../engine/demand.js';
import { demandFor } from '../data/demandBuckets.js';
import { inr, num, pctSigned } from '../lib/format.js';

const TILE = { kurtis: '👗', kurtaset: '👚', bottoms: '👖', leggings: '🩱', dupatta: '🧣', footwear: '👡', home: '🧴', bags: '👜' };
const TONE = { now: 'green', plan: 'teal', late: 'amber', later: 'grey' };
const lakh = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)} L` : inr(Math.round(n / 100) * 100));
const range = (r, f = num) => (r ? `${f(r[0])}–${f(r[1]).replace('₹', '')}` : '—');

/** "Launch now" · "List by Feb" · "Late for Diwali" — one short status for an idea's timing. */
function whenBadge(w, t) {
  if (w.status === 'now') return t('ln.st.now');
  if (w.status === 'late') return t('ln.st.late', { ev: w.current?.events?.[0] ?? t('ln.thisPeak') });
  return t('ln.st.plan', { m: w.listByLabel });
}

/** One plain sentence on when to launch and for how long. */
function whenText(w, t) {
  const ev = w.events.join(', ');
  if (w.status === 'now' && w.inPeak) return t('ln.w.nowIn', { ev, end: w.endLabel, n: w.sellFor, clear: w.clearBy });
  if (w.status === 'now') return t('ln.w.nowSoon', { ev, start: w.startLabel, end: w.endLabel, clear: w.clearBy });
  if (w.status === 'late') return t('ln.w.late', { cur: w.current.events.join(', '), wk: w.current.weeksLeft, ev, start: w.startLabel, end: w.endLabel, by: w.listByLabel, clear: w.clearBy });
  return t('ln.w.plan', { ev, start: w.startLabel, end: w.endLabel, by: w.listByLabel, n: w.len, clear: w.clearBy });
}

function Modal({ title, onClose, children, testid }) {
  const t = useT();
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal ln-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} data-testid={testid}>
        <div className="modal-stripe" />
        <button type="button" className="icon-btn ln-close" aria-label={t('common.close')} onClick={onClose}><X size={16} /></button>
        {children}
      </div>
    </div>
  );
}

/** The launch planner: change cost and price, see profit and timing, then add the product as a draft. */
function PlanModal({ idea, categoryId, onClose, t }) {
  const nav = useNavigate();
  const { addProduct, updateProduct, notify } = useProducts();
  const base = useMemo(() => evaluateIdea(idea, categoryId), [idea, categoryId]);
  const [cost, setCost] = useState(String(base.cost));
  const [packaging, setPackaging] = useState(String(base.packaging));
  const [price, setPrice] = useState(String(base.price ?? ''));
  const [name, setName] = useState(`${idea.kw[0]} ${idea.kw[1].toLowerCase()} — ${idea.kw[2].toLowerCase()}, ${idea.kw[3].toLowerCase()}`);
  const n = (s) => (Number(s) > 0 ? Number(s) : null);
  const e = useMemo(() => evaluateIdea(idea, categoryId, { cost: n(cost) ?? 0, packaging: n(packaging) ?? 0, price: n(price) ?? undefined }), [idea, categoryId, cost, packaging, price]);
  const w = e.when;
  const add = (to) => {
    const id = addProduct({ name: name.trim() || e.title, categoryId, cost: n(cost) ?? base.cost, packaging: n(packaging) ?? base.packaging });
    if (n(price)) updateProduct(id, { listedPrice: Math.round(n(price)) });
    notify(t('ln.added', { name: name.trim() || e.title }));
    onClose();
    nav(to);
  };
  return (
    <Modal title={t('ln.plan.title')} onClose={onClose} testid="plan-modal">
      <h2>{t('ln.plan.title')}</h2>
      <div className="chips" style={{ marginTop: 8 }}>{e.keywords.map((k) => <span key={k} className="kw">{k}</span>)}</div>
      <div className="ln-form">
        <label className="field grow"><span>{t('ln.plan.name')}</span><span className="input-wrap"><input value={name} onChange={(ev) => setName(ev.target.value)} data-testid="plan-name" /></span></label>
        <label className="field"><span>{t('ln.plan.cost')}</span><span className="input-wrap"><span className="affix">₹</span><input inputMode="numeric" value={cost} onChange={(ev) => setCost(ev.target.value.replace(/[^\d]/g, ''))} data-testid="plan-cost" /></span></label>
        <label className="field"><span>{t('ln.plan.pack')}</span><span className="input-wrap"><span className="affix">₹</span><input inputMode="numeric" value={packaging} onChange={(ev) => setPackaging(ev.target.value.replace(/[^\d]/g, ''))} /></span></label>
        <label className="field"><span>{t('ln.plan.price')}</span><span className="input-wrap"><span className="affix">₹</span><input inputMode="numeric" value={price} onChange={(ev) => setPrice(ev.target.value.replace(/[^\d]/g, ''))} data-testid="plan-price" /></span></label>
      </div>
      <p className="tiny muted" style={{ marginTop: 4 }}>{t('ln.plan.costHint', { range: e.priceLabel })}</p>
      <div className="money-tiles" data-testid="plan-tiles">
        <div className={`mt ${e.price < e.floor ? 'bad' : ''}`}><span className="k">{t('ln.plan.floor')}</span><b className="num">{inr(e.floor)}</b></div>
        <div className={`mt ${e.verdict === 'loss' ? 'bad' : e.verdict === 'thin' ? 'warn' : 'good'}`}><span className="k">{t('ln.plan.perOrder')}</span><b className="num">{inr(e.profit)}</b></div>
        <div className="mt"><span className="k">{t('ln.exp.sales')}</span><b className="num">{range(e.orders)}</b><span className="tiny muted">{t('ln.ordersMonth')}</span></div>
        <div className={`mt ${e.verdict === 'loss' ? 'bad' : 'good'}`}><span className="k">{t('ln.exp.profit')}</span><b className="num">{e.monthlyProfit ? `${inr(e.monthlyProfit[0])}–${inr(e.monthlyProfit[1]).replace('₹', '')}` : '—'}</b><span className="tiny muted">{t('ln.aMonth')}</span></div>
      </div>
      {e.verdict === 'loss' && <div className="banner tone-red" role="alert" style={{ marginTop: 10 }}>{t('ln.plan.loss', { price: inr(e.price), floor: inr(e.floor) })}</div>}
      <div className="ln-timeline" data-testid="plan-timeline">
        <div className={w.status === 'now' ? 'on' : ''}><span className="tiny muted">{t('ln.tl.list')}</span><b>{w.status === 'now' ? t('ln.tl.now') : w.listByLabel}</b></div>
        <span className="mv-arrow" aria-hidden>→</span>
        <div><span className="tiny muted">{t('ln.tl.peak')}</span><b>{w.startLabel}–{w.endLabel}</b><span className="tiny muted">{w.events.join(', ')}</span></div>
        <span className="mv-arrow" aria-hidden>→</span>
        <div><span className="tiny muted">{t('ln.tl.clear')}</span><b>{w.clearBy}</b><span className="tiny muted">{t('ln.tl.clearSub')}</span></div>
      </div>
      <p className="small" style={{ marginTop: 8 }}>{whenText(w, t)}</p>
      <div className="row wrap" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={() => add('/ads')} data-testid="plan-add-ads">{t('ln.plan.addAds')}</Button>
        <Button icon={Rocket} onClick={() => add('/price-coach')} data-testid="plan-add">{t('ln.plan.add')}</Button>
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>{t('ln.plan.note')}</p>
    </Modal>
  );
}

/** "View product": one top seller's listing in detail (simulated, seller anonymised). */
function SellerModal({ s, zone, onClose, onPlan, t }) {
  const inZone = zone && s.price >= zone.lo && s.price <= zone.hi;
  return (
    <Modal title={s.name} onClose={onClose} testid="seller-modal">
      <div className="ln-view">
        <div className="ln-photo" role="img" aria-label={t('cp.noImage')}><span aria-hidden>{TILE[s.categoryId]}</span><em>{t('cp.noImageShort')}</em></div>
        <div className="grow">
          <span className="badge tone-plum"><Trophy size={12} aria-hidden />{t('ln.ts.rank', { n: s.rank, group: CATEGORIES[s.categoryId].group })}</span>
          <h2 style={{ marginTop: 6 }}>{s.name}</h2>
          <div className="small muted">{t('ln.ts.by', { city: s.city, m: s.monthsLive })}</div>
          <div className="chips" style={{ marginTop: 8 }}>{s.keywords.map((k) => <span key={k} className="kw">{k}</span>)}</div>
        </div>
      </div>
      <div className="money-tiles">
        <div className="mt"><span className="k">{t('ln.ts.price')}</span><b className="num">{inr(s.price)}</b></div>
        <div className="mt"><span className="k">{t('ln.ts.rating')}</span><b className="num">★ {s.rating.toFixed(1)}</b><span className="tiny muted">{t('ln.ts.ratings', { n: num(s.ratings) })}</span></div>
        <div className="mt"><span className="k">{t('ln.ts.orders')}</span><b className="num">{num(s.ordersMonth)}</b><span className="tiny muted">{t('ln.aMonth')}</span></div>
        <div className="mt good"><span className="k">{t('ln.ts.revenue')}</span><b className="num">{lakh(s.revenueMonth)}</b><span className="tiny muted">{t('ln.aMonth')}</span></div>
      </div>
      <div className="ln-trend">
        <div><b className="small">{t('ln.ts.trend')}</b><div className="tiny muted">{t('ln.ts.trendSub', { pct: pctSigned(s.trendPct) })}</div></div>
        <Sparkline values={s.trend} width={240} height={46} tone={s.trendPct >= 0 ? 'green' : 'amber'} />
      </div>
      <h3 style={{ marginTop: 14 }}>{t('ln.ts.why')}</h3>
      <ul className="ad-how small">
        {s.idea && <li>{s.idea.why}</li>}
        <li>{inZone ? t('ln.ts.inZone', { zone: zone.label }) : t('ln.ts.outZone', { zone: zone?.label ?? '—' })}</li>
        <li>{s.rating >= 4.2 ? t('ln.ts.goodRating', { r: s.rating.toFixed(1) }) : t('ln.ts.okRating', { r: s.rating.toFixed(1) })}</li>
        {s.trendPct > 0.2 && <li>{t('ln.ts.rising')}</li>}
      </ul>
      <div className="row wrap" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        {s.idea && <Button icon={Rocket} onClick={onPlan} data-testid="seller-launch">{t('ln.ts.launch')}</Button>}
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>{t('ln.ts.note')}</p>
    </Modal>
  );
}

function IdeaCard({ e, onPlan, onSellers, t }) {
  const w = e.when;
  const today = new Date().getMonth();
  return (
    <article className={`idea ${w.status}`} data-testid={`idea-${e.idea.id}`}>
      <div className="idea-head">
        <div className="comp-tile" aria-hidden><span>{TILE[e.categoryId]}</span></div>
        <div className="grow">
          <span className={`badge tone-${TONE[w.status]}`} data-testid={`idea-when-${e.idea.id}`}><Clock size={12} aria-hidden />{whenBadge(w, t)}</span>
          <h3>{e.title}</h3>
        </div>
      </div>
      <div className="chips">{e.keywords.map((k, i) => <span key={k} className={`kw ${i === 4 ? 'price' : ''}`}>{k}</span>)}</div>
      <div className="idea-search">
        <Search size={14} aria-hidden />
        <span>{t('ln.search', { q: e.phrase })} <b className="num">{num(e.searches)}</b> {t('ln.aMonth')}</span>
        <span className={`mv-chip ${e.growth > 0.02 ? 'up' : e.growth < -0.02 ? 'down' : 'same'}`}>{e.growth >= 0 ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}{t('ln.growth', { pct: pctSigned(e.growth) })}</span>
      </div>
      <div className="idea-nums">
        <div><span className="mv-l">{t('ln.exp.sales')}</span><b className="num">{range(e.orders)}</b><span className="tiny muted">{t('ln.ordersMonth')}</span></div>
        <div><span className="mv-l">{t('ln.exp.profit')}</span><b className={`num ${e.verdict === 'loss' ? 'neg' : 'pos'}`}>{e.monthlyProfit ? `${inr(e.monthlyProfit[0])}–${inr(e.monthlyProfit[1]).replace('₹', '')}` : '—'}</b><span className="tiny muted">{t('ln.aMonth')}</span></div>
        <div><span className="mv-l">{t('ln.price')}</span><b className="num">{inr(e.price)}</b><span className="tiny muted">{t('ln.profitEach', { amt: inr(e.profit) })}</span></div>
        <div><span className="mv-l">{t('ln.comp')}<InfoTip>{t('ln.compTip')}</InfoTip></span><b>{t(`ln.c.${e.comp.level}`)}</b><span className="tiny muted">{t('ln.listings', { n: num(e.listings) })}</span></div>
      </div>
      <div className="idea-when">
        <CalendarDays size={15} aria-hidden />
        <div className="grow"><p className="small">{whenText(w, t)}</p>
          <SeasonStrip index={e.index} month={today} listBy={w.listBy} compact t={t} /></div>
      </div>
      <p className="small muted idea-why"><Info size={13} aria-hidden /> {e.why}</p>
      <div className="comp-actions">
        <Button size="sm" icon={Rocket} onClick={() => onPlan(e)} data-testid={`plan-${e.idea.id}`}>{t('ln.planBtn')}</Button>
        <Button size="sm" variant="ghost" icon={Users} onClick={onSellers}>{t('ln.seeSellers')}</Button>
      </div>
    </article>
  );
}

export default function Launch() {
  const t = useT();
  const { items } = useProducts();
  const mine = useMemo(() => [...new Set(items.map((p) => p.categoryId))], [items]);
  const [cat, setCat] = useState(mine[0] ?? 'kurtis');
  const [tab, setTab] = useState('ideas');
  const [band, setBand] = useState('all');
  const [sort, setSort] = useState('best');
  const [plan, setPlan] = useState(null);       // { idea, categoryId }
  const [view, setView] = useState(null);       // top seller
  const today = useMemo(() => new Date(), []);

  const ideas = useMemo(() => ideasFor(cat, { today }), [cat, today]);
  const shown = useMemo(() => ideas.filter((e) => band === 'all' || PRICE_BANDS[band].includes(e.idea.bucket)).sort(SORTS[sort]), [ideas, band, sort]);
  const sellers = useMemo(() => topSellersFor(cat), [cat]);
  const zone = useMemo(() => busyZone(demandFor(cat).buckets), [cat]);
  const seasons = useMemo(() => seasonPlan(mine, today), [mine, today]);
  const lead = shown.find((e) => e.when.status === 'now') ?? null;
  const catWhen = seasons.find((s) => s.categoryId === cat)?.when;

  return (
    <>
      <div className="page-head">
        <div><h1>{t('ln.title')}</h1><p>{t('ln.sub')}</p></div>
      </div>
      <div className="stack">
        <Card>
          <div className="field"><span>{t('ln.yourCats')}</span>
            <div className="chips" role="group" aria-label={t('ln.yourCats')}>
              {mine.map((id) => <button key={id} type="button" className={`chip ${cat === id ? 'on' : ''}`} aria-pressed={cat === id} onClick={() => setCat(id)} data-testid={`cat-${id}`}>{TILE[id]} {CATEGORIES[id].group}</button>)}
            </div>
          </div>
          <div className="seg ln-tabs" role="tablist" aria-label={t('ln.title')}>
            {[['ideas', Search], ['top', Trophy], ['season', CalendarDays]].map(([id, Ic]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)} data-testid={`tab-${id}`}><Ic size={14} aria-hidden /> {t(`ln.tab.${id}`)}</button>
            ))}
          </div>
          <div className="banner tone-teal" style={{ marginTop: 12 }}><FlaskConical size={16} aria-hidden /><span>{t('ln.simNote')}</span></div>
        </Card>

        {tab === 'ideas' && (
          <>
            {catWhen && (
              <div className={`banner big tone-${TONE[catWhen.status]}`} data-testid="ln-lead">
                <CalendarDays size={18} aria-hidden />
                <span>{lead && catWhen.status !== 'late'
                  ? t('ln.lead.now', { title: lead.title, sales: range(lead.orders), group: CATEGORIES[cat].group })
                  : whenText(catWhen, t)}</span>
              </div>
            )}
            <Card title={t('ln.ideas', { group: CATEGORIES[cat].group })} subtitle={t('ln.ideasSub')}>
              <div className="ln-filters">
                <div className="chips" role="group" aria-label={t('ln.band')}>
                  {['all', 'low', 'mid', 'high'].map((b) => <button key={b} type="button" className={`chip ${band === b ? 'on' : ''}`} aria-pressed={band === b} onClick={() => setBand(b)}>{t(`ln.band.${b}`, { zone: zone?.label ?? '' })}</button>)}
                </div>
                <Select label={t('ln.sort')} value={sort} onChange={(ev) => setSort(ev.target.value)} data-testid="ln-sort"
                  options={Object.keys(SORTS).map((k) => ({ value: k, label: t(`ln.sort.${k}`) }))} />
              </div>
              {shown.length === 0 ? <div className="empty-state"><Search size={30} aria-hidden /><b>{t('ln.none')}</b></div> : (
                <div className="idea-grid">
                  {shown.map((e) => <IdeaCard key={e.idea.id} e={e} t={t} onPlan={(x) => setPlan({ idea: x.idea, categoryId: cat })} onSellers={() => setTab('top')} />)}
                </div>
              )}
              <p className="tiny muted" style={{ marginTop: 12 }}>{t('ln.how')}</p>
            </Card>
          </>
        )}

        {tab === 'top' && (
          <Card title={t('ln.ts.title', { group: CATEGORIES[cat].group })} subtitle={t('ln.ts.sub')}>
            <div className="ts-list" data-testid="top-sellers">
              {sellers.map((s) => (
                <article key={s.id} className="ts" data-testid={`ts-${s.id}`}>
                  <span className="ts-rank">#{s.rank}</span>
                  <div className="comp-tile" aria-hidden><span>{TILE[s.categoryId]}</span></div>
                  <div className="ts-main">
                    <b>{s.name}</b>
                    <span className="tiny muted">{t('ln.ts.by', { city: s.city, m: s.monthsLive })} · <Star size={11} aria-hidden /> {s.rating.toFixed(1)} ({num(s.ratings)})</span>
                  </div>
                  <div className="ts-n"><span className="tiny muted">{t('ln.ts.price')}</span><b className="num">{inr(s.price)}</b></div>
                  <div className="ts-n"><span className="tiny muted">{t('ln.ts.orders')}</span><b className="num">{num(s.ordersMonth)}</b></div>
                  <div className="ts-n rev"><span className="tiny muted">{t('ln.ts.revenue')}</span><b className="num">{lakh(s.revenueMonth)}</b></div>
                  <div className="ts-spark"><Sparkline values={s.trend} width={96} height={30} tone={s.trendPct >= 0 ? 'green' : 'amber'} /><span className={`tiny ${s.trendPct >= 0 ? 'pos' : 'amber'}`}>{pctSigned(s.trendPct)}</span></div>
                  <Button size="sm" variant="secondary" icon={Eye} onClick={() => setView(s)} data-testid={`view-${s.id}`}>{t('ln.ts.view')}</Button>
                </article>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>{t('ln.ts.note')}</p>
          </Card>
        )}

        {tab === 'season' && (
          <Card title={t('ln.se.title')} subtitle={t('ln.se.sub')}>
            <div className="se-list" data-testid="season-plan">
              {seasons.map((s) => (
                <div key={s.categoryId} className={`se-row ${s.categoryId === cat ? 'on' : ''}`}>
                  <div className="se-name"><b>{TILE[s.categoryId]} {s.cat.group}</b>
                    <span className={`badge tone-${TONE[s.when.status]}`}>{whenBadge(s.when, t)}</span></div>
                  <SeasonStrip index={s.index} month={today.getMonth()} listBy={s.when.listBy} t={t} />
                  <p className="small">{whenText(s.when, t)}</p>
                </div>
              ))}
            </div>
            <div className="se-legend tiny muted">
              <span><i className="smo-key peak" /> {t('ln.se.peak')}</span><span>▲ {t('ln.thisMonth')}</span><span><i className="smo-key flag" /> {t('ln.listByShort')}</span>
            </div>
            <h3 style={{ marginTop: 16 }}>{t('ln.se.events')}</h3>
            <ul className="se-events small">
              {EVENTS.map((ev) => <li key={ev.id}><b>{ev.label}</b> <span className="muted">{ev.months.map((m) => MONTHS[m]).join('–')}</span></li>)}
            </ul>
            <p className="tiny muted" style={{ marginTop: 10 }}>{t('ln.se.rule')}</p>
          </Card>
        )}
      </div>
      {plan && <PlanModal idea={plan.idea} categoryId={plan.categoryId} onClose={() => setPlan(null)} t={t} />}
      {view && <SellerModal s={view} zone={zone} t={t} onClose={() => setView(null)} onPlan={() => { setView(null); setPlan({ idea: view.idea, categoryId: view.categoryId }); }} />}
    </>
  );
}
