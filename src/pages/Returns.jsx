import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock3, FlaskConical, Truck, Undo2, RotateCcw, Info, PackageCheck, PackageX, Ban } from 'lucide-react';
import { Card, Select, Button } from '../components/ui/index.js';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { buildCoach, roundToTotal } from '../engine/coach.js';
import { returnsAndClaims, CLAIM_DEFAULTS, validateClaimAssumptions } from '../engine/claims.js';
import { inr, inrSigned, num } from '../lib/format.js';

const one = (n) => (Math.round(n * 10) / 10).toString();
const toPct = (v) => String(Math.round(v * 100));

/** Rounded lines that add up exactly to the rounded total (so a seller can check the sum). */
function roundLines(values, total) { return roundToTotal(values, total); }

export default function Returns() {
  const t = useT();
  const { items, selected, select } = useProducts();
  const p = selected;
  const c = useMemo(() => buildCoach(p, { status: p.a.status }), [p]);
  const [text, setText] = useState({ raise: toPct(CLAIM_DEFAULTS.raise), approved: toPct(CLAIM_DEFAULTS.approved), pending: toPct(CLAIM_DEFAULTS.pending), payout: toPct(CLAIM_DEFAULTS.payout) });
  const [edit, setEdit] = useState(false);
  const claim = useMemo(() => {
    const n = Object.fromEntries(Object.entries(text).map(([k, v]) => [k, v.trim() === '' ? NaN : Number(v) / 100]));
    return n;
  }, [text]);
  const errors = validateClaimAssumptions(claim);
  const useClaim = errors.length ? CLAIM_DEFAULTS : claim;

  if (!c.valid) return <Card title={p.name}><div className="banner tone-red" role="alert">{c.errors.join('. ')}.</div></Card>;
  const price = p.listedPrice ?? Math.round(c.now.priceWithTargetMargin);
  const r = returnsAndClaims(c.inputs, price, useClaim);
  if (!r.valid) return <Card title={p.name}><div className="banner tone-red" role="alert">{r.errors.join('. ')}.</div></Card>;

  const { orders: o, claims: cl, money: m, profit, floor, breakdown: bd } = r;
  // the profit lines, per 100 orders shipped, rounded so they add up exactly
  const raw = [bd.sales, ...bd.lines.map((l) => l.amount)].map((v) => v * r.per);
  const rounded = roundLines(raw, bd.initial * r.per);
  const initial = rounded.reduce((s, v) => s + v, 0);
  const claimBack = Math.round(cl.recovered);
  const adjusted = initial + claimBack;
  const maxBar = Math.max(...rounded.map(Math.abs), 1);
  const LINE_KEYS = ['sales', ...bd.lines.map((l) => l.key)];
  const statuses = [
    { k: 'approved', icon: CheckCircle2, n: cl.approved, amt: cl.recovered, tone: 'green' },
    { k: 'pending', icon: Clock3, n: cl.pending, amt: cl.pendingAtStake, tone: 'amber' },
    { k: 'rejected', icon: XCircle, n: cl.rejected, amt: cl.rejectedLoss, tone: 'red' },
  ];
  const seg = [
    { k: 'kept', n: o.kept, icon: PackageCheck, tone: 'green' },
    { k: 'returned', n: o.returned, icon: Undo2, tone: 'amber' },
    { k: 'rto', n: o.rto, icon: PackageX, tone: 'red' },
  ];
  const setField = (k) => (e) => setText((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <div className="page-head"><div><h1>{t('rc.title')}</h1><p>{t('rc.sub')}</p></div></div>
      <div className="stack">
        <Card>
          <Select label={t('coach.product')} value={p.id} onChange={(e) => select(e.target.value)} data-testid="rc-product"
            options={items.map((it) => ({ value: it.id, label: it.name }))} />
          <div className="banner tone-teal" style={{ marginTop: 12 }}><FlaskConical size={16} aria-hidden /><span>{t('rc.simNote')}</span></div>
          <p className="tiny muted" style={{ marginTop: 8 }}>{t('rc.per100', { price: inr(price) })}{p.listedPrice == null ? ` ${t('rc.noPriceNote')}` : ''}</p>
        </Card>

        {/* 1 — what happens to 100 orders */}
        <Card title={t('rc.s1')} subtitle={t('rc.s1sub')}>
          <div className="outcome-bar" role="img" aria-label={seg.map((s) => `${t(`rc.o.${s.k}`)} ${one(s.n)}`).join(', ')} data-testid="outcome-bar">
            {seg.map((s) => <span key={s.k} className={`seg-${s.tone}`} style={{ width: `${s.n}%` }}>{s.n >= 8 ? one(s.n) : ''}</span>)}
          </div>
          <div className="outcome-legend">
            {seg.map((s) => (
              <div key={s.k} className={`o-item tone-${s.tone}`}><s.icon size={18} aria-hidden /><div><b className="num">{one(s.n)}</b><span className="small">{t(`rc.o.${s.k}`)}</span><span className="tiny muted">{t(`rc.o.${s.k}.sub`)}</span></div></div>
            ))}
          </div>
          <p className="small" style={{ marginTop: 10 }}>{t('rc.s1note', { unsellable: one(o.unsellable) })}</p>
        </Card>

        {/* 2 — claims */}
        <Card title={t('rc.s2')} subtitle={t('rc.s2sub')}
          action={<Button size="sm" variant="secondary" onClick={() => setEdit((v) => !v)} aria-expanded={edit} data-testid="rc-edit">{t(edit ? 'rc.editHide' : 'rc.edit')}</Button>}>
          <div className="claim-flow" data-testid="claim-flow">
            <div className="cf-step"><b className="num">{one(o.unsellable)}</b><span>{t('rc.f.unsellable')}</span></div>
            <span className="cf-arrow" aria-hidden>→</span>
            <div className="cf-step"><b className="num">{one(cl.raised)}</b><span>{t('rc.f.raised')}</span></div>
            <span className="cf-arrow" aria-hidden>→</span>
            <div className="cf-end">
              {statuses.map((s) => (
                <div key={s.k} className={`cf-status tone-${s.tone}`} data-testid={`claim-${s.k}`}><s.icon size={16} aria-hidden /><b className="num">{one(s.n)}</b><span>{t(`rc.st.${s.k}`)}</span></div>
              ))}
            </div>
          </div>
          <div className="money-tiles">
            <div className="mt"><span className="k">{t('rc.m.claimed')}</span><b className="num">{inr(cl.claimed)}</b><span className="tiny muted">{t('rc.m.claimedSub', { n: one(cl.raised), v: inr(cl.perClaim) })}</span></div>
            <div className="mt good"><span className="k">{t('rc.m.recovered')}</span><b className="num">{inr(cl.recovered)}</b><span className="tiny muted">{t('rc.m.recoveredSub', { pay: toPct(useClaim.payout) })}</span></div>
            <div className="mt warn"><span className="k">{t('rc.m.pending')}</span><b className="num">{inr(cl.pendingAtStake)}</b><span className="tiny muted">{t('rc.m.pendingSub')}</span></div>
            <div className="mt bad"><span className="k">{t('rc.m.lost')}</span><b className="num">{inr(cl.unrecovered)}</b><span className="tiny muted">{t('rc.m.lostSub')}</span></div>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>{t('rc.claimNote')}</p>
          {edit && (
            <div className="claim-edit" data-testid="claim-edit">
              <p className="small muted">{t('rc.editHelp')}</p>
              <div className="grid cols-2">
                {['raise', 'approved', 'pending', 'payout'].map((k) => (
                  <label key={k} className="field"><span>{t(`rc.a.${k}`)}</span>
                    <span className="input-wrap"><input inputMode="decimal" value={text[k]} onChange={setField(k)} data-testid={`claim-in-${k}`} /><span className="affix r">%</span></span>
                    <span className="hint">{t(`rc.a.${k}Hint`)}</span></label>
                ))}
              </div>
              {errors.length > 0 && <div className="banner tone-red" role="alert" style={{ marginTop: 8 }}>{t('rc.err')}</div>}
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setText({ raise: toPct(CLAIM_DEFAULTS.raise), approved: toPct(CLAIM_DEFAULTS.approved), pending: toPct(CLAIM_DEFAULTS.pending), payout: toPct(CLAIM_DEFAULTS.payout) })} style={{ marginTop: 8 }}>{t('rc.reset')}</Button>
            </div>
          )}
        </Card>

        {/* 3 — shipping split */}
        <Card title={t('rc.s3')} subtitle={t('rc.s3sub')}>
          <div className="ship-split" data-testid="ship-split">
            <div className="ss fwd"><Truck size={18} aria-hidden /><div><b className="num">{inr(m.forwardShipping)}</b><span className="small">{t('rc.sh.forward')}</span><span className="tiny muted">{t('rc.sh.forwardSub', { each: inr(c.inputs.shippingCost), n: r.per })}</span></div></div>
            <div className="ss rev"><Undo2 size={18} aria-hidden /><div><b className="num">{inr(m.reverseShipping)}</b><span className="small">{t('rc.sh.reverse')}</span><span className="tiny muted">{t('rc.sh.reverseSub', { each: inr(c.inputs.returnReverseCost), n: one(o.returned) })}</span></div></div>
            <div className="ss rto"><PackageX size={18} aria-hidden /><div><b className="num">{inr(m.rtoHandling)}</b><span className="small">{t('rc.sh.rto')}</span><span className="tiny muted">{t('rc.sh.rtoSub', { each: inr(c.inputs.rtoHandlingCost), n: one(o.rto) })}</span></div></div>
            <div className="ss paid"><Ban size={18} aria-hidden /><div><b className="num">—</b><span className="small">{t('rc.sh.paid')}</span><span className="tiny muted">{t('rc.sh.paidSub')}</span></div></div>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>{t('rc.sh.note')}</p>
        </Card>

        {/* 4 — adjusted profit */}
        <Card title={t('rc.s4')} subtitle={t('rc.s4sub', { price: inr(price) })}>
          <div className="pnl" data-testid="pnl">
            {LINE_KEYS.map((k, i) => {
              const v = rounded[i];
              return (
                <div key={k} className={`pnl-row ${v < 0 ? 'cost' : 'gain'} ${k === 'forward' ? 'fwd' : ''} ${k === 'reverse' ? 'rev' : ''}`}>
                  <span className="pnl-l">{t(`rc.l.${k}`)}</span>
                  <span className="pnl-bar"><span style={{ width: `${(Math.abs(v) / maxBar) * 100}%` }} /></span>
                  <b className="num pnl-v">{k === 'sales' ? inr(v) : inrSigned(v)}</b>
                </div>
              );
            })}
            <div className="pnl-row total initial" data-testid="pnl-initial"><span className="pnl-l">{t('rc.l.initial')}</span><span className="pnl-bar" /><b className={`num pnl-v ${initial < 0 ? 'neg' : 'pos'}`}>{inrSigned(initial)}</b></div>
            <div className="pnl-row claim"><span className="pnl-l">{t('rc.l.claimBack')}</span><span className="pnl-bar"><span style={{ width: `${(claimBack / maxBar) * 100}%` }} /></span><b className="num pnl-v pos">{inrSigned(claimBack)}</b></div>
            <div className="pnl-row total adjusted" data-testid="pnl-adjusted"><span className="pnl-l">{t('rc.l.adjusted')}</span><span className="pnl-bar" /><b className={`num pnl-v ${adjusted < 0 ? 'neg' : 'pos'}`}>{inrSigned(adjusted)}</b></div>
          </div>
          <div className="banner tone-teal" style={{ marginTop: 10 }}><Info size={16} aria-hidden /><span>{t('rc.s4note', { initial: inrSigned(initial), back: inr(claimBack), adjusted: inrSigned(adjusted) })}</span></div>
          <p className="tiny muted" style={{ marginTop: 6 }}>{t('rc.s4foot')}</p>
        </Card>

        {/* 5 — effect on the no-loss price */}
        <Card title={t('rc.s5')} subtitle={t('rc.s5sub')}>
          <div className="floor-effect" data-testid="floor-effect">
            <div><span className="k">{t('rc.fl.base')}</span><b className="num red">{inr(floor.base)}</b><span className="tiny muted">{t('rc.fl.baseSub')}</span></div>
            <span aria-hidden className="cf-arrow">→</span>
            <div><span className="k">{t('rc.fl.with')}</span><b className="num">{inr(floor.withClaims)}</b><span className="tiny muted">{t('rc.fl.withSub', { cut: inr(floor.cut) })}</span></div>
          </div>
          <p className="small" style={{ marginTop: 8 }}>{t('rc.fl.why')}</p>
        </Card>
      </div>
    </>
  );
}
