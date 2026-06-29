<script>
        import { KEEPER_MAX_SEASONS, WAIVER_COST_ROUND, keeperResetReasonLabel } from '$lib/utils/keeperRules.js';

        export let data;

        $: lineage = data.lineage;
        $: status = lineage?.status;
        $: player = lineage?.player || null;
        $: history = player?.history || [];

        function posClass(pos) {
                switch ((pos || '').toUpperCase()) {
                        case 'QB':
                                return 'cyan';
                        case 'RB':
                                return 'lime';
                        case 'WR':
                                return 'purple';
                        default:
                                return '';
                }
        }

        // Friendly label for one lineage event in the full timeline.
        function lineageLabel(ev) {
                switch (ev.kind) {
                        case 'draft': {
                                const rnd = ev.round ? ` · round ${ev.round}` : '';
                                return ev.isKeeper ? `Kept as a keeper${rnd}` : `Drafted${rnd}`;
                        }
                        case 'add':
                                return 'Added off waivers / free agency';
                        case 'origin-waiver':
                                return 'Picked up off waivers / free agency';
                        case 'trade':
                                return 'Acquired via trade';
                        case 'drop':
                                return 'Dropped to waivers / free agency';
                        default:
                                return ev.kind;
                }
        }

        function sourceLabel(source) {
                switch (source) {
                        case 'draft':
                                return 'Drafted';
                        case 'keeper':
                                return 'Kept (history begins mid-stream)';
                        case 'waiver':
                                return 'Waiver / free-agent pickup';
                        case 'trade':
                                return 'Acquired via trade';
                        default:
                                return 'Unknown';
                }
        }
</script>

<svelte:head>
        <title>{player ? `${player.name} · Keeper Lineage` : 'Keeper Lineage'}</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">Keeper Room</span>
                        <h1 class="sn-pagetitle">
                                {#if player}{player.name}{:else}KEEPER <span class="accent">LINEAGE</span>{/if}
                        </h1>
                        {#if status === 'ok'}
                                <p class="sn-pagesub">
                                        Full keeper history for {lineage.teamName}{lineage.manager ? ` · ${lineage.manager}` : ''},
                                        evaluated for the {lineage.upcomingYear} draft.
                                </p>
                        {/if}
                </div>
        </div>

        <div class="sn-container">
                <a class="back-link" href="/keepers">← Back to the keeper room</a>

                {#if status === 'ok'}
                        {@const exhausted = player.acquisitionYear && player.remainingYears !== null && player.remainingYears < 1}
                        <div class="sn-card detail-head">
                                <div class="sn-avatar lg">{(player.pos || '?').slice(0, 2).toUpperCase()}</div>
                                <div class="detail-id">
                                        <div class="detail-name">{player.name}</div>
                                        <div class="detail-tags">
                                                {#if player.pos}
                                                        <span class="sn-badge {posClass(player.pos)}">{player.pos}</span>
                                                {/if}
                                                {#if player.nflTeam}
                                                        <span class="player-nfl">{player.nflTeam}</span>
                                                {/if}
                                                <span class="sn-badge">R{player.costRound}</span>
                                        </div>
                                        <div class="detail-reason {player.eligible ? '' : 'warn'}">{player.reason}</div>
                                </div>
                        </div>

                        <!-- The verdict: cost, acquisition, years remaining and why. -->
                        <div class="verdict-grid">
                                <div class="sn-card flat verdict">
                                        <span class="verdict-label">Cost round</span>
                                        <span class="verdict-value">Round {player.costRound}</span>
                                        <span class="verdict-note">
                                                {player.source === 'waiver' || player.originSource === 'waiver'
                                                        ? `Waiver/FA pickups cost a round ${WAIVER_COST_ROUND} pick`
                                                        : 'The round this player was last drafted (sticks across trades)'}
                                        </span>
                                </div>
                                <div class="sn-card flat verdict">
                                        <span class="verdict-label">Acquired</span>
                                        <span class="verdict-value">{player.originSource === 'waiver' ? player.originYear : player.acquisitionYear || '—'}</span>
                                        <span class="verdict-note">{player.originSource === 'waiver' ? 'Waiver / free-agent pickup' : sourceLabel(player.source)}</span>
                                </div>
                                <div class="sn-card flat verdict">
                                        <span class="verdict-label">Keeper years left</span>
                                        <span class="verdict-value {exhausted ? 'warn' : ''}">
                                                {player.remainingYears === null ? '—' : Math.max(player.remainingYears, 0)}
                                        </span>
                                        <span class="verdict-note">
                                                {#if player.remainingYears === null}
                                                        Acquisition year unknown — verify with the commissioner.
                                                {:else if exhausted}
                                                        Used the full {KEEPER_MAX_SEASONS}-season window — returns to the draft pool.
                                                {:else}
                                                        Out of a {KEEPER_MAX_SEASONS}-season limit (the acquisition year counts as season 1).
                                                {/if}
                                        </span>
                                </div>
                        </div>

                        {#if player.needsReview}
                                <div class="sn-card flat review-note">
                                        {#if player.originSource === 'waiver'}
                                                <strong>Picked up off waivers / free agency in {player.originYear}.</strong>
                                                This player isn't in the {player.originYear} draft (which we have in full), so
                                                they joined the roster mid-season — then was kept the following year. If they
                                                actually arrived via an in-season trade, the commissioner can adjust it.
                                        {:else}
                                                <strong>History begins mid-stream.</strong>
                                                The earliest recorded move is already a keeper or trade, so the true original
                                                acquisition is older than the data we have. The commissioner should verify the
                                                acquisition year and cost.
                                        {/if}
                                </div>
                        {/if}

                        <h2 class="section-title">FULL EVENT CHAIN</h2>
                        <p class="section-sub">
                                Every recorded move for this player, oldest first. Moves before a reset are dimmed —
                                they no longer count toward the active keeper lineage.
                        </p>

                        {#if history.length}
                                <div class="sn-card flat timeline-card">
                                        <ol class="lineage">
                                                {#each history as ev}
                                                        {#if ev.resetReason}
                                                                <li class="lineage-reset">
                                                                        <span class="lineage-reset-text">{keeperResetReasonLabel(ev.resetReason)}</span>
                                                                        <span class="lineage-reset-sub">Everything above no longer counts; the keeper clock restarts below.</span>
                                                                </li>
                                                        {/if}
                                                        <li class="lineage-ev {ev.current ? 'current' : 'past'}">
                                                                <span class="lineage-year">{ev.year}</span>
                                                                <span class="lineage-text">{lineageLabel(ev)}</span>
                                                                {#if ev.current}
                                                                        <span class="lineage-flag">active lineage</span>
                                                                {/if}
                                                        </li>
                                                {/each}
                                        </ol>
                                </div>
                        {:else}
                                <div class="sn-card flat lineage-empty">
                                        No draft or transaction history on record for this player.
                                </div>
                        {/if}
                {:else if status === 'requires-auth'}
                        <div class="sn-card flat state-card">
                                <h3>Log in to view this lineage</h3>
                                <p>
                                        A player's full keeper history is built from live league rosters, which require a
                                        Yahoo login.
                                </p>
                                <a class="sn-btn primary" href="/auth/login"><span>Log in with Yahoo</span></a>
                        </div>
                {:else}
                        <div class="sn-card flat state-card">
                                <h3>History unavailable</h3>
                                <p>
                                        We couldn't find this player on that team's roster, so there's no keeper lineage
                                        to show. They may have been dropped or traded, or the link may be out of date.
                                </p>
                                <a class="sn-btn ghost" href="/keepers"><span>Back to the keeper room</span></a>
                        </div>
                {/if}
        </div>
</div>

<style>
        .back-link {
                display: inline-block;
                margin-bottom: 20px;
                font-size: 0.8rem;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                color: var(--sn-cyan);
                text-decoration: none;
        }
        .back-link:hover { text-decoration: underline; }

        .detail-head {
                display: flex;
                align-items: center;
                gap: 18px;
                padding: 20px 24px;
                margin-bottom: 20px;
        }
        .sn-avatar.lg {
                width: 56px;
                height: 56px;
                font-size: 1.1rem;
                flex-shrink: 0;
        }
        .detail-id { min-width: 0; }
        .detail-name {
                font-size: 1.4rem;
                font-weight: 900;
                color: #fff;
                line-height: 1.1;
        }
        .detail-tags {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                margin: 8px 0;
        }
        .player-nfl {
                font-size: 0.72rem;
                font-weight: 700;
                color: var(--sn-text-faint);
                text-transform: uppercase;
                letter-spacing: 0.04em;
        }
        .detail-reason {
                font-size: 0.84rem;
                color: var(--sn-text-mute);
                line-height: 1.4;
        }
        .detail-reason.warn { color: #ffb454; }

        .verdict-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 14px;
                margin-bottom: 20px;
        }
        .verdict {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 16px 18px;
        }
        .verdict-label {
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--sn-text-faint);
        }
        .verdict-value {
                font-size: 1.3rem;
                font-weight: 900;
                color: #fff;
        }
        .verdict-value.warn { color: #ffb454; }
        .verdict-note {
                font-size: 0.78rem;
                color: var(--sn-text-mute);
                line-height: 1.4;
        }

        .review-note {
                padding: 14px 18px;
                margin-bottom: 20px;
                border-left: 3px solid #b388ff;
                font-size: 0.85rem;
                color: var(--sn-text-mute);
                line-height: 1.5;
        }
        .review-note strong { color: #d0b8ff; }

        .section-title {
                margin: 28px 0 4px;
                font-size: 0.95rem;
                font-weight: 900;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: #fff;
        }
        .section-sub {
                color: var(--sn-text-mute);
                font-size: 0.86rem;
                margin: 0 0 16px;
                max-width: 640px;
                line-height: 1.5;
        }

        .timeline-card { padding: 18px 24px; }

        .lineage {
                list-style: none;
                margin: 0;
                padding: 0 0 0 16px;
                border-left: 2px solid var(--sn-border);
                display: flex;
                flex-direction: column;
                gap: 12px;
        }
        .lineage-ev {
                position: relative;
                display: flex;
                align-items: baseline;
                gap: 12px;
                font-size: 0.9rem;
        }
        .lineage-ev::before {
                content: '';
                position: absolute;
                left: -21px;
                top: 7px;
                width: 9px;
                height: 9px;
                border-radius: 50%;
                background: var(--sn-text-faint);
        }
        .lineage-ev.current::before { background: var(--sn-cyan); }
        .lineage-ev.past { opacity: 0.5; }
        .lineage-year {
                flex-shrink: 0;
                font-weight: 800;
                color: #fff;
                font-variant-numeric: tabular-nums;
        }
        .lineage-text { color: var(--sn-text-mute); }
        .lineage-ev.current .lineage-text { color: #fff; }
        .lineage-flag {
                font-size: 0.66rem;
                font-weight: 800;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--sn-cyan);
        }

        .lineage-reset {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 2px;
                padding: 6px 0;
        }
        .lineage-reset::before {
                content: '';
                position: absolute;
                left: -21px;
                top: 12px;
                width: 9px;
                height: 9px;
                border-radius: 50%;
                background: #ffb454;
                box-shadow: 0 0 0 3px rgba(255, 180, 84, 0.18);
        }
        .lineage-reset-text {
                font-size: 0.76rem;
                font-weight: 800;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                color: #ffb454;
        }
        .lineage-reset-sub {
                font-size: 0.76rem;
                color: var(--sn-text-faint);
                font-style: italic;
        }

        .lineage-empty {
                padding: 18px 24px;
                font-size: 0.85rem;
                font-style: italic;
                color: var(--sn-text-faint);
        }

        .state-card {
                padding: 28px 24px;
                text-align: center;
        }
        .state-card h3 {
                margin: 0 0 8px;
                color: #fff;
                font-size: 1.1rem;
        }
        .state-card p {
                margin: 0 auto 18px;
                color: var(--sn-text-mute);
                font-size: 0.9rem;
                max-width: 460px;
                line-height: 1.5;
        }

        @media (max-width: 640px) {
                .verdict-grid { grid-template-columns: 1fr; }
        }
</style>
