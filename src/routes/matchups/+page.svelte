<script>
        import { goto } from '$app/navigation';
        import { page } from '$app/stores';
        import { MatchupsAndBrackets } from '$lib/components';
        import MatchupDetail from '$lib/Matchups/MatchupDetail.svelte';

        export let data;

        let openKey = null;
        let detailCache = {};
        let detailStatus = {}; // key -> { loading, error }

        const gameKey = (g) => `${selectedYear}-${selectedWeek}-${g.matchupId}`;

        async function toggleGame(g) {
                const key = gameKey(g);
                if (openKey === key) {
                        openKey = null;
                        return;
                }
                openKey = key;
                if (detailCache[key] || detailStatus[key]?.loading) return;
                detailStatus = { ...detailStatus, [key]: { loading: true, error: null } };
                try {
                        const res = await fetch(
                                `/api/matchup-detail?year=${selectedYear}&week=${selectedWeek}&matchup=${g.matchupId}`
                        );
                        if (!res.ok) throw new Error(`Request failed (${res.status})`);
                        detailCache[key] = await res.json();
                        detailCache = detailCache;
                        detailStatus = { ...detailStatus, [key]: { loading: false, error: null } };
                } catch (e) {
                        detailStatus = {
                                ...detailStatus,
                                [key]: { loading: false, error: e.message || 'Could not load matchup detail.' }
                        };
                }
        }

        $: isLive = data?.isLive;
        $: years = data?.years ?? [];
        $: selectedYear = data?.selectedYear;
        $: schedule = data?.schedule ?? [];
        $: queryWeek = data?.queryWeek != null ? Number(data.queryWeek) : null;
        $: queryMatchup = data?.queryMatchup ?? null;

        let selectedWeek = null;
        $: weeks = schedule.map((w) => w.week);
        $: if (!isLive) {
                if (queryWeek != null && weeks.includes(queryWeek)) selectedWeek = queryWeek;
                else if (selectedWeek == null || !weeks.includes(selectedWeek)) selectedWeek = weeks[0] ?? null;
        }
        $: activeWeek = schedule.find((w) => w.week === selectedWeek) ?? null;

        $: champGames = activeWeek?.isPlayoffs ? activeWeek.games.filter((g) => g.bracket === 'championship') : [];
        $: consoGames = activeWeek?.isPlayoffs ? activeWeek.games.filter((g) => g.bracket === 'consolation') : [];
        $: showBrackets = activeWeek?.isPlayoffs && (champGames.length > 0 || consoGames.length > 0);

        function selectYear(y) {
                openKey = null;
                const params = new URLSearchParams($page.url.searchParams);
                params.set('year', y);
                params.delete('week');
                params.delete('matchup');
                goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
        }

        function selectWeek(w) {
                openKey = null;
                selectedWeek = w;
        }

        const fmtPts = (p) => (p == null ? '—' : Number(p).toFixed(2));

        function highlightAction(node, isMatch) {
                if (isMatch) setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
                return {};
        }
</script>

<svelte:head>
        <title>Matchups | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">The North</span>
                        <h1 class="sn-pagetitle">LEAGUE <span class="accent">MATCHUPS</span></h1>
                        <p class="sn-pagesub">
                                Every head-to-head, week by week. Browse the live season or dig through the archives.
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

                {#if isLive}
                        <div id="main">
                                <MatchupsAndBrackets
                                        queryWeek={data.queryWeek}
                                        matchupsData={data.matchupsData}
                                        bracketsData={data.bracketsData}
                                        playersData={data.playersData}
                                        leagueTeamManagersData={data.leagueTeamManagersData}
                                />
                        </div>
                {:else if schedule.length === 0}
                        <div class="sn-empty">
                                <h3>No Matchups Archived</h3>
                                <p>No archived matchups were found for {selectedYear}.</p>
                        </div>
                {:else}
                        <div class="week-tabs">
                                {#each schedule as w}
                                        <button
                                                class="week-tab"
                                                class:active={w.week === selectedWeek}
                                                on:click={() => selectWeek(w.week)}
                                        >
                                                Wk {w.week}
                                                {#if w.isPlayoffs}<span class="po-dot" title="Playoffs"></span>{/if}
                                        </button>
                                {/each}
                        </div>

                        {#if activeWeek}
                                <div class="week-heading">
                                        <h2>Week {activeWeek.week}</h2>
                                        {#if activeWeek.isPlayoffs}<span class="sn-badge lime">Playoffs</span>{/if}
                                </div>

                                {#snippet gameCard(g)}
                                        <div
                                                class="game-card"
                                                class:highlight={queryMatchup != null && g.matchupId === queryMatchup}
                                                class:open={openKey === gameKey(g)}
                                                use:highlightAction={queryMatchup != null && g.matchupId === queryMatchup}
                                        >
                                                <button
                                                        type="button"
                                                        class="card-toggle"
                                                        aria-expanded={openKey === gameKey(g)}
                                                        on:click={() => toggleGame(g)}
                                                >
                                                        {#each [g.home, g.away] as s, i}
                                                                {#if s}
                                                                        {#if i === 1}<div class="vs">VS</div>{/if}
                                                                        <div class="team-row" class:winner={g.winner === s.rosterId}>
                                                                                <div class="team-info">
                                                                                        <div class="team-owner">{s.ownerName ?? 'Unknown'}</div>
                                                                                        <div class="team-name">{s.teamName}</div>
                                                                                </div>
                                                                                <div class="team-pts">{fmtPts(s.points)}</div>
                                                                        </div>
                                                                {/if}
                                                        {/each}
                                                        <span class="card-hint">{openKey === gameKey(g) ? 'Hide lineups ▲' : 'View lineups ▼'}</span>
                                                </button>

                                                {#if openKey === gameKey(g)}
                                                        {#if detailCache[gameKey(g)]}
                                                                <MatchupDetail detail={detailCache[gameKey(g)]} winner={g.winner} />
                                                        {:else if detailStatus[gameKey(g)]?.error}
                                                                <p class="card-status error">{detailStatus[gameKey(g)].error}</p>
                                                        {:else}
                                                                <p class="card-status">Loading lineups…</p>
                                                        {/if}
                                                {/if}
                                        </div>
                                {/snippet}

                                {#if showBrackets}
                                        {#if champGames.length}
                                                <div class="bracket-group championship">
                                                        <div class="bracket-head">
                                                                <span class="bracket-icon">🏆</span>
                                                                <h3 class="bracket-title">Championship Bracket</h3>
                                                                <span class="bracket-sub">Playing for the title</span>
                                                        </div>
                                                        <div class="games-grid">
                                                                {#each champGames as g}{@render gameCard(g)}{/each}
                                                        </div>
                                                </div>
                                        {/if}
                                        {#if consoGames.length}
                                                <div class="bracket-group consolation">
                                                        <div class="bracket-head">
                                                                <span class="bracket-icon">🎯</span>
                                                                <h3 class="bracket-title">Consolation Bracket</h3>
                                                                <span class="bracket-sub">Playing for pride &amp; final placement</span>
                                                        </div>
                                                        <div class="games-grid">
                                                                {#each consoGames as g}{@render gameCard(g)}{/each}
                                                        </div>
                                                </div>
                                        {/if}
                                {:else}
                                        <div class="games-grid">
                                                {#each activeWeek.games as g}{@render gameCard(g)}{/each}
                                        </div>
                                {/if}
                        {/if}
                {/if}
        </div>
</div>

<style>
        #main {
                position: relative;
                z-index: 1;
        }
        .year-tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 24px;
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

        .week-tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--sn-border);
        }
        .week-tab {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 6px 12px;
                border-radius: 8px;
                border: 1px solid var(--sn-border);
                background: var(--sn-surface-2);
                color: var(--sn-text-mute);
                font-family: monospace;
                font-weight: 700;
                font-size: 0.82rem;
                cursor: pointer;
                transition: all 0.15s ease;
        }
        .week-tab:hover { color: #fff; border-color: var(--sn-text-faint); }
        .week-tab.active {
                background: var(--sn-cyan);
                color: #0a0a0a;
                border-color: var(--sn-cyan);
        }
        .po-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--sn-lime);
        }

        .week-heading {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 18px;
        }
        .week-heading h2 {
                font-size: 1.4rem;
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                color: #fff;
                margin: 0;
        }

        .bracket-group { margin-bottom: 32px; }
        .bracket-head {
                display: flex;
                align-items: baseline;
                gap: 12px;
                margin-bottom: 14px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--sn-border);
        }
        .bracket-icon { font-size: 1.1rem; line-height: 1; }
        .bracket-title {
                font-size: 1.05rem;
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: 0.02em;
                margin: 0;
                color: #fff;
        }
        .bracket-sub {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: var(--sn-text-faint);
                font-weight: 700;
        }
        .bracket-group.championship .bracket-head { border-bottom-color: var(--sn-lime); }
        .bracket-group.championship .bracket-title { color: var(--sn-lime); }
        .bracket-group.consolation .bracket-title { color: var(--sn-text-dim); }

        .games-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 16px;
        }
        .game-card {
                background: var(--sn-surface);
                border: 1px solid var(--sn-border);
                border-radius: 14px;
                padding: 16px 18px;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
                align-self: start;
        }
        .game-card.highlight {
                border-color: var(--sn-lime);
                box-shadow: 0 0 0 1px var(--sn-lime), 0 0 24px -8px var(--sn-lime);
        }
        .game-card.open {
                border-color: var(--sn-text-faint);
        }
        .card-toggle {
                display: flex;
                flex-direction: column;
                gap: 4px;
                width: 100%;
                background: none;
                border: none;
                padding: 0;
                margin: 0;
                text-align: inherit;
                cursor: pointer;
                color: inherit;
                font: inherit;
        }
        .card-hint {
                margin-top: 8px;
                text-align: center;
                font-family: monospace;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--sn-text-faint);
                transition: color 0.15s ease;
        }
        .card-toggle:hover .card-hint { color: var(--sn-cyan); }
        .card-status {
                margin: 12px 0 2px;
                text-align: center;
                font-size: 0.85rem;
                color: var(--sn-text-faint);
        }
        .card-status.error { color: #f8718c; }
        .team-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 4px;
        }
        .team-info { min-width: 0; }
        .team-owner { font-weight: 800; color: var(--sn-text-mute); font-size: 0.95rem; }
        .team-name {
                font-size: 12px;
                color: var(--sn-text-faint);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
        }
        .team-pts {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.3rem;
                color: var(--sn-text-dim);
        }
        .team-row.winner .team-owner { color: #fff; }
        .team-row.winner .team-pts { color: var(--sn-lime); }
        .vs {
                text-align: center;
                font-family: monospace;
                font-weight: 700;
                font-size: 11px;
                color: var(--sn-text-faint);
                letter-spacing: 0.1em;
                margin: 2px 0;
        }
</style>
