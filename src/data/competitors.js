import { CATEGORIES } from './categories.js';

/**
 * SIMULATED look-alike listings per product group — stand-ins for what Meesho's group data would suggest.
 * They are NOT real listings, and nothing here says a suggested listing is a genuine competitor: Farsh suggests,
 * the seller decides. A listing shares the group but can differ in material, size, quality or pack.
 *
 * Each has a price (set around the group's median), a rating, a material and a main feature, and 8 weeks of price
 * history (SIMULATED; the last point is today's price). We never show a competitor's order numbers, and we have
 * no listing images in this prototype, so the UI shows a labelled placeholder instead of a picture.
 */
const OFFSETS = [-0.12, -0.08, -0.04, -0.01, 0.03, 0.07, 0.13, 0.22];  // price vs the group median
const RATINGS = [3.8, 4.0, 4.2, 4.1, 4.3, 3.9, 4.4, 4.2];
/** weekly drift (fraction per week, applied backwards from today) and an optional one-off cut [week, share]. */
const MOVES = [
  { drift: 0.004 }, { cut: [5, 0.06] }, { drift: 0.008 }, { drift: 0 },
  { drift: -0.003 }, { cut: [6, 0.04] }, { drift: 0.002 }, { raise: [4, 0.05] },
];

/** [material, feature] pairs, one per listing, per group; the first listing shares most with the seller's own product. */
const VARIANTS = {
  kurtis:   { noun: 'A-line kurti',    pairs: [['cotton', 'printed'], ['rayon', 'plain'], ['cotton', 'block print'], ['cotton', 'with dupatta'], ['cotton', 'embroidered'], ['georgette', 'party wear'], ['cotton', 'pack of 2'], ['rayon', 'printed']] },
  kurtaset: { noun: 'kurta set',       pairs: [['cotton', '2-piece set'], ['rayon', '2-piece set'], ['cotton', 'with dupatta'], ['cotton', 'printed'], ['silk blend', 'festive'], ['cotton', 'embroidered'], ['rayon', 'plain'], ['cotton', '3-piece set']] },
  bottoms:  { noun: 'palazzo pants',   pairs: [['rayon', 'wide leg'], ['cotton', 'wide leg'], ['rayon', 'printed'], ['cotton', 'plain'], ['crepe', 'wide leg'], ['rayon', 'high waist'], ['cotton', 'pack of 2'], ['rayon', 'with pockets']] },
  leggings: { noun: 'leggings',        pairs: [['cotton-lycra', 'churidar length'], ['cotton', 'ankle length'], ['cotton-lycra', 'pack of 2'], ['polyester', 'plain'], ['cotton-lycra', 'high waist'], ['cotton', 'churidar length'], ['cotton-lycra', 'pack of 3'], ['polyester', 'shiny finish']] },
  dupatta:  { noun: 'dupatta',         pairs: [['cotton', 'block print'], ['cotton', 'plain'], ['chiffon', 'printed'], ['cotton', 'embroidered'], ['georgette', 'plain'], ['cotton', 'with lace'], ['silk blend', 'festive'], ['chiffon', 'plain']] },
  footwear: { noun: 'flat sandals',    pairs: [['synthetic', 'cushioned sole'], ['pu', 'plain'], ['synthetic', 'with buckle'], ['pu', 'cushioned sole'], ['leather look', 'embellished'], ['synthetic', 'plain'], ['pu', 'with buckle'], ['synthetic', 'anti-skid sole']] },
  home:     { noun: 'steel bottle',    pairs: [['steel', '1 L, leak-proof'], ['steel', '750 ml'], ['steel', '1 L'], ['steel', '1 L, with cap'], ['steel', '1.2 L, insulated'], ['steel', 'pack of 2'], ['plastic', '1 L'], ['steel', '1 L, with strap']] },
  bags:     { noun: 'sling bag',       pairs: [['cotton', 'zip pocket'], ['faux leather', 'plain'], ['cotton', 'printed'], ['canvas', 'zip pocket'], ['faux leather', 'quilted'], ['cotton', 'tassel'], ['canvas', 'plain'], ['faux leather', 'chain strap']] },
};

const roundTo9 = (n) => Math.max(9, Math.round(n / 10) * 10 - 1);

/** 8 weekly prices ending on `price`. */
function history(price, move) {
  const out = [];
  for (let w = 0; w < 8; w++) {
    let p = price * (1 - (move.drift ?? 0) * (7 - w));
    if (move.cut && w < move.cut[0]) p /= 1 - move.cut[1];      // before the cut it was higher
    if (move.raise && w < move.raise[0]) p /= 1 + move.raise[1]; // before the raise it was lower
    out.push(Math.round(p));
  }
  out[7] = price;
  return out;
}

function build(categoryId) {
  const cat = CATEGORIES[categoryId], v = VARIANTS[categoryId];
  return v.pairs.map(([material, feature], i) => {
    const price = roundTo9(cat.band.median * (1 + OFFSETS[i]));
    return {
      id: `${categoryId}-c${i + 1}`, categoryId, simulated: true,
      name: `${material[0].toUpperCase()}${material.slice(1)} ${v.noun} — ${feature}`,
      material, feature, price, rating: RATINGS[i], history: history(price, MOVES[i]),
    };
  });
}

const CACHE = {};
export const competitorsFor = (categoryId) => (CACHE[categoryId] ??= build(categoryId));
export const competitorById = (id) => {
  const cat = id.split('-c')[0];
  return competitorsFor(cat).find((c) => c.id === id) ?? null;
};
/** The listings the seller is already following when the demo opens (the worked example only). */
export const INITIAL_TRACKED = { 'SKU-1001': ['kurtis-c3', 'kurtis-c2', 'kurtis-c4'] };
