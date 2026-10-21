/**
 * The five lifecycle stages (deck Round 2, slide 7): what Farsh watches, what triggers a change, and when to leave
 * the price alone. Thresholds are starting points, tuned per category. Cost-fix recommendations are no longer kept
 * here: they are computed live by engine/coach.js (deck: −₹32 / −₹12 / −₹7 for the kurti).
 */
export const LIFECYCLE = [
  { stage: 'Launch', when: 'Week 0–2',    goal: 'Get seen without losing money',     watch: 'Views, rank in the group, clicks, first reasons for failed deliveries', fires: 'No views in 7 days and the price is above where buyers buy', leave: 'Views are fine but clicks are low: fix the photo and title first' },
  { stage: 'Learn',  when: 'Week 2–6',    goal: 'Swap borrowed averages for your own', watch: 'Your own returns and failed deliveries, return reasons, first ratings', fires: 'Your own returns or failed deliveries differ from the category average', leave: 'Fewer than ~30 orders: the numbers are still noise' },
  { stage: 'Grow',   when: 'Month 2–4',   goal: 'Capture the headroom you built',    watch: 'Sales vs similar products, rating, repeat orders, days of stock', fires: 'Selling better than similar products and rating ≥ 4, twice in a row', leave: 'Your rating is slipping: fix that first' },
  { stage: 'Defend', when: 'Month 4+',    goal: 'Hold the rank at a profit',         watch: 'Middle price of the group, rival price cuts, your costs, delivery slab, festivals', fires: 'The middle price of the group moves more than 5%, or a cost or delivery slab changes', leave: 'A rival goes below your no-loss price: let it go' },
  { stage: 'Clear',  when: 'Ageing stock', goal: 'Turn stock into cash',             watch: 'Days of stock, how fast it sells, profit after every discount', fires: 'More than 60 days of stock', leave: 'It would go below your no-loss price: delist instead' },
];
