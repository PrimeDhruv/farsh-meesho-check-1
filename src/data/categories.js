/**
 * Category / group presets — SIMULATED stand-ins for what Meesho would supply
 * (group price band, shipping slab, category RTO / returns). Not live Meesho data.
 * The A-line kurti group (₹349 / ₹379 / ₹429, shipping ₹90, returns 14%) is from the deck;
 * the other groups are invented for the demo.
 * `pack` = current vs proposed box dimensions (cm) for the repack lever; the kurti values are the deck's, the rest are invented.
 */
export const CATEGORIES = {
  kurtis:   { id: 'kurtis', pack: { current: [28,20,10], proposed: [24,16,8] },   label: "Women's kurtis", group: 'A-line kurtis',        band: { p25: 349, median: 379, p75: 429 }, shipping: 90,  slab: '1–2 kg, zonal',   ads: 8, codShare: 0.72, rtoCod: 0.26, rtoPrepaid: 0.02, returnRate: 0.14 },
  kurtaset: { id: 'kurtaset', pack: { current: [32,24,12], proposed: [28,20,8] }, label: 'Kurta sets',     group: 'Straight kurta sets',  band: { p25: 449, median: 499, p75: 579 }, shipping: 90,  slab: '1–2 kg, zonal',   ads: 8, codShare: 0.72, rtoCod: 0.26, rtoPrepaid: 0.02, returnRate: 0.15 },
  bottoms:  { id: 'bottoms', pack: { current: [30,22,10], proposed: [26,18,8] },  label: 'Bottomwear',     group: 'Palazzo & pants',      band: { p25: 289, median: 329, p75: 389 }, shipping: 90,  slab: '1–2 kg, zonal',   ads: 8, codShare: 0.74, rtoCod: 0.26, rtoPrepaid: 0.02, returnRate: 0.16 },
  leggings: { id: 'leggings', label: 'Leggings',       group: "Women's leggings",     band: { p25: 179, median: 209, p75: 249 }, shipping: 64,  slab: '0–0.5 kg, zonal', ads: 8, codShare: 0.72, rtoCod: 0.26, rtoPrepaid: 0.02, returnRate: 0.12 },
  dupatta:  { id: 'dupatta',  label: 'Accessories',    group: 'Cotton dupattas',      band: { p25: 129, median: 149, p75: 179 }, shipping: 64,  slab: '0–0.5 kg, zonal', ads: 8, codShare: 0.72, rtoCod: 0.26, rtoPrepaid: 0.02, returnRate: 0.10 },
  footwear: { id: 'footwear', label: 'Footwear',       group: "Women's flat sandals", band: { p25: 229, median: 259, p75: 299 }, shipping: 78,  slab: '0.5–1 kg, zonal', ads: 8, codShare: 0.78, rtoCod: 0.28, rtoPrepaid: 0.02, returnRate: 0.12 },
  home:     { id: 'home', pack: { current: [30,15,15], proposed: [26,14,13] },     label: 'Home & kitchen', group: 'Steel water bottles',  band: { p25: 239, median: 279, p75: 329 }, shipping: 104, slab: '1–2 kg, zonal',   ads: 8, codShare: 0.70, rtoCod: 0.22, rtoPrepaid: 0.02, returnRate: 0.08 },
  bags:     { id: 'bags', pack: { current: [34,26,12], proposed: [30,24,10] },     label: 'Bags',           group: 'Sling bags',           band: { p25: 329, median: 369, p75: 429 }, shipping: 90,  slab: '1–2 kg, zonal',   ads: 8, codShare: 0.74, rtoCod: 0.25, rtoPrepaid: 0.02, returnRate: 0.10 },
};
export const CATEGORY_LIST = Object.values(CATEGORIES);
