import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, PartyPopper, BellRing, ArrowRight } from 'lucide-react';
import { Card, Badge, Sparkline, Select, StatusBadge } from '../components/ui/index.js';
import { Link } from 'react-router-dom';
import { moveHeadline } from '../components/seller/MoveImpact.jsx';
import { SignalCard } from '../components/product/SignalCard.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT, useLang } from '../i18n/LanguageContext.jsx';
import { LIFECYCLE } from '../data/activity.js';
import { WATCH_HISTORY } from '../data/watchHistory.js';
import { CATEGORIES } from '../data/categories.js';
import { allSignals, festiveCheck } from '../engine/watchAll.js';
import { effectiveInputs } from '../engine/model.js';
import { calculate } from '../engine/calculator.js';
import { blendedRto } from '../engine/floor.js';
import { inr, inrSigned, pct } from '../lib/format.js';
import { STATUS } from '../engine/position.js';
import { buildCoach } from '../engine/coach.js';
import { compareMove } from '../engine/funnel.js';
import { matchCheck } from '../engine/competitors.js';

const last = (a) => a[a.length - 1];
const move = (a) => (last(a) - a[0]) / a[0];
const STAGE_ICON = { Launch: '🚀', Learn: '📚', Grow: '🌱', Defend: '🛡️', Clear: '🧹' };

export default function Watch() {
  const { selected, items, select, competitorsOf } = useProducts();
  const t = useT();
  const { lang } = useLang();
  const nav = useNavigate();
  const all = useMemo(() => allSignals(items), [items]);
  // alerts grouped by product, most urgent product first
  const groups = useMemo(() => items.map((p) => ({ p, list: all.filter((s) => s.productId === p.id) }))
    .filter((g) => g.list.length).sort((a, b) => STATUS[a.p.a.status].rank - STATUS[b.p.a.status].rank), [items, all]);
  // the weekly check focuses on a live product: the one selected elsewhere if it is live, else the first with alerts
  const [focusId, setFocusId] = useState(() => (WATCH_HISTORY[selected.id] ? selected.id : groups[0]?.p.id ?? selected.id));
  const p = items.find((x) => x.id === focusId) ?? selected;
  const cat = CATEGORIES[p.categoryId];
  const h = WATCH_HISTORY[p.id];
  const mine = all.filter((s) => s.productId === p.id);
  const calc = useMemo(() => calculate({ ...effectiveInputs(p), price: p.listedPrice ?? undefined }), [p]);
  const fest = useMemo(() => festiveCheck(p), [p]);
  const catRto = blendedRto(cat.codShare, cat.rtoCod, cat.rtoPrepaid);
  const openCoach = (id) => { select(id); nav('/price-coach'); };
  const covTone = (d) => (d > 60 ? 'red' : d > 45 ? 'amber' : 'green');
  const top = mine[0];

  // competitor price moves in the last two weeks, for the competitors the seller picked (simulated history)
  const coachP = useMemo(() => buildCoach(p, { status: p.a.status }), [p]);
  const tracked = competitorsOf(p).tracked;
  const rivals = useMemo(() => {
    if (!coachP.valid) return [];
    return tracked.flatMap((comp) => {
      const h = comp.history;
      if (!h || h.length < 3) return [];
      const was = h[h.length - 3], now = h[h.length - 1], pctMove = (now - was) / was;
      if (Math.abs(pctMove) < 0.03) return [];
      const chk = matchCheck({ inputs: coachP.inputs, price: comp.price, floor: coachP.now.floor, floorPlusMargin: coachP.now.priceWithTargetMargin, target: coachP.targetMargin });
      const cheaper = p.listedPrice != null && comp.price < p.listedPrice;
      const mv = cheaper && chk && chk.verdict !== 'below_floor'
        ? compareMove({ product: p, buckets: coachP.demand.buckets, nowPrice: p.listedPrice, nowInputs: coachP.inputs, toPrice: comp.price, toInputs: coachP.inputs }) : null;
      return [{ comp, was, now, pctMove, chk, mv }];
    });
  }, [coachP, tracked, p]);

  return (
    <>
      <div className="page-head"><div><h1>{t('watch.title')}</h1><p>{t('watch.sub')}</p></div></div>
      {lang !== 'en' && <p className="tiny muted" style={{ marginTop: -12, marginBottom: 12 }}>{t('watch.engineNote')}</p>}
      <div className="grid main-side">
        <section aria-labelledby="alerts-h" className="stack tight">
          <div className="row between">
            <div><h2 id="alerts-h">{t('watch.alerts')}</h2><p className="small muted">{t('watch.alertsSub', { n: all.length })} · {t('watch.products', { n: groups.length })}</p></div>
          </div>
          {groups.length ? groups.map(({ p: gp, list }) => (
            <div key={gp.id} className={`alert-group ${gp.id === p.id ? 'on' : ''}`} data-testid={`group-${gp.id}`}>
              <button type="button" className="ag-head" onClick={() => setFocusId(gp.id)} aria-pressed={gp.id === p.id}>
                <span className="ag-bell"><BellRing size={16} aria-hidden /></span>
                <span className="ag-name"><b>{gp.name}</b><span className="tiny muted">{t(list.length === 1 ? 'watch.nAlert1' : 'watch.nAlerts', { n: list.length })} · {t('watch.seeCheck')}</span></span>
                <StatusBadge status={gp.a.status} />
              </button>
              {list.map((s) => <SignalCard key={s.key} signal={{ ...s, icon: STAGE_ICON[s.stage] }} onOpenCoach={() => openCoach(s.productId)} />)}
            </div>
          )) : <Card><div className="banner tone-green">{t('watch.none')}</div></Card>}
        </section>

        <div className="stack watch-side">
          <Card title={t('watch.check')} subtitle={`${cat.group} · ${h ? t('watch.weeks') : t('watch.notLive')}`}>
            <Select label={t('coach.product')} value={p.id} onChange={(e) => setFocusId(e.target.value)} data-testid="watch-select"
              options={items.map((it) => ({ value: it.id, label: `${it.name}${WATCH_HISTORY[it.id] ? '' : ` · ${t('prod.draft')}`}` }))} />
            {h ? (
              <div className="watch-grid" style={{ marginTop: 12 }}>
                <div className="watch-cell"><div className="k">{t('m.floor')}</div><div className="v red">{inr(calc.floor)}</div><div className="tiny muted">{t('adv.yourPrice')} {inr(p.listedPrice)}</div></div>
                <div className="watch-cell"><div className="k">{t('m.rank')}</div><div className="v">{p.rank ?? '—'}</div></div>
                <div className="watch-cell"><div className="k">{t('m.conv')}</div><div className="v" style={{ color: (p.conv ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{(p.conv ?? 0) >= 0 ? '▲' : '▼'} {(p.conv ?? 0) >= 0 ? t('watch.better') : t('watch.worse')}</div><Sparkline values={h.conversionPp} tone={(p.conv ?? 0) >= 0 ? 'green' : 'red'} width={110} /></div>
                <div className="watch-cell"><div className="k">{t('m.rating')}</div><div className="v">{last(h.rating) != null ? `★ ${last(h.rating).toFixed(1)}` : '—'}</div><Sparkline values={h.rating} tone="plum" width={110} /></div>
                <div className="watch-cell"><div className="k">{t('m.rto')}</div><div className="v">{t('watch.of100', { n: Math.round(h.ownRto * 100) })}</div><div className="tiny muted">{t('watch.catAvg', { v: Math.round(catRto * 100) })}</div></div>
                <div className="watch-cell"><div className="k">{t('m.returns')}</div><div className="v">{t('watch.of100', { n: Math.round(h.ownReturns * 100) })}</div><div className="tiny muted">{t('watch.catAvg', { v: Math.round(cat.returnRate * 100) })}</div></div>
                <div className="watch-cell"><div className="k">{t('m.stock')}</div><div className="v" style={{ color: `var(--${covTone(last(h.stockCover))})` }}>{t('watch.days', { n: Math.round(last(h.stockCover)) })}</div><Sparkline values={h.stockCover} tone={covTone(last(h.stockCover))} width={110} /></div>
                <div className="watch-cell"><div className="k">{t('m.median')}</div><div className="v">{inr(cat.band.median)}</div><div className="tiny muted">{move(h.groupMedian) >= 0 ? '+' : ''}{(move(h.groupMedian) * 100).toFixed(1)}% · 8 {t('watch.wk')}</div></div>
              </div>
            ) : (
              <div className="banner tone-teal" style={{ marginTop: 12 }}>
                <span><b>{t('watch.forecast')}:</b> {LIFECYCLE[0].fires}. {LIFECYCLE[1].fires}.</span>
              </div>
            )}
            <button type="button" className="btn secondary sm" style={{ marginTop: 12 }} onClick={() => openCoach(p.id)}>{t('watch.openCoach')}<ArrowRight size={13} aria-hidden /></button>
          </Card>

          <Card title={t('watch.rivals')} subtitle={t('watch.rivalsSub')}>
            <div data-testid="rival-moves">
              {tracked.length === 0 ? <p className="small muted">{t('watch.rivalsNone')}</p>
                : rivals.length === 0 ? <div className="banner tone-green">{t('watch.rivalsQuiet', { n: tracked.length })}</div>
                : rivals.map((r) => (
                  <div key={r.comp.id} className={`rival ${r.chk?.verdict === 'below_floor' ? 'bad' : ''}`}>
                    <b>{t(r.pctMove < 0 ? 'watch.rivalCut' : 'watch.rivalRaise', { name: r.comp.name, was: inr(r.was), now: inr(r.now) })}</b>
                    {r.chk && <p className="small">{t(`cp.chk.${r.chk.verdict}`, { price: inr(r.now), floor: inr(coachP.now.floor), loss: inr(r.chk.loss ?? 0), profit: inr(r.chk.profit), target: inr(coachP.targetMargin) })}</p>}
                    {r.mv && <p className="small">{moveHeadline(r.mv, t, r.comp.price)[0]}</p>}
                  </div>
                ))}
              <Link to="/competitors" className="btn secondary sm" style={{ marginTop: 10 }}>{t('snap.open')}<ArrowRight size={13} aria-hidden /></Link>
              <p className="tiny muted" style={{ marginTop: 6 }}>{t('watch.rivalsNote')}</p>
            </div>
          </Card>

          <Card title={t('watch.wa')}>
            <div className="wa" data-testid="wa-preview">
              <div className="wa-head"><span className="wa-dot" />Meesho · Farsh</div>
              <div className="wa-body">
                {top ? (
                  <div className="wa-bubble">
                    <b>{p.name}</b>
                    <p>⚠️ {top.title}</p>
                    <p>👉 {top.lever}</p>
                    <p className="wa-effect">💰 {top.effect}</p>
                    <div className="wa-btns"><span>{t('watch.openCoach')}</span></div>
                    <span className="wa-time">{t('watch.check')} <CheckCheck size={13} aria-hidden /></span>
                  </div>
                ) : (
                  <div className="wa-bubble"><p>✅ {p.name}: {t('watch.none')}</p><span className="wa-time"><CheckCheck size={13} aria-hidden /></span></div>
                )}
              </div>
            </div>
          </Card>

          {fest && fest.runs.length === 2 && (
            <Card title={<><PartyPopper size={16} aria-hidden /> {t('watch.festive')}</>} subtitle={t('watch.festiveSub')}>
              <div className="fest" data-testid="festive">
                <div><span className="tiny muted">{t('watch.festNow')}</span><b className="num">{inr(fest.floorToday)}</b></div>
                <ArrowRight size={18} aria-hidden className="muted" />
                <div><span className="tiny muted">{t('watch.festFloor')}</span><b className="num red">{inr(fest.runs[0].floor)}–{inr(fest.runs[1].floor)}</b></div>
              </div>
              <p className="small" style={{ marginTop: 8 }}>{t('watch.festiveBody', {
                lo: pct(fest.runs[0].level), hi: pct(fest.runs[1].level), f0: inr(fest.floorToday), f1: inr(fest.runs[0].floor), f2: inr(fest.runs[1].floor),
                price: inr(fest.price), p1: inrSigned(fest.runs[0].profit), p2: inrSigned(fest.runs[1].profit),
              })}</p>
              <div className="banner tone-green" style={{ marginTop: 8 }}>{t('watch.festiveFix')}</div>
              <p className="tiny muted" style={{ marginTop: 6 }}>{t('watch.festiveNote')}</p>
            </Card>
          )}
        </div>
      </div>

      <Card flush title={t('watch.stages')} subtitle={t('watch.stagesSub')} className="mt">
        <div className="stages">
          {LIFECYCLE.map((r, i) => (
            <div key={r.stage} className="stage">
              <div className="stage-top"><span className="stage-ic" aria-hidden>{STAGE_ICON[r.stage]}</span><div><b>{r.stage}</b><div className="tiny muted">{r.when}</div></div>{i < LIFECYCLE.length - 1 && <span className="stage-arrow" aria-hidden>→</span>}</div>
              <dl>
                <div><dt>{t('st.watch')}</dt><dd>{r.watch}</dd></div>
                <div className="fires"><dt>{t('st.fires')}</dt><dd>{r.fires}</dd></div>
                <div className="leave"><dt>{t('st.leave')}</dt><dd>{r.leave}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
