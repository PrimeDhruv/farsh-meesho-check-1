import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { useProducts } from '../../state/ProductsContext.jsx';
import { compareWithSelected, matchCheck } from '../../engine/competitors.js';
import { inr } from '../../lib/format.js';

/**
 * Price Coach step 2, one card: how your price sits against the competitors YOU picked (not every look-alike).
 * The details, price history and the floor check live on the Competitors page.
 */
export function CompetitorSnapshot({ product, coach, t }) {
  const { competitorsOf } = useProducts();
  const { tracked } = competitorsOf(product);
  const cmp = compareWithSelected(product.listedPrice, tracked);
  const floor = coach.now.floor;
  const unsafe = tracked.filter((x) => matchCheck({ inputs: coach.inputs, price: x.price, floor, floorPlusMargin: coach.now.priceWithTargetMargin, target: coach.targetMargin })?.verdict === 'below_floor').length;
  return (
    <div className="comp-snap" data-testid="comp-snapshot">
      <Users size={18} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{t('snap.title')}</b>
        {tracked.length === 0 ? <p className="small muted">{t('snap.none')}</p> : cmp ? (
          <p className="small">{t(`cp.sum.${cmp.position}`, { price: inr(product.listedPrice), mid: inr(cmp.mid), gap: inr(Math.abs(cmp.gap)), lo: inr(cmp.lo), hi: inr(cmp.hi) })}{unsafe > 0 ? ` ${t('cp.sum.below', { n: unsafe, floor: inr(floor) })}` : ''}</p>
        ) : <p className="small muted">{t('snap.noPrice')}</p>}
      </div>
      <Link to="/competitors" className="btn secondary sm" data-testid="snap-link">{t('snap.open')}<ArrowRight size={13} aria-hidden /></Link>
    </div>
  );
}
