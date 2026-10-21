# Farsh (फ़र्श) — floor-first price coach · Meesho seller concept prototype
Meesho DICE Challenge S3 · Business Track · Pricing · Team PriceWise, IIT Bombay

**Farsh helps sellers lower their FLOOR before they lower their PRICE.**
Concept prototype. Simulated data, not live Meesho data; not connected to Meesho systems.

## Getting started (after cloning from GitHub)

### 1. Prerequisites
- **Node.js 18 or newer** (includes npm). Check with `node -v`. Download from https://nodejs.org (the LTS version is fine).
- **Git**, to clone the repository.

### 2. Clone and install
```bash
git clone <your-repo-url>
cd Farsh-Meesho        # the folder that contains package.json
npm install               # installs dependencies into node_modules/ (not stored in the repo)
```
`npm ci` also works and installs the exact versions pinned in `package-lock.json`.

### 3. Run the app
```bash
npm run dev
```
Open **http://localhost:5173** in your browser. On the first visit you'll be asked to pick a language (English or
Hindi); you can change it later from the top bar or Settings. Stop the server with `Ctrl + C`.

### 4. Other commands
| Command | What it does |
|---|---|
| `npm test` | Runs the 130 engine tests (Node's built-in test runner, no browser needed) |
| `npm run build` | Creates a production build in `dist/` |
| `npm run preview` | Serves the `dist/` build locally to check it |

The build uses relative paths, so the contents of `dist/` can be hosted on any static host (GitHub Pages, Netlify,
Vercel) or opened from a sub-folder.

### Troubleshooting
- **`vite: command not found` or missing modules:** run `npm install` first, from the folder that has `package.json`.
- **Port 5173 already in use:** Vite picks the next free port automatically. Use the URL it prints in the terminal.
- **Errors on an old Node version:** upgrade to Node 18+ (`node -v` to check).
- **Fonts look different offline:** the Plus Jakarta Sans and Noto Sans Devanagari fonts load from Google Fonts. The
  app still works without internet, using system fonts.
- **Language or demo state looks stuck:** the language choice is stored in your browser's localStorage under
  `farsh.lang`. Clear it, or use Settings → Reset demo data for prices and fixes (those are kept in memory only).

## The seller journey (matches the final Round 2 deck)
1. **Dashboard: what to do today.** Four tiles (losing money · may get fewer orders · small fix · on track) open
   Products pre-filtered. "Fix these first" cards show your price, your no-loss price and where buyers buy, then one
   action, why, and profit per order now → after.
2. **Price Coach:** product → **1 no-loss price** (two inputs; a cost sheet whose rows add up: 150 + 12 + 90 + 8 + 20 +
   59 + 19 + 7 = ₹365) → **2 where buyers buy** (orders per price range, the busy range ₹330–389, and what you'd make at
   each price; cheapest ≠ best-selling) → **3 lower your cost** (smaller box +₹20, online-payment offer +₹9, size chart
   +₹5 per order at ₹351; Apply / Undo) → **4 your price** (Try ₹351; now vs suggested vs copy-the-cheapest money; "Why
   ₹351?"; set my own; try-any-price slider) → **5 after you list** (estimates until 30 orders, Pehla Tees look-back,
   Farsh Watch). "All my numbers (for experts)" keeps every model input, the formula and the comparable listings.
3. **Products:** every SKU with price, no-loss price, profit per order, busy range, data confidence and status.
4. **Farsh Watch:** weekly alerts as what we noticed → likely reason → one thing to do → what it's worth (never a
   forced price), a WhatsApp preview, the festive stress test, and the five lifecycle stages.
5. **Ads Planner (new):** for any product and price, the monthly ads budget range that earns the most total profit
   (the sweet spot), what it buys (views, clicks, orders, total profit a month), a chart of extra profit by budget with
   too little / sweet spot / too much / losing money zones, the ad cost each order carries (no-loss price before and
   with ads), and "price + ads together": e.g. kurti best without ads ₹389 (≈₹1,600 a month) vs ₹406 with ≈₹750 of
   ads (≈₹2,050 a month). Model in `src/engine/ads.js`, assumptions in `src/data/ads.js`.
6. **Launch Ideas (new):** for each of the seller's categories, launch ideas built from buyer searches as five
   keywords (fabric · style · design · colour · price range) with searches, growth, competition, expected sales and
   profit (same maths as Price Coach), and when to launch / how long / when to clear stock; a top-sellers board with
   revenue per product and a "View product" window; a season planner. "Plan this launch" adds the product as a draft
   and opens Price Coach or the Ads Planner. Model in `src/engine/launch.js`, data in `src/data/launch.js`.
7. **Settings:** language, profile, alert channel, assumptions in plain words, reset demo data.

Applying a fix or using a price updates the catalogue, so every screen shows the same numbers.

## Language
English (default) and Hindi are complete for the seller-facing UI (`src/i18n/strings.js`); the language is chosen on
first visit and from the top bar or Settings, and remembered. Marathi, Bengali, Tamil, Telugu, Gujarati and Kannada
are listed as "coming soon" — add a `STRINGS` entry and set `ready: true`. Watch alert sentences and the expert panel
are generated in English and the UI says so.

## Structure
    src/engine/      pure logic, no UI
      calculator.js  pricing model: E = k(p(1−t) − c) − F − r·Lr − q·Lq; floor = price where E = 0
      demand.js      demand map: busy zone (buckets beating the group's typical listing), monthly ranges,
                     decision tree (in zone / fix cost first / below zone / reconsider)
      coach.js       Price Coach view-model: cost sheet (rows add to the floor), fixes applied in order
                     (−₹32 / −₹12 / −₹7 on the floor), money at three prices, adviceFor()
      levers.js      cost fixes as input patches (box → slab, prepaid mix → RTO, size chart → returns)
      position.js    catalogue status from floor + busy zone; signals.js / watchAll.js Farsh Watch
      decision.js, diagnosis.js, floor.js, model.js (effectiveInputs: base inputs + applied fixes)
    src/data/        SIMULATED: demandBuckets.js (kurti buckets = deck slide 6), categories, groups, products, history
    src/i18n/        LanguageContext + strings (en, hi)
    src/components/  seller/ (AdviceCard, CostSheet, DemandChart, FixCard, PricePanel, ZoneBar, ExpertPanel),
                     layout/ (shell, Meesho brand lock-up, language picker, onboarding), product/, ui/
    src/assets/meesho-tile.png   cropped from the official DICE S3 template provided with the case (not redrawn)

## Honesty notes
- Order ranges per price, comparable listings, ratings and Watch history are simulated. The kurti numbers are the
  deck's stated example. Order data is shown only as ranges, never one competitor's numbers.
- "Price can influence visibility, but the cheapest listing is not necessarily the one getting the most orders" —
  we make no claim about Meesho's production ranking.
- The size-chart fix is graded low confidence (published evidence supports a smaller effect); the online-payment offer
  is Meesho-funded (deck slide 9).
- "Money a month" assumes the seller sells like a typical similar product; it firms up after 30 orders.

## Changes in this upgrade (Oct 2026)
Meesho branding and template palette · language selector + Hindi · dashboard rebuilt around "what to do today" ·
Price Coach rebuilt as one guided flow with price × orders, before/after money and "Why?" · cost sheet that adds up ·
fixes now sequential (−₹32/−₹12/−₹7, matching the deck; the old stand-alone −₹14/−₹9 are gone) · catalogue status uses
the busy price range · plain-language Watch alerts · fixes and prices persist across screens · React key warning on
Watch fixed · React Router v7 warnings silenced. (A pre-upgrade copy of the source was kept locally by the team; it
is not part of this repository.)

## Product polish pass (Oct 2026)
Same solution, values and logic; clearer experience:
- **Brand:** Meesho above Farsh in the sidebar, onboarding and phone top bar, plus a "Meesho › Farsh › page" breadcrumb.
- **First visit:** two steps. Pick a language, then "How Farsh helps you price": safe price → where buyers buy → your best price.
- **Dashboard:**
  - Each tile opens exactly what it counts.
  - Advice cards read what's happening → your price / no-loss price / busy range / suggested → what to do and why → profit now → after.
  - Price-line labels never overlap.
  - "Quick ways to lower your cost" lists the single best fix per product that needs attention.
- **Price Coach:**
  - A sticky step bar that shows where you are.
  - Step 2 ends with "That's why…", leading into the suggestion.
  - "Why ₹351?" is always visible.
  - A one-line margin ↔ orders trade-off.
  - The "Try any price" slider can show today's costs or the costs after the fixes.
  - Fix savings are measured at the price you're actually told to use.
- **Products:** filter chips match the tiles and show counts; "You're above / in it / below" replaces the unlabelled bars; empty states are honest.
- **Farsh Watch:**
  - Alerts are grouped by product, most urgent first.
  - Each alert leads with "One thing to do".
  - The weekly check opens on a live product.
  - The five stages are shown as cards.
- **Phones:** 2-up to-do tiles, Meesho/Farsh brand in the top bar, and the simulated-data notice kept readable in its own strip. No horizontal overflow at 390px or 1024px.

## Round 2 upgrade notes

- **Views and clicks first.** Price advice now says what a lower price brings in views, clicks, orders per 100 views and total profit a month ("as seen now": your own last-30-day numbers when live, a typical look-alike otherwise). Profit per order is secondary. Engine: `src/engine/funnel.js`.
- **Floor-first is unchanged.** Floor ₹365, busy zone ₹330–389 and suggestion ₹351 for the demo kurti; no suggestion below the no-loss price.
- **Competitors** (`/competitors`): the seller picks, hides or adds competitors; every match is floor-checked; the price is never changed automatically.
- **Returns & Claims** (`/returns`): forward vs reverse shipping counted separately, claim recovery added back once, editable assumptions.
- **This week's no-loss price** with an 8-week trend (shown from 30 orders).
- **Simulated, not live:** competitor listings and histories, weekly floor history, claim rates, views/clicks ranges. All labelled in the UI.
- Tests: `npm test` (121 passing, incl. `src/engine/upgrade.test.js`).
