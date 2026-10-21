/**
 * Is the problem the PRICE, the FLOOR, BOTH, or the SKU itself?  (deck slide 2, step 4)
 * Pure; takes a calculator result and the group band. Recommends nothing by itself — it labels the situation.
 *
 *   D  floor above P75           → no in-band price clears the floor: change the pack/offer or reconsider the SKU
 *   floor problem                → floor + target margin sits above the group median: the SKU cannot rank at a
 *                                  healthy margin, so discounting only deepens losses. Lower the floor.
 *   price problem                → the listed price is wrong for the cost base: below the floor (loses money on
 *                                  every shipped order), or well above where floor + margin would put it
 *   A  price only, B floor only, C both.
 */
export const DIAGNOSIS = {
  A: { code: 'A', label: 'Price', tone: 'amber', headline: 'Your floor is fine. Your price is the problem.' },
  B: { code: 'B', label: 'Floor', tone: 'amber', headline: 'Your floor is the problem, not your price.' },
  C: { code: 'C', label: 'Both', tone: 'red', headline: 'Both the floor and the price need work.' },
  D: { code: 'D', label: 'Reconsider the SKU', tone: 'red', headline: 'This SKU may not be worth selling as it is.' },
  OK: { code: 'OK', label: 'On track', tone: 'green', headline: 'Floor and price both look healthy.' },
};

/**
 * `opts.bestFloor` (optional) = the floor the seller could reach after every reasonable lever. When given,
 * "D" means the floor is above P75 EVEN THEN; a high floor that levers can fix is a floor problem (B/C), not D.
 */
export function diagnose(calc, band, opts = {}) {
  if (!calc.valid) return null;
  const { floor, priceWithTargetMargin: fm, price } = calc;
  const priced = price != null;

  if ((opts.bestFloor ?? floor) > band.p75) return { ...DIAGNOSIS.D, discountWarning: false,
    detail: 'Your true floor is above the P75 of your group, so almost no buyer sees a price you can afford. Repacking or a different offer (bundle, cheaper variant) may help, otherwise skip this SKU.' };

  const floorProblem = fm > band.median;
  const belowFloor = priced && price < floor;
  const overpriced = priced && !floorProblem && price > band.median && price > fm + 0.5;
  const priceProblem = belowFloor || overpriced;

  if (floorProblem && priceProblem) return { ...DIAGNOSIS.C, discountWarning: true,
    detail: belowFloor
      ? 'You are listed below your true floor, so every shipped order loses money, and even a floor + margin price would sit above the group median. Lower the floor first, then reprice.'
      : 'Lower the floor first, then reprice.' };
  if (floorProblem) return { ...DIAGNOSIS.B, discountWarning: true,
    detail: 'Your floor + margin sits above the median. Don\'t discount yet.' };
  if (priceProblem) return { ...DIAGNOSIS.A, discountWarning: false,
    detail: belowFloor
      ? 'Your floor + margin fits inside the group, but you are listed below the floor. Raise the price to at least floor + margin.'
      : 'Your floor + margin fits inside the group, but you are listed above it. You can list lower, at floor + margin, and still keep your margin while ranking better.' };
  return { ...DIAGNOSIS.OK, discountWarning: false, detail: 'Nothing to fix right now.' };
}
