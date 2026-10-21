/**
 * Mock seller catalogue — SIMULATED. Persona: Rekha Sharma, Jaipur (deck, slide 2).
 * Product #1 is the deck's worked example (cost ₹150, packaging ₹12).
 * Everything else is invented for the demo. Shipping, ads, RTO and returns are NOT stored here:
 * they come from the category presets (borrowed averages) unless `own` data exists (≥ 30 orders).
 *
 * `listedPrice` is what the seller intends to list / has listed. null = not priced yet.
 * `last30` = the views, clicks and orders the listing got in the last 30 days (SIMULATED, as the supplier panel
 * would show them). Farsh uses it as the "as seen now" baseline when it says what a price change could do.
 * `attrs` = material and main feature, used only to explain why a competitor was suggested (SIMULATED).
 * rank / conv / stockCover feed the Farsh Watch weekly check (simulated).
 */
export const PRODUCTS = [
  { id: 'SKU-1001', name: "Women's A-line kurti — printed cotton", categoryId: 'kurtis',   status: 'draft', cost: 150, packaging: 12, listedPrice: 406, orders: 0,  note: 'Deck worked example. Priced cost + usual margin.', attrs: { material: 'cotton', feature: 'printed' } },
  { id: 'SKU-1002', name: 'Straight kurta set, 2-piece',           categoryId: 'kurtaset', status: 'live',  cost: 175, packaging: 14, listedPrice: 489, orders: 41, own: { rto: 0.20, returns: 0.14 }, rank: 'Top 40%', conv: 0.06,  stockCover: 34, attrs: { material: 'cotton', feature: '2-piece set' }, last30: { views: 2400, clicks: 170, orders: 24, atPrice: 489 } },
  { id: 'SKU-1003', name: "Women's flat sandals — tan",            categoryId: 'footwear', status: 'live',  cost: 44,  packaging: 9,  listedPrice: 249, orders: 62, own: { rto: 0.21, returns: 0.11 }, rank: 'Top 25%', conv: 0.03,  stockCover: 52, attrs: { material: 'synthetic', feature: 'cushioned sole' }, last30: { views: 3600, clicks: 250, orders: 38, atPrice: 249 } },
  { id: 'SKU-1004', name: 'Steel water bottle, 1 L',               categoryId: 'home',     status: 'live',  cost: 120, packaging: 18, listedPrice: 269, orders: 18, rank: 'Top 15%', conv: 0.09,  stockCover: 22, attrs: { material: 'steel', feature: '1 L, leak-proof' }, last30: { views: 1100, clicks: 75, orders: 11, atPrice: 269 } },
  { id: 'SKU-1005', name: 'Cotton sling bag',                      categoryId: 'bags',     status: 'live',  cost: 118, packaging: 14, listedPrice: 369, orders: 27, rank: 'Top 50%', conv: -0.01, stockCover: 41, attrs: { material: 'cotton', feature: 'zip pocket' }, last30: { views: 900, clicks: 55, orders: 8, atPrice: 369 } },
  { id: 'SKU-1006', name: 'Cotton dupatta — block print',          categoryId: 'dupatta',  status: 'draft', cost: 60,  packaging: 8,  listedPrice: 149, orders: 0, attrs: { material: 'cotton', feature: 'block print' } },
  { id: 'SKU-1007', name: 'Palazzo pants — rayon',                 categoryId: 'bottoms',  status: 'live',  cost: 95,  packaging: 12, listedPrice: 345, orders: 9,  rank: 'Bottom 40%', conv: -0.04, stockCover: 68, note: 'Repriced above median for the Farsh Watch demo (Part 5): triggers the no-impressions signal.', attrs: { material: 'rayon', feature: 'wide leg' }, last30: { views: 380, clicks: 12, orders: 2, atPrice: 345 } },
  { id: 'SKU-1008', name: "Women's leggings — churidar",           categoryId: 'leggings', status: 'live',  cost: 28,  packaging: 7,  listedPrice: 199, orders: 88, own: { rto: 0.12, returns: 0.12 }, rank: 'Top 30%', conv: 0.05,  stockCover: 29, attrs: { material: 'cotton-lycra', feature: 'churidar length' }, last30: { views: 4200, clicks: 320, orders: 55, atPrice: 199 } },
];
export const WORKED_EXAMPLE_ID = 'SKU-1001';
