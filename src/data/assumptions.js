/**
 * Model assumptions — every value here comes from the Farsh deck (slides 2, 4, 5).
 * Rates marked "assumption" are stated assumptions until replaced with Meesho category data.
 */
export const ASSUMPTIONS = {
  gstTds: 0.0715,            // t — measured from the team's own live listing test on the supplier panel
  ads: 8,                    // ₹ per shipment — category average (assumption)
  rtoCod: 0.26,              // RTO on COD orders (Shipway FY25)
  rtoPrepaid: 0.02,          // RTO on prepaid orders (Shipway FY25)
  codShare: 0.72,            // Meesho COD share of orders (72–77%, RHP)
  returnRate: 0.14,          // q — category returns (assumption)
  rtoHandling: 15,           // ₹ handling per RTO (Lr, part 1)
  rtoStockLost: 0.05,        // share of stock lost on an RTO (Lr, part 2)
  returnReverseLeg: 55,      // ₹ reverse leg per return (Lq, part 1)
  returnUnsellable: 0.20,    // share of returned stock unsellable (Lq, part 2)
  targetContribution: 25,    // ₹ per shipped order the seller aims to keep (worked example)
  ownDataThreshold: 30,      // orders before the seller's own rates replace borrowed averages

  // Claims on returned goods — SIMULATED stand-ins. Meesho's real claim rules and outcomes are not in this prototype.
  claimRaiseRate: 0.75,      // share of unsellable (damaged / suspected-fraud) returns the seller raises a claim for
  claimApproved: 0.50,       // share of raised claims approved
  claimPending: 0.20,        // share of raised claims still pending (the rest are rejected)
  claimPayout: 0.80,         // an approved claim pays this share of the claimed product value (not always in full)
};

/** How each number on screen is sourced. Drives the Provenance badges. */
export const PROVENANCE = {
  seller:   { label: 'Your input',              tone: 'teal',   help: 'Typed by the seller.' },
  borrowed: { label: 'Borrowed · category avg', tone: 'amber',  help: 'A category average used until the seller has ~30 orders of their own. Simulated in this prototype.' },
  own:      { label: 'Your own data',           tone: 'green',  help: "Measured from this seller's own shipped orders (simulated in this prototype)." },
  deck:     { label: 'From deck',               tone: 'teal',   help: "Value stated in the Farsh deck, e.g. GST + TDS of 7.15% measured in the team's own live listing test on the supplier panel." },
  computed: { label: 'Computed',                tone: 'plum',   help: 'Calculated by Farsh from the model E = k(p(1 − t) − c) − F − rLr − qLq.' },
  mock:     { label: 'Simulated',               tone: 'grey',   help: 'Mock data standing in for something Meesho would supply. Not live Meesho data.' },
};
