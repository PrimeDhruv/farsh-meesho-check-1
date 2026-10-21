import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Calculator, Package, Radar, Settings, Menu, Bell, FlaskConical, CheckCircle2, X, ChevronRight, Users, PackageX } from 'lucide-react';
import { BrandMark } from './Logo.jsx';
import meeshoTile from '../../assets/meesho-tile.png';
import { LanguagePicker } from './LanguagePicker.jsx';
import { Onboarding } from './Onboarding.jsx';
import { SELLER } from '../../data/seller.js';
import { useProducts } from '../../state/ProductsContext.jsx';
import { useLang } from '../../i18n/LanguageContext.jsx';
import { InfoTip } from '../ui/InfoTip.jsx';
import { countAlerts } from '../../engine/watchAll.js';

const NAV = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/price-coach', key: 'nav.coach', icon: Calculator },
  { to: '/products', key: 'nav.products', icon: Package },
  { to: '/competitors', key: 'nav.competitors', icon: Users },
  { to: '/returns', key: 'nav.returns', icon: PackageX },
  { to: '/watch', key: 'nav.watch', icon: Radar },
  { to: '/settings', key: 'nav.settings', icon: Settings },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { summary, items, toast, dismissToast } = useProducts();
  const { t, chosen, lang } = useLang();
  const [showOnboarding, setShowOnboarding] = useState(!chosen);
  const title = t(NAV.find((n) => n.to === pathname)?.key ?? 'nav.dashboard');
  const alerts = useMemo(() => countAlerts(items), [items]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { document.title = `${title} · Meesho Farsh (concept)`; }, [title]);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <BrandMark sub={t('brand.sub')} />
        <nav className="nav">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={19} aria-hidden /><span>{t(key)}</span>
              {to === '/' && summary.losing > 0 && <span className="count" aria-label={`${summary.losing} ${t('tile.losing')}`}>{summary.losing}</span>}
              {to === '/watch' && alerts > 0 && <span className="count soft" aria-label={`${alerts} ${t('bell.label')}`}>{alerts}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="nav-foot">
          <div className="seller"><div className="avatar">{SELLER.initials}</div><div><b>{SELLER.name}</b><span>{SELLER.business} · {SELLER.city}</span></div></div>
          <p className="concept-note">{t('concept.note')}</p>
        </div>
      </aside>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label={t('menu.open')} onClick={() => setOpen(true)}><Menu size={18} /></button>
          <nav className="crumbs" aria-label="Breadcrumb"><span>Meesho</span><ChevronRight size={14} aria-hidden /><span>Farsh</span><ChevronRight size={14} aria-hidden /><b aria-current="page">{title}</b></nav>
          <span className="m-brand"><img src={meeshoTile} alt="" width="30" height="30" /><span><b>Meesho</b><em>Farsh</em></span></span>
          <span className="title">{title}</span>
          <span className="spacer" />
          <span className="badge tone-grey sim-pill" data-testid="sim-pill"><FlaskConical size={13} aria-hidden /><span>{t('sim.pill')}</span></span>
          <span className="sim-tip"><InfoTip label="About simulated data" align="right">{t('sim.tip')}</InfoTip></span>
          <LanguagePicker />
          <Link to="/watch" className="icon-btn" aria-label={t('bell.label')}><Bell size={17} />{alerts > 0 && <span className="dot-count">{alerts}</span>}</Link>
        </header>
        <div className="sim-strip" role="note"><FlaskConical size={12} aria-hidden />{t('sim.pill')}</div>
        {lang !== 'en' && <div className="lang-note" role="note">{t('lang.partial')}</div>}
        <main className="content"><Outlet /></main>
      </div>
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      {toast && (
        <div className={`toast tone-${toast.tone}`} role="status" aria-live="polite" data-testid="toast">
          <CheckCircle2 size={18} aria-hidden /><span>{toast.message}</span>
          <button type="button" aria-label={t('common.close')} onClick={dismissToast}><X size={15} /></button>
        </div>
      )}
    </div>
  );
}
