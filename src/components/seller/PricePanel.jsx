import { useState, useMemo } from 'react';
import { CheckCircle2, PencilLine, Sparkles, AlertTriangle, Check, BadgeCheck } from 'lucide-react';
import { assessPrice } from '../../engine/decision.js';
import { zonePosition } from '../../engine/demand.js';
import { priceLadder } from '../../engine/funnel.js';
import { MoveImpact, moveHeadline } from './MoveImpact.jsx';
import { inr, inrSigned, num, per100 } from '../../lib/format.js';

/** One line on what the move does to views and TOTAL profit a month (a volume game, not profit per order alone). */
function tradeoff(now, sugg, t) {
  if (now.profit < 0 && sugg.profit > 0) return t('cmp.fromLoss');
  const dv = sugg.views - now.views, dm = (sugg.monthlyProfit ?? 0) - (now.monthlyProfit ?? 0);
  if (Math.abs(dv) < 1) return dm > 0 ? t('cmp.sameViewsMore') : t('cmp.same');
  if (dv > 0) return dm >= 0 ? t('cmp.moreAll') : t('cmp.moreViewsLess');
  return dm > 0 ? t('cmp.fewerMore') : t('cmp.lessAll');
}

/** One price worked through the funnel: views, clicks, orders, orders per 100 views, profit per order, total a month. */
function scenario(coach, inputs, price) {
  if (price == null || !Number.isFinite(price)) return null;
  const f = coach.funnel(price, inputs);
  return f ? { ...f, position: zonePosition(price, coach.zone) } : null;
}

/**
 * Step 4 — the price. Shows the suggestion and WHY, the before → after money, lets the seller use it or set her
 * own (the seller always decides), and a slider to try any price against orders and profit.
 */
export function PricePanel({ coach, advice, t, onUse, onApplyAll }) {
  const c = coach, ad = advice;
  const [own, setOwn] = useState(false);
  const [ownText, setOwnText] = useState('');
  const target = ad.target ?? null;
  const needsFixes = ad.kind === 'fix_then' || ad.kind === 'fix_then_above';
  const sugg = target != null ? (needsFixes ? scenario(c, c.allFixed, target) : scenario(c, c.inputs, target)) : null;
  const suggNow = target != null ? scenario(c, c.inputs, target) : null;       // the same price, with only the fixes applied so far
  const now = c.price != null ? scenario(c, c.inputs, c.price) : null;
  const cheap = scenario(c, c.inputs, c.demand.buckets[0].hi ?? c.demand.buckets[0].lo);
  const inUse = target != null && c.price === target;
  const ownNum = ownText.trim() === '' ? null : Number(ownText);
  const ownOk = ownNum != null && Number.isFinite(ownNum) && ownNum > 0;
  const ownCheck = ownOk ? assessPrice(c.inputs, c.band, ownNum) : null;
  const ownScen = ownOk ? scenario(c, c.inputs, ownNum) : null;

  const Col = ({ s, label, tone, testid }) => (
    <div className={`cmp-col ${tone}`} data-testid={testid}>
      <div className="cmp-label">{label}</div>
      {s ? (
        <>
          <div className="cmp-price num">{inr(s.price)}</div>
          <dl>
            <div><dt>{t('fn.views')}</dt><dd className="num">{num(s.views)}</dd></div>
            <div><dt>{t('fn.clicks')}</dt><dd className="num">{num(s.clicks)}</dd></div>
            <div><dt>{t('fn.opv')}</dt><dd className="num">{per100(s.opv100)}</dd></div>
            <div><dt>{t('fn.orders')}</dt><dd className="num">{num(s.orders)}</dd></div>
            <div><dt>{t('fn.total')}</dt><dd className={`num ${s.monthlyProfit < 0 ? 'neg' : 'pos'}`}>{inr(s.monthlyProfit)}</dd></div>
            <div className="sub"><dt>{t('s4.row.profit')}</dt><dd className={`num ${s.profit < 0 ? 'neg' : ''}`}>{inrSigned(s.profit)}</dd></div>
          </dl>
          {s.position && <span className={`badge tone-${s.position === 'in_zone' ? 'green' : 'amber'}`}>{t(`s4.v.${s.position}`)}</span>}
        </>
      ) : <div className="muted small">{t('s1.noPrice')}</div>}
    </div>
  );

  return (
    <div className="price-panel">
      {/* the recommendation */}
      {ad.kind === 'keep' && (
        <div className="reco-hero ok" data-testid="reco-hero"><CheckCircle2 size={28} aria-hidden /><div><h3>{t('adv.keep')}</h3><p className="small">{t('s4.keepNote')}</p></div></div>
      )}
      {ad.kind === 'reconsider' && (
        <div className="reco-hero bad" data-testid="reco-hero"><AlertTriangle size={28} aria-hidden /><div><h3>{t('adv.reconsider')}</h3><p className="small">{t('adv.reconsider.body')}</p><p className="small muted">{t('s4.recon')}</p></div></div>
      )}
      {target != null && (
        <div className="reco-hero go" data-testid="reco-hero">
          <Sparkles size={26} aria-hidden />
          <div style={{ flex: 1 }}>
            <div className="tiny" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t('s4.compare.suggested')}</div>
            <div className="reco-price num" data-testid="reco-price">{ad.kind === 'fix_then_above' ? t('s4.list', { price: inr(target) }) : t('s4.try', { price: inr(target) })}</div>
            {ad.move && <p className="mv-lead" data-testid="mv-lead">{moveHeadline(ad.move, t, target).map((line, i) => <span key={i}>{line}</span>)}</p>}
            {needsFixes && ad.pending.length > 0 && (
              <div className="reco-warn">
                <AlertTriangle size={15} aria-hidden />
                <span>{t('s4.unlock', { price: inr(target) })}. {suggNow && suggNow.profit < 0 ? t('s4.noFix', { price: inr(target), loss: inr(-suggNow.profit) }) : ''}</span>
                <button type="button" className="btn secondary sm" onClick={onApplyAll} data-testid="apply-all-2">{t('fix.applyAll')}</button>
              </div>
            )}
            {ad.kind === 'fix_then_above' && <p className="small" style={{ marginTop: 6 }}>{t('adv.fix_then_above.body', { price: inr(target) })}</p>}
          </div>
          <div className="reco-actions">
            <button type="button" className="btn primary" disabled={inUse} onClick={() => onUse(target)} data-testid="use-price">{inUse ? <><Check size={15} aria-hidden />{t('s4.inUse')}</> : t('s4.use', { price: inr(target) })}</button>
            <button type="button" className="btn secondary" onClick={() => { setOwn((v) => !v); if (!ownText) setOwnText(String(c.price ?? target)); }} aria-expanded={own} data-testid="set-own"><PencilLine size={15} aria-hidden />{t('s4.own')}</button>
          </div>
        </div>
      )}
      {target == null && ad.kind !== 'reconsider' && (
        <div className="row" style={{ marginTop: 10 }}>
          <button type="button" className="btn secondary" onClick={() => { setOwn((v) => !v); if (!ownText) setOwnText(String(c.price ?? '')); }} aria-expanded={own} data-testid="set-own"><PencilLine size={15} aria-hidden />{t('s4.own')}</button>
        </div>
      )}

      {ad.move && <MoveImpact move={ad.move} t={t} />}

      {own && (
        <div className="own" data-testid="own-panel">
          <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
            <label className="field grow"><span>{t('s4.ownLabel')}</span>
              <span className="input-wrap"><span className="affix">₹</span><input inputMode="decimal" value={ownText} onChange={(e) => setOwnText(e.target.value)} data-testid="own-input" /></span>
            </label>
            <button type="button" className="btn primary" disabled={!ownOk} onClick={() => onUse(Math.round(ownNum))} data-testid="use-own">{t('s4.ownUse')}</button>
          </div>
          {ownCheck && ownScen && (
            <div className={`banner tone-${ownCheck.level}`} style={{ marginTop: 8 }} data-testid="own-check">
              <span><b>{num(ownScen.views)} {t('fn.views')} · {num(ownScen.clicks)} {t('fn.clicks')} · {num(ownScen.orders)} {t('fn.orders')}</b> · {t('fn.total')} <b>{inr(ownScen.monthlyProfit)}</b> · {inrSigned(ownScen.profit)} {t('term.perOrder')}{ownScen.position ? ` · ${t(`s4.v.${ownScen.position}`)}` : ''}</span>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 6 }}>{t('s4.ownAlways')}</p>
        </div>
      )}

      {/* why: always visible, right under the suggestion */}
      {target != null && (
        <div className="why-card" data-testid="why-panel">
          <div className="why-head"><BadgeCheck size={18} aria-hidden />{t('s4.why', { price: inr(target) })}</div>
          <p className="tiny muted">{t('s4.why.lead')}</p>
          <ul className="why-ticks">
            <li><span>🛡️</span>{t('s4.why.1', { floor: inr(needsFixes ? c.best.floor : c.now.floor) })}</li>
            <li><span>🛍️</span>{t('s4.why.2', { n: c.demand.buckets.reduce((sum, b) => sum + b.listings, 0) })}</li>
            <li><span>📊</span>{t('s4.why.3', { zone: c.zone.label })}</li>
            <li><span>🏷️</span>{t('s4.why.4', { price: inr(c.price) })}</li>
            <li><span>💰</span>{t('s4.why.5', { target: inr(c.targetMargin) })}</li>
          </ul>
          <p className="why-end">{t('s4.why.end', { price: inr(target), target: inr(c.targetMargin) })}</p>
        </div>
      )}

      {/* before → after: profit per order AND orders, side by side */}
      {(now || sugg) && ad.kind !== 'keep' && (
        <>
          {now && sugg && <p className="tradeoff" data-testid="tradeoff">{tradeoff(now, sugg, t)}</p>}
          <div className="cmp" data-testid="compare">
            <Col s={now} label={t('s4.compare.now')} tone="now" testid="cmp-now" />
            {sugg && <Col s={sugg} label={`${t('s4.compare.suggested')}${needsFixes ? ' · ' + t('sheet.afterFixes') : ''}`} tone="sugg" testid="cmp-sugg" />}
            {cheap && <Col s={cheap} label={t('s4.compare.cheap')} tone="cheap" testid="cmp-cheap" />}
          </div>
          <p className="tiny muted" style={{ marginTop: 6 }}>{t('s4.monthNote')}</p>
        </>
      )}

      <PriceLadder key={`l-${c.fixesApplied.join(',')}`} coach={c} t={t} suggested={target} preferFixed={needsFixes} />

      <PriceExplorer key={c.fixesApplied.join(',')} coach={c} t={t} start={target ?? c.price ?? Math.round(c.now.priceWithTargetMargin)} preferFixed={needsFixes} />
    </div>
  );
}

/** Slide any price: which price range it lands in, orders there, profit per order, money a month. */
function PriceExplorer({ coach, t, start, preferFixed }) {
  const c = coach;
  const pending = c.fixes.some((f) => !f.applied);
  const min = c.demand.buckets[0].lo - 20, max = c.demand.buckets[c.demand.buckets.length - 1].lo + 60;
  const [p, setP] = useState(() => Math.max(min, Math.min(max, start)));
  const [fixed, setFixed] = useState(preferFixed && pending);
  const inputs = fixed ? c.allFixed : c.inputs;
  const floor = fixed ? c.best.floor : c.now.floor;
  const s = useMemo(() => scenario(c, inputs, p), [c, inputs, p]);
  const verdict = s == null ? 'out' : s.profit < 0 ? 'loss' : s.position ?? 'out';
  const tone = verdict === 'loss' ? 'red' : verdict === 'in_zone' ? 'green' : 'amber';
  const pct = (v) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div className="explorer" data-testid="explorer">
      <div className="row between wrap"><div><h3>{t('s4.explore')}</h3><p className="tiny muted">{t('s4.explore.sub')}</p></div>
        <span className={`badge big tone-${tone}`} data-testid="explorer-verdict">{t(`s4.v.${verdict}`)}</span></div>
      {pending && (
        <div className="seg" role="group" aria-label={t('s4.explore')}>
          <button type="button" className={!fixed ? 'on' : ''} aria-pressed={!fixed} onClick={() => setFixed(false)} data-testid="explorer-today">{t('ex.today')}</button>
          <button type="button" className={fixed ? 'on' : ''} aria-pressed={fixed} onClick={() => setFixed(true)} data-testid="explorer-fixed">{t('ex.fixed')}</button>
        </div>
      )}
      <div className="ex-track">
        {c.zone && <span className="ex-zone" style={{ left: pct(c.zone.lo), width: `calc(${pct(c.zone.hi)} - ${pct(c.zone.lo)})` }} />}
        <span className="ex-floor" style={{ left: pct(Math.max(min, Math.min(max, floor))) }} title={`${t('term.floor')} ${inr(floor)}`} />
        <input type="range" min={min} max={max} step={1} value={p} onChange={(e) => setP(Number(e.target.value))} aria-label={t('s4.explore')} data-testid="explorer-range" />
      </div>
      <div className="ex-scale tiny muted"><span>{inr(min)}</span><span className="red">{t('zb.floor')} {inr(floor)}</span><span>{inr(max)}</span></div>
      <div className="ex-read six">
        <div><span className="tiny muted">{t('s4.row.price')}</span><b className="num">{inr(p)}</b></div>
        <div><span className="tiny muted">{t('fn.views')}</span><b className="num">{s ? num(s.views) : '—'}</b></div>
        <div><span className="tiny muted">{t('fn.clicks')}</span><b className="num">{s ? num(s.clicks) : '—'}</b></div>
        <div><span className="tiny muted">{t('fn.orders')}</span><b className="num">{s ? num(s.orders) : '—'}</b></div>
        <div><span className="tiny muted">{t('fn.total')}</span><b className={`num ${s.monthlyProfit < 0 ? 'neg' : 'pos'}`}>{inr(s.monthlyProfit)}</b></div>
        <div><span className="tiny muted">{t('s4.row.profit')}</span><b className={`num ${s.profit < 0 ? 'neg' : ''}`}>{inrSigned(s.profit)}</b></div>
      </div>
    </div>
  );
}

/**
 * "What each price range brings": for every price range, the best price you could ask there and what it does to
 * views, clicks, orders per 100 views and TOTAL profit a month. Flags any price under the no-loss price — a lower
 * price is only worth it while it stays above your floor.
 */
function PriceLadder({ coach, t, suggested, preferFixed }) {
  const c = coach;
  const pending = c.fixes.some((f) => !f.applied);
  const [fixed, setFixed] = useState(preferFixed && pending);
  const calc = fixed ? c.best : c.now;
  const inputs = fixed ? c.allFixed : c.inputs;
  const ladder = useMemo(() => priceLadder({
    product: c.product, buckets: c.demand.buckets, inputs, floor: calc.floor, floorPlusMargin: calc.priceWithTargetMargin,
    target: c.targetMargin, nowPrice: c.price, suggested,
  }), [c, inputs, calc, suggested]);
  const verdictTone = { loss: 'red', thin: 'amber', safe: 'green' };
  return (
    <div className="ladder" data-testid="ladder">
      <div className="ladder-head">
        <h3>{t('ld.title')}</h3>
        <p className="tiny muted">{t('ld.sub', { floor: inr(calc.floor) })}</p>
        {pending && (
          <div className="seg" role="group" aria-label={t('ld.title')}>
            <button type="button" className={!fixed ? 'on' : ''} aria-pressed={!fixed} onClick={() => setFixed(false)}>{t('ex.today')}</button>
            <button type="button" className={fixed ? 'on' : ''} aria-pressed={fixed} onClick={() => setFixed(true)}>{t('ex.fixed')}</button>
          </div>
        )}
      </div>
      <div className="l-row l-hd" role="row">
        <span>{t('s2.col.price')}</span><span className="r">{t('fn.views')}</span><span className="r">{t('fn.clicks')}</span><span className="r">{t('fn.opv')}</span><span className="r">{t('fn.total')}</span><span>{t('ld.verdict')}</span>
      </div>
      {ladder.rows.map((r) => (
        <div key={r.lo} className={`l-row ${r.isSuggested ? 'sugg' : ''} ${r.isNow ? 'now' : ''} ${r.verdict === 'loss' ? 'loss' : ''}`} data-testid={`ladder-${r.lo}`}>
          <span className="l-price">
            <b className="num">{inr(r.price)}</b><span className="tiny muted">{t('ld.inRange', { range: r.label })}</span>
            <span className="l-tags">
              {r.isNow && <span className="badge tone-grey">{t('s4.compare.now')}</span>}
              {r.isSuggested && <span className="badge tone-green">{t('s4.compare.suggested')}</span>}
              {r.mostProfit && <span className="badge tone-teal">{t('ld.mostProfit')}</span>}
            </span>
          </span>
          <span className="l-v r"><b className="num">{num(r.views)}</b><span className="tiny muted">{t('fn.views')}</span></span>
          <span className="l-v r"><b className="num">{num(r.clicks)}</b><span className="tiny muted">{t('fn.clicks')}</span></span>
          <span className="l-v r"><b className="num">{per100(r.opv100)}</b><span className="tiny muted">{t('fn.opv')} · {num(r.orders)} {t('fn.orders')}</span></span>
          <span className="l-v r"><b className={`num ${r.monthlyProfit < 0 ? 'neg' : 'pos'}`}>{inr(r.monthlyProfit)}</b><span className="tiny muted">{inrSigned(r.profit)} {t('term.perOrder')}</span></span>
          <span className="l-verdict"><span className={`badge tone-${verdictTone[r.verdict]}`}>{t(`ld.v.${r.verdict}`)}</span></span>
        </div>
      ))}
      <p className="tiny muted" style={{ padding: '8px 16px 12px' }}>{t('ld.foot')}</p>
    </div>
  );
}
