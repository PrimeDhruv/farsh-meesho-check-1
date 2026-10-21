import { useEffect, useRef, useState } from 'react';
import { inr } from '../../lib/format.js';

/** Measure an element's width (px) so labels can be laid out without overlapping. */
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width || 600));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * The price line: similar products' price range, the busy range (green), the seller's no-loss price (red),
 * her price (plum) and the suggested price (orange). Every mark carries a short label ("You ₹406"); labels that
 * would collide drop to a second row. `labels={false}` draws a bare mini bar (legend shown elsewhere).
 */
export function ZoneBar({ buckets, zone, floor, price, suggested, labels = true, t }) {
  const [ref, width] = useWidth();
  const lo = buckets[0].lo - 10, hi = buckets[buckets.length - 1].lo + 45;
  const clamp = (v) => Math.max(lo, Math.min(hi, v));
  const pos = (v) => ((clamp(v) - lo) / (hi - lo)) * 100;
  const L = (k, fallback) => (t ? t(k) : fallback);

  const marks = [];
  if (floor != null) marks.push({ k: 'floor', v: floor, text: `${L('zb.floor', 'No-loss')} ${inr(floor)}` });
  if (price != null) marks.push({ k: 'price', v: price, text: `${L('zb.you', 'You')} ${inr(price)}` });
  if (suggested != null && Math.round(suggested) !== Math.round(price ?? -1)) marks.push({ k: 'sugg', v: suggested, text: `${L('zb.try', 'Try')} ${inr(suggested)}` });
  // greedy two-row layout: a label moves down a row if it would overlap the previous label on its row
  const labelPx = 92, gap = (labelPx / Math.max(width, 1)) * 100;
  const lastX = [];
  marks.sort((a, b) => a.v - b.v).forEach((m) => {
    m.x = pos(m.v);
    let level = 0;
    while (lastX[level] != null && m.x - lastX[level] < gap) level += 1;
    m.level = Math.min(level, 2);
    lastX[m.level] = m.x;
    m.align = m.x < gap / 2 ? 'left' : m.x > 100 - gap / 2 ? 'right' : 'center';
  });
  const rows = labels ? Math.max(0, ...marks.map((m) => m.level)) + 1 : 0;
  const desc = `${zone ? `${L('s2.busy', 'Busy price range')} ${zone.label}. ` : ''}${marks.map((m) => m.text).join('. ')}.`;

  return (
    <div ref={ref} className={`zbar ${labels ? 'with-labels' : ''}`} style={labels ? { height: 40 + rows * 17 } : undefined} role="img" aria-label={desc}>
      <div className="zb-track" />
      {zone && (
        <div className="zb-zone" style={{ left: `${pos(zone.lo)}%`, width: `${pos(zone.hi) - pos(zone.lo)}%` }}>
          {labels && <span>{L('s2.busy', 'Busy price range')} {zone.label}</span>}
        </div>
      )}
      {marks.map((m) => (
        <div key={m.k} className={`zb-mark ${m.k}`} style={{ left: `${m.x}%` }} title={m.text}>
          <i />
          {labels && <em className={`lvl-${m.level} al-${m.align}`}>{m.text}</em>}
        </div>
      ))}
    </div>
  );
}
