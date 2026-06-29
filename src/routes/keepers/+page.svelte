<script>
        import { enhance } from '$app/forms';
        import { KEEPER_MAX_SEASONS, WAIVER_COST_ROUND, keeperResetReasonLabel } from '$lib/utils/keeperRules.js';
        import { MAX_PICKS_PER_ROUND } from '$lib/utils/draftRules.js';

        export let data;
        export let form;

        // Tracks which player's Keep/Remove is mid-flight so its button can show an
        // immediate "saving" state instead of looking frozen during the round-trip.
        let submitting = {};
        function submitKeeper(key) {
                submitting = { ...submitting, [key]: true };
                return async ({ update }) => {
                        try {
                                await update();
                        } finally {
                                submitting = { ...submitting, [key]: false };
                        }
                };
        }

        $: keepers = data.keepers;
        $: maxKeepers = keepers?.maxKeepers ?? 2;
        $: rounds = keepers?.rounds || 15;
        $: teams = keepers?.teams || [];
        $: myTeamKey = keepers?.myTeamKey || null;
        $: publicTeams = keepers?.publicTeams || [];
        // Live-season read-only view: keeper selection is over, so show who was
        // actually kept this season instead of the editable selection room.
        $: showCaptured = !!keepers?.showCaptured;
        $: capturedKeepers = keepers?.capturedKeepers || [];

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

        // Group ALL of a team's players by their cost round — eligible AND
        // ineligible. Ineligible players (max seasons reached, returning to the
        // draft pool) are shown right alongside everyone else, just clearly
        // flagged, instead of being tucked away in a hidden disclosure. The
        // capacity header still reflects only eligible/selected keepers.
        function roundGroups(team) {
                const byRound = new Map();
                // Picks consumed per round counts EVERY selected player in that round,
                // so the capacity header always matches the server's true consumption.
                const usedByRound = new Map();
                for (const p of team.players) {
                        if (p.selected) {
                                const cr = p.costRound || 0;
                                usedByRound.set(cr, (usedByRound.get(cr) || 0) + 1);
                        }
                        const r = p.costRound || 0;
                        if (!byRound.has(r)) byRound.set(r, []);
                        byRound.get(r).push(p);
                }
                return [...byRound.entries()]
                        .map(([round, players]) => {
                                const owned = players.find((p) => p.ownedPicksInRound != null)?.ownedPicksInRound ?? (team.picks?.[round - 1] || 0);
                                const used = usedByRound.get(round) || 0;
                                const eligibleCount = players.filter((p) => p.eligibleByRules).length;
                                return {
                                        round,
                                        owned,
                                        used,
                                        remaining: owned - used,
                                        eligibleCount,
                                        // Eligible players first, then ineligible; alphabetical within each.
                                        players: players.sort((a, b) => {
                                                if (!!a.eligibleByRules !== !!b.eligibleByRules) return a.eligibleByRules ? -1 : 1;
                                                return a.name.localeCompare(b.name);
                                        })
                                };
                        })
                        .sort((a, b) => a.round - b.round);
        }

        // Per-player drill-in: which lineage timelines are expanded (keyed by
        // teamKey::playerKey so the same player on different teams never collide).
        let openLineage = {};
        function toggleLineage(key) {
                openLineage = { ...openLineage, [key]: !openLineage[key] };
        }

        // Friendly label for one lineage event in the drill-in timeline.
        function lineageLabel(ev) {
                switch (ev.kind) {
                        case 'draft': {
                                const rnd = ev.round ? ` · round ${ev.round}` : '';
                                return ev.isKeeper ? `Kept (keeper draft)${rnd}` : `Drafted${rnd}`;
                        }
                        case 'add':
                                return 'Added off waivers / FA';
                        case 'origin-waiver':
                                return 'Picked up off waivers / FA';
                        case 'trade':
                                return 'Acquired via trade';
                        case 'drop':
                                return 'Dropped — lineage reset';
                        case 'inferred-origin':
                                return 'Acquired (before keeper records)';
                        default:
                                return ev.kind;
                }
        }

        // Link to the dedicated per-player lineage page, keyed by team + player so
        // the same player on two rosters resolves to the right story.
        function lineagePath(teamKey, playerKey) {
                return `/keepers/player?team=${encodeURIComponent(teamKey)}&player=${encodeURIComponent(playerKey)}`;
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
                                <li>Each team can keep up to <strong>{maxKeepers} player{maxKeepers === 1 ? '' : 's'}</strong> per season.</li>
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

                {#if showCaptured}
                        {#if capturedKeepers.length}
                                <h2 class="section-title">KEEPERS KEPT · {keepers?.upcomingYear}</h2>
                                <p class="from-note">
                                        The {keepers?.upcomingYear} season is underway — here are the keepers each team
                                        locked in for this year's draft. Selection reopens before next season.
                                </p>
                                <div class="teams-grid">
                                        {#each capturedKeepers as team (team.teamKey)}
                                                <div class="sn-card team-card">
                                                        <div class="team-head">
                                                                <div class="sn-avatar">{initials(team.teamName)}</div>
                                                                <div class="team-text">
                                                                        <div class="sn-team-name">{team.teamName}</div>
                                                                        {#if team.manager}
                                                                                <div class="sn-team-meta">{team.manager}</div>
                                                                        {/if}
                                                                </div>
                                                        </div>
                                                        <div class="player-list">
                                                                {#each team.players as p (p.playerKey)}
                                                                        <div class="player-row selected">
                                                                                <div class="player-main">
                                                                                        <span class="player-name">{p.name}</span>
                                                                                        <div class="player-tags">
                                                                                                {#if p.pos}<span class="sn-badge">{p.pos}</span>{/if}
                                                                                                {#if p.nflTeam}<span class="sn-badge">{p.nflTeam}</span>{/if}
                                                                                                {#if p.costRound}<span class="sn-badge lime">R{p.costRound}</span>{/if}
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
                                        <h3>No keepers this season</h3>
                                        <p>No players were kept for the {keepers?.upcomingYear} season — every roster spot came from the draft.</p>
                                </div>
                        {/if}
                {:else if keepers?.requiresAuth}
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
                                        {@const groups = roundGroups(team)}
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
                                                                <span class="sn-badge {team.atLimit ? 'amber' : ''}">{team.selectedCount}/{team.keeperLimit} kept</span>
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

                                                <div class="picks-overview">
                                                        <div class="picks-overview-label">Draft picks by round</div>
                                                        <div class="draft-picks">
                                                                {#each Array(rounds) as _, i}
                                                                        {@const count = team.picks?.[i] || 0}
                                                                        {#if count > 0}
                                                                                <span class="pick-chip" class:extra={count > 1 && count <= MAX_PICKS_PER_ROUND} class:over={count > MAX_PICKS_PER_ROUND} title={count > MAX_PICKS_PER_ROUND ? `Over the ${MAX_PICKS_PER_ROUND}-pick round limit` : ''}><span class="rnd">R{i + 1}</span> <span class="pick-count">×{count}</span></span>
                                                                        {:else}
                                                                                <span class="pick-chip traded"><span class="rnd">R{i + 1}</span> <span class="pick-count">—</span></span>
                                                                        {/if}
                                                                {/each}
                                                        </div>
                                                </div>

                                                {#if groups.length}
                                                        <div class="round-groups">
                                                                {#each groups as g (g.round)}
                                                                        {@const full = editable && g.owned > 0 && g.remaining <= 0}
                                                                        <div class="round-group {full ? 'full' : ''}">
                                                                                <div class="round-head">
                                                                                        <span class="round-label">Round {g.round}</span>
                                                                                        {#if editable}
                                                                                                {#if g.owned === 0}
                                                                                                        <span class="round-cap none">No pick in this round</span>
                                                                                                {:else}
                                                                                                        <span class="round-cap {g.remaining <= 0 ? 'full' : 'open'}">{g.used}/{g.owned} kept · {Math.max(g.remaining, 0)} left</span>
                                                                                                {/if}
                                                                                        {:else}
                                                                                                <span class="round-cap muted">{g.eligibleCount} eligible{g.players.length > g.eligibleCount ? ` · ${g.players.length - g.eligibleCount} ineligible` : ''}</span>
                                                                                        {/if}
                                                                                </div>
                                                                                <div class="player-list">
                                                                                        {#each g.players as p (p.playerKey)}
                                                                                                {@const blocked = editable && !p.selected && !p.canSelect}
                                                                                                <div class="player-row {p.selected ? 'selected' : ''} {blocked ? 'blocked' : ''} {!p.eligibleByRules ? 'ineligible' : ''}">
                                                                                                        <div class="player-main">
                                                                                                                <span class="player-name">{p.name}</span>
                                                                                                                <div class="player-tags">
                                                                                                                        {#if p.pos}
                                                                                                                                <span class="sn-badge {posClass(p.pos)}">{p.pos}</span>
                                                                                                                        {/if}
                                                                                                                        {#if p.nflTeam}
                                                                                                                                <span class="player-nfl">{p.nflTeam}</span>
                                                                                                                        {/if}
                                                                                                                        {#if !p.eligibleByRules}
                                                                                                                                <span class="sn-badge slate">Ineligible</span>
                                                                                                                        {/if}
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
                                                                                                                <button type="button" class="lineage-toggle" on:click={() => toggleLineage(team.teamKey + '::' + p.playerKey)} aria-expanded={!!openLineage[team.teamKey + '::' + p.playerKey]}>
                                                                                                                        {openLineage[team.teamKey + '::' + p.playerKey] ? 'Hide history' : 'View history'}
                                                                                                                </button>
                                                                                                                {#if openLineage[team.teamKey + '::' + p.playerKey]}
                                                                                                                        {@const hist = p.history || []}
                                                                                                                        {#if hist.length}
                                                                                                                                <ol class="lineage">
                                                                                                                                        {#each hist as ev}
                                                                                                                                                {#if ev.resetReason}
                                                                                                                                                        <li class="lineage-reset">
                                                                                                                                                                <span class="lineage-reset-text">{keeperResetReasonLabel(ev.resetReason)}</span>
                                                                                                                                                        </li>
                                                                                                                                                {/if}
                                                                                                                                                <li class="lineage-ev {ev.current ? 'current' : 'past'}{ev.inferred ? ' inferred' : ''}">
                                                                                                                                                        <span class="lineage-year">{ev.inferred ? '~' : ''}{ev.year}</span>
                                                                                                                                                        <span class="lineage-text">{lineageLabel(ev)}</span>
                                                                                                                                                </li>
                                                                                                                                        {/each}
                                                                                                                                </ol>
                                                                                                                                <a class="lineage-link" href={lineagePath(team.teamKey, p.playerKey)}>View full lineage →</a>
                                                                                                                        {:else}
                                                                                                                                <div class="lineage-empty">No draft or transaction history on record.</div>
                                                                                                                        {/if}
                                                                                                                {/if}
                                                                                                        </div>
                                                                                                        {#if editable}
                                                                                                                <div class="player-action">
                                                                                                                        {#if p.selected}
                                                                                                                                <form method="POST" action="?/unselect" use:enhance={() => submitKeeper(team.teamKey + '::' + p.playerKey)}>
                                                                                                                                        <input type="hidden" name="teamKey" value={team.teamKey} />
                                                                                                                                        <input type="hidden" name="playerKey" value={p.playerKey} />
                                                                                                                                        <button class="sn-btn ghost" type="submit" disabled={submitting[team.teamKey + '::' + p.playerKey]}><span>{submitting[team.teamKey + '::' + p.playerKey] ? 'Saving…' : 'Remove'}</span></button>
                                                                                                                                </form>
                                                                                                                        {:else if !p.eligibleByRules}
                                                                                                                                <span class="no-pick">Ineligible</span>
                                                                                                                        {:else if p.canSelect}
                                                                                                                                <form method="POST" action="?/select" use:enhance={() => submitKeeper(team.teamKey + '::' + p.playerKey)}>
                                                                                                                                        <input type="hidden" name="teamKey" value={team.teamKey} />
                                                                                                                                        <input type="hidden" name="playerKey" value={p.playerKey} />
                                                                                                                                        <button class="sn-btn primary" type="submit" disabled={submitting[team.teamKey + '::' + p.playerKey]}><span>{submitting[team.teamKey + '::' + p.playerKey] ? 'Saving…' : 'Keep'}</span></button>
                                                                                                                                </form>
                                                                                                                        {:else if p.blockedByLimit}
                                                                                                                                <span class="no-pick" title="This team has reached its keeper limit of {team.keeperLimit}">Limit reached</span>
                                                                                                                        {:else}
                                                                                                                                <span class="no-pick" title="No picks left in round {g.round}">No pick left</span>
                                                                                                                        {/if}
                                                                                                                </div>
                                                                                                        {/if}
                                                                                                </div>
                                                                                        {/each}
                                                                                </div>
                                                                        </div>
                                                                {/each}
                                                        </div>
                                                {:else}
                                                        <div class="no-cands">No keeper-eligible players.</div>
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

        .picks-overview {
                border: 1px solid var(--sn-border);
                border-radius: 12px;
                padding: 12px;
                background: rgba(0, 240, 255, 0.03);
        }
        .picks-overview-label {
                font-size: 0.7rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--sn-text-faint);
                margin-bottom: 10px;
        }
        .draft-picks {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
        }
        .pick-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-family: monospace;
                font-size: 12px;
                font-weight: 700;
                color: #6b7280;
                background: #0a0a0c;
                border: 1px dashed #1f2937;
                border-radius: 999px;
                padding: 6px 12px;
        }
        .pick-chip .rnd { color: #00f0ff; }
        .pick-chip .pick-count { color: #e5e7eb; font-weight: 800; }
        .pick-chip.extra {
                border-style: solid;
                border-color: #00f0ff;
                background: rgba(0, 240, 255, 0.08);
        }
        .pick-chip.extra .pick-count { color: #00f0ff; }
        .pick-chip.over {
                border-style: solid;
                border-color: #ff5050;
                background: rgba(255, 80, 80, 0.12);
                color: #ff8080;
        }
        .pick-chip.over .rnd,
        .pick-chip.over .pick-count { color: #ff8080; }
        .pick-chip.traded {
                opacity: 0.4;
        }
        .pick-chip.traded .rnd { color: #4b5563; }
        .pick-chip.traded .pick-count { color: #6b7280; }

        .round-groups { display: flex; flex-direction: column; gap: 16px; }
        .round-group {
                border: 1px solid var(--sn-border);
                border-radius: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.015);
                transition: opacity 0.15s ease;
        }
        .round-group.full { opacity: 0.62; }
        .round-head {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--sn-border);
        }
        .round-label {
                font-size: 0.82rem;
                font-weight: 900;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #fff;
        }
        .round-cap {
                font-size: 0.74rem;
                font-weight: 800;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                white-space: nowrap;
        }
        .round-cap.open { color: var(--sn-cyan); }
        .round-cap.full { color: #ffb454; }
        .round-cap.none { color: var(--sn-text-faint); }
        .round-cap.muted { color: var(--sn-text-faint); font-weight: 700; }

        .player-list { display: flex; flex-direction: column; gap: 8px; }

        .player-row.blocked { opacity: 0.55; }

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

        .lineage-toggle {
                margin-top: 6px;
                padding: 0;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                color: var(--sn-cyan);
        }
        .lineage-toggle:hover { text-decoration: underline; }

        .lineage {
                list-style: none;
                margin: 8px 0 2px;
                padding: 0 0 0 14px;
                border-left: 2px solid var(--sn-border);
                display: flex;
                flex-direction: column;
                gap: 8px;
        }
        .lineage-ev {
                position: relative;
                display: flex;
                align-items: baseline;
                gap: 10px;
                font-size: 0.78rem;
        }
        .lineage-ev::before {
                content: '';
                position: absolute;
                left: -19px;
                top: 6px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--sn-text-faint);
        }
        .lineage-ev.current::before { background: var(--sn-cyan); }
        .lineage-ev.past { opacity: 0.55; }
        .lineage-year {
                flex-shrink: 0;
                font-weight: 800;
                color: #fff;
                font-variant-numeric: tabular-nums;
        }
        .lineage-text { color: var(--sn-text-mute); }
        .lineage-ev.current .lineage-text { color: #fff; }
        .lineage-ev.inferred .lineage-text { font-style: italic; color: var(--sn-text-mute); }
        .lineage-ev.inferred .lineage-year { opacity: 0.7; }
        .lineage-ev.inferred::before { background: var(--sn-text-mute); opacity: 0.6; }

        /* Break marker between expired history and the active lineage. */
        .lineage-reset {
                position: relative;
                margin: 2px 0;
                padding: 4px 0;
        }
        .lineage-reset::before {
                content: '';
                position: absolute;
                left: -19px;
                top: 50%;
                transform: translateY(-50%);
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ffb454;
                box-shadow: 0 0 0 3px rgba(255, 180, 84, 0.18);
        }
        .lineage-reset-text {
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                color: #ffb454;
        }

        .lineage-link {
                display: inline-block;
                margin-top: 8px;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                color: var(--sn-cyan);
                text-decoration: none;
        }
        .lineage-link:hover { text-decoration: underline; }

        .lineage-empty {
                margin: 8px 0 2px;
                font-size: 0.78rem;
                font-style: italic;
                color: var(--sn-text-faint);
        }

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

        .player-row.ineligible { opacity: 0.62; }
        .player-row.ineligible .player-name { color: var(--sn-text-mute); }

        @media (max-width: 640px) {
                .teams-grid { grid-template-columns: 1fr; }
        }
</style>
