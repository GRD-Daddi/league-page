<script>
        import { MAX_PICKS_PER_ROUND } from '$lib/utils/draftRules.js';
        export let data;
        const { upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData, draftPickOwnership, draftPickYear } = data;
        // Pre-season phase drives which tab opens by DEFAULT, but both views' data
        // is always loaded so the owner can toggle freely at any point.
        const isDraftPrep = data.isDraftPrep ?? true;

        // Upcoming draft order: Pick 1 → Pick N (worst finisher first, champion
        // last), derived server-side from last completed season's final standings.
        const draftOrder = data.draftOrder ?? [];
        const draftOrderSeason = data.draftOrderSeason ?? null;

        // Active view: Planning (draft order + picks-by-team + keepers) or Past
        // Drafts (completed results). Default from the season phase, then let the
        // owner switch manually.
        let activeTab = isDraftPrep ? 'planning' : 'past';

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

        // Approved keepers for the upcoming draft. Each keeper consumes its team's
        // pick in the keeper's cost round, so surface them and flag the consumed cell.
        const approvedKeepers = data.approvedKeepers ?? [];
        const teamNameByKey = new Map(pickTeams.map((t) => [t.teamKey, t.teamName]));

        function keeperName(k) {
                if (k.player_name) return k.player_name;
                const p = resolvePlayer(k.player_id || k.player_key);
                if (p) return `${p.fn ?? ''} ${p.ln ?? ''}`.trim() || 'Unknown Player';
                return 'Unknown Player';
        }

        function keeperMeta(k) {
                const p = resolvePlayer(k.player_id || k.player_key);
                if (!p) return '';
                return [p.pos, p.t].filter(Boolean).join(' · ');
        }

        const keeperConsumed = (() => {
                const m = new Map();
                for (const k of approvedKeepers) {
                        const key = `${k.team_key}::${k.cost_round}`;
                        m.set(key, (m.get(key) || 0) + 1);
                }
                return m;
        })();

        const keeperTeams = (() => {
                const byTeam = new Map();
                for (const k of approvedKeepers) {
                        if (!byTeam.has(k.team_key)) byTeam.set(k.team_key, []);
                        byTeam.get(k.team_key).push(k);
                }
                return [...byTeam.entries()]
                        .map(([teamKey, list]) => ({
                                teamKey,
                                teamName: teamNameByKey.get(teamKey) || teamKey,
                                keepers: list.sort((a, b) => (a.cost_round ?? 0) - (b.cost_round ?? 0))
                        }))
                        .sort((a, b) => a.teamName.localeCompare(b.teamName));
        })();

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
                <div class="draft-tabs" role="tablist" aria-label="Draft Room views">
                        <button
                                type="button"
                                role="tab"
                                class="draft-tab"
                                class:active={activeTab === 'planning'}
                                aria-selected={activeTab === 'planning'}
                                on:click={() => (activeTab = 'planning')}
                        >
                                Planning
                        </button>
                        <button
                                type="button"
                                role="tab"
                                class="draft-tab"
                                class:active={activeTab === 'past'}
                                aria-selected={activeTab === 'past'}
                                on:click={() => (activeTab = 'past')}
                        >
                                Past Drafts
                        </button>
                </div>

                {#if activeTab === 'planning'}
                        {#if draftOrder.length}
                                <div class="sn-section-header">
                                        <h2 class="sn-section-title">{draftPickYear} DRAFT ORDER</h2>
                                </div>
                                <p class="picks-intro">
                                        The pick order for the {draftPickYear} draft — the reverse of
                                        {#if draftOrderSeason}the {draftOrderSeason}{:else}last season's{/if}
                                        final standings. Last place picks first
                                        (<span class="lg-multi">Pick 1</span>); the champion picks last.
                                </p>
                                <ol class="order-list">
                                        {#each draftOrder as entry}
                                                <li class="sn-card flat order-item">
                                                        <span class="order-no">{entry.pick}</span>
                                                        <div class="sn-avatar">{ownershipInitials(entry.teamName)}</div>
                                                        <div class="order-text">
                                                                <div class="sn-team-name">{entry.teamName}</div>
                                                                {#if entry.managerName && entry.managerName !== entry.teamName}
                                                                        <div class="sn-team-meta">{entry.managerName}</div>
                                                                {/if}
                                                        </div>
                                                </li>
                                        {/each}
                                </ol>
                        {:else}
                                <div class="sn-section-header">
                                        <h2 class="sn-section-title">{draftPickYear} DRAFT ORDER</h2>
                                </div>
                                <p class="picks-intro">
                                        Draft order isn't set yet — it's seeded from last season's final
                                        standings once a season is in the books.
                                </p>
                        {/if}
                {/if}

                {#if activeTab === 'planning' && pickTeams.length}
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
                                                                {@const consumed = keeperConsumed.get(`${team.teamKey}::${r + 1}`) || 0}
                                                                {@const oversub = consumed > count}
                                                                <div class="picks-cell {count === 0 ? 'zero' : count > MAX_PICKS_PER_ROUND ? 'over' : count > 1 ? 'multi' : ''} {consumed > 0 ? 'keeper' : ''} {oversub ? 'oversub' : ''}" title={oversub ? `${consumed} keeper${consumed === 1 ? '' : 's'} cost round ${r + 1} but the team owns only ${count} pick${count === 1 ? '' : 's'} — over the limit` : consumed > 0 ? `${consumed} keeper${consumed === 1 ? '' : 's'} consume this round` : count > MAX_PICKS_PER_ROUND ? `Over the ${MAX_PICKS_PER_ROUND}-pick round limit` : ''}>
                                                                        <span class="pc-round">R{r + 1}</span>
                                                                        <span class="pc-count">{count}</span>
                                                                        {#if oversub}<span class="pc-warn" title="Keepers exceed owned picks in this round">!</span>{:else if consumed > 0}<span class="pc-keeper" title="Keeper consumes this round">K</span>{/if}
                                                                </div>
                                                        {/each}
                                                </div>
                                        </div>
                                {/each}
                        </div>
                {/if}

                {#if activeTab === 'planning' && keeperTeams.length}
                        <div class="sn-section-header">
                                <h2 class="sn-section-title">{draftPickYear} KEEPERS</h2>
                        </div>
                        <p class="picks-intro">
                                Approved keepers heading into the {draftPickYear} draft. Each keeper costs — and
                                consumes — its team's pick in the listed round.
                        </p>
                        <div class="picks-grid">
                                {#each keeperTeams as kt}
                                        <div class="sn-card flat picks-card">
                                                <div class="picks-card-head">
                                                        <div class="sn-avatar">{ownershipInitials(kt.teamName)}</div>
                                                        <div class="picks-team-text">
                                                                <div class="sn-team-name">{kt.teamName}</div>
                                                                <div class="sn-team-meta">{kt.keepers.length} keeper{kt.keepers.length === 1 ? '' : 's'}</div>
                                                        </div>
                                                </div>
                                                <ul class="keeper-list">
                                                        {#each kt.keepers as k}
                                                                <li class="keeper-item">
                                                                        <div class="ki-main">
                                                                                <span class="ki-name">{keeperName(k)}</span>
                                                                                {#if keeperMeta(k)}<span class="ki-meta">{keeperMeta(k)}</span>{/if}
                                                                        </div>
                                                                        <span class="ki-round" title="Costs a round {k.cost_round} pick">R{k.cost_round}</span>
                                                                </li>
                                                        {/each}
                                                </ul>
                                        </div>
                                {/each}
                        </div>
                {/if}

                {#if activeTab === 'past'}
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
                {/if}
        </div>
</div>

<style>
        .draft-tabs {
                display: inline-flex;
                gap: 4px;
                padding: 4px;
                margin: 0 0 28px;
                border: 1px solid var(--sn-border);
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.02);
        }
        .draft-tab {
                appearance: none;
                border: none;
                cursor: pointer;
                padding: 8px 20px;
                border-radius: 8px;
                background: transparent;
                color: var(--sn-text-mute);
                font-weight: 800;
                font-size: 0.82rem;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                transition: background 0.15s ease, color 0.15s ease;
        }
        .draft-tab:hover {
                color: #fff;
        }
        .draft-tab.active {
                background: var(--sn-lime);
                color: #0a0a0a;
        }

        .order-list {
                list-style: none;
                margin: 0 0 44px;
                padding: 0;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 12px;
        }
        .order-item {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 14px 16px;
        }
        .order-no {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.5rem;
                color: var(--sn-lime);
                line-height: 1;
                min-width: 2ch;
                text-align: center;
        }
        .order-text {
                min-width: 0;
                flex: 1;
        }

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

        .picks-cell.keeper {
                position: relative;
                border-color: rgba(0, 240, 255, 0.5);
                background: rgba(0, 240, 255, 0.08);
        }
        .pc-keeper {
                position: absolute;
                top: 2px;
                right: 3px;
                font-size: 8px;
                font-weight: 900;
                letter-spacing: 0.04em;
                color: var(--sn-cyan);
        }

        /* Over-subscribed: more keepers cost this round than the team owns picks. */
        .picks-cell.oversub {
                position: relative;
                border-color: rgba(255, 80, 80, 0.7);
                background: rgba(255, 80, 80, 0.14);
        }
        .picks-cell.oversub .pc-count { color: #ff8080; }
        .pc-warn {
                position: absolute;
                top: 1px;
                right: 3px;
                font-size: 11px;
                font-weight: 900;
                line-height: 1;
                color: #ff8080;
        }

        .keeper-list {
                list-style: none;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 6px;
        }
        .keeper-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 8px 10px;
                border: 1px solid var(--sn-border);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.02);
        }
        .ki-main { display: flex; flex-direction: column; min-width: 0; }
        .ki-name {
                font-weight: 700;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
        }
        .ki-meta {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--sn-text-faint);
        }
        .ki-round {
                font-family: monospace;
                font-weight: 900;
                font-size: 0.9rem;
                color: var(--sn-cyan);
                border: 1px solid rgba(0, 240, 255, 0.4);
                border-radius: 6px;
                padding: 3px 8px;
                flex-shrink: 0;
        }

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
