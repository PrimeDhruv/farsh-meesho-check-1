import { useEffect, useRef, useState } from 'react';
import { FlaskConical, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext.jsx';
import { LanguageTiles } from './LanguagePicker.jsx';
import { BrandMark } from './Logo.jsx';

const HOW = [['🛡️', 'ob.h1', 'ob.h1s'], ['🛍️', 'ob.h2', 'ob.h2s'], ['🏷️', 'ob.h3', 'ob.h3s']];

/**
 * First visit, two short steps: 1) pick a language, 2) what Farsh does, in three pictures (safe price → where buyers
 * buy → your best price). Escape or a click outside closes it at any step; the language choice is remembered.
 */
export function Onboarding({ onClose }) {
  const { t, lang, setLang } = useLang();
  const [step, setStep] = useState(1);
  const box = useRef(null);
  useEffect(() => {
    box.current?.querySelector(step === 1 ? 'button[aria-checked="true"]' : '[data-testid=ob-start]')?.focus();
    const esc = (e) => { if (e.key === 'Escape') { setLang(lang); onClose(); } };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, lang, setLang, step]);
  const done = () => { setLang(lang); onClose(); };
  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) done(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ob-title" ref={box} data-testid="onboarding">
        <div className="modal-stripe" aria-hidden />
        <div className="row between top">
          <BrandMark sub={t('brand.sub')} light />
          <span className="ob-dots" aria-label={`${step} / 2`}><i className={step === 1 ? 'on' : ''} /><i className={step === 2 ? 'on' : ''} /></span>
        </div>
        {step === 1 ? (
          <>
            <h2 id="ob-title" style={{ marginTop: 6 }}>{t('ob.title')} <span className="muted" lang="hi">· अपनी भाषा चुनें</span></h2>
            <p className="muted small" style={{ margin: '4px 0 14px' }}>{t('ob.sub')}</p>
            <LanguageTiles />
            <div className="row between wrap" style={{ marginTop: 18, gap: 12 }}>
              <span className="badge tone-grey"><FlaskConical size={13} aria-hidden />{t('ob.sim')}</span>
              <button type="button" className="btn primary lg" onClick={() => { setLang(lang); setStep(2); }} data-testid="ob-continue">{t('ob.continue')}<ArrowRight size={16} aria-hidden /></button>
            </div>
          </>
        ) : (
          <>
            <h2 id="ob-title" style={{ marginTop: 6 }}>{t('ob.howTitle')}</h2>
            <p className="ob-tag">{t('tag.pre')}<b>{t('tag.floor')}</b>{t('tag.mid')}<b>{t('tag.price')}</b>{t('tag.post')}</p>
            <ol className="ob-how">
              {HOW.map(([ic, k, s], i) => (
                <li key={k}>
                  <span className="ob-ic" aria-hidden>{ic}</span>
                  <span className="ob-n">{i + 1}</span>
                  <b>{t(k)}</b>
                  <span className="small muted">{t(s)}</span>
                </li>
              ))}
            </ol>
            <p className="small" style={{ marginTop: 12 }}>✋ {t('ob.youDecide')}</p>
            <div className="row between wrap" style={{ marginTop: 16, gap: 12 }}>
              <button type="button" className="btn ghost" onClick={() => setStep(1)}><ArrowLeft size={15} aria-hidden />{t('ob.back')}</button>
              <button type="button" className="btn primary lg" onClick={done} data-testid="ob-start">{t('ob.start')}<ArrowRight size={16} aria-hidden /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
