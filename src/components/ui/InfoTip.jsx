import { Info } from 'lucide-react';

/** Small (i) that explains a number. Works on hover and keyboard focus. `align="right"` keeps it on screen at the edge. */
export function InfoTip({ children, label = 'Explain this', align }) {
  return (
    <span className={`tip ${align === 'right' ? 'tip-right' : ''}`}>
      <button type="button" aria-label={label}><Info size={15} aria-hidden /></button>
      <span className="tip-body" role="tooltip">{children}</span>
    </span>
  );
}
