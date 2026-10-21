import { Link } from 'react-router-dom';

/** variant: primary | secondary | ghost. Pass `to` to render a router link. */
export function Button({ variant = 'primary', size, to, icon: Icon, children, className = '', ...rest }) {
  const cls = `btn ${variant} ${size || ''} ${className}`;
  const inner = <>{Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden />}{children}</>;
  return to ? <Link to={to} className={cls} {...rest}>{inner}</Link> : <button type="button" className={cls} {...rest}>{inner}</button>;
}
