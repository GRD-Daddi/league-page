import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import CommissionerPage from './+page.svelte';

// Page-level guard for the commissioner "Pot & Payouts" buy-in split warning.
//
// Unlike the SplitMismatchNote unit test, this server-renders the REAL
// +page.svelte with mocked load data and asserts the warning appears/disappears
// based on the page's own wiring. It fails if a future refactor removes the
// <SplitMismatchNote .../> from the Buy-in & Split card, miswires its props,
// or breaks the comparison — i.e. it catches the warning silently disappearing
// from the actual commissioner UI, not just from the isolated component.

const WARNING_MARKER = "doesn't match";

// Minimal-but-complete `data` shape the Pot & Payouts tab (the default tab)
// reads during SSR. Only the three split inputs vary per test.
function makeData({ buyIn, poolShare, potShare }) {
        return {
                commissioner: {
                        year: 2025,
                        potTotal: 1000,
                        totalPaidAll: 5,
                        paidThisYear: 3,
                        payoutPool: {
                                remaining: 500,
                                first: { enabled: true, amount: 300, paid: false },
                                second: { enabled: true, amount: 150, paid: false },
                                third: { enabled: false, amount: 50, paid: false }
                        },
                        champion: { reigning: { name: 'Champ', teamKey: 'nfl.l.1.t.1' }, backToBackAchieved: false },
                        projection: { expectedMembers: 12 },
                        settings: { buyIn, poolShare, potShare, pointsLeaderAmount: 10, maxKeepers: 2 },
                        season: {
                                payoutFirst: 300,
                                payoutSecond: 150,
                                payoutThird: 50,
                                championName: '',
                                championTeamKey: '',
                                pointsLeaderName: '',
                                pointsLeaderTeamKey: ''
                        },
                        draftRounds: 15,
                        members: [],
                        draftPicks: { teams: [] },
                        yahooDraftPicks: [],
                        keeperState: { teams: [], selections: [] }
                }
        };
}

function renderPage(split) {
        return render(CommissionerPage, { props: { data: makeData(split), form: null } }).body;
}

describe('Commissioner page — buy-in split warning wiring', () => {
        it('does NOT show the warning when pool + pot equals the buy-in', () => {
                expect(renderPage({ buyIn: 100, poolShare: 50, potShare: 50 })).not.toContain(WARNING_MARKER);
        });

        it('shows the warning on the page when pool + pot is under the buy-in', () => {
                const html = renderPage({ buyIn: 100, poolShare: 40, potShare: 40 });
                expect(html).toContain(WARNING_MARKER);
                expect(html).toContain('$80');
                expect(html).toContain('$100');
        });

        it('shows the warning on the page when pool + pot is over the buy-in', () => {
                expect(renderPage({ buyIn: 100, poolShare: 60, potShare: 60 })).toContain(WARNING_MARKER);
        });

        // Each of these flips exactly one of the three values the page passes down,
        // proving the page forwards all three operands to the warning correctly.
        it('reacts to the buy-in value the page passes through', () => {
                expect(renderPage({ buyIn: 100, poolShare: 50, potShare: 50 })).not.toContain(WARNING_MARKER);
                expect(renderPage({ buyIn: 90, poolShare: 50, potShare: 50 })).toContain(WARNING_MARKER);
        });

        it('reacts to the pool share value the page passes through', () => {
                expect(renderPage({ buyIn: 100, poolShare: 50, potShare: 50 })).not.toContain(WARNING_MARKER);
                expect(renderPage({ buyIn: 100, poolShare: 40, potShare: 50 })).toContain(WARNING_MARKER);
        });

        it('reacts to the pot share value the page passes through', () => {
                expect(renderPage({ buyIn: 100, poolShare: 50, potShare: 50 })).not.toContain(WARNING_MARKER);
                expect(renderPage({ buyIn: 100, poolShare: 50, potShare: 40 })).toContain(WARNING_MARKER);
        });
});
