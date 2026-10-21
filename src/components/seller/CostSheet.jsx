import { inr, pct } from '../../lib/format.js';

const f1 = (x) => (Math.round(x * 10) / 10).toString();

/**
 * The no-loss price as a spreadsheet (deck slide 5): every line, how it is worked out, a running total, and the
 * same sheet after all the cost fixes. Rows add up exactly to the totals shown.
 */
export function CostSheet({ sheet, after, t }) {
  const s = sheet, a = after;
  const g = s.g.toFixed(2);
  const per100 = (x) => f1(x * 100);
  const run = [];
  let acc = 0;
  for (const k of ['product', 'packing', 'shipping', 'ads', 'tax', 'again', 'returns', 'rto']) { acc += s.shown[k]; run.push(acc); }
  const R = ({ n, label, how, k, runIdx, hidden }) => (
    <tr className={hidden ? 'hidden-lever' : ''}>
      <td className="n">{n}</td>
      <td><b>{label}</b></td>
      <td className="how">{how}</td>
      <td className="v num">{s.shown[k]}</td>
      <td className="run num">{run[runIdx]}</td>
      {a && <td className={`v num ${a.shown[k] !== s.shown[k] ? 'chg' : ''}`}>{a.shown[k]}</td>}
    </tr>
  );
  return (
    <div className="table-wrap">
      <table className="sheet" data-testid="cost-sheet">
        <thead>
          <tr><th>#</th><th>{t('sheet.line')}</th><th>{t('sheet.how')}</th><th className="r">{t('sheet.today')} ₹</th><th className="r">Σ</th>{a && <th className="r">{t('sheet.afterFixes')} ₹</th>}</tr>
        </thead>
        <tbody>
          <R n="1" label={t('sheet.product')} how={t('sheet.yourCost')} k="product" runIdx={0} />
          <R n="2" label={t('sheet.packing')} how={t('sheet.yourCost')} k="packing" runIdx={1} />
          <R n="3" label={t('sheet.shipping')} how={t('sheet.slab')} k="shipping" runIdx={2} hidden />
          <R n="4" label={t('sheet.ads')} how={t('sheet.catAvg')} k="ads" runIdx={3} />
          <tr className="sub"><td /><td>{t('sheet.delivered')}</td><td className="how">1 + 2 + 3 + 4</td><td className="v num">{inr(s.delivered)}</td><td />{a && <td className="v num">{inr(a.delivered)}</td>}</tr>
          <R n="5" label={t('sheet.tax', { pct: pct(s.t, 2) })} how={`${s.delivered} ÷ ${g} − ${s.delivered}`} k="tax" runIdx={4} />
          <tr className="tot1"><td /><td>{t('sheet.safe')}</td><td className="how" /><td className="v num">{inr(s.safeLooking)}</td><td />{a && <td className="v num">{inr(a.safeLooking)}</td>}</tr>
          <tr className="sec"><td colSpan={a ? 6 : 5}>{t('sheet.backHead', { fail: per100(s.fail) })}{a ? ` → ${per100(a.fail)}` : ''}</td></tr>
          <R n="6" label={t('sheet.again')} how={`₹${Math.round(s.perShipment)} × ${per100(s.fail)} ÷ ${per100(s.kept)} ÷ ${g}`} k="again" runIdx={5} hidden />
          <R n="7" label={t('sheet.returns')} how={`${per100(s.returnRate)} × ₹${f1(s.lossPerReturn)} ÷ ${per100(s.kept)} ÷ ${g}`} k="returns" runIdx={6} hidden />
          <R n="8" label={t('sheet.rto')} how={`${per100(s.rtoRate)} × ₹${f1(s.lossPerRto)} ÷ ${per100(s.kept)} ÷ ${g}`} k="rto" runIdx={7} />
          <tr className="tot2"><td /><td>{t('sheet.total')}</td><td className="how">1 + … + 8</td><td className="v num">{inr(s.floorShown)}</td><td />{a && <td className="v num">{inr(a.floorShown)}</td>}</tr>
        </tbody>
      </table>
      <p className="tiny muted" style={{ marginTop: 8 }}>{t('sheet.note', { pct: pct(s.t, 2) })}</p>
    </div>
  );
}

/** One-line version: Product ₹150 + delivery, packing & ads ₹110 + tax ₹20 + orders that come back ₹85 = ₹365 */
export function FloorFormula({ sheet, t }) {
  const s = sheet.shown;
  const f = s.packing + s.shipping + s.ads, back = s.again + s.returns + s.rto;
  const Part = ({ label, v, tone }) => <span className={`ff-part ${tone || ''}`}><b className="num">{inr(v)}</b><span>{label}</span></span>;
  return (
    <div className="ff" data-testid="floor-formula">
      <Part label={t('s1.sum.product')} v={s.product} />
      <span className="ff-op">+</span><Part label={t('s1.sum.f')} v={f} />
      <span className="ff-op">+</span><Part label={t('s1.sum.tax')} v={s.tax} />
      <span className="ff-op">+</span><Part label={t('s1.sum.back')} v={back} tone="warn" />
      <span className="ff-op">=</span><Part label={t('term.floor')} v={sheet.floorShown} tone="total" />
    </div>
  );
}
