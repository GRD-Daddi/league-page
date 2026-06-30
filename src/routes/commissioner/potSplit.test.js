import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import { round2, splitTotal, isSplitMismatch } from './potSplit.js';
import SplitMismatchNote from './SplitMismatchNote.svelte';

// Guards the commissioner "Pot & Payouts" buy-in split advisory warning.
//
// The Buy-in & Split card shows an inline warning (the <SplitMismatchNote>
// component) when the per-member payout-pool share + per-member carryover-pot
// share do NOT add up to the buy-in. This warning is purely advisory and easy
// to break or wire to the wrong values during a refactor. These tests fail if:
//   - the warning would show when the split actually matches (false positive),
//   - the warning would stay hidden when the split is wrong (the silent failure
//     this task exists to prevent),
//   - the comparison is wired to the wrong operands,
//   - the warning markup/branch is removed from the component.

const WARNING_MARKER = "doesn't match";

function renderNote(poolShare, potShare, buyIn) {
        return render(SplitMismatchNote, { props: { poolShare, potShare, buyIn } }).body;
}

describe('SplitMismatchNote — rendered warning visibility', () => {
        it('renders NOTHING when pool + pot exactly equals the buy-in', () => {
                expect(renderNote(40, 60, 100)).not.toContain(WARNING_MARKER);
                expect(renderNote(50, 50, 100)).not.toContain(WARNING_MARKER);
                expect(renderNote(0, 25, 25)).not.toContain(WARNING_MARKER);
        });

        it('renders the warning when pool + pot is less than the buy-in', () => {
                const html = renderNote(40, 40, 100);
                expect(html).toContain(WARNING_MARKER);
                // The warning shows the actual numbers so it must reflect the real values.
                expect(html).toContain('$80');
                expect(html).toContain('$100');
        });

        it('renders the warning when pool + pot is greater than the buy-in', () => {
                expect(renderNote(60, 60, 100)).toContain(WARNING_MARKER);
        });

        it('toggles back to hidden once the values are corrected to match', () => {
                expect(renderNote(40, 40, 100)).toContain(WARNING_MARKER); // mismatch → shown
                expect(renderNote(60, 40, 100)).not.toContain(WARNING_MARKER); // corrected → hidden
        });

        it('is wired to all three operands, not a subset', () => {
                // Only the buy-in changes between these two — proves buyIn drives it.
                expect(renderNote(50, 50, 100)).not.toContain(WARNING_MARKER);
                expect(renderNote(50, 50, 90)).toContain(WARNING_MARKER);
                // Only the pot share changes — proves potShare drives it.
                expect(renderNote(50, 40, 100)).toContain(WARNING_MARKER);
                // Only the pool share changes — proves poolShare drives it.
                expect(renderNote(40, 50, 100)).toContain(WARNING_MARKER);
        });

        it('tolerates floating-point dust via cent rounding (no false warning)', () => {
                expect(renderNote(0.1, 0.2, 0.3)).not.toContain(WARNING_MARKER);
        });
});

describe('isSplitMismatch — pure helper behind the warning', () => {
        it('is HIDDEN (false) when the shares add up to the buy-in', () => {
                expect(isSplitMismatch(40, 60, 100)).toBe(false);
                expect(isSplitMismatch(0, 25, 25)).toBe(false);
        });

        it('is SHOWN (true) when the shares are under or over the buy-in', () => {
                expect(isSplitMismatch(40, 40, 100)).toBe(true);
                expect(isSplitMismatch(60, 60, 100)).toBe(true);
        });

        it('treats blank / non-numeric entries as zero', () => {
                expect(isSplitMismatch('', '', 0)).toBe(false);
                expect(isSplitMismatch(null, undefined, 0)).toBe(false);
                expect(isSplitMismatch('', '', 100)).toBe(true);
        });
});

describe('splitTotal / round2 helpers', () => {
        it('sums the two shares to the cent', () => {
                expect(splitTotal(40, 60)).toBe(100);
                expect(splitTotal(0.1, 0.2)).toBe(0.3);
        });

        it('round2 rounds to two decimals and coerces junk to 0', () => {
                expect(round2(1.567)).toBe(1.57);
                expect(round2('abc')).toBe(0);
                expect(round2(null)).toBe(0);
        });
});
