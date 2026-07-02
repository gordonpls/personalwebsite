// Format a portfolio weight so a tiny-but-nonzero position never reads "0.0%".
// One decimal normally; anything that would round to 0.0% shows "<0.1%" instead.
export function formatWeightPct(pct: number): string {
    if (!(pct > 0)) return "0%";
    const oneDecimal = pct.toFixed(1);
    return oneDecimal === "0.0" ? "<0.1%" : `${oneDecimal}%`;
}
