import { useId } from 'react';

/** Labelled input with optional ₹ prefix, hint and read-only state. */
export function Input({ label, prefix, hint, readOnly, className = '', ...rest }) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={`input-wrap ${readOnly ? 'readonly' : ''}`}>
        {prefix && <span className="affix">{prefix}</span>}
        <input id={id} readOnly={readOnly} {...rest} />
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Select({ label, hint, options, className = '', ...rest }) {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="input-wrap"><select id={id} {...rest}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
