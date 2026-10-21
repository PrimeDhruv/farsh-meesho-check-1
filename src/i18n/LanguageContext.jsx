import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS, LANGUAGES } from './strings.js';

/**
 * Language layer. Every seller-facing label goes through t(key, vars). Missing keys fall back to English, then to
 * the key itself, so a half-translated language never breaks a screen. Adding a language = adding a STRINGS entry
 * and flipping `ready` in LANGUAGES. Languages that are not ready are shown as "coming soon", never faked.
 */
const Ctx = createContext(null);
const KEY = 'farsh.lang';

const readStored = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const s = readStored();
    return LANGUAGES.some((l) => l.code === s && l.ready) ? s : 'en';
  });
  const [chosen, setChosen] = useState(() => readStored() != null);

  const setLang = useCallback((code) => {
    if (!LANGUAGES.some((l) => l.code === code && l.ready)) return;
    setLangState(code);
    setChosen(true);
    try { localStorage.setItem(KEY, code); } catch { /* private mode: keep in memory */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = useCallback((key, vars) => {
    let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, chosen, languages: LANGUAGES }), [lang, setLang, t, chosen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
