// Pure helpers behind the commissioner "Pot & Payouts" buy-in split advisory.
//
// The per-member payout-pool share plus the per-member carryover-pot share are
// entered by hand and are SUPPOSED to add up to the buy-in. When they don't, the
// UI shows an inline warning. That warning is purely advisory and easy to break
// or drop unnoticed during a refactor, so the comparison lives here as a pure
// function with a focused test guarding its behaviour.

export function round2(n) {
        return Math.round((Number(n) || 0) * 100) / 100;
}

// The combined per-member split (pool share + pot share), rounded to cents.
export function splitTotal(poolShare, potShare) {
        return round2(poolShare + potShare);
}

// True when the entered shares do NOT add up to the buy-in — i.e. the advisory
// warning should be shown. False when they match (warning hidden).
export function isSplitMismatch(poolShare, potShare, buyIn) {
        return splitTotal(poolShare, potShare) !== round2(buyIn);
}

// One-click reconciliation. Keeps the per-member payout-pool share (it is tied to
// the place payouts the commissioner enters) and snaps the carryover-pot share to
// whatever is left of the buy-in, so pool + pot always equals the buy-in. The pool
// share is clamped to [0, buyIn] so the pot can never go negative; the returned
// pair therefore always reconciles exactly. Returns { poolShare, potShare }.
export function balancedSplit(poolShare, buyIn) {
        const target = round2(buyIn);
        let pool = round2(poolShare);
        if (pool < 0) pool = 0;
        if (pool > target) pool = target;
        return { poolShare: pool, potShare: round2(target - pool) };
}
