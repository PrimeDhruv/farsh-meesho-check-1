/**
 * LAUNCH IDEAS — SIMULATED stand-ins for what Meesho's buyer-search and category data would supply (Oct 2026 addition).
 * None of this is live Meesho data. In production:
 *   searches   monthly buyer searches for a keyword set (Meesho search logs, rolled up per product group)
 *   growth     change in those searches over the last 3 months
 *   listings   how many live listings already match the keyword set (supply)
 *   season     a 12-month demand index for the group (100 = an average month), from last year's orders
 *   top sellers  the best-selling listings in the group, from aggregated order data
 *
 * Each idea is a product a supplier could launch, described by five keywords (fabric · style · design · colour ·
 * price range). `bucket` is the price range, as a position in that group's price ranges in demandBuckets.js
 * (3 = the busiest range). `cost` is a typical making cost for this kind of product (simulated), used only as a
 * starting point the supplier can change.
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Buying moments by month (0 = January). Diwali 2026 falls on 8 November. */
export const EVENTS = [
  { id: 'wedding1', label: 'Wedding season', months: [0, 1] },
  { id: 'holi', label: 'Holi', months: [2] },
  { id: 'summer', label: 'Summer', months: [3, 4, 5] },
  { id: 'school', label: 'School & college reopen', months: [5, 6] },
  { id: 'rakhi', label: 'Raksha Bandhan', months: [7] },
  { id: 'navratri', label: 'Navratri & Durga Puja', months: [8, 9] },
  { id: 'diwali', label: 'Diwali', months: [9, 10] },
  { id: 'wedding2', label: 'Wedding season', months: [10, 11] },
  { id: 'winter', label: 'Winter', months: [11, 0] },
];

/** 12-month demand index per group (Jan … Dec). */
export const SEASON = {
  kurtis:   { index: [95, 90, 112, 120, 116, 96, 85, 95, 114, 135, 128, 104], events: ['summer', 'navratri', 'diwali'] },
  kurtaset: { index: [104, 96, 100, 104, 100, 88, 84, 100, 120, 146, 136, 116], events: ['navratri', 'diwali', 'wedding2'] },
  bottoms:  { index: [94, 94, 110, 122, 116, 100, 88, 94, 104, 116, 112, 100], events: ['summer', 'diwali'] },
  leggings: { index: [122, 106, 92, 86, 80, 86, 92, 96, 104, 114, 124, 130], events: ['winter', 'wedding2'] },
  dupatta:  { index: [108, 100, 96, 90, 88, 84, 90, 106, 116, 142, 130, 114], events: ['navratri', 'diwali', 'wedding2'] },
  footwear: { index: [96, 94, 104, 116, 112, 100, 84, 90, 106, 132, 122, 100], events: ['summer', 'diwali'] },
  home:     { index: [84, 90, 116, 136, 142, 122, 96, 90, 90, 96, 86, 80], events: ['summer', 'school'] },
  bags:     { index: [100, 94, 100, 100, 96, 118, 112, 100, 104, 126, 114, 98], events: ['school', 'diwali'] },
};

/** Typical packaging ₹ for a new product in each group (simulated; same as the catalogue's look-alikes). */
export const PACKAGING = { kurtis: 12, kurtaset: 14, bottoms: 12, leggings: 7, dupatta: 8, footwear: 9, home: 18, bags: 14 };

const I = (id, kw, searches, growth, listings, bucket, cost, why, extra = {}) => ({ id, kw, searches, growth, listings, bucket, cost, why, ...extra });

/**
 * kw = [fabric, style, design, colour] — the price range is the fifth keyword, read from the bucket.
 * `season` overrides the group's season for ideas that sell at a different time (e.g. winter wear).
 */
export const IDEAS = {
  kurtis: [
    I('k1', ['Cotton', 'A-line', 'Floral print', 'Pastel'], 48000, 0.18, 210, 3, 130, 'The most-searched kurti look. Pastels lead in the festive month.'),
    I('k2', ['Rayon', 'Straight', 'Foil print', 'Maroon'], 26000, 0.42, 70, 4, 145, 'Festive searches for foil prints are up fast and few listings match.'),
    I('k3', ['Cotton', 'Anarkali', 'Embroidered', 'Mustard'], 18000, 0.27, 55, 4, 160, 'Buyers want a festive look under ₹420. Not many sellers offer it.'),
    I('k4', ['Cotton', 'Short kurti', 'Solid', 'Black'], 21000, 0.06, 240, 2, 105, 'Steady all-year seller, but crowded. Win on price and photos.'),
    I('k5', ['Khadi', 'A-line', 'Block print', 'Indigo'], 9000, 0.35, 22, 4, 150, 'Small but growing search with very few listings: an easy gap.'),
    I('k6', ['Rayon', 'Kaftan', 'Printed', 'Teal'], 12000, -0.08, 60, 3, 120, 'Searches peaked in summer and are now slowing. Plan it for March.', { season: [95, 90, 118, 130, 126, 104, 88, 90, 92, 96, 92, 90] }),
  ],
  kurtaset: [
    I('ks1', ['Rayon', '3-piece set', 'Gota work', 'Pink'], 30000, 0.38, 90, 3, 230, 'The festive bestseller look. Searches climb into Diwali.'),
    I('ks2', ['Cotton', 'Kurta + pant', 'Printed', 'Green'], 22000, 0.12, 140, 2, 170, 'Daily wear set with steady demand.'),
    I('ks3', ['Chanderi', 'Kurta + dupatta', 'Woven', 'Gold'], 14000, 0.52, 35, 4, 260, 'Fast-growing wedding-guest search and few listings.'),
    I('ks4', ['Cotton', 'Co-ord set', 'Solid', 'Beige'], 16000, 0.24, 80, 3, 180, 'Young buyers search co-ords more each month.'),
    I('ks5', ['Silk blend', 'Sharara set', 'Embroidered', 'Red'], 11000, 0.31, 40, 5, 300, 'Higher price, but wedding buyers pay for it in Nov–Dec.'),
  ],
  bottoms: [
    I('b1', ['Rayon', 'Palazzo', 'Solid', 'Black'], 34000, 0.04, 260, 3, 80, 'High searches, but many listings. Win with a 2-pack.'),
    I('b2', ['Cotton', 'Straight pant', 'Solid', 'White'], 19000, 0.22, 90, 3, 85, 'Grows with kurta-set searches. Cotton is wanted for summer.'),
    I('b3', ['Crepe', 'Wide leg', 'Printed', 'Navy'], 12000, 0.36, 40, 4, 100, 'Printed wide-leg searches are rising and few listings match.'),
    I('b4', ['Cotton', 'Palazzo', 'Pack of 2', 'Assorted'], 15000, 0.18, 50, 4, 125, 'Packs sell well: a higher order value for the same shipping.'),
    I('b5', ['Rayon', 'Sharara', 'Plain', 'Maroon'], 8000, 0.44, 25, 4, 100, 'Festive bottoms. Grows in Oct–Nov.'),
  ],
  leggings: [
    I('l1', ['Cotton-lycra', 'Churidar', 'Solid', 'Black'], 52000, 0.10, 300, 3, 28, 'The biggest search in the group. Crowded, so keep cost tight.'),
    I('l2', ['Woollen', 'Ankle length', 'Solid', 'Maroon'], 24000, 0.68, 60, 4, 50, 'Winter searches are rising fast. List now for Nov–Jan.', { season: [140, 110, 80, 70, 64, 64, 70, 80, 96, 120, 145, 160] }),
    I('l3', ['Cotton-lycra', 'Ankle length', 'Pack of 3', 'Assorted'], 21000, 0.20, 70, 4, 60, 'Packs win on value. Few listings at this price.'),
    I('l4', ['Velvet', 'Churidar', 'Shiny', 'Wine'], 9000, 0.48, 20, 4, 42, 'Festive and wedding wear with very few listings.'),
    I('l5', ['Cotton', 'Capri', 'Solid', 'Grey'], 7000, -0.12, 45, 2, 30, 'A summer search that is slowing now. Plan it for March.', { season: [80, 86, 110, 128, 132, 118, 100, 92, 88, 84, 80, 78] }),
  ],
  dupatta: [
    I('d1', ['Chiffon', 'Dupatta', 'Printed', 'Multicolour'], 28000, 0.22, 120, 5, 22, 'Pairs with kurta searches. Festive colours sell best.'),
    I('d2', ['Banarasi', 'Dupatta', 'Woven', 'Red'], 17000, 0.48, 40, 6, 35, 'Wedding and festive search, growing fast with few listings.'),
    I('d3', ['Cotton', 'Stole', 'Block print', 'Indigo'], 9000, 0.14, 35, 5, 24, 'A small, steady search. Block prints stand out.'),
    I('d4', ['Net', 'Dupatta', 'Gota border', 'Pink'], 13000, 0.33, 45, 6, 28, 'Festive look at a mid price. Searches are rising into Diwali.'),
    I('d5', ['Woollen', 'Shawl', 'Embroidered', 'Black'], 11000, 0.58, 30, 6, 40, 'A winter search, rising now.', { season: [140, 115, 80, 64, 60, 60, 66, 76, 92, 118, 142, 160] }),
  ],
  footwear: [
    I('f1', ['Synthetic', 'Flat sandal', 'Embellished', 'Gold'], 31000, 0.40, 110, 4, 58, 'Festive flats are the top search this month.'),
    I('f2', ['PU', 'Slider', 'Solid', 'Black'], 38000, 0.05, 280, 2, 32, 'Big, steady search. Very crowded, so price matters.'),
    I('f3', ['Synthetic', 'Kolhapuri', 'Handcrafted look', 'Tan'], 15000, 0.28, 45, 3, 46, 'Ethnic flats are growing with festive kurta searches.'),
    I('f4', ['PU', 'Block heel', 'Strappy', 'Nude'], 12000, 0.36, 40, 5, 75, 'Party wear for wedding season, with few listings.'),
    I('f5', ['EVA', 'Flip-flop', 'Printed', 'Navy'], 9000, -0.10, 90, 1, 25, 'Summer and monsoon wear. Slowing now; plan it for March.', { season: [86, 90, 112, 126, 130, 128, 118, 96, 88, 82, 78, 80] }),
  ],
  home: [
    I('h1', ['Steel', 'Bottle', 'Insulated', 'Black'], 26000, 0.30, 80, 5, 85, 'Hot-and-cold bottles grow in winter and for gifting.', { season: [104, 96, 104, 112, 112, 106, 94, 90, 96, 114, 118, 112] }),
    I('h2', ['Steel', 'Bottle', 'Fridge, 1 L', 'Silver'], 33000, -0.06, 200, 3, 50, 'A big summer search. Slowing now; stock up for March.'),
    I('h3', ['Copper', 'Bottle', 'Hammered', 'Copper'], 12000, 0.22, 35, 6, 95, 'Diwali gifting search with few listings.', { season: [92, 90, 96, 100, 100, 94, 90, 92, 104, 134, 128, 98] }),
    I('h4', ['Steel', 'Lunch box', 'Pack of 3', 'Silver'], 17000, 0.12, 70, 4, 55, 'School and office demand. Peaks in June and stays steady.', { season: [96, 94, 100, 104, 100, 128, 120, 100, 98, 96, 92, 92] }),
    I('h5', ['Glass', 'Bottle', 'With sleeve', 'Pastel'], 8000, 0.26, 25, 5, 70, 'A small, fast-growing search with very few listings.'),
  ],
  bags: [
    I('g1', ['Faux leather', 'Sling bag', 'Quilted', 'Black'], 29000, 0.26, 120, 3, 125, 'The top sling-bag search, rising into the festive season.'),
    I('g2', ['Canvas', 'Tote', 'Printed', 'Beige'], 18000, 0.18, 60, 3, 110, 'College and office buyers. Peaks in June–July.'),
    I('g3', ['Velvet', 'Potli', 'Embroidered', 'Maroon'], 14000, 0.62, 30, 4, 95, 'Festive and wedding potlis are growing fast with few listings.', { season: [118, 112, 96, 92, 90, 88, 90, 100, 112, 132, 130, 120] }),
    I('g4', ['Faux leather', 'Handbag', 'Structured', 'Tan'], 16000, 0.10, 90, 5, 170, 'A higher price and steady demand. Photos decide the sale.'),
    I('g5', ['Nylon', 'Backpack', 'Solid', 'Navy'], 21000, -0.04, 150, 3, 140, 'A school-season search. Plan it for May–June.', { season: [92, 88, 96, 104, 112, 136, 124, 96, 92, 90, 86, 88] }),
  ],
};

/**
 * Top sellers per group: the best-selling listings Meesho would see (SIMULATED, sellers anonymised by city).
 * `idea` links a listing to the keyword set it sells under; ordersMonth = last 30 days; trend = weekly orders, 8 weeks.
 */
const S = (id, idea, city, price, rating, ratings, ordersMonth, monthsLive, trend) => ({ id, idea, city, price, rating, ratings, ordersMonth, monthsLive, trend });
export const TOP_SELLERS = {
  kurtis: [
    S('ts-k1', 'k1', 'Jaipur', 369, 4.3, 5200, 1840, 14, [380, 395, 410, 420, 430, 440, 455, 470]),
    S('ts-k2', 'k2', 'Surat', 399, 4.2, 2100, 1260, 5, [180, 210, 240, 270, 300, 320, 340, 360]),
    S('ts-k3', 'k4', 'Ahmedabad', 339, 4.1, 7400, 1150, 22, [290, 285, 280, 290, 285, 280, 275, 285]),
    S('ts-k4', 'k3', 'Lucknow', 409, 4.4, 1300, 720, 6, [120, 135, 150, 160, 170, 180, 190, 200]),
    S('ts-k5', 'k5', 'Jaipur', 399, 4.5, 640, 410, 4, [60, 70, 80, 85, 95, 100, 110, 115]),
  ],
  kurtaset: [
    S('ts-ks1', 'ks1', 'Jaipur', 499, 4.3, 4100, 1520, 11, [300, 320, 340, 360, 380, 400, 420, 440]),
    S('ts-ks2', 'ks2', 'Surat', 469, 4.1, 6200, 1180, 19, [290, 300, 295, 300, 295, 300, 305, 300]),
    S('ts-ks3', 'ks4', 'Delhi', 489, 4.2, 1800, 860, 7, [160, 175, 190, 200, 215, 225, 235, 245]),
    S('ts-ks4', 'ks3', 'Kolkata', 539, 4.4, 900, 610, 4, [80, 100, 120, 140, 160, 175, 190, 205]),
    S('ts-ks5', 'ks5', 'Delhi', 599, 4.2, 700, 380, 8, [70, 75, 80, 90, 95, 100, 105, 110]),
  ],
  bottoms: [
    S('ts-b1', 'b1', 'Surat', 319, 4.1, 8800, 1960, 26, [480, 490, 485, 490, 495, 490, 500, 495]),
    S('ts-b2', 'b4', 'Ahmedabad', 359, 4.3, 2300, 980, 9, [200, 210, 225, 235, 245, 250, 260, 265]),
    S('ts-b3', 'b2', 'Delhi', 329, 4.2, 1900, 740, 8, [170, 175, 180, 185, 185, 190, 190, 195]),
    S('ts-b4', 'b3', 'Mumbai', 349, 4.3, 800, 520, 5, [80, 95, 110, 120, 130, 140, 150, 155]),
    S('ts-b5', 'b5', 'Jaipur', 359, 4.0, 400, 310, 3, [30, 45, 60, 70, 80, 90, 100, 110]),
  ],
  leggings: [
    S('ts-l1', 'l1', 'Tiruppur', 199, 4.2, 18400, 3900, 30, [960, 970, 980, 975, 980, 990, 985, 990]),
    S('ts-l2', 'l2', 'Ludhiana', 229, 4.3, 3100, 1650, 13, [180, 230, 290, 350, 410, 460, 520, 580]),
    S('ts-l3', 'l3', 'Tiruppur', 229, 4.2, 4200, 1380, 15, [320, 330, 340, 345, 350, 355, 360, 365]),
    S('ts-l4', 'l4', 'Delhi', 225, 4.1, 600, 420, 4, [50, 60, 75, 90, 100, 115, 125, 135]),
    S('ts-l5', 'l5', 'Kolkata', 189, 4.0, 5100, 520, 20, [190, 175, 160, 145, 135, 125, 115, 110]),
  ],
  dupatta: [
    S('ts-d1', 'd1', 'Surat', 149, 4.1, 9200, 2100, 21, [500, 510, 520, 525, 530, 540, 545, 550]),
    S('ts-d2', 'd2', 'Varanasi', 189, 4.5, 1700, 940, 8, [140, 160, 185, 210, 235, 255, 275, 295]),
    S('ts-d3', 'd4', 'Jaipur', 169, 4.2, 1500, 720, 7, [130, 145, 160, 170, 180, 190, 200, 210]),
    S('ts-d4', 'd3', 'Jaipur', 149, 4.3, 1100, 380, 12, [90, 92, 95, 94, 96, 95, 97, 96]),
    S('ts-d5', 'd5', 'Amritsar', 199, 4.4, 500, 310, 3, [20, 30, 45, 60, 75, 90, 105, 120]),
  ],
  footwear: [
    S('ts-f1', 'f2', 'Agra', 229, 4.0, 14200, 2650, 28, [660, 665, 660, 665, 670, 665, 660, 665]),
    S('ts-f2', 'f1', 'Delhi', 269, 4.2, 3000, 1720, 9, [260, 300, 340, 380, 420, 450, 480, 510]),
    S('ts-f3', 'f3', 'Kolhapur', 259, 4.4, 1600, 760, 10, [150, 160, 170, 180, 190, 195, 205, 210]),
    S('ts-f4', 'f4', 'Mumbai', 299, 4.1, 900, 480, 5, [70, 80, 95, 105, 115, 125, 135, 145]),
    S('ts-f5', 'f5', 'Agra', 209, 3.9, 6400, 640, 18, [240, 220, 200, 185, 170, 160, 150, 140]),
  ],
  home: [
    S('ts-h1', 'h2', 'Mumbai', 279, 4.2, 12100, 1500, 24, [460, 430, 400, 380, 360, 345, 330, 320]),
    S('ts-h2', 'h1', 'Delhi', 309, 4.3, 3800, 1340, 10, [240, 260, 285, 305, 325, 345, 365, 385]),
    S('ts-h3', 'h4', 'Rajkot', 279, 4.2, 2600, 720, 14, [175, 180, 180, 180, 182, 180, 181, 180]),
    S('ts-h4', 'h3', 'Moradabad', 349, 4.4, 1100, 540, 6, [60, 80, 100, 120, 140, 160, 180, 200]),
    S('ts-h5', 'h5', 'Delhi', 309, 4.3, 300, 260, 3, [25, 35, 45, 55, 65, 75, 80, 90]),
  ],
  bags: [
    S('ts-g1', 'g1', 'Delhi', 369, 4.2, 5600, 1610, 15, [360, 370, 385, 395, 405, 415, 425, 435]),
    S('ts-g2', 'g3', 'Jaipur', 389, 4.4, 1400, 900, 5, [120, 145, 170, 195, 220, 245, 265, 285]),
    S('ts-g3', 'g2', 'Kolkata', 359, 4.1, 3300, 780, 12, [200, 195, 195, 190, 195, 190, 195, 190]),
    S('ts-g4', 'g5', 'Mumbai', 369, 4.0, 4400, 610, 16, [190, 180, 170, 160, 155, 150, 145, 140]),
    S('ts-g5', 'g4', 'Kanpur', 439, 4.3, 900, 430, 7, [90, 95, 100, 105, 110, 112, 115, 118]),
  ],
};
