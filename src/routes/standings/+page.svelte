<script>
        import { goto } from '$app/navigation';
        import { page } from '$app/stores';
        import { ownerDisplayName } from '$lib/utils/ownerNames.js';

        export let data;

        $: years = data?.years ?? [];
        $: selectedYear = data?.selectedYear;
        $: isLive = data?.isLive;
        $: users = data?.leagueTeamManagersData ?? {};
        $: podium = data?.podium ?? [];
                $: highlightTeam = $page.url.searchParams.get('team');

        const PLACES = {
                1: { medal: '🥇', label: 'Champion' },
                2: { medal: '🥈', label: 'Runner-Up' },
                3: { medal: '🥉', label: 'Third Place' }
        };

        function initials(name) {
                return (name ?? '??')
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
        }

        function findUser(roster) {
                const teamKey = roster?.metadata?.team_key;
                if (teamKey) {
                        for (const id in users) {
                                if (users[id]?.metadata?.team_key === teamKey) return users[id];
                        }
                }
                if (roster?.owner_id && users[roster.owner_id]) return users[roster.owner_id];
                return null;
        }

        function buildLiveStandings(rostersMap) {
                if (!rostersMap) return [];
                return Object.values(rostersMap)
                        .slice()
                        .sort((a, b) => {
                                const winDiff = (b.settings?.wins ?? 0) - (a.settings?.wins ?? 0);
                                if (winDiff !== 0) return winDiff;
                                return (b.settings?.fpts ?? 0) - (a.settings?.fpts ?? 0);
                        })
                        .map((r, i) => {
                                const user = findUser(r);
                                const teamName = r.metadata?.team_name ?? user?.metadata?.team_name ?? 'Unknown Team';
                                const nickname = user?.metadata?.manager_nickname ?? null;
                                const w = r.settings?.wins ?? 0;
                                const l = r.settings?.losses ?? 0;
                                const t = r.settings?.ties ?? 0;
                                const games = w + l + t;
                                const pct = games > 0 ? (w + t * 0.5) / games : 0;
                                return {
                                        rank: i + 1,
                                        team: teamName,
                                        manager: nickname ? ownerDisplayName(nickname) : null,
                                        logo: r.metadata?.team_logo ?? null,
                                        w,
                                        l,
                                        t,
                                        pct,
                                        pf: r.settings?.fpts ?? 0,
                                        pa: r.settings?.fpts_against ?? 0
                                };
                        });
        }

        $: standings = isLive
                ? buildLiveStandings(data?.standingsData?.rosters)
                : (data?.archivedStandings ?? []).map((s) => ({
                                ...s,
                                pct: s.w + s.l + s.t > 0 ? (s.w + s.t * 0.5) / (s.w + s.l + s.t) : 0
                  }));

        $: topScorer = standings.length ? standings.slice().sort((a, b) => b.pf - a.pf)[0] : null;
        $: bestRecord = standings.length ? standings.slice().sort((a, b) => a.rank - b.rank)[0] : null;
        $: mostAgainst = standings.length ? standings.slice().sort((a, b) => b.pa - a.pa)[0] : null;

        const fmtPct = (p) => p.toFixed(3).replace(/^0/, '');

        function selectYear(y) {
                const params = new URLSearchParams($page.url.searchParams);
                params.set('year', y);
                goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
        }
        function scrollRow(node, isMatch) {
                if (isMatch) setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
                return {};
        }
</script>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">The North</span>
                        <h1 class="sn-pagetitle">LEAGUE <span class="accent">STANDINGS</span></h1>
                        <p class="sn-pagesub">
                                Where every team ranks in the battle for the frozen tundra. Sorted by record, broken by points.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                {#if years.length}
                        <div class="year-tabs">
                                {#each years as y}
                                        <button
                                                class="year-tab"
                                                class:active={y.year === selectedYear}
                                                on:click={() => selectYear(y.year)}
                                        >
                                                {y.year}
                                                {#if y.status !== 'complete'}<span class="live-dot" title="In progress"></span>{/if}
                                        </button>
                                {/each}
                        </div>
                {/if}

                {#if standings.length === 0}
                        <div class="sn-empty">
                                <h3>No Standings Yet</h3>
                                <p>
                                        {#if isLive}
                                                Standings will appear once your league is connected and games are underway.
                                        {:else}
                                                No archived standings were found for {selectedYear}.
                                        {/if}
                                </p>
                        </div>
                {:else}
                        {#if !isLive && podium.length}
                                <div class="podium-grid">
                                        {#each podium as p}
                                                <div class="podium-card" class:champ={p.rank === 1}>
                                                        <div class="podium-medal">{PLACES[p.rank]?.medal ?? ''}</div>
                                                        <div class="podium-place">{PLACES[p.rank]?.label ?? `#${p.rank}`}</div>
                                                        <div class="podium-team">{p.teamName}</div>
                                                        {#if p.ownerName}
                                                                <div class="podium-owner">{p.ownerName}</div>
                                                        {/if}
                                                </div>
                                        {/each}
                                </div>
                        {/if}

                        <div class="sn-stat-grid" style="margin-bottom: 32px;">
                                {#if topScorer}
                                        <div class="sn-stat">
                                                <div class="sn-stat-label">Top Scorer</div>
                                                <div class="sn-stat-value cyan">{topScorer.pf.toFixed(1)}</div>
                                                <div class="sn-stat-meta">{topScorer.team}</div>
                                        </div>
                                {/if}
                                {#if bestRecord && isLive}
                                        <div class="sn-stat">
                                                <div class="sn-stat-label">Best Record</div>
                                                <div class="sn-stat-value lime">{bestRecord.w}-{bestRecord.l}{bestRecord.t ? `-${bestRecord.t}` : ''}</div>
                                                <div class="sn-stat-meta">{bestRecord.team}</div>
                                        </div>
                                {/if}
                                {#if mostAgainst}
                                        <div class="sn-stat">
                                                <div class="sn-stat-label">Most Points Against</div>
                                                <div class="sn-stat-value purple">{mostAgainst.pa.toFixed(1)}</div>
                                                <div class="sn-stat-meta">{mostAgainst.team}</div>
                                        </div>
                                {/if}
                        </div>

                        <div class="sn-card">
                                <div style="overflow-x: auto;">
                                        <table class="sn-table">
                                                <thead>
                                                        <tr>
                                                                <th class="center">Rnk</th>
                                                                <th>Team</th>
                                                                <th class="center">W-L-T</th>
                                                                <th class="center">PCT</th>
                                                                <th class="right">PF</th>
                                                                <th class="right">PA</th>
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {#each standings as team}
                                                                <tr class:row-highlight={highlightTeam && team.team === highlightTeam} use:scrollRow={highlightTeam && team.team === highlightTeam}>
                                                                        <td class="sn-rank">{team.rank}</td>
                                                                        <td>
                                                                                <div class="sn-team-cell">
                                                                                        <div class="sn-avatar">
                                                                                                {#if team.logo}
                                                                                                        <img src={team.logo} alt={team.team} />
                                                                                                {:else}
                                                                                                        {initials(team.team)}
                                                                                                {/if}
                                                                                        </div>
                                                                                        <div>
                                                                                                <div class="sn-team-name">{team.team}</div>
                                                                                                {#if team.manager}
                                                                                                        <div class="sn-team-meta">{team.manager}</div>
                                                                                                {/if}
                                                                                        </div>
                                                                                </div>
                                                                        </td>
                                                                        <td class="center sn-num">{team.w}-{team.l}{team.t ? `-${team.t}` : ''}</td>
                                                                        <td class="center sn-num">{fmtPct(team.pct)}</td>
                                                                        <td class="right sn-num lime">{team.pf.toFixed(1)}</td>
                                                                        <td class="right sn-num">{team.pa.toFixed(1)}</td>
                                                                </tr>
                                                        {/each}
                                                </tbody>
                                        </table>
                                </div>
                        </div>
                {/if}
        </div>
</div>

<style>
        .year-tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 28px;
        }
        .year-tab {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border-radius: 999px;
                border: 1px solid var(--sn-border);
                background: var(--sn-surface-2);
                color: var(--sn-text-mute);
                font-family: monospace;
                font-weight: 700;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.15s ease;
        }
        .year-tab:hover { color: #fff; border-color: var(--sn-text-faint); }
        .year-tab.active {
                background: var(--sn-lime);
                color: #0a0a0a;
                border-color: var(--sn-lime);
        }
        .live-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--sn-cyan);
                box-shadow: 0 0 8px var(--sn-cyan);
        }
        tr.row-highlight td { background: color-mix(in srgb, var(--sn-lime) 12%, transparent); }
        tr.row-highlight td:first-child { box-shadow: inset 3px 0 0 var(--sn-lime); }

        .podium-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 24px;
        }
        .podium-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                padding: 24px 16px;
                border-radius: 16px;
                border: 1px solid var(--sn-border);
                background: var(--sn-surface-2);
        }
        .podium-card.champ {
                border-color: color-mix(in srgb, var(--sn-lime) 55%, transparent);
                background: color-mix(in srgb, var(--sn-lime) 8%, var(--sn-surface-2));
                box-shadow: 0 0 22px color-mix(in srgb, var(--sn-lime) 14%, transparent);
        }
        .podium-medal { font-size: 2rem; line-height: 1; }
        .podium-place {
                margin-top: 8px;
                font-family: monospace;
                font-weight: 700;
                font-size: 0.72rem;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--sn-text-mute);
        }
        .podium-card.champ .podium-place { color: var(--sn-lime); }
        .podium-team {
                margin-top: 10px;
                font-weight: 800;
                font-size: 1.05rem;
                color: #fff;
        }
        .podium-owner {
                margin-top: 4px;
                font-size: 0.85rem;
                color: var(--sn-text-mute);
        }
        @media (max-width: 640px) {
                .podium-grid { grid-template-columns: 1fr; }
        }
</style>
