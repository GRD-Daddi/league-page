<script>
        import { MAX_PICKS_PER_ROUND } from '$lib/utils/draftRules.js';
        export let data;
        const { upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData, draftPickOwnership, draftPickYear } = data;

        const pickRounds = draftPickOwnership?.rounds || 15;
        const pickTeams = [...(draftPickOwnership?.teams || [])].sort(
                (a, b) => (b.total ?? 0) - (a.total ?? 0) || (a.teamName || '').localeCompare(b.teamName || '')
        );

        function ownershipInitials(name) {
                const cleaned = (name || '?').replace(/[^a-zA-Z0-9 ]/g, '').trim();
                const parts = cleaned.split(/\s+/).filter(Boolean);
                if (!parts.length) return '?';
                return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
        }

        const players = playersData?.players ?? {};

        const yahooPlayerIndex = (() => {
                const index = {};
                for (const id in players) {
                        const yh = players[id]?.yh;
                        if (yh != null) index[String(yh)] = players[id];
                }
                return index;
        })();

        function resolvePlayer(pid) {
                if (pid == null) return null;
                const key = String(pid);
                const direct = players?.[key];
                if (direct) return direct;
                // Yahoo player keys look like "{game}.p.{id}"; bridge to the Sleeper
                // dataset via its yahoo_id. Fall back to a bare trailing numeric id.
                const m = key.match(/\.p\.(\d+)/) || key.match(/^(\d+)$/);
                if (m) return yahooPlayerIndex[m[1]] ?? null;
                return null;
        }

        function buildDrafts(prev, upcoming) {
                if (Array.isArray(prev) && prev.length) {
                        return [...prev].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
                }
                if (Array.isArray(upcoming) && upcoming.length) {
                        return [{ year: new Date().getFullYear(), draft: upcoming }];
                }
                return [];
        }

        const drafts = buildDrafts(previousDraftsData, upcomingDraftData);

        let selectedYear;
        $: if (selectedYear == null && drafts.length) selectedYear = drafts[0].year;

        $: selectedDraft = drafts.find((d) => d.year === selectedYear) ?? drafts[0];

        function groupByRound(picks) {
                if (!Array.isArray(picks) || !picks.length) return [];
                const map = {};
                for (const p of picks) {
                        const r = p.round ?? 0;
                        if (!map[r]) map[r] = [];
                        map[r].push(p);
                }
                return Object.keys(map)
                        .sort((a, b) => Number(a) - Number(b))
                        .map((r) => ({
                                round: Number(r),
                                picks: map[r].sort((a, b) => (a.pick_no ?? 0) - (b.pick_no ?? 0))
                        }));
        }

        $: rounds = groupByRound(selectedDraft?.draft);

        function buildRosterMap(users) {
                const map = {};
                for (const id in users || {}) {
                        const u = users[id];
                        const tk = u?.metadata?.team_key;
                        const m = tk && tk.match(/\.t\.(\d+)/);
                        if (m) map[Number(m[1])] = u;
                }
                return map;
        }

        const rosterMap = buildRosterMap(leagueTeamManagersData);

        function teamName(rosterId) {
                const u = rosterMap[rosterId];
                return u?.metadata?.team_name || u?.display_name || (rosterId ? `Team ${rosterId}` : 'Unknown Team');
        }

        function teamManager(rosterId) {
                const u = rosterMap[rosterId];
                const nick = u?.metadata?.manager_nickname;
                const team = u?.metadata?.team_name;
                return nick && nick !== team ? nick : null;
        }

        function initials(name) {
                return (name ?? '??')
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
        }

        function playerName(pid) {
                const p = resolvePlayer(pid);
                if (p) return `${p.fn ?? ''} ${p.ln ?? ''}`.trim() || 'Unknown';
                return 'Unknown Player';
        }

        function playerPos(pid) {
                return resolvePlayer(pid)?.pos || null;
        }

        function playerTeam(pid) {
                return resolvePlayer(pid)?.t || null;
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
</script>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">League Info</span>
                        <h1 class="sn-pagetitle">DRAFT <span class="accent">ROOM</span></h1>
                        <p class="sn-pagesub">Every pick, every round. Relive the draft that built this league.</p>
                </div>
        </div>

        <div class="sn-container">
                {#if pickTeams.length}
                        <div class="sn-section-header">
                                <h2 class="sn-section-title">{draftPickYear} DRAFT PICKS BY TEAM</h2>
                        </div>
                        <p class="picks-intro">
                                Who owns what heading into the {draftPickYear} draft. Numbers show how many picks each
                                team holds per round — <span class="lg-zero">0</span> means traded away,
                                <span class="lg-multi">{MAX_PICKS_PER_ROUND}</span> is the max a team may hold in a round.
                                <span class="lg-rule">League rule: max {MAX_PICKS_PER_ROUND} picks per round.</span>
                        </p>
                        <div class="picks-grid">
                                {#each pickTeams as team}
                                        <div class="sn-card flat picks-card">
                                                <div class="picks-card-head">
                                                        <div class="sn-avatar">{ownershipInitials(team.teamName)}</div>
                                                        <div class="picks-team-text">
                                                                <div class="sn-team-name">{team.teamName || 'Unknown Team'}</div>
                                                                <div class="sn-team-meta">{team.total} total pick{team.total === 1 ? '' : 's'}</div>
                                                        </div>
                                                        <span class="picks-total">{team.total}</span>
                                                </div>
                                                <div class="picks-rounds">
                                                        {#each Array(pickRounds) as _, r}
                                                                {@const count = Number(team.picks?.[r]) || 0}
                                                                <div class="picks-cell {count === 0 ? 'zero' : count > MAX_PICKS_PER_ROUND ? 'over' : count > 1 ? 'multi' : ''}" title={count > MAX_PICKS_PER_ROUND ? `Over the ${MAX_PICKS_PER_ROUND}-pick round limit` : ''}>
                                                                        <span class="pc-round">R{r + 1}</span>
                                                                        <span class="pc-count">{count}</span>
                                                                </div>
                                                        {/each}
                                                </div>
                                        </div>
                                {/each}
                        </div>
                {/if}

                {#if drafts.length}
                        <div class="sn-section-header">
                                <h2 class="sn-section-title">
                                        {selectedDraft?.year} DRAFT BOARD
                                </h2>
                                {#if drafts.length > 1}
                                        <select class="sn-select" bind:value={selectedYear}>
                                                {#each drafts as d}
                                                        <option value={d.year}>{d.year} Season</option>
                                                {/each}
                                        </select>
                                {/if}
                        </div>

                        {#if rounds.length}
                                <div class="draft-board">
                                        {#each rounds as round}
                                                <div class="round-col">
                                                        <div class="round-head">Round {round.round}</div>
                                                        {#each round.picks as pick}
                                                                {@const pos = playerPos(pick.player_id)}
                                                                <div class="sn-card flat pick-card">
                                                                        <div class="pick-top">
                                                                                <span class="pick-no">#{pick.pick_no}</span>
                                                                                {#if pick.is_keeper}
                                                                                        <span class="sn-badge lime">Keeper</span>
                                                                                {/if}
                                                                        </div>
                                                                        <div class="pick-player">
                                                                                <span class="pick-name">{playerName(pick.player_id)}</span>
                                                                                <div class="pick-tags">
                                                                                        {#if pos}
                                                                                                <span class="sn-badge {posClass(pos)}">{pos}</span>
                                                                                        {/if}
                                                                                        {#if playerTeam(pick.player_id)}
                                                                                                <span class="pick-team-nfl">{playerTeam(pick.player_id)}</span>
                                                                                        {/if}
                                                                                </div>
                                                                        </div>
                                                                        <div class="pick-owner">
                                                                                <div class="sn-avatar">{initials(teamName(pick.roster_id))}</div>
                                                                                <div class="pick-owner-text">
                                                                                        <div class="sn-team-name">{teamName(pick.roster_id)}</div>
                                                                                        {#if teamManager(pick.roster_id)}
                                                                                                <div class="sn-team-meta">{teamManager(pick.roster_id)}</div>
                                                                                        {/if}
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        {/each}
                                                </div>
                                        {/each}
                                </div>
                        {:else}
                                <div class="sn-empty">
                                        <h3>No Picks Recorded</h3>
                                        <p>This draft has no recorded picks yet.</p>
                                </div>
                        {/if}
                {:else}
                        <div class="sn-empty">
                                <h3>Draft Hasn't Happened Yet</h3>
                                <p>
                                        The draft board will light up here once the league completes its draft. Check back when
                                        it's go time.
                                </p>
                        </div>
                {/if}
        </div>
</div>

<style>
        .picks-intro {
                color: var(--sn-text-mute);
                font-size: 0.92rem;
                margin: 0 0 20px;
                max-width: 720px;
        }
        .picks-intro .lg-zero { color: var(--sn-text-faint); font-weight: 800; }
        .picks-intro .lg-multi { color: var(--sn-lime); font-weight: 800; }
        .picks-intro .lg-rule {
                display: block;
                margin-top: 6px;
                color: var(--sn-cyan);
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-size: 0.8rem;
        }

        .picks-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 16px;
                margin-bottom: 44px;
        }

        .picks-card {
                padding: 18px;
                display: flex;
                flex-direction: column;
                gap: 14px;
        }

        .picks-card-head {
                display: flex;
                align-items: center;
                gap: 12px;
        }

        .picks-team-text {
                min-width: 0;
                flex: 1;
        }

        .picks-total {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.6rem;
                color: var(--sn-lime);
                line-height: 1;
        }

        .picks-rounds {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 6px;
        }

        .picks-cell {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: 7px 2px;
                border: 1px solid var(--sn-border);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.02);
        }

        .pc-round {
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                color: var(--sn-text-faint);
        }

        .pc-count {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.05rem;
                color: #fff;
        }

        .picks-cell.zero {
                opacity: 0.55;
                border-style: dashed;
        }
        .picks-cell.zero .pc-count { color: var(--sn-text-faint); }

        .picks-cell.multi {
                border-color: rgba(204, 255, 0, 0.45);
                background: rgba(204, 255, 0, 0.08);
        }
        .picks-cell.multi .pc-count { color: var(--sn-lime); }

        .picks-cell.over {
                border-color: rgba(255, 80, 80, 0.6);
                background: rgba(255, 80, 80, 0.12);
        }
        .picks-cell.over .pc-count { color: #ff8080; }

        .draft-board {
                display: flex;
                gap: 20px;
                overflow-x: auto;
                padding-bottom: 16px;
        }

        .round-col {
                flex: 0 0 280px;
                min-width: 280px;
                display: flex;
                flex-direction: column;
                gap: 12px;
        }

        .round-head {
                font-size: 13px;
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--sn-cyan);
                padding: 8px 4px;
                border-bottom: 2px solid var(--sn-border);
                position: sticky;
                top: 0;
        }

        .pick-card {
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
        }

        .pick-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
        }

        .pick-no {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.1rem;
                color: var(--sn-text-faint);
        }

        .pick-player {
                display: flex;
                flex-direction: column;
                gap: 8px;
        }

        .pick-name {
                font-weight: 700;
                font-size: 1.05rem;
                color: #fff;
        }

        .pick-tags {
                display: flex;
                align-items: center;
                gap: 8px;
        }

        .pick-team-nfl {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: var(--sn-text-mute);
                text-transform: uppercase;
        }

        .pick-owner {
                display: flex;
                align-items: center;
                gap: 10px;
                border-top: 1px solid var(--sn-border);
                padding-top: 12px;
        }

        .pick-owner-text {
                min-width: 0;
        }
</style>
