import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, FlaskConical, AlertTriangle, Sparkles, Check, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card, Button, Select, InfoTip } from '../components/ui/index.js';
import { AdsCurveChart } from '../components/growth/AdsCurveChart.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { buildCoach } from '../engine/coach.js';
import { adsCurve, priceAdsPlan, spendZone, roundSpend } from '../engine/ads.js';
import { inr, inrSigned, num, numSigned } from '../lib/format.js';

const rv = (n) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);   // views
const rc = (n) => (n >= 20 ? Math.round(n / 5) * 5 : Math.round(n));                  // clicks
const r50 = (n) => Math.round(n / 50) * 50 + 0;

/** One "now → with ads" tile, in the same style as the views · clicks · orders tiles in Price Coach. */
function Tile({ label, from, to, fmt = num, deltaFmt = numSigned, big }) {
  const d = to - from;
  return (
    <div className={`mv-cell ${big ? 'ad-big' : ''}`}>
      <span className="mv-l">{label}</span>
      <span className="mv-v"><span className="mv-from">{fmt(from)}</span><span className="mv-arrow">→</span><b>{fmt(to)}</b></span>
      <span className={`mv-chip ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}`}>{deltaFmt(d)}</span>
    </div>
  );
}

export default function AdsPlanner() {
  const t = useT();
  const { items, selected, select, updateProduct, notify } = useProducts();
  const p = selected;
  const c = useMemo(() => buildCoach(p, { status: p.a.status }), [p]);
  const plan = useMemo(() => (c.valid ? priceAdsPlan({ product: p, coach: c }) : null), [p, c]);
  const suggested = c.valid ? (c.recAll.price ?? c.recAll.hold ?? Math.round(c.now.priceWithTargetMargin)) : null;
  const bestAdsPrice = plan?.bestWithAds?.price ?? null;

  const [mode, setMode] = useState(p.listedPrice != null ? 'mine' : 'suggested');
  const [custom, setCustom] = useState('');
  useEffect(() => { setMode(p.listedPrice != null ? 'mine' : 'suggested'); setCustom(''); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const price = mode === 'mine' ? p.listedPrice : mode === 'bestAds' ? bestAdsPrice : mode === 'custom' ? (Number(custom) > 0 ? Math.round(Number(custom)) : null) : suggested;
  const curve = useMemo(() => (c.valid && price != null ? adsCurve({ product: p, coach: c, price }) : null), [p, c, price]);
  const [spend, setSpend] = useState(0);
  useEffect(() => { setSpend(curve ? roundSpend(curve.bestSpend) : 0); }, [curve]);

  if (!c.valid) return <Card title={p.name}><div className="banner tone-red" role="alert">{c.errors.join('. ')}.</div></Card>;

  const chips = [
    p.listedPrice != null && { id: 'mine', label: t('ad.p.mine', { price: inr(p.listedPrice) }) },
    suggested != null && { id: 'suggested', label: t('ad.p.sugg', { price: inr(suggested) }) },
    bestAdsPrice != null && { id: 'bestAds', label: t('ad.p.best', { price: inr(bestAdsPrice) }) },
    { id: 'custom', label: t('ad.p.custom') },
  ].filter(Boolean);

  const cur = curve?.at(spend), none = curve?.none, best = curve?.best;
  const zone = curve ? spendZone(curve, spend) : 'none';
  const bestRounded = curve ? roundSpend(curve.bestSpend) : 0;
  const atBest = curve?.at(bestRounded);
  const floorNow = curve?.floorNoAds, floorAds = curve && spend > 0 ? curve.floorWith(spend) : floorNow;

  const usePrice = (np) => {
    updateProduct(p.id, { listedPrice: np });
    notify(t('ad.used', { price: inr(np), name: p.name }));
    setMode('mine');
  };

  return (
    <>
      <div className="page-head">
        <div><h1>{t('ad.title')}</h1><p>{t('ad.sub')}</p></div>
      </div>
      <div className="stack">
        {/* 0 — product and price */}
        <Card>
          <div className="ad-pick">
            <Select label={t('coach.product')} value={p.id} onChange={(e) => select(e.target.value)} data-testid="ads-product"
              options={items.map((it) => ({ value: it.id, label: it.name }))} />
            <div className="field">
              <span>{t('ad.planAt')}</span>
              <div className="chips" role="group" aria-label={t('ad.planAt')}>
                {chips.map((ch) => (
                  <button key={ch.id} type="button" className={`chip ${mode === ch.id ? 'on' : ''}`} aria-pressed={mode === ch.id} onClick={() => setMode(ch.id)} data-testid={`ads-price-${ch.id}`}>{ch.label}</button>
                ))}
                {mode === 'custom' && (
                  <span className="input-wrap ad-custom"><span className="affix">₹</span>
                    <input inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))} placeholder="399" aria-label={t('ad.p.custom')} data-testid="ads-custom" autoFocus /></span>
                )}
              </div>
            </div>
          </div>
          <div className="banner tone-teal" style={{ marginTop: 12 }}><FlaskConical size={16} aria-hidden /><span>{t('ad.simNote', { amt: inr(c.base.advertisingCost) })}</span></div>
        </Card>

        {!curve && <Card><div className="empty-state"><Megaphone size={30} aria-hidden /><b>{t('ad.noPrice')}</b></div></Card>}

        {curve && curve.belowFloor && (
          <div className="banner big tone-red" role="alert" data-testid="ads-below-floor"><ShieldAlert size={18} aria-hidden />
            <span>{t('ad.belowFloor', { price: inr(price), floor: inr(curve.floorNoAds) })} <Link className="linklike" to="/price-coach">{t('ad.toCoach')}</Link></span></div>
        )}
        {curve && !curve.belowFloor && !curve.pays && (
          <div className="banner big tone-amber" role="alert" data-testid="ads-no-pay"><AlertTriangle size={18} aria-hidden />
            <span>{t('ad.noPay', { price: inr(price), back: curve.r0.toFixed(2) })}</span></div>
        )}

        {curve && curve.pays && curve.sweet && (
          <>
            {/* 1 — the answer */}
            <section className="ad-hero" data-testid="ads-hero">
              <div className="ad-hero-k"><Sparkles size={15} aria-hidden />{t('ad.hero.k', { price: inr(price) })}</div>
              <h2 className="ad-hero-h">{t('ad.hero.h', { lo: inr(r50(curve.sweet.lo)), hi: inr(r50(curve.sweet.hi)), dlo: inr(Math.round(curve.sweet.lo / 30)), dhi: inr(Math.round(curve.sweet.hi / 30)) })}</h2>
              <p className="ad-hero-p">{t('ad.hero.p', { amt: inr(bestRounded), views: num(rv(atBest.adViews)), clicks: num(rc(atBest.adClicks)), orders: num(Math.round(atBest.adOrders)), profit: inrSigned(r50(atBest.gain)) })}</p>
              <div className="mv-grid" style={{ marginTop: 12 }}>
                <Tile label={t('fn.views')} from={none.views} to={rv(atBest.views)} />
                <Tile label={t('fn.clicks')} from={none.clicks} to={rc(atBest.clicks)} />
                <Tile label={t('fn.orders')} from={Math.round(none.orders)} to={Math.round(atBest.orders)} />
                <Tile label={t('fn.total')} from={r50(none.totalProfit)} to={r50(atBest.totalProfit)} fmt={inr} deltaFmt={inrSigned} big />
              </div>
              <p className="tiny ad-hero-note">{t('ad.hero.note', { per: inr(Math.round(atBest.adCostPerOrder)), roas: atBest.roas.toFixed(1) })}</p>
            </section>

            {/* 2 — find your budget */}
            <Card title={t('ad.find')} subtitle={t('ad.findSub')}>
              <AdsCurveChart curve={curve} spend={spend} t={t} />
              <div className="ad-slider">
                <label htmlFor="ads-spend" className="row between">
                  <b>{t('ad.yourBudget')}</b>
                  <span className={`badge tone-${zone === 'sweet' ? 'green' : zone === 'loss' ? 'red' : zone === 'none' ? 'grey' : 'amber'}`} data-testid="ads-zone">{t(`ad.z.${zone}`)}</span>
                </label>
                <div className="ex-track">
                  <span className="ex-zone ad-sweet-bar" style={{ left: `${(curve.sweet.lo / curve.maxSpend) * 100}%`, width: `${((curve.sweet.hi - curve.sweet.lo) / curve.maxSpend) * 100}%` }} />
                  <input id="ads-spend" type="range" min="0" max={curve.maxSpend} step="50" value={spend} onChange={(e) => setSpend(Number(e.target.value))} data-testid="ads-slider"
                    aria-valuetext={`${inr(spend)} ${t('ad.perMonth')}`} />
                </div>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="big-num num">{inr(spend)}</span><span className="muted small">{t('ad.perMonth')} · {t('ad.perDay', { amt: inr(Math.round(spend / 30)) })}</span>
                  <span className="spacer" style={{ flex: 1 }} />
                  {spend !== bestRounded && <Button size="sm" variant="secondary" onClick={() => setSpend(bestRounded)} data-testid="ads-reset">{t('ad.backBest', { amt: inr(bestRounded) })}</Button>}
                </div>
              </div>
              <div className="ex-read six" style={{ marginTop: 12 }} data-testid="ads-readout">
                <div><span className="tiny muted">{t('ad.r.views')}</span><b className="num">{numSigned(rv(cur.adViews))}</b></div>
                <div><span className="tiny muted">{t('ad.r.clicks')}</span><b className="num">{numSigned(rc(cur.adClicks))}</b></div>
                <div><span className="tiny muted">{t('ad.r.orders')}</span><b className="num">{numSigned(Math.round(cur.adOrders))}</b></div>
                <div><span className="tiny muted">{t('ad.r.gain')}</span><b className={`num ${cur.gain < 0 ? 'neg' : 'pos'}`}>{inrSigned(r50(cur.gain))}</b></div>
                <div><span className="tiny muted">{t('ad.r.cpo')}<InfoTip>{t('ad.r.cpoTip')}</InfoTip></span><b className="num">{inr(Math.round(cur.adCostPerOrder))}</b></div>
                <div><span className="tiny muted">{t('ad.r.next')}<InfoTip>{t('ad.r.nextTip')}</InfoTip></span><b className={`num ${cur.nextRupee < 1 ? 'neg' : ''}`}>₹{cur.nextRupee.toFixed(2)}</b></div>
              </div>
              <p className="small" style={{ marginTop: 10 }} data-testid="ads-zone-text">{t(`ad.zt.${zone}`, { lo: inr(r50(curve.sweet.lo)), hi: inr(r50(curve.sweet.hi)), be: inr(r50(curve.breakEven)), best: inr(bestRounded) })}</p>
            </Card>

            {/* 3 — ads are a cost per order */}
            <Card title={t('ad.cost')} subtitle={t('ad.costSub')}>
              <div className="floor-effect" data-testid="ads-floor">
                <div><span className="k">{t('ad.floorBefore')}</span><b className="num">{inr(floorNow)}</b></div>
                <span className="mv-arrow" aria-hidden>→</span>
                <div><span className="k">{t('ad.floorAfter', { amt: inr(spend) })}</span><b className="num">{inr(floorAds)}</b></div>
                <div><span className="k">{t('ad.r.cpo')}</span><b className="num">{inr(Math.round(cur.adCostPerOrder))}</b></div>
              </div>
              <p className="small" style={{ marginTop: 10 }}>
                {price >= floorAds
                  ? <><Check size={14} aria-hidden className="pos" /> {t('ad.floorOk', { price: inr(price), floor: inr(floorAds), left: inr(Math.round(curve.E - cur.adCostPerOrder)) })}</>
                  : <span className="neg">{t('ad.floorBad', { price: inr(price), floor: inr(floorAds) })}</span>}
              </p>
            </Card>
          </>
        )}

        {/* 4 — price and ads together */}
        {plan && plan.bestWithAds && (
          <Card title={t('ad.combo')} subtitle={t('ad.comboSub')}>
            {plan.bestNoAds && (
              <div className="banner big tone-green" data-testid="ads-combo-head"><Sparkles size={18} aria-hidden />
                <span>{plan.bestWithAds.price > plan.bestNoAds.price
                  ? t('ad.combo.higher', { amt: inr(plan.bestWithAds.spend), price: inr(plan.bestWithAds.price), diff: inr(plan.bestWithAds.price - plan.bestNoAds.price), base: inr(plan.bestNoAds.price), a: inr(r50(plan.bestNoAds.noAds.totalProfit)), b: inr(r50(plan.bestWithAds.withAds.totalProfit)) })
                  : t('ad.combo.same', { amt: inr(plan.bestWithAds.spend), price: inr(plan.bestWithAds.price), a: inr(r50(plan.bestNoAds.noAds.totalProfit)), b: inr(r50(plan.bestWithAds.withAds.totalProfit)) })}</span>
              </div>
            )}
            <div className="ladder" role="table" aria-label={t('ad.combo')} data-testid="ads-combo">
              <div className="l-row ad-row l-hd" role="row">
                <span role="columnheader">{t('ad.c.price')}</span>
                <span role="columnheader" className="r">{t('ad.c.budget')}</span>
                <span role="columnheader" className="r">{t('ad.c.orders')}</span>
                <span role="columnheader" className="r">{t('ad.c.noAds')}</span>
                <span role="columnheader" className="r">{t('ad.c.withAds')}</span>
                <span role="columnheader" />
              </div>
              {plan.rows.map((r) => {
                const isBest = r === plan.bestWithAds, isBase = r === plan.bestNoAds;
                return (
                  <div key={r.bucket.lo} role="row" className={`l-row ad-row ${isBest ? 'sugg' : ''} ${r.loss ? 'loss' : ''} ${r.price === price ? 'now' : ''}`} data-testid={`combo-${r.bucket.lo}`}>
                    <span role="cell" className="l-price"><b className="num">{inr(r.price)}</b><span className="tiny muted">{r.curve.label}</span>
                      <span className="l-tags">{isBest && <span className="badge tone-green">{t('ad.c.bestAds')}</span>}{isBase && <span className="badge tone-grey">{t('ad.c.bestNo')}</span>}</span></span>
                    {r.loss ? <span role="cell" className="neg small ad-loss">{t('ad.c.loss')}</span> : <>
                      <span role="cell" className="l-v r num"><span className="tiny muted">{t('ad.c.budget')}</span>{r.spend > 0 ? inr(r.spend) : t('ad.c.skip')}</span>
                      <span role="cell" className="l-v r num"><span className="tiny muted">{t('ad.c.orders')}</span>{Math.round(r.noAds.orders)} → {Math.round(r.withAds.orders)}</span>
                      <span role="cell" className="l-v r num"><span className="tiny muted">{t('ad.c.noAds')}</span>{inr(r50(r.noAds.totalProfit))}</span>
                      <span role="cell" className="l-v r num"><span className="tiny muted">{t('ad.c.withAds')}</span><b>{inr(r50(r.withAds.totalProfit))}</b></span>
                    </>}
                    <span role="cell" className="r">{!r.loss && r.price !== price && <Button size="sm" variant="ghost" onClick={() => { setMode('custom'); setCustom(String(r.price)); }}>{t('ad.c.try')}</Button>}</span>
                  </div>
                );
              })}
            </div>
            <div className="row wrap" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              {p.listedPrice !== plan.bestWithAds.price && <Button onClick={() => usePrice(plan.bestWithAds.price)} data-testid="ads-use">{t('ad.use', { price: inr(plan.bestWithAds.price) })}</Button>}
              <Button variant="secondary" to="/price-coach">{t('ad.toCoach')}<ArrowRight size={15} aria-hidden /></Button>
            </div>
          </Card>
        )}

        <Card title={t('ad.how')}>
          <ul className="ad-how small">
            <li>{t('ad.how.1')}</li><li>{t('ad.how.2')}</li><li>{t('ad.how.3')}</li><li>{t('ad.how.4')}</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
