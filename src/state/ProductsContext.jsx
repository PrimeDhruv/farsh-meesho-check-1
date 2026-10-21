import { createContext, useContext, useMemo, useState, useCallback, useRef } from 'react';
import { PRODUCTS, WORKED_EXAMPLE_ID } from '../data/products.js';
import { analyseProduct, STATUS } from '../engine/position.js';
import { INITIAL_TRACKED, competitorsFor } from '../data/competitors.js';

const Ctx = createContext(null);
export const useProducts = () => useContext(Ctx);

/**
 * Products + selected product + derived analysis (floor, busy zone, status) for every SKU.
 * Seller actions in Price Coach (apply a cost fix, use a suggested price, edit cost) update the catalogue here,
 * so the Dashboard, Products and Farsh Watch always show the same numbers. In-memory only: nothing is sent anywhere.
 */
export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(PRODUCTS);
  const [selectedId, setSelectedId] = useState(WORKED_EXAMPLE_ID);
  const [toast, setToast] = useState(null);
  // competitors the seller follows, per product: approved suggestions, ones she said are not a match, ones she added
  const [follow, setFollow] = useState(() => ({ tracked: { ...INITIAL_TRACKED }, dismissed: {}, custom: {} }));
  const timer = useRef(null);

  const items = useMemo(() => products.map((p) => ({ ...p, a: analyseProduct(p) })), [products]);
  const selected = items.find((p) => p.id === selectedId) || items[0];

  const summary = useMemo(() => {
    const live = items.filter((p) => p.status === 'live'), priced = items.filter((p) => p.a.contribution != null);
    const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
    const count = (...st) => items.filter((p) => st.includes(p.a.status)).length;
    return {
      total: items.length, live: live.length, drafts: items.length - live.length,
      alerts: items.filter((p) => p.a.isAlert).length,
      attention: items.filter((p) => p.a.needsAttention).length,
      losing: count('below_floor', 'skip'), fewerOrders: count('wont_rank', 'above_zone'),
      smallFix: count('thin', 'unpriced'), onTrack: count('healthy'),
      avgContribution: avg(priced.map((p) => p.a.contribution)),
      avgMarginPct: avg(priced.map((p) => p.a.marginPct)),
      pricedCount: priced.length,
    };
  }, [items]);

  const notify = useCallback((message, tone = 'green') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const updateProduct = useCallback((id, patch) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const toggleFix = useCallback((id, fixId) => {
    setProducts((ps) => ps.map((p) => {
      if (p.id !== id) return p;
      const fixes = p.fixes ?? [];
      return { ...p, fixes: fixes.includes(fixId) ? fixes.filter((f) => f !== fixId) : [...fixes, fixId] };
    }));
  }, []);

  const addProduct = useCallback(({ name, categoryId, cost, packaging }) => {
    const id = `SKU-${1000 + products.length + 1}`;
    setProducts((ps) => [...ps, { id, name, categoryId, cost, packaging, status: 'draft', listedPrice: null, orders: 0, note: 'Created in this session.' }]);
    setSelectedId(id);
    return id;
  }, [products.length]);

  const resetDemo = useCallback(() => {
    setProducts(PRODUCTS); setSelectedId(WORKED_EXAMPLE_ID);
    setFollow({ tracked: { ...INITIAL_TRACKED }, dismissed: {}, custom: {} });
  }, []);

  /** Follow / unfollow a suggested listing (the seller decides which look-alikes are genuine competitors). */
  const toggleCompetitor = useCallback((productId, compId) => {
    setFollow((f) => {
      const cur = f.tracked[productId] ?? [];
      const next = cur.includes(compId) ? cur.filter((x) => x !== compId) : [...cur, compId];
      return { ...f, tracked: { ...f.tracked, [productId]: next }, dismissed: { ...f.dismissed, [productId]: (f.dismissed[productId] ?? []).filter((x) => x !== compId) } };
    });
  }, []);
  /** "Not a match": hide a suggestion (and unfollow it if it was followed). */
  const dismissCompetitor = useCallback((productId, compId, undo = false) => {
    setFollow((f) => {
      const hidden = f.dismissed[productId] ?? [];
      return {
        ...f,
        tracked: { ...f.tracked, [productId]: (f.tracked[productId] ?? []).filter((x) => x !== compId) },
        dismissed: { ...f.dismissed, [productId]: undo ? hidden.filter((x) => x !== compId) : [...new Set([...hidden, compId])] },
      };
    });
  }, []);
  /** A listing the seller knows about that Farsh did not suggest. Its price history starts today. */
  const addCustomCompetitor = useCallback((productId, { name, price }) => {
    const id = `custom-${productId}-${Date.now()}`;
    setFollow((f) => ({
      ...f,
      custom: { ...f.custom, [productId]: [...(f.custom[productId] ?? []), { id, name, price, categoryId: null, material: null, feature: null, rating: null, history: [price], custom: true, addedOn: new Date().toISOString() }] },
      tracked: { ...f.tracked, [productId]: [...(f.tracked[productId] ?? []), id] },
    }));
    return id;
  }, []);
  const removeCustomCompetitor = useCallback((productId, compId) => {
    setFollow((f) => ({
      ...f,
      custom: { ...f.custom, [productId]: (f.custom[productId] ?? []).filter((c) => c.id !== compId) },
      tracked: { ...f.tracked, [productId]: (f.tracked[productId] ?? []).filter((x) => x !== compId) },
    }));
  }, []);
  /** Everything about one product's competitors: suggestions, the ones she follows, hidden ones. */
  const competitorsOf = useCallback((product) => {
    const all = [...competitorsFor(product.categoryId), ...(follow.custom[product.id] ?? [])];
    const ids = follow.tracked[product.id] ?? [], hidden = follow.dismissed[product.id] ?? [];
    return {
      tracked: ids.map((id) => all.find((c) => c.id === id)).filter(Boolean),
      suggestions: all.filter((c) => !c.custom && !ids.includes(c.id) && !hidden.includes(c.id)),
      hidden: all.filter((c) => hidden.includes(c.id)),
    };
  }, [follow]);

  const value = {
    items, selected, selectedId, select: setSelectedId, addProduct, updateProduct, toggleFix, resetDemo,
    competitorsOf, toggleCompetitor, dismissCompetitor, addCustomCompetitor, removeCustomCompetitor,
    summary, STATUS, toast, notify, dismissToast: () => setToast(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
