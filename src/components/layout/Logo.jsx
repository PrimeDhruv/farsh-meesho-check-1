import meeshoTile from '../../assets/meesho-tile.png';

/**
 * Brand lock-up: Meesho (parent brand) above Farsh (the product). The tile is the Meesho app tile cropped from the
 * official Meesho DICE S3 template provided with the case; no Meesho mark is redrawn or altered. "Meesho" next to it
 * is plain text, not a recreated wordmark.
 */
export function BrandMark({ sub, light = false }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <img src={meeshoTile} alt="" width="44" height="44" className="brand-tile" />
      <div className="brand-text">
        <div className="brand-parent">Meesho</div>
        <div className="brand-product">Farsh <span className="brand-hi" lang="hi">फ़र्श</span></div>
        {sub && <div className="brand-sub">{sub}</div>}
      </div>
    </div>
  );
}
