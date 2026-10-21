export function Card({ title, subtitle, action, flush, tint, children, className = '' }) {
  return (
    <section className={`card ${flush ? 'flush' : ''} ${tint ? `tint-${tint}` : ''} ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>
          {action}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
