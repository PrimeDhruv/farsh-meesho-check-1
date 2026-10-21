import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, ArrowUp, ArrowDown, Check, PackageSearch } from 'lucide-react';
import { Card, Table, Button, StatusBadge, Badge } from '../components/ui/index.js';
import { NewProductForm } from '../components/product/NewProductForm.jsx';
import { useProducts } from '../state/ProductsContext.jsx';
import { useT } from '../i18n/LanguageContext.jsx';
import { CATEGORIES } from '../data/categories.js';
import { inr, inrSigned } from '../lib/format.js';

const is = (...st) => (p) => st.includes(p.a.status);
/** Same groups as the Dashboard tiles, so a tile always opens exactly what it counted. */
const FILTERS = {
  all: () => true,
  attention: (p) => p.a.needsAttention,
  losing: is('below_floor', 'skip'),
  fewer: is('wont_rank', 'above_zone'),
  small: is('thin', 'unpriced'),
  ok: is('healthy'),
  draft: (p) => p.status === 'draft',
  live: (p) => p.status === 'live',
};
const CHIPS = ['all', 'attention', 'losing', 'fewer', 'small', 'ok', 'draft'];
const POS = {
  above_zone: { icon: ArrowUp, tone: 'amber', key: 'pos.above' },
  in_zone: { icon: Check, tone: 'green', key: 'pos.in' },
  below_zone: { icon: ArrowDown, tone: 'teal', key: 'pos.below' },
};

export default function Products() {
  const { items, select, selectedId } = useProducts();
  const t = useT();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS[params.get('filter')] ? params.get('filter') : 'all';
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (params.get('new') === '1') setCreating(true); }, [params]);
  const rows = items.filter(FILTERS[filter]);
  const open = (p) => { select(p.id); nav('/price-coach'); };

  const columns = [
    { key: 'name', header: t('col.product'), render: (p) => (
      <>
        <div className="cell-title">{p.name}</div>
        <div className="cell-sub">{CATEGORIES[p.categoryId].group} · <Badge tone={p.status === 'live' ? 'green' : 'grey'}>{t(p.status === 'live' ? 'prod.live' : 'prod.draft')}</Badge>
          <Badge tone={p.a.model.source === 'own' ? 'green' : 'amber'}>{p.a.model.source === 'own' ? t('data.own', { n: p.orders }) : t('data.est', { n: Math.min(30, p.orders) })}</Badge></div>
      </>
    ) },
    { key: 'price', header: t('col.price'), align: 'right', render: (p) => <b className="num big-cell">{inr(p.a.price)}</b> },
    { key: 'floor', header: t('col.floor'), align: 'right', render: (p) => <span className="num big-cell red">{inr(p.a.floor)}</span> },
    { key: 'e', header: t('col.profit'), align: 'right', render: (p) => <b className={`num big-cell ${p.a.contribution < 0 ? 'neg' : 'pos'}`}>{p.a.contribution == null ? '—' : inrSigned(p.a.contribution)}</b> },
    { key: 'band', header: t('col.market'), render: (p) => {
      const pos = POS[p.a.position];
      return (
        <div className="mkt">
          <b className="num green">{p.a.zone?.label}</b>
          {pos ? <span className={`badge tone-${pos.tone}`}><pos.icon size={12} aria-hidden />{t(pos.key)}</span> : <span className="tiny muted">{t('status.unpriced')}</span>}
        </div>
      );
    } },
    { key: 'status', header: t('col.status'), render: (p) => <StatusBadge status={p.a.status} /> },
    { key: 'go', header: '', render: (p) => <Button size="sm" variant={p.a.needsAttention ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); open(p); }}>{t('prod.review')}<ArrowRight size={13} aria-hidden /></Button> },
  ];
  return (
    <>
      <div className="page-head">
        <div><h1>{t('prod.title')}</h1><p>{t('prod.sub')}</p></div>
        <Button icon={Plus} onClick={() => setCreating((v) => !v)} data-testid="new-product">{t('coach.new')}</Button>
      </div>
      <div className="stack">
        {creating && <NewProductForm onDone={() => setCreating(false)} />}
        <Card flush title={t(`f.${filter}`)} subtitle={t('prod.count', { n: rows.length, total: items.length })}>
          <div className="chips chip-bar" role="group" aria-label="Filter">
            {CHIPS.map((k) => {
              const n = items.filter(FILTERS[k]).length;
              return (
                <button key={k} className={`chip ${filter === k ? 'on' : ''} chip-${k}`} aria-pressed={filter === k} onClick={() => setParams(k === 'all' ? {} : { filter: k })} data-testid={`filter-${k}`}>
                  {t(`f.${k}`)} <span className="chip-n">{n}</span>
                </button>
              );
            })}
          </div>
          {rows.length ? (
            <Table columns={columns} rows={rows} rowKey="id" selectedKey={selectedId} onRowClick={open} />
          ) : (
            <div className="empty-state" data-testid="empty">
              <PackageSearch size={34} aria-hidden />
              <b>{t(filter === 'losing' || filter === 'fewer' || filter === 'attention' || filter === 'small' ? 'empty.good' : 'empty.none')}</b>
              <button type="button" className="btn secondary sm" onClick={() => setParams({})}>{t('empty.showAll')}</button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
