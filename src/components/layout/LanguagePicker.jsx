import { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext.jsx';

/** Compact language switcher for the top bar. Languages without translations are listed as "coming soon". */
export function LanguagePicker() {
  const { lang, setLang, languages, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = languages.find((l) => l.code === lang);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="lang-pick" ref={ref}>
      <button type="button" className="lang-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="lang-btn">
        <Globe size={16} aria-hidden /><span>{cur.native}</span><ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t('lang.label')}>
          {languages.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === lang} disabled={!l.ready}
                onClick={() => { setLang(l.code); setOpen(false); }} data-testid={`lang-${l.code}`}>
                <span className="lang-native" lang={l.code}>{l.native}</span>
                <span className="lang-en">{l.ready ? l.english : t('lang.soon')}</span>
                {l.code === lang && <Check size={15} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Big language tiles, used by first-visit onboarding and Settings. */
export function LanguageTiles() {
  const { lang, setLang, languages, t } = useLang();
  return (
    <div className="lang-tiles" role="radiogroup" aria-label={t('lang.label')}>
      {languages.map((l) => (
        <button key={l.code} type="button" role="radio" aria-checked={l.code === lang} disabled={!l.ready}
          className={`lang-tile ${l.code === lang ? 'on' : ''}`} onClick={() => setLang(l.code)} data-testid={`tile-${l.code}`}>
          <span className="glyph" lang={l.code} aria-hidden>{l.glyph}</span>
          <span className="lang-native" lang={l.code}>{l.native}</span>
          <span className="lang-en">{l.ready ? l.english : t('lang.soon')}</span>
        </button>
      ))}
    </div>
  );
}
