import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Input } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { GroupChart } from '../product/GroupChart.jsx';
import { calculate } from '../../engine/calculator.js';
import { position } from '../../engine/decision.js';
import { groupFor } from '../../data/groups.js';
import { inr, pct } from '../../lib/format.js';

/* Every input of the pricing model. `pct` fields are typed as percentages and stored as fractions. */
export const FIELDS = [
  { group: 'You tell us', items: [
    { key: 'productCost', label: 'Product cost', prefix: '₹' },
    { key: 'packagingCost', label: 'Packaging', prefix: '₹' },
    { key: 'targetMargin', label: 'Target profit / shipped order', prefix: '₹' },
  ] },
  { group: 'Delivery, ads & tax (Meesho fills these in)', items: [
    { key: 'shippingCost', label: 'Delivery (weight slab)', prefix: '₹' },
    { key: 'advertisingCost', label: 'Advertising', prefix: '₹' },
    { key: 'gstTds', label: 'GST + TDS', prefix: '%', pct: true },
  ] },
  { group: 'Orders that come back (category averages until 30 orders)', items: [
    { key: 'rtoRate', label: 'Failed deliveries (RTO)', prefix: '%', pct: true },
    { key: 'rtoHandlingCost', label: 'Handling per RTO', prefix: '₹' },
    { key: 'rtoStockLossShare', label: 'Stock lost per RTO', prefix: '%', pct: true },
    { key: 'returnRate', label: 'Customer returns', prefix: '%', pct: true },
    { key: 'returnReverseCost', label: 'Reverse delivery per return', prefix: '₹' },
    { key: 'returnUnsellableShare', label: 'Returns that cannot be resold', prefix: '%', pct: true },
  ] },
];
const ALL = FIELDS.flatMap((g) => g.items);
const toText = (f, v) => (v == null ? '' : String(f.pct ? +(v * 100).toFixed(4) : v));
const toNum = (f, s) => {
  if (s.trim() === '') return f.key === 'targetMargin' ? undefined : NaN;
  const n = Number(s);
  return Number.isFinite(n) ? (f.pct ? n / 100 : n) : NaN;
};

/**
 * "All my numbers (for experts)": the full model, editable. Edits are a what-if on this screen only; the cost fixes
 * the seller applied are layered on top by the coach. English only in this prototype.
 */
export function ExpertPanel({ product, defaults, effective, onChange }) {
  const [text, setText] = useState(() => Object.fromEntries(ALL.map((f) => [f.key, toText(f, defaults[f.key])])));
  const edited = ALL.filter((f) => text[f.key] !== toText(f, defaults[f.key])).map((f) => f.key);
  const set = (k) => (e) => {
    const next = { ...text, [k]: e.target.value };
    setText(next);
    const inputs = { ...defaults, ...Object.fromEntries(ALL.map((f) => [f.key, toNum(f, next[f.key])])) };
    const changed = ALL.some((f) => next[f.key] !== toText(f, defaults[f.key]));
    onChange(changed ? inputs : null);
  };
  const reset = () => { setText(Object.fromEntries(ALL.map((f) => [f.key, toText(f, defaults[f.key])]))); onChange(null); };
  const r = useMemo(() => calculate({ ...effective, price: product.listedPrice ?? undefined }), [effective, product.listedPrice]);
  const group = useMemo(() => groupFor(product.categoryId), [product.categoryId]);
  const band = group.band;

  return (
    <div className="expert" data-testid="expert-panel">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="small muted">Defaults: {product.own && product.orders >= 30 ? 'your own orders (simulated)' : 'borrowed category averages (simulated)'} and deck assumptions. {edited.length ? `${edited.length} edited — a what-if on this screen only.` : ''}</span>
        <Button variant="ghost" size="sm" onClick={reset} disabled={!edited.length}><RotateCcw size={14} aria-hidden /> Reset</Button>
      </div>
      {FIELDS.map((g) => (
        <div key={g.group} style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>{g.group}</h3>
          <div className="grid cols-3">
            {g.items.map((f) => (
              <Input key={f.key} label={f.label} prefix={f.prefix} inputMode="decimal" value={text[f.key]} onChange={set(f.key)}
                aria-invalid={Number.isNaN(toNum(f, text[f.key]))} hint={edited.includes(f.key) ? `edited · default ${toText(f, defaults[f.key]) || '—'}` : undefined} />
            ))}
          </div>
        </div>
      ))}
      {!r.valid && <div className="banner tone-red" role="alert" style={{ marginTop: 12 }}>{r.errors.join('. ')}.</div>}

      {r.valid && (
        <>
          <div className="grid cols-2" style={{ marginTop: 18 }}>
            <div>
              <h3 style={{ marginBottom: 8 }}>What moves your no-loss price</h3>
              <table className="tbl compact"><thead><tr><th>Input</th><th className="r">Step</th><th className="r">Floor moves by</th></tr></thead>
                <tbody>{r.floorImpacts.map((d) => <tr key={d.key}><td>{d.label}</td><td className="r muted">{d.stepLabel}</td><td className="r num"><b>{d.delta == null ? '—' : `+₹${d.delta.toFixed(2)}`}</b></td></tr>)}</tbody></table>
              <p className="tiny muted" style={{ marginTop: 6 }}>₹1 off any per-shipment cost takes ₹{r.floorPerRupeeOfShipmentCost.toFixed(2)} off the floor: the orders that stick also pay for the ones that come back.</p>
            </div>
            <div>
              <h3 style={{ marginBottom: 8 }}>The model</h3>
              <div className="formula">
                <p><b>Profit per shipped order</b><br />E = k·(p·(1 − t) − c) − F − r·Lr − q·Lq, &nbsp;k = 1 − r − q</p>
                <p style={{ marginTop: 8 }}><b>No-loss price (floor)</b> = price where E = 0<br />= [c + (F + r·Lr + q·Lq) ÷ k] ÷ (1 − t) = <b>₹{r.floor.toFixed(2)}</b></p>
                <p className="tiny muted" style={{ marginTop: 8 }}>Keep rate k = {pct(r.keepRate, 1)} · loss per RTO {inr(r.losses.perRto)} · per return {inr(r.losses.perReturn)} · per-shipment costs {inr(r.losses.perShipmentCost)}{r.orderScreenContribution != null ? ` · order screen shows ${inr(r.orderScreenContribution)} per order, ignoring returns and RTO` : ''}.</p>
              </div>
            </div>
          </div>
          <h3 style={{ margin: '18px 0 8px' }}>Comparable listings (simulated) against the group band</h3>
          <GroupChart band={band} listings={group.listings} currentFloor={r.floor} newFloor={r.floor} currentPrice={product.listedPrice} proposedPrice={null} />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="tbl compact" data-testid="listings">
              <thead><tr><th>Comparable listing</th><th className="r">Price</th><th>Band position</th><th>Against your floor</th></tr></thead>
              <tbody>{group.listings.map((l) => (
                <tr key={l.id}><td>{l.name}</td><td className="r num">{inr(l.price)}</td><td className="muted">{position(l.price, band)}</td>
                  <td className={l.price >= r.floor ? '' : 'muted'}>{l.price >= r.floor ? `${inr(l.price - r.floor)} above` : `${inr(r.floor - l.price)} below: can't match`}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
