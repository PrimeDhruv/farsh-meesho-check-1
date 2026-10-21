import { CATEGORIES } from './categories.js';

/**
 * Mock GROUP data — SIMULATED. Meesho would supply, per product group, the price distribution of live
 * comparable listings. Here the P25 / median / P75 come from the category presets (the kurti group is the
 * deck's ₹349 / ₹379 / ₹429) and a set of example listings is generated so that their own percentiles
 * reproduce that band exactly. Names, ratings and order counts are invented; nothing here is live Meesho data.
 */

/** Linear-interpolation percentile on a sorted array (p in 0..1). */
export function percentile(sorted, p) {
  const pos = p * (sorted.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const NAMES = {
  kurtis:   ['Printed cotton A-line kurti', 'Rayon A-line kurti, floral', 'Cotton A-line kurti, block print', 'A-line kurti with pockets', 'Chikankari-style A-line kurti', 'Anarkali-cut printed kurti', 'Embroidered A-line kurti', 'Cotton-silk A-line kurti', 'Festive A-line kurti, mirror work'],
  kurtaset: ['Straight kurta + pant set', 'Cotton kurta set, printed', 'Rayon kurta set, plain', 'Kurta set with dupatta', 'Embroidered kurta set', 'Cotton-silk kurta set', 'Festive kurta set', 'Chanderi-style kurta set', 'Premium kurta set, 3-piece'],
  bottoms:  ['Rayon palazzo, plain', 'Cotton palazzo, printed', 'Wide-leg pants', 'Palazzo with pockets', 'Straight pants, stretch', 'Culottes, cotton', 'Flared palazzo', 'Linen-blend pants', 'Premium palazzo set'],
  leggings: ['Churidar leggings, cotton', 'Ankle leggings, stretch', 'Churidar leggings, 2-pack', 'Leggings, plain', 'Leggings, high-waist', 'Leggings, fleece-lined', 'Leggings, printed', 'Leggings, premium cotton', 'Leggings, 3-pack'],
  dupatta:  ['Cotton dupatta, plain', 'Block-print dupatta', 'Chiffon dupatta', 'Phulkari-style dupatta', 'Cotton dupatta, mirror work', 'Printed dupatta', 'Embroidered dupatta', 'Silk-blend dupatta', 'Bandhani dupatta'],
  footwear: ['Flat sandals, tan', 'Flat sandals, black', 'Slip-on flats', 'Sandals with back strap', 'Embellished flats', 'Cushioned sandals', 'Block-heel sandals', 'Faux-leather flats', 'Premium leather-look sandals'],
  home:     ['Steel bottle 1 L', 'Steel bottle 750 ml', 'Insulated bottle 1 L', 'Steel bottle 2-pack', 'Steel bottle with sleeve', 'Insulated bottle 750 ml', 'Steel flask 1 L', 'Premium insulated bottle', 'Bottle set with lunch box'],
  bags:     ['Cotton sling bag', 'Canvas sling bag', 'Faux-leather sling', 'Sling bag with pockets', 'Printed sling bag', 'Mini sling, zip', 'Quilted sling bag', 'Embroidered sling bag', 'Premium sling bag'],
};

const r5 = (n) => Math.round(n);

/** Nine example comparable listings whose interpolated P25 / median / P75 equal the group band. */
export function groupFor(categoryId) {
  const cat = CATEGORIES[categoryId], { p25, median, p75 } = cat.band;
  const prices = [p25 - 55, p25 - 28, p25, (p25 + median) / 2, median, (median + p75) / 2, p75, p75 + 30, p75 + 65].map(r5);
  const names = NAMES[categoryId];
  const listings = prices.map((price, i) => ({
    id: `${categoryId}-${i + 1}`, name: names[i], price,
    rating: +(3.6 + ((i * 7) % 11) / 10).toFixed(1),      // invented
    orders30d: 40 + ((i * 53) % 160),                      // invented
  }));
  return { categoryId, name: cat.group, band: cat.band, listings, simulated: true };
}
