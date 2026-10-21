/**
 * RETURNS & CLAIMS — what happens to the money when orders come back. Pure, UI-free.
 *
 * A returned order is a financial outcome, not just a count. Some returns come back fine and are resold; some come
 * back damaged or look like fraud (the model's "unsellable share"). For those the seller can raise a CLAIM:
 *   approved  → pays back (part of) the product value        rejected → the seller bears the loss
 *   pending   → not decided yet, so it is NOT counted as money back
 *
 * Everything is per 100 orders shipped, from the same inputs as the floor (calculator.js), so the numbers
 * reconcile with the cost sheet:
 *
 *   product value lost on returns     = returns × unsellable share × product cost     (inside Lq)
 *   claim amount                      = that value, for the claims the seller raises
 *   claims recovered                  = approved claims × claim amount × payout share
 *
 * No double counting: the floor and the profit estimate E already subtract the FULL return-related loss. Claim
 * recovery is added back ONCE, on top, to give the adjusted profit. The no-loss price shown in Price Coach does not
 * assume recoveries (it stays the prudent figure); this module shows how much lower it would be if claims keep
 * being approved at the assumed rate. Outcomes are simulated: the UI must say so.
 */
import { calculate, keepRate } from './calculator.js';
import { ASSUMPTIONS } from '../data/assumptions.js';

export const CLAIM_DEFAULTS = {
  raise: ASSUMPTIONS.claimRaiseRate, approved: ASSUMPTIONS.claimApproved,
  pending: ASSUMPTIONS.claimPending, payout: ASSUMPTIONS.claimPayout,
};

/** Returns a list of problems with the claim assumptions; empty = usable. */
export function validateClaimAssumptions(a) {
  const errs = [];
  for (const k of ['raise', 'approved', 'pending', 'payout']) {
    if (typeof a[k] !== 'number' || !Number.isFinite(a[k]) || a[k] < 0 || a[k] > 1) errs.push(`${k} must be between 0 and 100%`);
  }
  if (!errs.length && a.approved + a.pending > 1 + 1e-9) errs.push('approved + pending cannot be more than 100%');
  return errs;
}

/**
 * @param inputs  calculator inputs (effective inputs of the product)
 * @param price   the price to measure the adjusted profit at (optional)
 * @param claim   claim assumptions (defaults above)
 * @param per     how many shipped orders the counts are for (default 100)
 */
export function returnsAndClaims(inputs, price, claim = CLAIM_DEFAULTS, per = 100) {
  const calc = calculate({ ...inputs, price: price ?? undefined });
  if (!calc.valid) return { valid: false, errors: calc.errors };
  const bad = validateClaimAssumptions(claim);
  if (bad.length) return { valid: false, errors: bad };

  const i = inputs, k = calc.keepRate;
  const shipped = per;
  const kept = k * per, returned = i.returnRate * per, rto = i.rtoRate * per;
  const unsellable = returned * i.returnUnsellableShare;               // damaged or suspected-fraud returns
  const raised = unsellable * claim.raise;
  const approved = raised * claim.approved, pending = raised * claim.pending, rejected = raised - approved - pending;
  const perClaim = i.productCost;                                      // value of the product lost
  const claimed = raised * perClaim;
  const recovered = approved * perClaim * claim.payout;                // approved, and not always paid in full
  const pendingAtStake = pending * perClaim * claim.payout;            // would be recovered if approved; NOT counted
  const rejectedLoss = rejected * perClaim;
  const shortPaid = approved * perClaim * (1 - claim.payout);          // approved but paid below the full value
  const unrecovered = rejectedLoss + shortPaid;                        // money the seller bears for good
  // each raised claim ends up recovered, short-paid, rejected or pending: they add up to the amount claimed
  const check = recovered + shortPaid + rejectedLoss + pending * perClaim;

  // where the return-related money goes, per 100 shipped orders (these are the lines inside the floor)
  const money = {
    forwardShipping: i.shippingCost * per,                             // paid on every shipment
    reverseShipping: returned * i.returnReverseCost,                   // the return leg of each returned order
    rtoHandling: rto * i.rtoHandlingCost,                              // handling of each failed delivery coming back
    returnProductLoss: returned * i.returnUnsellableShare * i.productCost,
    rtoStockLoss: rto * i.rtoStockLossShare * i.productCost,
  };
  money.returnRelatedLoss = money.reverseShipping + money.rtoHandling + money.returnProductLoss + money.rtoStockLoss;

  // profit per shipped order: the estimate already carries every loss above; recoveries are added back once
  const recoveredPerOrder = recovered / per;
  const E = calc.contributionPerShippedOrder;                          // null when no price
  const adjusted = E == null ? null : E + recoveredPerOrder;
  // the no-loss price if the same recoveries keep coming: floor = [c + (F + rLr + qLq − R) ÷ k] ÷ (1 − t)
  const floorWithClaims = calc.floor - recoveredPerOrder / (k * (1 - i.gstTds));

  return {
    valid: true, per, inputs: i, price, claim,
    orders: { shipped, kept, returned, rto, unsellable },
    claims: { raised, approved, rejected, pending, perClaim, claimed, recovered, pendingAtStake, rejectedLoss, shortPaid, unrecovered, check },
    money,
    profit: { initial: E, recoveredPerOrder, adjusted, possibleExtra: pendingAtStake / per },
    floor: { base: calc.floor, withClaims: floorWithClaims, cut: calc.floor - floorWithClaims },
    breakdown: price == null ? null : profitBreakdown(i, price, k, recoveredPerOrder),
    keepRate: keepRate(i.rtoRate, i.returnRate),
  };
}

/**
 * One shipped order, line by line, ending at the initial estimate and then the adjusted figure.
 * kept sales − tax − product − packing − forward shipping − ads − RTO losses − return losses = initial estimate.
 * Reverse shipping (returns) is shown apart from forward shipping. Lines add up exactly (see claims.test.js).
 */
export function profitBreakdown(i, price, k, recoveredPerOrder) {
  const sales = k * price;
  const lines = [
    { key: 'tax', amount: -(k * price * i.gstTds) },
    { key: 'product', amount: -(k * i.productCost) },
    { key: 'packing', amount: -i.packagingCost },
    { key: 'forward', amount: -i.shippingCost },
    { key: 'ads', amount: -i.advertisingCost },
    { key: 'reverse', amount: -(i.returnRate * i.returnReverseCost) },
    { key: 'rtoHandling', amount: -(i.rtoRate * i.rtoHandlingCost) },
    { key: 'returnProduct', amount: -(i.returnRate * i.returnUnsellableShare * i.productCost) },
    { key: 'rtoStock', amount: -(i.rtoRate * i.rtoStockLossShare * i.productCost) },
  ];
  const initial = sales + lines.reduce((s, l) => s + l.amount, 0);
  return { sales, lines, initial, claimBack: recoveredPerOrder, adjusted: initial + recoveredPerOrder };
}
