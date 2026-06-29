<script>
        import { enhance } from '$app/forms';
        import { KEEPER_MAX_SEASONS, WAIVER_COST_ROUND } from '$lib/utils/keeperRules.js';

        export let data;
        export let form;

        $: keepers = data.keepers;
        $: teams = keepers?.teams || [];
        $: myTeamKey = keepers?.myTeamKey || null;
        $: publicTeams = keepers?.publicTeams || [];

        // Players whose keeper window is exhausted (kept the max number of seasons)
        // and therefore return to the upcoming draft pool. Only those with a known
        // acquisition lineage — "unknown history" players are review items, not this.
        $: returningToDraft = teams
                .flatMap((t) =>
                        (t.players || [])
                                .filter(
                                        (p) =>
                                                !p.eligibleByRules &&
                                                p.source &&
                                                p.source !== 'unknown' &&
                                                p.remainingYears !== null &&
                                                p.remainingYears < 1
                                )
                                .map((p) => ({ ...p, teamName: t.teamName }))
                )
                .sort((a, b) => (a.costRound || 99) - (b.costRound || 99) || a.name.localeCompare(b.name));

        function initials(name) {
                const cleaned = (name || '?').replace(/[^a-zA-Z0-9 ]/g, '').trim();
                const parts = cleaned.split(/\s+/).filter(Boolean);
                if (!parts.length) return '?';
                return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
        }

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

        function canEditTeam(team) {
                return !!(myTeamKey && team.teamKey === myTeamKey);
        }

        // Eligible-by-rules players are the keeper candidates; the rest are shown muted.
        function candidates(team) {
                return team.players.filter((p) => p.eligibleByRules);
        }
        function ineligible(team) {
                return team.players.filter((p) => !p.eligibleByRules);
        }

        // Surface the manager's own team first.
        $: sortedTeams = [...teams].sort((a, b) => {
                const am = a.teamKey === myTeamKey ? 0 : 1;
                const bm = b.teamKey === myTeamKey ? 0 : 1;
                return am - bm || a.teamName.localeCompare(b.teamName);
        });
</script>

<svelte:head>
        <title>Keepers</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">League Info</span>
                        <h1 class="sn-pagetitle">KEEPER <span class="accent">ROOM</span></h1>
                        <p class="sn-pagesub">
                                Lock in your keepers for the {keepers?.upcomingYear} draft. Each keeper costs the round you
                                drafted them and counts against that round's pick.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                <div class="sn-card flat rules-card">
                        <h2 class="rules-title">KEEPER RULES</h2>
                        <ul class="rules-list">
                                <li>Keep a player for up to <strong>{KEEPER_MAX_SEASONS} seasons</strong> total (the season you draft or sign them is season 1).</li>
                                <li>Keeper cost = the <strong>round you drafted</strong> them, and it sticks even after a trade.</li>
                                <li>Players added off waivers or free agency cost a <strong>round {WAIVER_COST_ROUND}</strong> pick.</li>
                                <li>A <strong>trade</strong> carries the year count and cost to the new owner. <strong>Dropping</strong> a player resets everything.</li>
                                <li>You must own a pick in the keeper's cost round to keep them.</li>
                        </ul>
                </div>

                {#if form?.error}
                        <div class="sn-card flat form-error">{form.error}</div>
                {/if}

                {#if keepers?.requiresAuth}
                        <div class="sn-card flat login-prompt">
                                <div>
                                        <strong>Viewing in read-only mode.</strong>
                                        <span>Log in with Yahoo to see full keeper eligibility and lock in your own keepers.</span>
                                </div>
                                <a class="sn-btn primary" href="/auth/login"><span>Log in with Yahoo</span></a>
                        </div>

                        {#if publicTeams.length}
                                <h2 class="section-title">KEEPERS LOCKED IN · {keepers?.upcomingYear}</h2>
                                <div class="teams-grid">
                                        {#each publicTeams as team (team.teamKey)}
                                                <div class="sn-card team-card">
                                                        <div class="team-head">
                                                                <div class="sn-avatar">{initials(team.teamName)}</div>
                                                                <div class="team-text">
                                                                        <div class="sn-team-name">{team.teamName}</div>
                                                                </div>
                                                        </div>
                                                        <div class="player-list">
                                                                {#each team.players as p (p.player_key)}
                                                                        <div class="player-row {p.status === 'approved' ? 'selected' : ''}">
                                                                                <div class="player-main">
                                                                                        <span class="player-name">{p.player_name}</span>
                                                                                        <div class="player-tags">
                                                                                                <span class="sn-badge">R{p.cost_round}</span>
                                                                                                {#if p.status === 'approved'}
                                                                                                        <span class="sn-badge lime">Approved</span>
                                                                                                {:else}
                                                                                                        <span class="sn-badge cyan">Pending</span>
                                                                                                {/if}
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                {/each}
                                                        </div>
                                                </div>
                                        {/each}
                                </div>
                        {:else}
                                <div class="sn-empty">
                                        <h3>No keepers locked in yet</h3>
                                        <p>Once managers select their keepers, they'll appear here for everyone to see.</p>
                                </div>
                        {/if}
                {:else if !teams.length}
                        <div class="sn-empty">
                                <h3>No Rosters Found</h3>
                                <p>
                                        Keepers appear once rosters are available. If history hasn't been imported yet, the
                                        commissioner can backfill it from the Commissioner page.
                                </p>
                        </div>
                {:else}
                        {#if keepers?.fromSeason}
                                <p class="from-note">
                                        Rosters shown are from the {keepers.fromSeason} season (current-season rosters aren't set yet).
                                </p>
                        {/if}

                        <div class="teams-grid">
                                {#each sortedTeams as team (team.teamKey)}
                                        {@const editable = canEditTeam(team)}
                                        {@const cands = candidates(team)}
                                        {@const inel = ineligible(team)}
                                        <div class="sn-card team-card {team.teamKey === myTeamKey ? 'mine' : ''}">
                                                <div class="team-head">
                                                        <div class="sn-avatar">{initials(team.teamName)}</div>
                                                        <div class="team-text">
                                                                <div class="sn-team-name">{team.teamName}</div>
                                                                {#if team.manager}
                                                                        <div class="sn-team-meta">{team.manager}</div>
                                                                {/if}
                                                        </div>
                                                        <div class="team-counts">
                                                                <span class="sn-badge {team.approvedCount ? 'lime' : ''}">{team.approvedCount} approved</span>
                                                                {#if team.selectedCount > team.approvedCount}
                                                                        <span class="sn-badge cyan">{team.selectedCount - team.approvedCount} pending</span>
                                                                {/if}
                                                        </div>
                                                </div>

                                                {#if team.teamKey === myTeamKey}
                                                        <div class="mine-flag">Your team</div>
                                                {/if}

                                                {#if team.roundConflicts?.length}
                                                        <div class="round-warn">
                                                                <strong>Over the round limit.</strong>
                                                                {#each team.roundConflicts as conf}
                                                                        <span class="round-warn-item">Round {conf.round}: {conf.selected} keeper{conf.selected === 1 ? '' : 's'} cost this round but only {conf.owned} pick{conf.owned === 1 ? '' : 's'} owned.</span>
                                                                {/each}
                                                                <span class="round-warn-fix">Remove a keeper in that round or acquire another pick.</span>
                                                        </div>
                                                {/if}

                                                {#if cands.length}
                                                        <div class="player-list">
                                                                {#each cands as p (p.playerKey)}
                                                                        <div class="player-row {p.selected ? 'selected' : ''}">
                                                                                <div class="player-main">
                                                                                        <span class="player-name">{p.name}</span>
                                                                                        <div class="player-tags">
                                                                                                {#if p.pos}
                                                                                                        <span class="sn-badge {posClass(p.pos)}">{p.pos}</span>
                                                                                                {/if}
                                                                                                {#if p.nflTeam}
                                                                                                        <span class="player-nfl">{p.nflTeam}</span>
                                                                                                {/if}
                                                                                                <span class="sn-badge">R{p.costRound}</span>
                                                                                                {#if p.status === 'approved'}
                                                                                                        <span class="sn-badge lime">Approved</span>
                                                                                                {:else if p.status === 'pending'}
                                                                                                        <span class="sn-badge cyan">Pending</span>
                                                                                                {/if}
                                                                                                {#if p.needsReview}
                                                                                                        <span class="sn-badge purple" title="History is incomplete — verify with the commissioner">Review</span>
                                                                                                {/if}
                                                                                        </div>
                                                                                        <div class="player-reason {p.eligible ? '' : 'warn'}">{p.reason}</div>
                                                                                </div>
                                                                                {#if editable}
                                                                                        <div class="player-action">
                                                                                                {#if p.selected}
                                                                                                        <form method="POST" action="?/unselect" use:enhance>
                                                                                                                <input type="hidden" name="teamKey" value={team.teamKey} />
                                                                                                                <input type="hidden" name="playerKey" value={p.playerKey} />
                                                                                                                <button class="sn-btn ghost" type="submit"><span>Remove</span></button>
                                                                                                        </form>
                                                                                                {:else if p.canSelect}
                                                                                                        <form method="POST" action="?/select" use:enhance>
                                                                                                                <input type="hidden" name="teamKey" value={team.teamKey} />
                                                                                                                <input type="hidden" name="playerKey" value={p.playerKey} />
                                                                                                                <button class="sn-btn primary" type="submit"><span>Keep</span></button>
                                                                                                        </form>
                                                                                                {:else}
                                                                                                        <span class="no-pick" title={p.reason}>No pick</span>
                                                                                                {/if}
                                                                                        </div>
                                                                                {/if}
                                                                        </div>
                                                                {/each}
                                                        </div>
                                                {:else}
                                                        <div class="no-cands">No keeper-eligible players.</div>
                                                {/if}

                                                {#if inel.length}
                                                        <details class="inel">
                                                                <summary>{inel.length} ineligible player{inel.length === 1 ? '' : 's'}</summary>
                                                                <div class="inel-list">
                                                                        {#each inel as p (p.playerKey)}
                                                                                <div class="inel-row">
                                                                                        <span class="inel-name">{p.name}</span>
                                                                                        <span class="inel-reason">{p.reason}</span>
                                                                                </div>
                                                                        {/each}
                                                                </div>
                                                        </details>
                                                {/if}
                                        </div>
                                {/each}
                        </div>

                        {#if returningToDraft.length}
                                <h2 class="section-title returning">PLAYERS RETURNING TO THE {keepers?.upcomingYear} DRAFT</h2>
                                <p class="section-sub">
                                        These players hit the {KEEPER_MAX_SEASONS}-season keeper limit and are no longer
                                        eligible to keep — they go back into the draft pool.
                                </p>
                                <div class="sn-card flat returning-card">
                                        <div class="returning-list">
                                                {#each returningToDraft as p (p.teamName + p.playerKey)}
                                                        <div class="returning-row">
                                                                <div class="returning-main">
                                                                        <span class="player-name">{p.name}</span>
                                                                        <div class="player-tags">
                                                                                {#if p.pos}
                                                                                        <span class="sn-badge {posClass(p.pos)}">{p.pos}</span>
                                                                                {/if}
                                                                                {#if p.nflTeam}
                                                                                        <span class="player-nfl">{p.nflTeam}</span>
                                                                                {/if}
                                                                                <span class="sn-badge">R{p.costRound}</span>
                                                                        </div>
                                                                </div>
                                                                <span class="returning-team">{p.teamName}</span>
                                                        </div>
                                                {/each}
                                        </div>
                                </div>
                        {/if}
                {/if}
        </div>
</div>

<style>
        .rules-card {
                padding: 20px 24px;
                margin-bottom: 24px;
                border-left: 3px solid var(--sn-cyan);
        }
        .rules-title {
                margin: 0 0 12px;
                font-size: 0.8rem;
                font-weight: 900;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--sn-cyan);
        }
        .rules-list {
                margin: 0;
                padding-left: 18px;
                color: var(--sn-text-mute);
                font-size: 0.9rem;
                line-height: 1.7;
        }
        .rules-list strong { color: #fff; }

        .form-error {
                padding: 14px 18px;
                margin-bottom: 20px;
                border-left: 3px solid #ff5050;
                color: #ff8080;
                font-weight: 700;
        }

        .round-warn {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 10px 12px;
                border: 1px solid rgba(255, 80, 80, 0.5);
                border-left: 3px solid #ff5050;
                border-radius: 8px;
                background: rgba(255, 80, 80, 0.1);
                font-size: 0.82rem;
                color: #ffb0b0;
        }
        .round-warn strong { color: #ff8080; }
        .round-warn-item { color: #ffd0d0; }
        .round-warn-fix { color: var(--sn-text-mute); font-style: italic; }

        .from-note {
                color: var(--sn-text-faint);
                font-size: 0.85rem;
                margin: 0 0 20px;
        }

        .login-prompt {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                flex-wrap: wrap;
                padding: 16px 20px;
                margin-bottom: 24px;
                border-left: 3px solid var(--sn-cyan);
        }
        .login-prompt strong { color: #fff; display: block; }
        .login-prompt span { color: var(--sn-text-mute); font-size: 0.88rem; }

        .section-title {
                margin: 32px 0 4px;
                font-size: 0.95rem;
                font-weight: 900;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: #fff;
        }
        .section-title.returning { color: #ffb454; }
        .section-sub {
                color: var(--sn-text-mute);
                font-size: 0.86rem;
                margin: 0 0 16px;
                max-width: 640px;
        }

        .returning-card { padding: 8px 12px; }
        .returning-list { display: flex; flex-direction: column; }
        .returning-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 6px;
                border-bottom: 1px solid var(--sn-border);
        }
        .returning-row:last-child { border-bottom: none; }
        .returning-main { min-width: 0; }
        .returning-team {
                font-size: 0.78rem;
                font-weight: 700;
                color: var(--sn-text-faint);
                text-align: right;
                flex-shrink: 0;
        }

        .teams-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                gap: 20px;
        }

        .team-card {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 14px;
        }
        .team-card.mine {
                border-color: rgba(0, 240, 255, 0.5);
                box-shadow: 0 0 24px rgba(0, 240, 255, 0.08);
        }

        .team-head {
                display: flex;
                align-items: center;
                gap: 12px;
        }
        .team-text { min-width: 0; flex: 1; }
        .team-counts {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
        }

        .mine-flag {
                align-self: flex-start;
                font-size: 0.7rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--sn-cyan);
        }

        .player-list { display: flex; flex-direction: column; gap: 8px; }

        .player-row {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                border: 1px solid var(--sn-border);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.02);
        }
        .player-row.selected {
                border-color: rgba(204, 255, 0, 0.4);
                background: rgba(204, 255, 0, 0.06);
        }
        .player-main { min-width: 0; flex: 1; }
        .player-name { font-weight: 800; color: #fff; }
        .player-tags {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
                margin: 4px 0;
        }
        .player-nfl {
                font-size: 0.72rem;
                font-weight: 700;
                color: var(--sn-text-faint);
                text-transform: uppercase;
                letter-spacing: 0.04em;
        }
        .player-reason {
                font-size: 0.78rem;
                color: var(--sn-text-mute);
                line-height: 1.4;
        }
        .player-reason.warn { color: #ffb454; }

        .player-action { flex-shrink: 0; }
        .no-pick {
                font-size: 0.75rem;
                font-weight: 700;
                color: var(--sn-text-faint);
                text-transform: uppercase;
                letter-spacing: 0.04em;
        }

        .no-cands {
                color: var(--sn-text-faint);
                font-size: 0.85rem;
                font-style: italic;
        }

        .inel { margin-top: 4px; }
        .inel summary {
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 700;
                color: var(--sn-text-faint);
                letter-spacing: 0.03em;
        }
        .inel-list {
                margin-top: 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
        }
        .inel-row {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                font-size: 0.8rem;
                color: var(--sn-text-mute);
        }
        .inel-name { color: var(--sn-text-mute); font-weight: 700; }
        .inel-reason { color: var(--sn-text-faint); text-align: right; }

        @media (max-width: 640px) {
                .teams-grid { grid-template-columns: 1fr; }
        }
</style>
