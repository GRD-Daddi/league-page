<script>
        import { leagueName } from '$lib/utils/leagueInfo';
        import { enhance } from '$app/forms';
        import { MAX_PICKS_PER_ROUND } from '$lib/utils/draftRules.js';
        import { round2 } from './potSplit.js';
        import SplitMismatchNote from './SplitMismatchNote.svelte';

        let { data, form } = $props();

        let c = $derived(data.commissioner);

        let activeTab = $state('pot');
        const TABS = [
            { id: 'pot', label: 'Pot & Payouts' },
            { id: 'champion', label: 'Champion & Points' },
            { id: 'members', label: 'Buy-ins' },
            { id: 'draft', label: 'Draft Picks' },
            { id: 'keepers', label: 'Keepers' },
            { id: 'history', label: 'History' }
        ];

        function money(n) {
                return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
        }

        let expectedMembers = $derived(c.projection?.expectedMembers || 12);

        // Initialise editable fields straight from the server-loaded data so they
        // render with the saved values during SSR. The $effect below keeps them in
        // sync after saves (invalidateAll). Without server-side init these inputs
        // would show their bare defaults (0 / '') until client hydration runs the
        // effect — which looks exactly like "all payouts are 0 and won't save".
        let buyIn = $state(data.commissioner.settings.buyIn);
        let pointsLeaderAmount = $state(data.commissioner.settings.pointsLeaderAmount);
        let maxKeepers = $state(data.commissioner.settings.maxKeepers ?? 2);
        let poolShare = $state(data.commissioner.settings.poolShare);
        let potShare = $state(data.commissioner.settings.potShare);
        let firstAmt = $state(data.commissioner.season.payoutFirst);
        let secondAmt = $state(data.commissioner.season.payoutSecond);
        let thirdAmt = $state(data.commissioner.season.payoutThird);
        let championName = $state(data.commissioner.season.championName || '');
        let championTeamKey = $state(data.commissioner.season.championTeamKey || '');
        let winnerName = $state(data.commissioner.champion?.reigning?.name || '');
        let winnerTeamKey = $state(data.commissioner.champion?.reigning?.teamKey || '');
        let potTotalInput = $state(data.commissioner.potTotal);
        let pointsLeaderName = $state(data.commissioner.season.pointsLeaderName || '');
        let pointsLeaderTeamKey = $state(data.commissioner.season.pointsLeaderTeamKey || '');

        // Live previews. The payout pool is the sum of the place payouts. The
        // per-member pool/pot split is whatever the commissioner has entered by hand.
        let livePoolTotal = $derived(round2(firstAmt + secondAmt + thirdAmt));

        // At-a-glance reconciliation against dues actually collected this season.
        // Uses the live form values so the commissioner sees the impact before
        // saving. Positive delta = split over-allocates the buy-in; negative =
        // part of each member's dues is unallocated.
        let paidThisYear = $derived(c.paidThisYear || 0);
        let duesCollected = $derived(round2(paidThisYear * round2(buyIn)));
        let allocated = $derived(round2(paidThisYear * splitTotal));
        let reconcileDelta = $derived(round2(allocated - duesCollected));

        $effect(() => {
                buyIn = c.settings.buyIn;
                pointsLeaderAmount = c.settings.pointsLeaderAmount;
                maxKeepers = c.settings.maxKeepers ?? 2;
                poolShare = c.settings.poolShare;
                potShare = c.settings.potShare;
                potTotalInput = c.potTotal;
                firstAmt = c.season.payoutFirst;
                secondAmt = c.season.payoutSecond;
                thirdAmt = c.season.payoutThird;
                championName = c.season.championName || '';
                championTeamKey = c.season.championTeamKey || '';
                pointsLeaderName = c.season.pointsLeaderName || '';
                pointsLeaderTeamKey = c.season.pointsLeaderTeamKey || '';
                if (c.champion?.reigning) {
                        winnerName = c.champion.reigning.name || '';
                        winnerTeamKey = c.champion.reigning.teamKey || '';
                }
        });

        const submitting = $state({});

        // SvelteKit's default use:enhance calls form.reset() on a successful action,
        // which yanks every bind:value input back to its SSR default (e.g. 0 / 50)
        // instead of the value just saved. Our $effect re-syncs inputs from the DB,
        // but when the synced value already equals the saved value the effect doesn't
        // re-fire — so the reset default stays on screen and the save looks like it
        // reverted. Re-running invalidateAll WITHOUT the reset keeps saved values
        // visible.
        const keepValues = () => async ({ update }) => {
                await update({ reset: false });
        };

        // Best-effort prefill transcribed from the league's Grid View screenshot.
        // Keyed by a normalized team name (lowercase, alphanumeric only). These are a
        // starting point only — the commissioner must verify each value before saving.
        const PREFILL = {
                bbldaddi: [1, 0, 0, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1],
                '4aces': [1, 2, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
                bblcriffy: [0, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                ceedeznuts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                miamitropics: [2, 1, 2, 2, 2, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0],
                handicappedhitlers: [1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                kenkaniff: [1, 2, 1, 2, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
                knuckifyoubuck: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                lamarstbrown: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                playedtheslicedidntslice: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                younghoestubtoe: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                mostunderwhelming: [1, 0, 1, 0, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2]
        };

        function normalizeName(s) {
                return (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        let draftRounds = $derived(c.draftRounds || 15);
        let roundList = $derived(Array.from({ length: draftRounds }, (_, i) => i + 1));
        let draftGrid = $state([]);
        let draftPrefilled = $state(false);
        let draftFromYahoo = $state(false);

        // Guard so we only seed the editable grid when the underlying source data
        // genuinely changes. Plain (non-reactive) variable on purpose — it must not
        // be a dependency of the effect below.
        let lastSeedKey = null;

        $effect(() => {
                const saved = c.draftPicks?.teams || [];
                const rounds = c.draftRounds || 15;
                const members = c.members || [];
                const yahooSeed = c.yahooDraftPicks || [];

                // Re-seed only when the DB/prefill source actually changes. Every other
                // form on this page submits with use:enhance, which runs invalidateAll()
                // and re-runs this effect. Without this guard, an unrelated save (e.g.
                // marking a buy-in paid) would reset draftGrid and silently wipe the
                // commissioner's in-progress draft-pick edits before they hit Save.
                const seedKey = JSON.stringify({
                        year: c.year,
                        teams: saved.map((t) => [t.teamKey, t.picks]),
                        rounds,
                        members: members.map((m) => m.teamKey),
                        yahoo: yahooSeed.map((t) => [t.teamKey, t.picks])
                });
                if (seedKey === lastSeedKey) return;
                lastSeedKey = seedKey;

                if (saved.length) {
                        draftGrid = saved.map((t) => ({
                                teamKey: t.teamKey,
                                teamName: t.teamName,
                                picks: Array.from({ length: rounds }, (_, i) => Number(t.picks?.[i]) || 0)
                        }));
                        draftPrefilled = false;
                        draftFromYahoo = false;
                } else if (yahooSeed.length) {
                        // No saved ownership yet — seed from Yahoo's real traded picks.
                        draftGrid = yahooSeed.map((t) => ({
                                teamKey: t.teamKey,
                                teamName: t.teamName,
                                picks: Array.from({ length: rounds }, (_, i) => Number(t.picks?.[i]) || 0)
                        }));
                        draftPrefilled = false;
                        draftFromYahoo = true;
                } else {
                        let usedPrefill = false;
                        draftGrid = members.map((m) => {
                                const pre = PREFILL[normalizeName(m.name)];
                                if (pre) usedPrefill = true;
                                const picks = Array.from({ length: rounds }, (_, i) =>
                                        pre ? Number(pre[i]) || 0 : 1
                                );
                                return { teamKey: m.teamKey, teamName: m.name, picks };
                        });
                        draftPrefilled = usedPrefill;
                        draftFromYahoo = false;
                }
        });

        let draftPayload = $derived(JSON.stringify(draftGrid));
        let roundTotals = $derived(
                roundList.map((_, i) => draftGrid.reduce((sum, t) => sum + (Number(t.picks?.[i]) || 0), 0))
        );
        let teamTotal = (team) => team.picks.reduce((s, n) => s + (Number(n) || 0), 0);

        // League rule: a team may hold at most MAX_PICKS_PER_ROUND picks in any round.
        // A trade that would push a receiving team past this is invalid — surface every
        // offending cell so the commissioner can't save an illegal pick distribution.
        let pickViolations = $derived(
                draftGrid.flatMap((team) =>
                        team.picks
                                .map((n, i) => ({ count: Number(n) || 0, round: i + 1 }))
                                .filter((p) => p.count > MAX_PICKS_PER_ROUND)
                                .map((p) => ({ teamName: team.teamName, round: p.round, count: p.count }))
                )
        );

        // Keeper approvals: map team_key -> name and group the selections by team so
        // the commissioner can approve/revert each manager's submissions.
        let keeperTeamNames = $derived(
                new Map((c.keeperState?.teams || []).map((t) => [t.teamKey, t.teamName]))
        );
        // team_key -> per-round over-subscription conflicts (more keepers cost a round
        // than the team owns picks in it). Computed server-side in getKeeperState.
        let keeperConflictsByTeam = $derived(
                new Map((c.keeperState?.teams || []).map((t) => [t.teamKey, t.roundConflicts || []]))
        );
        let keeperSelections = $derived(c.keeperState?.selections || []);
        let keeperPendingCount = $derived(keeperSelections.filter((s) => s.status !== 'approved').length);
        let keeperGroups = $derived.by(() => {
                const byTeam = new Map();
                for (const s of keeperSelections) {
                        if (!byTeam.has(s.team_key)) byTeam.set(s.team_key, []);
                        byTeam.get(s.team_key).push(s);
                }
                return [...byTeam.entries()]
                        .map(([teamKey, picks]) => ({
                                teamKey,
                                teamName: keeperTeamNames.get(teamKey) || teamKey,
                                conflicts: keeperConflictsByTeam.get(teamKey) || [],
                                picks: picks.sort((a, b) => (a.cost_round ?? 0) - (b.cost_round ?? 0))
                        }))
                        .sort((a, b) => a.teamName.localeCompare(b.teamName));
        });
</script>

<svelte:head>
        <title>Commissioner | {leagueName}</title>
</svelte:head>

<div class="sn-page">
        <div class="wrap">
                <header class="page-head">
                        <div class="eyebrow"><span class="dot"></span> Commissioner Control</div>
                        <h1>League Pot &amp; Payouts</h1>
                        <p class="sub">Manage the buy-ins, the carryover pot, and this season's payout pool for the {c.year} season.</p>
                </header>

                {#if form?.error}
                        <div class="banner error">{form.error}</div>
                {:else if form?.success}
                        <div class="banner ok">Saved.</div>
                {/if}

                <!-- Summary tiles -->
                <div class="tiles">
                        <div class="tile pot">
                                <div class="tile-label">Carryover Pot</div>
                                <div class="tile-value">{money(c.potTotal)}</div>
                                <div class="tile-meta">{c.totalPaidAll} paid buy-in{c.totalPaidAll === 1 ? '' : 's'} all-time</div>
                        </div>
                        <div class="tile pool">
                                <div class="tile-label">{c.year} Payout Pool</div>
                                <div class="tile-value">{money(c.payoutPool.remaining)}</div>
                                <div class="tile-meta">{c.paidThisYear} paid this season</div>
                        </div>
                        <div class="tile champ">
                                <div class="tile-label">Reigning Champion</div>
                                <div class="tile-value sm">{c.champion?.reigning?.name || '—'}</div>
                                <div class="tile-meta">
                                        {#if c.champion?.backToBackAchieved}
                                                <span class="hot">Back-to-back achieved</span>
                                        {:else if c.champion?.reigning}
                                                The person to beat
                                        {:else}
                                                No champion recorded
                                        {/if}
                                </div>
                        </div>
                </div>

                <nav class="tabnav">
                    {#each TABS as t}
                        <button type="button" class="tabbtn" class:active={activeTab === t.id} onclick={() => (activeTab = t.id)}>{t.label}</button>
                    {/each}
                </nav>

                <div class="grid">
                    {#if activeTab === 'pot'}
                        <!-- Settings -->
                        <section class="card">
                                <h2>Buy-in &amp; Split</h2>
                                <p class="card-sub">Set the buy-in and how each one splits between this year's payout pool and the carryover pot. Enter the per-member amounts by hand — they should add up to the buy-in.</p>
                                <form method="POST" action="?/updateSettings" use:enhance={keepValues}>
                                        <label class="field">
                                                <span>Buy-in amount ($)</span>
                                                <input type="number" name="buyIn" min="0" step="1" bind:value={buyIn} />
                                        </label>
                                        <label class="field">
                                                <span>Per member to payout pool ($)</span>
                                                <input type="number" name="poolShare" min="0" step="1" bind:value={poolShare} />
                                        </label>
                                        <label class="field">
                                                <span>Per member to carryover pot ($)</span>
                                                <input type="number" name="potShare" min="0" step="1" bind:value={potShare} />
                                        </label>
                                        <SplitMismatchNote {poolShare} {potShare} {buyIn} />
                                        <p class="card-sub note">Across {expectedMembers} members: {money(poolShare * expectedMembers)} to the payout pool, {money(potShare * expectedMembers)} to the carryover pot.</p>

                                        <div class="reconcile {splitMismatch ? 'off' : 'ok'}">
                                                <div class="reconcile-head">
                                                        <span class="reconcile-title">Dues Reconciliation</span>
                                                        <span class="reconcile-badge {splitMismatch ? 'off' : 'ok'}">{splitMismatch ? 'Out of balance' : 'Balanced'}</span>
                                                </div>
                                                <div class="reconcile-rows">
                                                        <div class="reconcile-row"><span>Dues collected ({paidThisYear} paid &times; {money(buyIn)})</span><strong>{money(duesCollected)}</strong></div>
                                                        <div class="reconcile-row"><span>To payout pool ({paidThisYear} &times; {money(poolShare)})</span><strong>{money(round2(paidThisYear * poolShare))}</strong></div>
                                                        <div class="reconcile-row"><span>To carryover pot ({paidThisYear} &times; {money(potShare)})</span><strong>{money(round2(paidThisYear * potShare))}</strong></div>
                                                        <div class="reconcile-row total"><span>Allocated</span><strong>{money(allocated)}</strong></div>
                                                        {#if splitMismatch}
                                                                <div class="reconcile-row delta {reconcileDelta > 0 ? 'over' : 'under'}">
                                                                        <span>{reconcileDelta > 0 ? 'Over-allocated' : 'Unallocated'}</span>
                                                                        <strong>{reconcileDelta > 0 ? '+' : '\u2212'}{money(Math.abs(reconcileDelta))}</strong>
                                                                </div>
                                                        {/if}
                                                </div>
                                                {#if splitMismatch}
                                                        <p class="reconcile-note">Adjust the per-member split so pool + pot equals the {money(buyIn)} buy-in, or the public pot and pool totals won't add up to dues collected.</p>
                                                {:else}
                                                        <p class="reconcile-note">Pool + pot equals the buy-in, so the public totals reconcile with dues collected.</p>
                                                {/if}
                                        </div>
                                        <label class="field">
                                                <span>Points-leader bonus per member ($)</span>
                                                <input type="number" name="pointsLeaderAmount" min="0" step="1" bind:value={pointsLeaderAmount} />
                                        </label>
                                        <p class="card-sub note">Each member chips in this amount directly to the season's points leader, on top of dues.</p>
                                        <button class="btn" type="submit">Save Settings</button>
                                </form>

                                <div class="hr"></div>

                                <form method="POST" action="?/setPotTotal" use:enhance={keepValues}>
                                        <label class="field">
                                                <span>Set carryover pot total ($)</span>
                                                <input type="number" name="potTotal" min="0" step="1" bind:value={potTotalInput} />
                                        </label>
                                        <p class="card-sub note">Type the pot's current value to set it directly — useful for seeding a balance carried over from past seasons. Paid buy-ins keep adding on top of this amount.</p>
                                        <button class="btn" type="submit">Set Pot Total</button>
                                </form>
                        </section>

                        <!-- Payouts -->
                        <section class="card">
                                <h2>{c.year} Payout Amounts</h2>
                                <p class="card-sub">Record each place's payout in dollars. The total is this year's payout pool. The per-member pool/pot split is set above under Buy-in &amp; Split.</p>
                                <form method="POST" action="?/setPayouts" use:enhance={keepValues}>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>1st place ($)</span><input type="number" name="first" min="0" step="1" bind:value={firstAmt} /></label>
                                        <label class="field"><span>2nd place ($)</span><input type="number" name="second" min="0" step="1" bind:value={secondAmt} /></label>
                                        <label class="field"><span>3rd place ($)</span><input type="number" name="third" min="0" step="1" bind:value={thirdAmt} /></label>
                                        <div class="split-preview">
                                                <div><strong>{money(livePoolTotal)}</strong><span>total payout pool</span></div>
                                                <div><strong>{money(poolShare)}</strong><span>per member to pool</span></div>
                                                <div><strong>{money(potShare)}</strong><span>per member to pot</span></div>
                                        </div>
                                        <button class="btn" type="submit">Save Payouts</button>
                                </form>

                                <div class="payout-rows">
                                        {#each [ ['first','1st',c.payoutPool.first], ['second','2nd',c.payoutPool.second], ['third','3rd',c.payoutPool.third] ] as [place, label, info]}
                                                <div class="payout-row {info.enabled ? '' : 'disabled'}">
                                                        <span class="pl">{label}</span>
                                                        <span class="amt">{info.enabled ? money(info.amount) : 'Not paid'}</span>
                                                        <form method="POST" action="?/togglePayoutEnabled" use:enhance>
                                                                <input type="hidden" name="year" value={c.year} />
                                                                <input type="hidden" name="place" value={place} />
                                                                <input type="hidden" name="enabled" value={(!info.enabled).toString()} />
                                                                <button class="chip ghost" type="submit">{info.enabled ? 'Disable' : 'Enable'}</button>
                                                        </form>
                                                        <form method="POST" action="?/togglePayoutPaid" use:enhance>
                                                                <input type="hidden" name="year" value={c.year} />
                                                                <input type="hidden" name="place" value={place} />
                                                                <input type="hidden" name="paid" value={(!info.paid).toString()} />
                                                                <button class="chip {info.paid ? 'paid' : ''}" type="submit" disabled={!info.enabled}>{info.paid ? 'Paid ✓' : 'Mark Paid'}</button>
                                                        </form>
                                                </div>
                                        {/each}
                                </div>
                        </section>

                    {/if}
                    {#if activeTab === 'champion'}
                        <!-- Champion -->
                        <section class="card">
                                <h2>Record Champion</h2>
                                <p class="card-sub">Confirm the {c.year} champion. Used to determine the "person to beat" and back-to-back status.</p>
                                <form method="POST" action="?/recordChampion" use:enhance={keepValues}>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>Champion name</span><input type="text" name="championName" placeholder="Team or manager name" bind:value={championName} /></label>
                                        <label class="field"><span>Team key (optional)</span><input type="text" name="championTeamKey" placeholder="nfl.l.xxxxxx.t.x" bind:value={championTeamKey} /></label>
                                        <button class="btn" type="submit">Record Champion</button>
                                </form>

                                {#if c.championHistory.length}
                                        <div class="history">
                                                <div class="history-title">Recorded champions</div>
                                                {#each [...c.championHistory].sort((a,b)=>b.year-a.year) as ch}
                                                        <div class="history-row"><span>{ch.year}</span><strong>{ch.name}</strong></div>
                                                {/each}
                                        </div>
                                {/if}
                        </section>

                        <!-- Points leader bonus -->
                        <section class="card">
                                <h2>{c.year} Points Leader</h2>
                                <p class="card-sub">The regular-season points leader collects {money(c.pointsLeader.amount)} from every other member, on top of dues.</p>
                                <form method="POST" action="?/recordPointsLeader" use:enhance={keepValues}>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>Points leader name</span><input type="text" name="pointsLeaderName" placeholder="Team or manager name" bind:value={pointsLeaderName} /></label>
                                        <label class="field"><span>Team key (optional)</span><input type="text" name="pointsLeaderTeamKey" placeholder="nfl.l.xxxxxx.t.x" bind:value={pointsLeaderTeamKey} /></label>
                                        <button class="btn" type="submit">Record Points Leader</button>
                                </form>

                                <div class="pl-summary">
                                        <div><span>Per member</span><strong>{money(c.pointsLeader.amount)}</strong></div>
                                        <div><span>Contributors</span><strong>{c.pointsLeader.contributors}</strong></div>
                                        <div><span>Total to leader</span><strong>{money(c.pointsLeader.total)}</strong></div>
                                </div>

                                {#if c.pointsLeader.recorded}
                                        <div class="payout-row">
                                                <span class="amt">{c.pointsLeader.name} collects {money(c.pointsLeader.total)}</span>
                                                <form method="POST" action="?/togglePointsLeaderPaid" use:enhance>
                                                        <input type="hidden" name="year" value={c.year} />
                                                        <input type="hidden" name="paid" value={(!c.pointsLeader.paid).toString()} />
                                                        <button class="chip {c.pointsLeader.paid ? 'paid' : ''}" type="submit">{c.pointsLeader.paid ? 'Settled ✓' : 'Mark Settled'}</button>
                                                </form>
                                        </div>
                                {/if}
                        </section>

                    {/if}
                    {#if activeTab === 'pot'}
                        <!-- Award pot -->
                        <section class="card award">
                                <h2>Award the Pot</h2>
                                <p class="card-sub">When a champion wins two years in a row, award the entire carryover pot. This records the winner and resets the pot to $0.</p>
                                {#if c.champion?.backToBackAchieved}
                                        <div class="banner hotbanner">🏆 {c.champion.reigning.name} has gone back-to-back and can claim the pot.</div>
                                {/if}
                                <form method="POST" action="?/awardPot" use:enhance={keepValues}>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>Winner name</span><input type="text" name="winnerName" bind:value={winnerName} /></label>
                                        <label class="field"><span>Winner team key (optional)</span><input type="text" name="winnerTeamKey" bind:value={winnerTeamKey} /></label>
                                        <div class="award-amt">Current pot: <strong>{money(c.potTotal)}</strong></div>
                                        <button class="btn danger" type="submit" disabled={c.potTotal <= 0}>Award {money(c.potTotal)} &amp; Reset</button>
                                </form>
                        </section>

                    {/if}
                    {#if activeTab === 'history'}
                        <!-- Backfill the archive -->
                        <section class="card backfill">
                                <h2>Backfill League History</h2>
                                <p class="card-sub">Walks Yahoo's past-season chain and saves every prior season's standings, rosters and matchups into this site's own database — so the history survives even if Yahoo goes away. Safe to run anytime; it updates in place.</p>
                                <form method="POST" action="?/backfillArchive" use:enhance={() => {
                                        submitting.backfill = true;
                                        return async ({ update }) => {
                                                await update();
                                                submitting.backfill = false;
                                        };
                                }}>
                                        <button class="btn" type="submit" disabled={submitting.backfill}>
                                                {submitting.backfill ? 'Backfilling… this can take a minute' : 'Backfill all past seasons'}
                                        </button>
                                </form>
                                {#if submitting.backfill}
                                        <p class="card-sub" style="margin-top:10px;">Walking every past season on Yahoo and saving them in place. Please keep this tab open.</p>
                                {/if}
                                {#if form?.action === 'backfillArchive' && form?.backfill}
                                        <div class="banner ok">Archived {form.backfill.count} season{form.backfill.count === 1 ? '' : 's'}.</div>
                                        <ul class="backfill-list">
                                                {#each form.backfill.seasons as s}
                                                        <li class="backfill-row {s.ok ? 'ok' : 'bad'}">
                                                                {#if s.ok}
                                                                        <span class="bf-year">{s.year}</span>
                                                                        <span class="bf-detail">{s.name ?? 'Season'} — {s.teams} teams, {s.weeks} weeks</span>
                                                                {:else}
                                                                        <span class="bf-year">—</span>
                                                                        <span class="bf-detail">{s.leagueKey}: {s.error}</span>
                                                                {/if}
                                                        </li>
                                                {/each}
                                        </ul>
                                {/if}
                                {#if c.archivedSeasons?.length}
                                        <div class="archived-summary">Saved seasons: {c.archivedSeasons.map((a) => a.year).join(', ')}</div>
                                {/if}
                        </section>
                    {/if}
                </div>

                {#if activeTab === 'members'}
                <!-- Member buy-ins -->
                <section class="card full">
                        <h2>{c.year} Buy-ins</h2>
                        <p class="card-sub">Check off each member who has paid their buy-in this season. Each paid member adds {money(c.settings.potShare)} to the pot and {money(c.settings.poolShare)} to the payout pool.</p>
                        {#if !c.leagueUsersAvailable}
                                <div class="banner error">Could not load league members from Yahoo. Make sure you're logged in and the league is connected.</div>
                        {:else}
                                <div class="members">
                                        {#each c.members as m}
                                                <div class="member {m.paid ? 'is-paid' : ''}">
                                                        <div class="m-info">
                                                                <span class="m-name">{m.name}</span>
                                                                {#if m.manager}<span class="m-manager">{m.manager}</span>{/if}
                                                        </div>
                                                        <form method="POST" action="?/toggleBuyin" use:enhance>
                                                                <input type="hidden" name="year" value={c.year} />
                                                                <input type="hidden" name="teamKey" value={m.teamKey} />
                                                                <input type="hidden" name="memberName" value={m.name} />
                                                                <input type="hidden" name="paid" value={(!m.paid).toString()} />
                                                                <button class="chip {m.paid ? 'paid' : ''}" type="submit">{m.paid ? 'Paid ✓' : 'Unpaid'}</button>
                                                        </form>
                                                </div>
                                        {/each}
                                </div>
                        {/if}
                </section>

                {/if}
                {#if activeTab === 'draft'}
                <!-- Draft pick ownership editor -->
                <section class="card full draftpicks">
                        <h2>{c.year} Draft Picks by Team</h2>
                        <p class="card-sub">Set how many picks each team owns in each round of the upcoming draft. <strong>1</strong> is a standard pick, <strong>0</strong> means it was traded away, <strong>2</strong> means a pick was acquired. League rule: a team may hold <strong>at most {MAX_PICKS_PER_ROUND} picks per round</strong> — a trade that would give a team 3 in a round is invalid. This is what powers the public "Draft Picks by Team" board.</p>
                        {#if draftFromYahoo}
                                <div class="banner ok">Auto-seeded from Yahoo's actual traded picks. Review and <strong>Save</strong> to make these the official numbers, or adjust any cell first. Each round column should total {draftGrid.length}.</div>
                        {:else if draftPrefilled}
                                <div class="banner warn">Pre-filled from your Grid View screenshot as a starting point. The screenshot is low-resolution — <strong>please verify every number before saving.</strong> Each round column should total {draftGrid.length}.</div>
                        {/if}
                        {#if form?.action === 'saveDraftPicks' && form?.revertedKeepers?.length}
                                <div class="banner warn">
                                        <strong>{form.revertedKeepers.length} approved keeper{form.revertedKeepers.length === 1 ? ' was' : 's were'} reverted to pending</strong> — saving these picks left {form.revertedKeepers.length === 1 ? 'it' : 'them'} without a pick in their cost round. Re-approve on the Keepers tab once the pick distribution is settled:
                                        <ul class="skip-list">
                                                {#each form.revertedKeepers as k}
                                                        <li>{k.playerName || k.playerKey}: Round {k.round} now owns {k.owned} pick{k.owned === 1 ? '' : 's'} but had {k.approved} approved keeper{k.approved === 1 ? '' : 's'}.</li>
                                                {/each}
                                        </ul>
                                </div>
                        {:else if form?.action === 'saveDraftPicks' && form?.success}
                                <div class="banner ok">Draft picks saved.</div>
                        {/if}
                        {#if pickViolations.length}
                                <div class="banner error">
                                        <strong>Invalid pick distribution — over the {MAX_PICKS_PER_ROUND}-per-round limit:</strong>
                                        {#each pickViolations as v}
                                                <div>{v.teamName} has {v.count} picks in Round {v.round}.</div>
                                        {/each}
                                        Fix these before saving — a trade can't leave a team with more than {MAX_PICKS_PER_ROUND} picks in a round.
                                </div>
                        {/if}
                        {#if !draftGrid.length}
                                <div class="banner error">Could not load league teams from Yahoo. Make sure you're logged in and the league is connected.</div>
                        {:else}
                                <form method="POST" action="?/saveDraftPicks" use:enhance={keepValues}>
                                        <input type="hidden" name="year" value={c.year} />
                                        <input type="hidden" name="payload" value={draftPayload} />
                                        <div class="draft-scroll">
                                                <table class="draft-grid">
                                                        <thead>
                                                                <tr>
                                                                        <th class="th-team">Team</th>
                                                                        {#each roundList as r}<th>R{r}</th>{/each}
                                                                        <th class="th-total">Total</th>
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {#each draftGrid as team, i}
                                                                        <tr>
                                                                                <td class="td-team">{team.teamName}</td>
                                                                                {#each team.picks as _, r}
                                                                                        <td>
                                                                                                <input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        max={MAX_PICKS_PER_ROUND}
                                                                                                        class:zero={(Number(draftGrid[i].picks[r]) || 0) === 0}
                                                                                                        class:multi={(Number(draftGrid[i].picks[r]) || 0) > 1 && (Number(draftGrid[i].picks[r]) || 0) <= MAX_PICKS_PER_ROUND}
                                                                                                        class:over={(Number(draftGrid[i].picks[r]) || 0) > MAX_PICKS_PER_ROUND}
                                                                                                        bind:value={draftGrid[i].picks[r]}
                                                                                                />
                                                                                        </td>
                                                                                {/each}
                                                                                <td class="td-total">{teamTotal(team)}</td>
                                                                        </tr>
                                                                {/each}
                                                        </tbody>
                                                        <tfoot>
                                                                <tr>
                                                                        <td class="td-team">Per round</td>
                                                                        {#each roundTotals as total}
                                                                                <td class="rt {total === draftGrid.length ? 'good' : 'bad'}">{total}</td>
                                                                        {/each}
                                                                        <td class="td-total">{roundTotals.reduce((a, b) => a + b, 0)}</td>
                                                                </tr>
                                                        </tfoot>
                                                </table>
                                        </div>
                                        <button class="btn" type="submit" disabled={pickViolations.length > 0}>Save Draft Picks</button>
                                </form>
                        {/if}
                </section>
                {/if}

                {#if activeTab === 'keepers'}
                <!-- Keeper approvals -->
                <section class="card full">
                        <h2>{c.year} Keeper Approvals</h2>
                        <p class="card-sub">Managers submit their keepers on the public Keepers page; approve them here. Approved keepers are surfaced on the Draft Room and consume the team's pick in the keeper's cost round. The keeper engine reads imported draft + transaction history — run the import below if numbers look off.</p>

                        <form method="POST" action="?/updateKeeperSettings" use:enhance={keepValues} class="keeper-settings">
                                <label for="maxKeepers">Max keepers per team</label>
                                <input id="maxKeepers" type="number" name="maxKeepers" min="1" step="1" bind:value={maxKeepers} />
                                <button class="btn" type="submit">Save limit</button>
                        </form>
                        {#if form?.action === 'updateKeeperSettings' && form?.success}
                                <div class="banner ok">Keeper limit saved.</div>
                        {/if}

                        <form
                                method="POST"
                                action="?/backfillKeeperHistory"
                                use:enhance={() => {
                                        submitting.keeperBackfill = true;
                                        return async ({ update }) => {
                                                await update();
                                                submitting.keeperBackfill = false;
                                        };
                                }}
                        >
                                <button class="btn" type="submit" disabled={submitting.keeperBackfill}>
                                        {submitting.keeperBackfill ? 'Importing history… this can take a minute' : 'Import keeper history from Yahoo'}
                                </button>
                        </form>
                        {#if c.keeperArchiveStats}
                                <p class="card-sub" style="margin-top:10px;">
                                        Imported: {c.keeperArchiveStats.drafts?.picks ?? 0} draft picks across {c.keeperArchiveStats.drafts?.seasons ?? 0} season(s){#if c.keeperArchiveStats.drafts?.min_year}, {c.keeperArchiveStats.drafts.min_year}–{c.keeperArchiveStats.drafts.max_year}{/if}; {c.keeperArchiveStats.transactions?.events ?? 0} transaction events.
                                </p>
                        {/if}
                        {#if form?.action === 'backfillKeeperHistory' && form?.keeperBackfill}
                                <div class="banner ok">Imported {form.keeperBackfill.picks} picks and {form.keeperBackfill.transactions} transaction events from {form.keeperBackfill.seasons?.length || 0} season(s).</div>
                        {/if}

                        {#if keeperSelections.length}
                                <div class="keeper-actions">
                                        <form method="POST" action="?/approveAllKeepers" use:enhance={keepValues}>
                                                <input type="hidden" name="year" value={c.year} />
                                                <input type="hidden" name="status" value="approved" />
                                                <button class="btn" type="submit" disabled={keeperPendingCount === 0}>Approve all ({keeperPendingCount} pending)</button>
                                        </form>
                                        <form method="POST" action="?/approveAllKeepers" use:enhance={keepValues}>
                                                <input type="hidden" name="year" value={c.year} />
                                                <input type="hidden" name="status" value="pending" />
                                                <button class="btn ghost" type="submit">Revert all to pending</button>
                                        </form>
                                </div>

                                {#if form?.action === 'approveAllKeepers' && form?.skipped?.length}
                                        <div class="banner warn">
                                                <strong>{form.skipped.length} selection{form.skipped.length === 1 ? '' : 's'} held back</strong> — not approved because they failed re-validation:
                                                <ul class="skip-list">
                                                        {#each form.skipped as s}
                                                                <li>{s.playerName || s.teamKey}: {s.issues?.join('; ')}</li>
                                                        {/each}
                                                </ul>
                                        </div>
                                {/if}

                                {#each keeperGroups as group}
                                        <div class="keeper-group">
                                                <h3 class="keeper-team">{group.teamName}</h3>
                                                {#if group.conflicts.length}
                                                        <div class="banner warn">
                                                                <strong>Round limit exceeded</strong> — more keepers cost a round than this team owns picks in it. The draft board will go negative until the extra keepers are reverted or the team acquires more picks.
                                                                <ul class="skip-list">
                                                                        {#each group.conflicts as conf}
                                                                                <li>
                                                                                        Round {conf.round}: owns {conf.owned} pick{conf.owned === 1 ? '' : 's'},
                                                                                        {#if conf.approved > conf.owned}{conf.approved} approved keeper{conf.approved === 1 ? '' : 's'}{:else}{conf.selected} keeper{conf.selected === 1 ? '' : 's'} selected{/if}.
                                                                                </li>
                                                                        {/each}
                                                                </ul>
                                                        </div>
                                                {/if}
                                                <table class="keeper-table">
                                                        <thead>
                                                                <tr>
                                                                        <th>Player</th>
                                                                        <th>Cost</th>
                                                                        <th>Acquired</th>
                                                                        <th>Status</th>
                                                                        <th></th>
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {#each group.picks as k}
                                                                        <tr class={k.valid === false ? 'krow-invalid' : ''}>
                                                                                <td>
                                                                                        {k.player_name || k.player_key}
                                                                                        {#if k.issues?.length}
                                                                                                <div class="kflags">
                                                                                                        {#each k.issues as issue}
                                                                                                                <span class="kflag invalid">⚠ {issue}</span>
                                                                                                        {/each}
                                                                                                </div>
                                                                                        {/if}
                                                                                        {#if k.warnings?.length}
                                                                                                <div class="kflags">
                                                                                                        {#each k.warnings as warn}
                                                                                                                <span class="kflag warn">{warn}</span>
                                                                                                        {/each}
                                                                                                </div>
                                                                                        {/if}
                                                                                </td>
                                                                                <td>Round {k.cost_round}</td>
                                                                                <td>{k.acquisition_year || '—'}</td>
                                                                                <td>
                                                                                        <span class="kstatus {k.status === 'approved' ? 'approved' : 'pending'}">{k.status === 'approved' ? 'Approved' : 'Pending'}</span>
                                                                                </td>
                                                                                <td class="kactions">
                                                                                        {#if k.status === 'approved'}
                                                                                                <form method="POST" action="?/approveKeeper" use:enhance={keepValues}>
                                                                                                        <input type="hidden" name="year" value={c.year} />
                                                                                                        <input type="hidden" name="teamKey" value={k.team_key} />
                                                                                                        <input type="hidden" name="playerKey" value={k.player_key} />
                                                                                                        <input type="hidden" name="status" value="pending" />
                                                                                                        <button class="chip ghost" type="submit">Revert</button>
                                                                                                </form>
                                                                                        {:else}
                                                                                                <form method="POST" action="?/approveKeeper" use:enhance={keepValues}>
                                                                                                        <input type="hidden" name="year" value={c.year} />
                                                                                                        <input type="hidden" name="teamKey" value={k.team_key} />
                                                                                                        <input type="hidden" name="playerKey" value={k.player_key} />
                                                                                                        <input type="hidden" name="status" value="approved" />
                                                                                                        <button class="chip" type="submit">Approve</button>
                                                                                                </form>
                                                                                                <form method="POST" action="?/rejectKeeper" use:enhance={keepValues}>
                                                                                                        <input type="hidden" name="year" value={c.year} />
                                                                                                        <input type="hidden" name="teamKey" value={k.team_key} />
                                                                                                        <input type="hidden" name="playerKey" value={k.player_key} />
                                                                                                        <button class="chip danger" type="submit">Reject</button>
                                                                                                </form>
                                                                                        {/if}
                                                                                </td>
                                                                        </tr>
                                                                {/each}
                                                        </tbody>
                                                </table>
                                        </div>
                                {/each}
                        {:else}
                                <div class="banner">No keepers have been submitted yet. Managers can select keepers from the public Keepers page.</div>
                        {/if}
                </section>
                {/if}
        </div>
</div>

<style>
        .sn-page { min-height: 100vh; background: #0a0a0c; color: #fff; }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 48px 24px 96px; }

        .page-head { margin-bottom: 32px; }

        .tabnav {
                display: flex; flex-wrap: wrap; gap: 4px;
                margin-bottom: 28px; border-bottom: 1px solid #1f2937;
        }
        .tabbtn {
                appearance: none; background: transparent; border: 0; cursor: pointer;
                color: #9ca3af; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.04em;
                text-transform: uppercase; padding: 12px 16px;
                border-bottom: 2px solid transparent; margin-bottom: -1px;
                transition: color .15s, border-color .15s;
        }
        .tabbtn:hover { color: #fff; }
        .tabbtn.active { color: #ccff00; border-bottom-color: #ccff00; }
        .eyebrow {
                display: inline-flex; align-items: center; gap: 8px;
                color: #ccff00; font-size: 11px; font-weight: 900; letter-spacing: 0.2em;
                text-transform: uppercase; margin-bottom: 14px;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #ccff00; box-shadow: 0 0 10px #ccff00; }
        h1 {
                font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; font-style: italic;
                text-transform: uppercase; letter-spacing: -0.03em; margin: 0 0 12px;
                background: linear-gradient(to right, #00f0ff, #7000ff);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sub { color: #9ca3af; margin: 0; max-width: 640px; }

        .banner { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 700; font-size: 0.9rem; }
        .banner.ok { background: rgba(204,255,0,0.12); color: #ccff00; border: 1px solid rgba(204,255,0,0.3); }
        .banner.error { background: rgba(255,60,60,0.12); color: #ff8080; border: 1px solid rgba(255,60,60,0.3); }
        .hotbanner { background: rgba(112,0,255,0.18); color: #c4a6ff; border: 1px solid rgba(112,0,255,0.4); }

        .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        @media (max-width: 760px) { .tiles { grid-template-columns: 1fr; } }
        .tile {
                background: linear-gradient(135deg, #1a1d24, #0f1115);
                border: 1px solid #1f2937; border-radius: 12px; padding: 22px;
        }
        .tile-label { font-size: 11px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
        .tile-value { font-family: monospace; font-size: 2.2rem; font-weight: 900; }
        .tile-value.sm { font-size: 1.4rem; font-family: inherit; font-style: italic; }
        .tile.pot .tile-value { color: #ccff00; }
        .tile.pool .tile-value { color: #00f0ff; }
        .tile.champ .tile-value { color: #fff; }
        .tile-meta { font-size: 12px; color: #6b7280; margin-top: 8px; }
        .tile-meta .hot { color: #c4a6ff; font-weight: 800; }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }

        .card {
                background: #0f1115; border: 1px solid #1f2937; border-radius: 12px; padding: 24px;
        }
        .card.full { margin-top: 16px; }

        .banner.warn { background: rgba(255,193,7,0.12); color: #ffd24a; border: 1px solid rgba(255,193,7,0.3); }
        .banner.warn strong { color: #fff; }

        .draftpicks .draft-scroll { overflow-x: auto; margin-bottom: 18px; border: 1px solid #1f2937; border-radius: 10px; }
        .draft-grid { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
        .draft-grid th, .draft-grid td { text-align: center; padding: 7px 4px; border-bottom: 1px solid #15181f; }
        .draft-grid thead th {
                position: sticky; top: 0; background: #14171d; color: #9ca3af;
                font-size: 10px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase;
                white-space: nowrap;
        }
        .draft-grid .th-team, .draft-grid .td-team {
                text-align: left; white-space: nowrap; padding-left: 14px;
                position: sticky; left: 0; background: #0f1115; z-index: 1;
        }
        .draft-grid thead .th-team { background: #14171d; z-index: 2; }
        .draft-grid .td-team { font-weight: 700; color: #fff; min-width: 150px; }
        .draft-grid .th-total, .draft-grid .td-total { color: #ccff00; font-family: monospace; font-weight: 900; }
        .draft-grid tbody tr:hover .td-team { color: #00f0ff; }
        .draft-grid input {
                width: 42px; box-sizing: border-box; text-align: center;
                background: #0a0a0c; border: 1px solid #2a3340; color: #fff;
                border-radius: 6px; padding: 6px 2px; font-size: 0.9rem; font-family: monospace;
                -moz-appearance: textfield;
        }
        .draft-grid input::-webkit-outer-spin-button,
        .draft-grid input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .draft-grid input:focus { outline: none; border-color: #00f0ff; }
        .draft-grid input.zero { color: #6b7280; border-color: #2a2326; }
        .draft-grid input.multi { color: #ccff00; border-color: rgba(204,255,0,0.5); }
        .draft-grid input.over { color: #ff8080; border-color: #ff5050; background: rgba(255,80,80,0.12); }
        .draft-grid tfoot td { border-top: 2px solid #1f2937; font-weight: 900; font-family: monospace; }
        .draft-grid tfoot .rt.good { color: #4ade80; }
        .draft-grid tfoot .rt.bad { color: #ff8080; }
        .card.award { border-color: rgba(112,0,255,0.35); }
        .card h2 { font-size: 1.1rem; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.01em; margin: 0 0 6px; }
        .card-sub { color: #6b7280; font-size: 0.82rem; margin: 0 0 18px; line-height: 1.5; }
        .card-sub.note { margin: -4px 0 16px; }
        .hr { height: 1px; background: #1f2937; margin: 22px 0; }

        .field { display: block; margin-bottom: 14px; }
        .field span { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 6px; }
        .field input {
                width: 100%; box-sizing: border-box; background: #0a0a0c; border: 1px solid #374151;
                color: #fff; border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; font-family: inherit;
        }
        .field input:focus { outline: none; border-color: #00f0ff; }

        .split-preview { display: flex; gap: 18px; margin: 4px 0 16px; }
        .split-preview div { display: flex; flex-direction: column; }
        .split-preview strong { font-family: monospace; font-size: 1.2rem; color: #ccff00; }
        .split-preview span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }

        .reconcile { margin: 4px 0 18px; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
        .reconcile.off { border-color: rgba(248,113,113,0.32); background: rgba(248,113,113,0.06); }
        .reconcile.ok { border-color: rgba(52,211,153,0.28); background: rgba(52,211,153,0.05); }
        .reconcile-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .reconcile-title { font-size: 0.82rem; font-weight: 600; color: #e5e7eb; text-transform: uppercase; letter-spacing: 0.08em; }
        .reconcile-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 9px; border-radius: 999px; }
        .reconcile-badge.ok { color: #34d399; background: rgba(52,211,153,0.12); }
        .reconcile-badge.off { color: #f87171; background: rgba(248,113,113,0.12); }
        .reconcile-rows { display: flex; flex-direction: column; gap: 6px; }
        .reconcile-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 0.84rem; color: #9ca3af; }
        .reconcile-row strong { font-family: monospace; color: #e5e7eb; }
        .reconcile-row.total { margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); color: #e5e7eb; font-weight: 600; }
        .reconcile-row.delta.over strong { color: #f87171; }
        .reconcile-row.delta.under strong { color: #fbbf24; }
        .reconcile-row.delta span { color: #d1d5db; }
        .reconcile-note { margin: 12px 0 0; font-size: 0.78rem; line-height: 1.5; color: #6b7280; }

        .btn {
                display: inline-flex; align-items: center; justify-content: center;
                background: #ccff00; color: #000; font-weight: 900; font-size: 12px;
                letter-spacing: 0.12em; text-transform: uppercase; padding: 0 22px; height: 44px;
                border: none; border-radius: 6px; cursor: pointer; font-family: inherit;
                transition: background 0.15s, box-shadow 0.15s;
        }
        .btn:hover { background: #aacc00; box-shadow: 0 0 20px rgba(204,255,0,0.25); }
        .btn.danger { background: #7000ff; color: #fff; }
        .btn.danger:hover { background: #5e00d6; box-shadow: 0 0 20px rgba(112,0,255,0.4); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

        .payout-rows { margin-top: 18px; border-top: 1px solid #1f2937; padding-top: 14px; }
        .payout-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .payout-row .pl { width: 36px; font-weight: 900; color: #6b7280; }
        .payout-row .amt { flex: 1; font-family: monospace; font-weight: 700; color: #00f0ff; }

        .chip {
                background: transparent; border: 1px solid #374151; color: #9ca3af;
                font-weight: 800; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
                padding: 7px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .chip:hover { border-color: #00f0ff; color: #00f0ff; }
        .chip.paid { background: rgba(204,255,0,0.15); border-color: rgba(204,255,0,0.4); color: #ccff00; }
        .chip.ghost { border-style: dashed; }
        .chip.danger { border-color: rgba(248,113,113,0.5); color: #f87171; }
        .chip.danger:hover { border-color: #f87171; color: #fca5a5; }
        .chip:disabled { opacity: 0.35; cursor: not-allowed; }
        .chip:disabled:hover { border-color: #374151; color: #9ca3af; }
        .payout-row.disabled .amt { color: #6b7280; text-decoration: line-through; }

        .pl-summary { display: flex; gap: 18px; margin-top: 16px; flex-wrap: wrap; }
        .pl-summary div { display: flex; flex-direction: column; gap: 2px; }
        .pl-summary span { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; }
        .pl-summary strong { font-family: monospace; font-size: 1.05rem; color: #00f0ff; }

        .award-amt { font-size: 0.9rem; color: #9ca3af; margin-bottom: 14px; }
        .award-amt strong { color: #ccff00; font-family: monospace; }

        .history { margin-top: 18px; border-top: 1px solid #1f2937; padding-top: 14px; }
        .history-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 8px; }
        .history-row { display: flex; gap: 12px; padding: 4px 0; font-size: 0.9rem; }
        .history-row span { color: #6b7280; font-family: monospace; width: 48px; }

        .members { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (max-width: 600px) { .members { grid-template-columns: 1fr; } }
        .member {
                display: flex; align-items: center; justify-content: space-between; gap: 12px;
                background: #0a0a0c; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 14px;
        }
        .member.is-paid { border-color: rgba(204,255,0,0.3); }
        .m-info { display: flex; flex-direction: column; min-width: 0; }
        .m-name { font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .m-manager { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }

        .backfill-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .backfill-row { display: flex; gap: 10px; align-items: baseline; font-size: 0.82rem; padding: 8px 10px; border-radius: 6px; background: #0a0a0c; border: 1px solid #1f2937; }
        .backfill-row.bad { border-color: rgba(239,68,68,0.4); }
        .bf-year { font-family: monospace; font-weight: 800; color: #00f0ff; min-width: 48px; }
        .bf-detail { color: #9ca3af; }
        .archived-summary { margin-top: 14px; font-size: 0.78rem; color: #6b7280; }

        .keeper-settings { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 14px; }
        .keeper-settings label { font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; }
        .keeper-settings input { width: 80px; padding: 8px 10px; border-radius: 8px; border: 1px solid #1f2937; background: #0b0f17; color: #fff; font-weight: 700; }
        .keeper-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 8px; }
        .keeper-group { margin-top: 18px; }
        .keeper-team { font-size: 0.95rem; font-weight: 800; color: #fff; margin: 0 0 8px; }
        .keeper-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
        .keeper-table th {
                text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.08em; color: #6b7280; padding: 6px 10px; border-bottom: 1px solid #1f2937;
        }
        .keeper-table td { padding: 8px 10px; border-bottom: 1px solid #14181f; color: #d1d5db; }
        .keeper-table .kactions { text-align: right; }
        .kstatus { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 9px; border-radius: 999px; }
        .kstatus.approved { background: rgba(204,255,0,0.15); border: 1px solid rgba(204,255,0,0.4); color: #ccff00; }
        .kstatus.pending { background: rgba(148,163,184,0.12); border: 1px solid #374151; color: #9ca3af; }
        .krow-invalid td { background: rgba(255,60,60,0.06); }
        .kflags { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
        .kflag { font-size: 11px; font-weight: 700; line-height: 1.3; }
        .kflag.invalid { color: #ff8080; }
        .kflag.warn { color: #ffd24a; }
        .skip-list { margin: 8px 0 0; padding-left: 18px; font-weight: 600; }
        .skip-list li { margin-bottom: 3px; }
</style>
