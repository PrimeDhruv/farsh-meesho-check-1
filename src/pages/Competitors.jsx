import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Check, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, Minus, EyeOff, ArrowRight, FlaskConical, Info } from 'lucide-react';
import { Card, Button, Select } from '../components/ui/index.js';
import { PriceTrendChart } from '../components/seller/PriceTrendChart.jsx';
import { moveHeadline } from '../components/seller/MoveImpact.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { buildCoach } from '../engine/coach.js';
import { compareMove } from '../engine/funnel.js';
import { suggestionReasons, checkItems, rankSuggestions, priceMove, matchCheck, compareWithSelected } from '../engine/competitors.js';
import { weekLabel } from '../engine/history.js';
import { inr, inrSigned, pctSigned } from '../lib/format.js';

const TILE = { kurtis: '👗', kurtaset: '👚', bottoms: '👖', leggings: '🩱', dupatta: '🧣', footwear: '👡', home: '🧴', bags: '👜' };
const DAY = 86400000;

/** Weekly labels ending today, oldest first (8 points, like the simulated history). */
const weekLabels = () => Array.from({ length: 8 }, (_, w) => weekLabel(new Date(Date.now() - (7 - w) * 7 * DAY)));

/** A labelled placeholder where the listing photo would be: this prototype has no listing images. */
function Tile({ comp, t }) {
  return (
    <div className="comp-tile" role="img" aria-label={t('cp.noImage')}>
      <span aria-hidden>{TILE[comp.categoryId] ?? '🛍️'}</span>
      <em>{t('cp.noImageShort')}</em>
    </div>
  );
}

export default function Competitors() {
  const t = useT();
  const nav = useNavigate();
  const { items, selected, select, competitorsOf, toggleCompetitor, dismissCompetitor, addCustomCompetitor, removeCustomCompetitor, notify } = useProducts();
  const p = selected;
  const c = useMemo(() => buildCoach(p, { status: p.a.status }), [p]);
  const { tracked, suggestions, hidden } = competitorsOf(p);
  const [showHidden, setShowHidden] = useState(false);
  const [form, setForm] = useState({ name: '', price: '' });
  const [formErr, setFormErr] = useState('');
  const ranked = useMemo(() => rankSuggestions(suggestions, p, p.listedPrice), [suggestions, p]);
  const cmp = compareWithSelected(p.listedPrice, tracked);
  const labels = useMemo(weekLabels, []);

  if (!c.valid) return <Card title={p.name}><div className="banner tone-red" role="alert">{c.errors.join('. ')}.</div></Card>;
  const floor = c.now.floor;
  const checkOf = (comp) => matchCheck({ inputs: c.inputs, price: comp.price, floor, floorPlusMargin: c.now.priceWithTargetMargin, target: c.targetMargin });
  const below = tracked.filter((x) => x.price < floor).length;

  const series = [
    ...(p.listedPrice != null ? [{ id: 'you', kind: 'you', label: t('cp.you'), short: t('cp.you'), values: Array(8).fill(p.listedPrice) }] : []),
    { id: 'floor', kind: 'floor', label: t('cp.floorLine'), short: t('zb.floor'), values: Array(8).fill(Math.round(floor)) },
    ...tracked.map((x, i) => ({ id: x.id, kind: 'comp', index: i, label: x.name, short: `#${i + 1}`, values: x.history })),
  ];

  const add = (e) => {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim()) return setFormErr(t('cp.err.name'));
    if (!Number.isFinite(price) || price <= 0) return setFormErr(t('cp.err.price'));
    addCustomCompetitor(p.id, { name: form.name.trim(), price: Math.round(price) });
    setForm({ name: '', price: '' }); setFormErr('');
    notify(t('cp.added', { name: form.name.trim() }));
  };
  const follow = (comp) => { toggleCompetitor(p.id, comp.id); notify(t('cp.followed', { name: comp.name })); };
  const unfollow = (comp) => { toggleCompetitor(p.id, comp.id); notify(t('cp.unfollowed', { name: comp.name }), 'amber'); };

  return (
    <>
      <div className="page-head">
        <div><h1>{t('cp.title')}</h1><p>{t('cp.sub')}</p></div>
      </div>
      <div className="stack">
        <Card>
          <Select label={t('coach.product')} value={p.id} onChange={(e) => select(e.target.value)} data-testid="comp-product"
            options={items.map((it) => ({ value: it.id, label: it.name }))} />
          <div className="banner tone-teal" style={{ marginTop: 12 }}><FlaskConical size={16} aria-hidden /><span>{t('cp.simNote')}</span></div>
          <div className="comp-rule"><Info size={15} aria-hidden /><span>{t('cp.rule')}</span></div>
        </Card>

        {/* 1 — my competitors */}
        <Card title={t('cp.mine')} subtitle={t('cp.mineSub', { n: tracked.length })}>
          {tracked.length === 0 ? (
            <div className="empty-state" data-testid="comp-empty"><ShieldCheck size={32} aria-hidden /><b>{t('cp.emptyMine')}</b><span className="small muted">{t('cp.emptyMineSub')}</span></div>
          ) : (
            <>
              {cmp && (
                <div className="banner big tone-teal" data-testid="comp-summary">
                  <Info size={18} aria-hidden />
                  <span>{t(`cp.sum.${cmp.position}`, { price: inr(p.listedPrice), mid: inr(cmp.mid), gap: inr(Math.abs(cmp.gap)), lo: inr(cmp.lo), hi: inr(cmp.hi) })}{below > 0 ? ` ${t('cp.sum.below', { n: below, floor: inr(floor) })}` : ''}</span>
                </div>
              )}
              <div className="comp-list">
                {tracked.map((comp, i) => {
                  const mv = priceMove(comp.history);
                  const chk = checkOf(comp);
                  const cheaper = p.listedPrice != null && comp.price < p.listedPrice;
                  const move = cheaper && chk && chk.verdict !== 'below_floor'
                    ? compareMove({ product: p, buckets: c.demand.buckets, nowPrice: p.listedPrice, nowInputs: c.inputs, toPrice: comp.price, toInputs: c.inputs }) : null;
                  const diff = p.listedPrice != null ? comp.price - p.listedPrice : null;
                  return (
                    <article key={comp.id} className="comp-card" data-testid={`tracked-${comp.id}`}>
                      <div className="comp-head">
                        <Tile comp={comp} t={t} />
                        <div className="comp-main">
                          <h3><span className="comp-n">#{i + 1}</span> {comp.name}</h3>
                          <div className="tiny muted">{comp.custom ? t('cp.addedByYou') : `${comp.material} · ${comp.feature} · ★ ${comp.rating.toFixed(1)} · ${t('cp.simTag')}`}</div>
                        </div>
                        <div className="comp-price"><b className="num">{inr(comp.price)}</b>
                          {diff != null && <span className="tiny muted">{diff === 0 ? t('cp.samePrice') : t(diff < 0 ? 'cp.below' : 'cp.above', { amt: inr(Math.abs(diff)) })}</span>}</div>
                      </div>
                      <div className="comp-moves">
                        {mv.total == null ? <span className="tiny muted">{t('cp.historyToday')}</span> : (
                          <>
                            <span className={`mv-chip ${mv.total < 0 ? 'down' : mv.total > 0 ? 'up' : 'same'}`}>{mv.total < 0 ? <TrendingDown size={12} aria-hidden /> : mv.total > 0 ? <TrendingUp size={12} aria-hidden /> : <Minus size={12} aria-hidden />}{t('cp.in8', { amt: inrSigned(mv.total), pct: pctSigned(mv.pct) })}</span>
                            {mv.last !== 0 && <span className="tiny muted">{t('cp.lastWeek', { amt: inrSigned(mv.last) })}</span>}
                          </>
                        )}
                      </div>
                      {chk && (
                        <div className={`comp-check tone-${chk.verdict === 'below_floor' ? 'red' : chk.verdict === 'thin' ? 'amber' : 'green'}`} data-testid={`check-${comp.id}`}>
                          {chk.verdict === 'below_floor' ? <ShieldAlert size={16} aria-hidden /> : <ShieldCheck size={16} aria-hidden />}
                          <div>
                            <b>{t(`cp.chk.${chk.verdict}.h`)}</b>
                            <p className="small">{t(`cp.chk.${chk.verdict}`, { price: inr(comp.price), floor: inr(floor), loss: inr(chk.loss ?? 0), profit: inr(chk.profit), target: inr(c.targetMargin) })}</p>
                            {move && <p className="small" data-testid={`match-views-${comp.id}`}>{moveHeadline(move, t, comp.price)[0]}</p>}
                          </div>
                        </div>
                      )}
                      <div className="comp-actions">
                        {comp.custom
                          ? <Button size="sm" variant="ghost" icon={X} onClick={() => removeCustomCompetitor(p.id, comp.id)} data-testid={`remove-${comp.id}`}>{t('cp.remove')}</Button>
                          : <Button size="sm" variant="ghost" icon={X} onClick={() => unfollow(comp)} data-testid={`remove-${comp.id}`}>{t('cp.remove')}</Button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* 2 — prices over time */}
        {tracked.length > 0 && (
          <Card title={t('cp.chartTitle')} subtitle={t('cp.chartSub')}>
            <PriceTrendChart labels={labels} series={series} t={t} title={t('cp.chartCap', { name: p.name })} />
            <p className="tiny muted" style={{ marginTop: 6 }}>{t('cp.chartNote')}</p>
            {p.listedPrice == null && <div className="banner tone-amber" style={{ marginTop: 8 }}>{t('cp.noPrice')}</div>}
          </Card>
        )}

        {/* 3 — suggestions */}
        <Card title={t('cp.suggested')} subtitle={t('cp.suggestedSub')}>
          {ranked.length === 0 ? (
            <div className="empty-state"><Check size={30} aria-hidden /><b>{t('cp.noMore')}</b></div>
          ) : (
            <div className="sugg-grid">
              {ranked.map((comp) => {
                const why = suggestionReasons(comp, p, p.listedPrice), chk = checkItems(comp, p);
                return (
                  <article key={comp.id} className="sugg-card" data-testid={`sugg-${comp.id}`}>
                    <div className="comp-head">
                      <Tile comp={comp} t={t} />
                      <div className="comp-main"><h3>{comp.name}</h3><div className="tiny muted">{comp.material} · {comp.feature}</div></div>
                      <div className="comp-price"><b className="num">{inr(comp.price)}</b><span className="tiny muted">★ {comp.rating.toFixed(1)}</span></div>
                    </div>
                    <div className="sugg-why"><b className="tiny">{t('cp.why')}</b>
                      <ul>{why.map((r) => <li key={r.key}>{t(`cp.r.${r.key}`, { ...r.vars, group: c.cat.group })}</li>)}</ul></div>
                    {chk.length > 0 && <div className="sugg-check"><b className="tiny">{t('cp.checkFirst')}</b>
                      <ul>{chk.map((r) => <li key={r.key}>{t(`cp.c.${r.key}`, r.vars)}</li>)}</ul></div>}
                    <div className="comp-actions">
                      <Button size="sm" icon={Plus} onClick={() => follow(comp)} data-testid={`add-${comp.id}`}>{t('cp.add')}</Button>
                      <Button size="sm" variant="ghost" icon={EyeOff} onClick={() => dismissCompetitor(p.id, comp.id)} data-testid={`hide-${comp.id}`}>{t('cp.notMatch')}</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {hidden.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost sm" onClick={() => setShowHidden((v) => !v)} aria-expanded={showHidden}>{t(showHidden ? 'cp.hideHidden' : 'cp.showHidden', { n: hidden.length })}</button>
              {showHidden && <ul className="hidden-list">{hidden.map((h) => (
                <li key={h.id}><span>{h.name} · {inr(h.price)}</span><button type="button" className="btn secondary sm" onClick={() => dismissCompetitor(p.id, h.id, true)}>{t('cp.undoHide')}</button></li>
              ))}</ul>}
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 10 }}>{t('cp.suggNote')}</p>
        </Card>

        {/* 4 — add one yourself */}
        <Card title={t('cp.addOwn')} subtitle={t('cp.addOwnSub')}>
          <form className="comp-form" onSubmit={add} data-testid="comp-form" noValidate>
            <label className="field grow"><span>{t('cp.f.name')}</span><span className="input-wrap"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('cp.f.namePh')} data-testid="comp-name" /></span></label>
            <label className="field"><span>{t('cp.f.price')}</span><span className="input-wrap"><span className="affix">₹</span><input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="comp-price" /></span></label>
            <Button type="submit" icon={Plus} data-testid="comp-add">{t('cp.addBtn')}</Button>
          </form>
          {formErr && <div className="banner tone-red" role="alert" style={{ marginTop: 8 }}>{formErr}</div>}
          <p className="tiny muted" style={{ marginTop: 8 }}>{t('cp.addOwnNote')}</p>
        </Card>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => nav('/price-coach')}>{t('cp.backCoach')}<ArrowRight size={15} aria-hidden /></Button>
        </div>
      </div>
    </>
  );
}
