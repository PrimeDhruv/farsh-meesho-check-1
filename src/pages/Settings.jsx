import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card, Input, Select, Badge, Button } from '../components/ui/index.js';
import { LanguageTiles } from '../components/layout/LanguagePicker.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { SELLER } from '../data/seller.js';
import { ASSUMPTIONS } from '../data/assumptions.js';
import { pct } from '../lib/format.js';

export default function Settings() {
  const t = useT();
  const { resetDemo, notify } = useProducts();
  const [channel, setChannel] = useState('whatsapp');
  const A = ASSUMPTIONS;
  const rows = [
    ['GST + TDS taken from each payout', pct(A.gstTds, 2), 'Measured · our live listing test', 'green'],
    ['Orders paid by cash on delivery (COD)', pct(A.codShare), 'Meesho: 72–77% (RHP)', 'teal'],
    ['Failed deliveries: COD / prepaid', `${pct(A.rtoCod)} / ${pct(A.rtoPrepaid)}`, 'Shipway FY25', 'teal'],
    ['Customer returns', pct(A.returnRate), 'Assumption · category average', 'amber'],
    ['Lost per failed delivery', `₹${A.rtoHandling} + ${pct(A.rtoStockLost)} of stock`, 'Assumption', 'amber'],
    ['Lost per return', `₹${A.returnReverseLeg} + ${pct(A.returnUnsellable)} of stock`, 'Assumption', 'amber'],
    ['Delivery (1–2 kg slab)', '₹90', 'Third-party estimate', 'amber'],
    ['Ads per order', `₹${A.ads}`, 'Assumption · category average', 'amber'],
    ['Target profit per order', `₹${A.targetContribution}`, 'Deck worked example', 'teal'],
    ['Your own numbers replace averages at', `${A.ownDataThreshold} orders`, 'Deck', 'teal'],
  ];
  return (
    <>
      <div className="page-head"><div><h1>{t('set.title')}</h1><p>{t('set.sub')}</p></div></div>
      <div className="stack">
        <Card title={t('set.lang')} subtitle={t('set.langSub')}><LanguageTiles /></Card>
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <Card title={t('set.profile')} subtitle={t('set.profileSub')}>
              <div className="grid cols-2">
                <Input label={t('set.name')} value={SELLER.name} readOnly /><Input label={t('set.city')} value={SELLER.city} readOnly />
                <Input label={t('set.business')} value={SELLER.business} readOnly /><Input label={t('set.id')} value={SELLER.sellerId} readOnly />
              </div>
            </Card>
            <Card title={t('set.alerts')} subtitle={t('set.alertsSub')}>
              <Select label={t('set.channel')} value={channel} onChange={(e) => setChannel(e.target.value)}
                options={[{ value: 'whatsapp', label: t('set.ch.whatsapp') }, { value: 'app', label: t('set.ch.app') }, { value: 'both', label: t('set.ch.both') }]} hint={t('set.preview')} />
            </Card>
            <Card title={t('set.reset')} subtitle={t('set.resetSub')}>
              <Button variant="secondary" icon={RotateCcw} onClick={() => { resetDemo(); notify(t('set.resetDone')); }} data-testid="reset-demo">{t('set.reset')}</Button>
            </Card>
          </div>
          <Card title={t('set.assump')} subtitle={t('set.assumpSub')}>
            <div className="table-wrap"><table className="tbl compact"><tbody>
              {rows.map(([k, v, s, tone]) => <tr key={k}><td>{k}</td><td className="r num"><b>{v}</b></td><td><Badge tone={tone}>{s}</Badge></td></tr>)}
            </tbody></table></div>
            <p className="tiny muted" style={{ marginTop: 8 }}>All shipping, failed-delivery, return, market-price and order-range values are simulated in this prototype, not live Meesho data.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
