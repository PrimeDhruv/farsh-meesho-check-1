import { inr } from '../../lib/format.js';

/**
 * Where the seller sits in the group, on one ₹ scale, in three lanes:
 *   Group  – comparable listings as dots, P25–P75 band, median line
 *   Floor  – current floor → new floor (after the levers the seller applied)
 *   Price  – current listing price → proposed listing price
 * Colour is never the only cue: every marker is labelled with its ₹ value.
 */
const W = 640, X0 = 96, X1 = 616;

export function GroupChart({ band, listings = [], currentFloor, newFloor, currentPrice, proposedPrice, proposedLabel = 'Proposed' }) {
  const vals = [band.p25, band.p75, currentFloor, newFloor, currentPrice, proposedPrice, ...listings.map((l) => l.price)].filter((v) => v != null);
  const lo = Math.floor((Math.min(...vals) - 20) / 10) * 10, hi = Math.ceil((Math.max(...vals) + 20) / 10) * 10;
  const x = (v) => X0 + ((v - lo) / (hi - lo)) * (X1 - X0);
  const floorMoved = newFloor != null && currentFloor != null && Math.abs(newFloor - currentFloor) >= 1;
  const priceMoved = proposedPrice != null && currentPrice != null && Math.abs(proposedPrice - currentPrice) >= 1;

  // ticks
  const step = (hi - lo) > 200 ? 50 : 25, ticks = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

  const desc = `Group ${inr(band.p25)} to ${inr(band.p75)}, median ${inr(band.median)}. Floor ${inr(currentFloor)}${floorMoved ? ` now ${inr(newFloor)}` : ''}. ` +
    `${currentPrice != null ? `Listed ${inr(currentPrice)}. ` : ''}${proposedPrice != null ? `${proposedLabel} ${inr(proposedPrice)}.` : ''}`;

  const laneY = { group: 62, floor: 138, price: 208 };
  const Marker = ({ v, y, fill, stroke, label, above = true, r = 7, bold }) => (
    <g>
      <circle cx={x(v)} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="2.5" />
      <text x={x(v)} y={above ? y - 14 : y + 24} textAnchor="middle" fontSize="12" fontWeight={bold ? 800 : 600} fill="var(--ink, #23151f)">{label} {inr(v)}</text>
    </g>
  );
  const Arrow = ({ a, b, y, color }) => {
    const dir = b > a ? 1 : -1, x1 = x(a) + dir * 9, x2 = x(b) - dir * 9;
    return <g><line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="2.5" strokeDasharray="5 3" /><path d={`M${x2} ${y} l${-dir * 8} -5 v10 z`} fill={color} /></g>;
  };

  return (
    <figure style={{ margin: 0 }} data-testid="group-chart">
      <svg viewBox={`0 0 ${W} 250`} role="img" aria-label={desc} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <title>{desc}</title>
        {/* scale */}
        {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={28} y2={232} stroke="#efe6ed" /><text x={x(t)} y={246} textAnchor="middle" fontSize="10" fill="var(--muted, #7a6674)">₹{t}</text></g>)}
        {/* median guide across all lanes */}
        <line x1={x(band.median)} x2={x(band.median)} y1={28} y2={232} stroke="var(--plum-800, #570d48)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* lane labels */}
        {[['Group', laneY.group], ['Floor', laneY.floor], ['Price', laneY.price]].map(([t, y]) => <text key={t} x={8} y={y + 4} fontSize="12" fontWeight="700" fill="var(--muted, #7a6674)">{t}</text>)}

        {/* group lane */}
        <text x={x(band.p25)} y={laneY.group - 26} textAnchor="middle" fontSize="11" fill="var(--muted, #7a6674)">P25 {inr(band.p25)}</text>
        <text x={x(band.median)} y={laneY.group - 42} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--plum-800, #570d48)">Median {inr(band.median)}</text>
        <text x={x(band.p75)} y={laneY.group - 26} textAnchor="middle" fontSize="11" fill="var(--muted, #7a6674)">P75 {inr(band.p75)}</text>
        <rect x={x(band.p25)} y={laneY.group - 11} width={x(band.p75) - x(band.p25)} height="22" rx="6" fill="#ecd3e6" />
        {listings.map((l) => <circle key={l.id} cx={x(l.price)} cy={laneY.group} r="4" fill="#fff" stroke="var(--plum-700, #6f1a5d)" strokeWidth="1.5"><title>{l.name} {inr(l.price)}</title></circle>)}

        {/* floor lane */}
        <line x1={X0} x2={X1} y1={laneY.floor} y2={laneY.floor} stroke="#e6dae3" strokeWidth="2" />
        {floorMoved && <Arrow a={currentFloor} b={newFloor} y={laneY.floor} color="var(--green, #1c7a4b)" />}
        {currentFloor != null && <Marker v={currentFloor} y={laneY.floor} fill="#fff" stroke="var(--red, #b3203f)" label={floorMoved ? 'Current floor' : 'Floor'} above={!floorMoved || currentFloor > newFloor ? true : true} />}
        {floorMoved && <Marker v={newFloor} y={laneY.floor} fill="var(--green, #1c7a4b)" stroke="var(--green, #1c7a4b)" label="New floor" above={false} bold />}

        {/* price lane */}
        <line x1={X0} x2={X1} y1={laneY.price} y2={laneY.price} stroke="#e6dae3" strokeWidth="2" />
        {priceMoved && <Arrow a={currentPrice} b={proposedPrice} y={laneY.price} color="var(--teal, #0e6b7e)" />}
        {currentPrice != null && <Marker v={currentPrice} y={laneY.price} fill="#fff" stroke="var(--plum-800, #570d48)" label={priceMoved ? 'Current price' : 'Price'} above />}
        {priceMoved && <Marker v={proposedPrice} y={laneY.price} fill="var(--teal, #0e6b7e)" stroke="var(--teal, #0e6b7e)" label={proposedLabel} above={false} bold />}
        {!priceMoved && proposedPrice != null && currentPrice == null && <Marker v={proposedPrice} y={laneY.price} fill="var(--teal, #0e6b7e)" stroke="var(--teal, #0e6b7e)" label={proposedLabel} above bold />}
      </svg>
      <figcaption className="small muted">Dots are example comparable listings (simulated). Shaded bar = P25 to P75 of the group; dashed line = median.</figcaption>
    </figure>
  );
}
