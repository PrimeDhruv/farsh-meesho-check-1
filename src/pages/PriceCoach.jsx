import { useMemo, useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, ChevronUp, Radar, Info, ShieldAlert, ArrowDown, ArrowRight } from 'lucide-react';
import { Card, Button, InfoTip, StatusBadge, Select } from '../components/ui/index.js';
import { NewProductForm } from '../components/product/NewProductForm.jsx';
import { CostSheet, FloorFormula } from '../components/seller/CostSheet.jsx';
import { DemandChart } from '../components/seller/DemandChart.jsx';
import { ZoneBar } from '../components/seller/ZoneBar.jsx';
import { FixCard, ProfitMeter } from '../components/seller/FixCard.jsx';
import { PricePanel } from '../components/seller/PricePanel.jsx';
import { ExpertPanel } from '../components/seller/ExpertPanel.jsx';
import { FloorTrend } from '../components/seller/FloorTrend.jsx';
import { CompetitorSnapshot } from '../components/seller/CompetitorSnapshot.jsx';
import { adviceText } from '../components/seller/AdviceCard.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { buildCoach, adviceFor } from '../engine/coach.js';
import { floorHistory } from '../engine/history.js';
import { toCalcInputs, effectiveInputs } from '../engine/model.js';
import { inr, inrSigned } from '../lib/format.js';

const STEPS = ['s1', 's2', 's3', 's4', 's5'];

export default function PriceCoach() {
  const { selected } = useProducts();
  return <Coach key={selected.id} p={selected} />; // fresh screen state when the product changes
}

/** Sticky step bar: jump to any step; the step on screen is highlighted. */
function StepNav({ t, go }) {
  const [active, setActive] = useState('s1');
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current, btn = nav?.querySelector('button.on');
    if (nav && btn && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: btn.offsetLeft - 8, behavior: 'smooth' });
  }, [active]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-130px 0px -55% 0px' });
    STEPS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="stepnav" aria-label="Steps" data-testid="stepnav" ref={navRef}>
      {STEPS.map((s, i) => (
        <button key={s} type="button" className={active === s ? 'on' : ''} aria-current={active === s ? 'step' : undefined} onClick={() => go(s)}>
          <span>{i + 1}</span>{t(`step.${i + 1}`)}
        </button>
      ))}
    </nav>
  );
}

function Step({ id, n, title, sub, children, aside }) {
  return (
    <section id={id} className="step card" aria-labelledby={`${id}-h`}>
      <header className="step-head">
        <span className="step-n" aria-hidden>{n}</span>
        <div style={{ flex: 1, minWidth: 0 }}><h2 id={`${id}-h`}>{title}</h2>{sub && <p className="small muted">{sub}</p>}</div>
        {aside}
      </header>
      <div className="step-body">{children}</div>
    </section>
  );
}

function Coach({ p }) {
  const t = useT();
  const { items, select, updateProduct, toggleFix, notify } = useProducts();
  const [creating, setCreating] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [expertBase, setExpertBase] = useState(null); // what-if inputs from the expert panel (screen only)
  const [costText, setCostText] = useState({ cost: String(p.cost), packaging: String(p.packaging) });
  useEffect(() => { setCostText({ cost: String(p.cost), packaging: String(p.packaging) }); }, [p.cost, p.packaging]);

  const coach = useMemo(() => buildCoach(p, { baseInputs: expertBase ?? undefined, status: p.a.status }), [p, expertBase]);
  const advice = useMemo(() => adviceFor(coach, p.a.status), [coach, p.a.status]);
  const defaults = useMemo(() => toCalcInputs(p), [p]);
  const fh = useMemo(() => (coach.valid ? floorHistory(coach.inputs, p) : null), [coach, p]);

  if (!coach.valid) {
    return <Card title={p.name}><div className="banner tone-red" role="alert">{coach.errors.join('. ')}.</div>
      {expertOpen && <ExpertPanel product={p} defaults={defaults} effective={effectiveInputs(p)} onChange={setExpertBase} />}</Card>;
  }
  const c = coach;
  const { title: adTitle, why } = adviceText(advice, c, t);
  const setCost = (k) => (e) => {
    const v = e.target.value;
    setCostText((s) => ({ ...s, [k]: v }));
    const n = Number(v);
    if (v.trim() !== '' && Number.isFinite(n) && n >= 0 && (k !== 'cost' || n > 0)) updateProduct(p.id, { [k]: n });
  };
  const applyAll = () => { c.fixes.filter((f) => !f.applied).forEach((f) => toggleFix(p.id, f.id)); };
  const usePrice = (price) => { updateProduct(p.id, { listedPrice: price }); notify(t('s4.saved', { price: inr(price), name: p.name })); };
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const insightKey = c.pricePosition ? `s2.insight.${c.pricePosition}` : 's2.insight.none';
  const suggested = advice.target ?? null;
  const profitTone = c.priceProfit == null ? '' : c.priceProfit < 0 ? 'neg' : 'pos';

  return (
    <>
      <div className="page-head">
        <div><h1>{t('coach.title')}</h1><p>{t('coach.sub')}</p></div>
      </div>

      <div className="stack">
        {/* product + verdict */}
        <Card>
          <div className="coach-top">
            <Select label={t('coach.product')} value={p.id} onChange={(e) => select(e.target.value)} data-testid="product-select"
              options={items.map((it) => ({ value: it.id, label: `${it.name} · ${t(`status.${it.a.status}`)}` }))} className="grow" />
            <Button variant="secondary" icon={Plus} onClick={() => setCreating((v) => !v)}>{t('coach.new')}</Button>
          </div>
          {creating && <div style={{ marginTop: 14 }}><NewProductForm onDone={() => setCreating(false)} /></div>}
          <div className="verdict" data-testid="verdict">
            <div className="verdict-main">
              <div className="row wrap" style={{ gap: 8 }}><h2 style={{ margin: 0 }}>{p.name}</h2><StatusBadge status={p.a.status} big /></div>
              <div className="tiny muted">{c.cat.group} · {p.status === 'live' ? t('common.orders', { n: p.orders }) : t('prod.draft')} · {c.usingOwnData ? t('data.own', { n: p.orders }) : t('data.est', { n: p.orders })}</div>
              <div className="verdict-title" data-testid="verdict-title">{adTitle}</div>
              <ul className="advice-why">{why.map((w, i) => <li key={i}>{w}</li>)}</ul>
              <button type="button" className="btn secondary sm" style={{ marginTop: 10 }} onClick={() => go('s4')} data-testid="jump-price">{t('coach.jump')}<ArrowDown size={14} aria-hidden /></button>
            </div>
            <div className={`verdict-nums ${suggested != null ? 'four' : ''}`}>
              <div><span>{t('adv.yourPrice')}</span><b className="num">{inr(c.price)}</b><em className={`num ${profitTone}`}>{c.priceProfit != null ? `${inrSigned(c.priceProfit)} ${t('term.perOrder')}` : t('s1.noPrice')}</em></div>
              <div><span>{t('adv.floor')}</span><b className="num red">{inr(c.now.floor)}</b><em>{t('s1.dont')}</em></div>
              <div><span>{t('adv.zone')}</span><b className="num green">{c.zone?.label}</b><em>{t('s2.busy')}</em></div>
              {suggested != null && <div className="v-sugg"><span>{t('s4.compare.suggested')}</span><b className="num">{inr(suggested)}</b><em>{advice.kind === 'fix_then' || advice.kind === 'fix_then_above' ? t('coach.afterFixes') : t('coach.useIt')}</em></div>}
            </div>
          </div>
        </Card>
        <StepNav t={t} go={go} />

        {/* 1 — no-loss price */}
        <Step id="s1" n={1} title={t('s1.title')} sub={t('term.floorHelp')}>
          <div className="s1-grid">
            <div className="floor-hero" data-testid="floor-hero">
              <div className="tiny" style={{ fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}><ShieldAlert size={14} aria-hidden /> {t('s1.dont')}</div>
              <div className="floor-num num" data-testid="floor">{inr(c.now.floor)}</div>
              <p className="small">{t('s1.below')}</p>
              <LossProfitBar floor={c.now.floor} price={c.price} profit={c.priceProfit} t={t} />
            </div>
            <div className="you-tell">
              <h3>{t('s1.inputs')}</h3>
              <p className="tiny muted">{t('s1.inputsSub')}</p>
              <div className="grid cols-2" style={{ marginTop: 8 }}>
                <label className="field"><span>{t('s1.cost')}</span><span className="input-wrap big"><span className="affix">₹</span><input inputMode="decimal" value={costText.cost} onChange={setCost('cost')} data-testid="in-cost" /></span><span className="hint">{t('s1.costHint')}</span></label>
                <label className="field"><span>{t('s1.pack')}</span><span className="input-wrap big"><span className="affix">₹</span><input inputMode="decimal" value={costText.packaging} onChange={setCost('packaging')} data-testid="in-pack" /></span><span className="hint">{t('s1.packHint')}</span></label>
              </div>
            </div>
          </div>
          <FloorFormula sheet={c.sheet} t={t} />
          <FloorTrend history={fh} t={t} />
          <button type="button" className="btn ghost sm" onClick={() => setShowSheet((v) => !v)} aria-expanded={showSheet} data-testid="how-btn" style={{ marginTop: 8 }}>
            {showSheet ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}{showSheet ? t('s1.hide') : t('s1.how', { floor: inr(c.now.floor) })}
          </button>
          {showSheet && <CostSheet sheet={c.sheet} after={c.allApplied ? null : c.sheetBest} t={t} />}
        </Step>

        {/* 2 — where buyers buy */}
        <Step id="s2" n={2} title={t('s2.title')} sub={t('s2.sub')} aside={<InfoTip align="right">{t('term.busyHelp')}</InfoTip>}>
          <div className={`banner big tone-${c.pricePosition === 'in_zone' ? 'green' : c.pricePosition ? 'amber' : 'teal'}`} data-testid="insight">
            <Info size={18} aria-hidden /><span>{t(insightKey, { zone: c.zone.label, price: inr(c.price) })}</span>
          </div>
          <ZoneBar buckets={c.demand.buckets} zone={c.zone} floor={c.now.floor} price={c.price} suggested={suggested} t={t} />
          <DemandChart coach={c} t={t} price={c.price} suggested={suggested} />
          <div className="banner tone-teal" style={{ marginTop: 10 }}>{t('s2.cheapNote', { cheap: c.cheapest.label })}</div>
          <CompetitorSnapshot product={p} coach={c} t={t} />
          <div className="bridge" data-testid="bridge">
            <div>
              <div className="bridge-k">{t('bridge.so')}</div>
              <div className="bridge-t">{suggested != null
                ? t('bridge.text', { zone: c.zone.label, target: inr(c.targetMargin) })
                : advice.kind === 'keep' ? t('bridge.keep', { zone: c.zone.label }) : t('bridge.none')}</div>
            </div>
            {suggested != null && <button type="button" className="btn primary" onClick={() => go('s4')}>{t('bridge.cta', { price: inr(suggested) })}<ArrowRight size={15} aria-hidden /></button>}
          </div>
        </Step>

        {/* 3 — lower your cost */}
        <Step id="s3" n={3} title={t('s3.title')} sub={t('s3.sub', { price: inr(c.focusPrice) })}
          aside={c.fixes.some((f) => !f.applied) ? <Button size="sm" onClick={applyAll} data-testid="apply-all">{t('fix.applyAll')}</Button> : (c.fixes.length ? <span className="badge tone-green">{t('s3.allDone')}</span> : null)}>
          {c.fixes.length ? (
            <>
              <ProfitMeter coach={c} t={t} />
              <div className="fix-list">{c.fixes.map((f) => <FixCard key={f.id} fix={f} coach={c} t={t} onToggle={() => toggleFix(p.id, f.id)} />)}</div>
            </>
          ) : <p className="muted">{t('fix.none')}</p>}
        </Step>

        {/* 4 — the price */}
        <Step id="s4" n={4} title={t('s4.title')}>
          <PricePanel coach={c} advice={advice} t={t} onUse={usePrice} onApplyAll={applyAll} />
        </Step>

        {/* 5 — after you list */}
        <Step id="s5" n={5} title={t('s5.title')}>
          <div className="grid cols-3">
            <div className="after-card">
              <h3>{c.usingOwnData ? t('s5.own', { n: c.ordersSoFar }) : t('s5.estimates')}</h3>
              <div className="progress" aria-label={`${Math.min(30, c.ordersSoFar)} of 30 orders`}><span style={{ width: `${Math.min(100, (c.ordersSoFar / 30) * 100)}%` }} /></div>
              <p className="tiny muted">{Math.min(30, c.ordersSoFar)} / 30</p>
              <p className="small">{t(c.usingOwnData ? 's5.ownBody' : 's5.estBody')}</p>
            </div>
            <div className="after-card">
              <h3>{t('s5.pehla')}</h3>
              <p className="small">{t('s5.pehlaBody', { zone: c.zone.label })}</p>
              <PehlaTees zone={c.zone} t={t} />
              <p className="tiny muted">{t('s5.pehlaNote')}</p>
            </div>
            <div className="after-card">
              <h3><Radar size={16} aria-hidden /> {t('nav.watch')}</h3>
              <p className="small">{t('s5.watch')}</p>
              <Button variant="secondary" size="sm" to="/watch" style={{ marginTop: 8 }}>{t('s5.openWatch')}</Button>
            </div>
          </div>
        </Step>

        {/* expert detail, out of the seller's way */}
        <section className="card expert-wrap">
          <button type="button" className="expert-toggle" onClick={() => setExpertOpen((v) => !v)} aria-expanded={expertOpen} data-testid="expert-toggle">
            <div><h2>{t('expert.title')}</h2><p className="small muted">{t('expert.sub')}</p></div>
            {expertOpen ? <ChevronUp size={20} aria-hidden /> : <ChevronDown size={20} aria-hidden />}
          </button>
          {expertOpen && <div className="card-body"><ExpertPanel key={`${p.cost}-${p.packaging}`} product={p} defaults={defaults} effective={c.inputs} onChange={setExpertBase} /></div>}
        </section>
      </div>
    </>
  );
}

/** Red below the no-loss price, green above, with the seller's price marked. */
function LossProfitBar({ floor, price, profit, t }) {
  const lo = floor - 90, hi = floor + 90;
  const x = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="lpbar" role="img" aria-label={`No-loss price ${inr(floor)}${price != null ? `, your price ${inr(price)}` : ''}`}>
      <div className="lp-track"><span className="lp-loss" /><span className="lp-gain" /></div>
      <div className="lp-floor" style={{ left: '50%' }}><em>{inr(floor)}</em></div>
      {price != null && (
        <div className={`lp-price ${profit < 0 ? 'neg' : 'pos'}`} style={{ left: x(price) }}>
          <span>{t('s1.atYour', { price: inr(price) })}: <b>{inrSigned(profit)}</b></span>
        </div>
      )}
      <div className="lp-labels"><span>{t('term.loss')}</span><span>{t('term.profit')}</span></div>
    </div>
  );
}

/** Illustrative look-back (deck slide 7): share of similar launches still getting orders at day 90, by launch price. */
function PehlaTees({ zone, t }) {
  const rows = [[`< ₹${zone.lo}`, 25, 'red'], [zone.label, 60, 'green'], [`> ₹${zone.hi}`, 20, 'amber']];
  return (
    <div className="pehla" data-testid="pehla">
      {rows.map(([label, v, tone]) => (
        <div key={label} className="pehla-row"><span className="num">{label}</span><span className="pehla-bar"><span className={`tone-${tone}`} style={{ width: `${v}%` }} /></span><b className="num">{v}%</b></div>
      ))}
      <p className="tiny muted">day 90 · {t('common.illustrative')}</p>
    </div>
  );
}
