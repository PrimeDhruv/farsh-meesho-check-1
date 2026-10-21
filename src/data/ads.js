/**
 * ADS ASSUMPTIONS — SIMULATED stand-ins for what Meesho's ads data would supply (Oct 2026 addition).
 * Meesho ads are paid per click. In this prototype:
 *
 *   cpc    ₹ a click costs when you start spending (the cheapest searches first). Per category, invented.
 *   reach  the most extra clicks ads can bring in a month, as a multiple of the clicks a typical similar listing gets
 *          on its own at that price. Ads show your product to more buyers, but they cannot make buyers want a product
 *          at a price few of them look at, so the ceiling follows buyer interest at that price.
 *
 * Every extra ₹ buys fewer clicks than the one before (you move from cheap searches to costly ones), so the extra
 * clicks follow   ad clicks = most × (1 − e^(−spend ÷ (most × cpc)))   — about spend ÷ cpc at first, then flattening.
 * In production these would come from Meesho's ads reports (cost per click and impressions by category).
 */
export const ADS = {
  cpc: { kurtis: 2.0, kurtaset: 2.4, bottoms: 1.8, leggings: 1.4, dupatta: 1.2, footwear: 1.8, home: 2.2, bags: 2.0 },
  defaultCpc: 2.0,
  reach: 1.6,
  // the sweet spot = every monthly budget that earns at least this share of the best possible extra profit
  sweetShare: 0.8,
};
