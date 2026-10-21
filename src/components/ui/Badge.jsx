import { PROVENANCE } from '../../data/assumptions.js';
import { STATUS } from '../../engine/position.js';
import { InfoTip } from './InfoTip.jsx';
import { useT } from '../../i18n/LanguageContext.jsx';

export const Badge = ({ tone = 'grey', children, title }) => <span className={`badge tone-${tone}`} title={title}>{children}</span>;

/** Coloured dot + label. Never relies on colour alone: the label always names the state. */
export const StatusIndicator = ({ tone = 'grey', children, big }) => (
  <span className={`badge tone-${tone} ${big ? 'big' : ''}`}><i className="dot" />{children}</span>
);

export function StatusBadge({ status, big }) {
  const t = useT();
  return <StatusIndicator tone={STATUS[status].tone} big={big}>{t(`status.${status}`)}</StatusIndicator>;
}

/** Where a number came from: seller input, borrowed category average, own data, computed, simulated. */
export function Provenance({ kind, label }) {
  const p = PROVENANCE[kind];
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Badge tone={p.tone}>{label || p.label}</Badge><InfoTip>{p.help}</InfoTip></span>;
}
