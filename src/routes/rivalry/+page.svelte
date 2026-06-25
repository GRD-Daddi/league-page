<script>
        import { goto } from '$app/navigation';

        export let data;

        $: owners = data?.owners ?? [];
        $: teamA = data?.teamA ?? null;
        $: teamB = data?.teamB ?? null;
        $: rivals = data?.rivals ?? null;
        $: rivalAwards = rivals?.awards ?? [];
        $: mainName = nameFor(teamA);
        $: opponents = owners.filter((o) => o.owner !== teamA);
        $: h2h = data?.h2h ?? null;
        $: summary = h2h?.summary ?? null;
        $: meetings = (h2h?.meetings ?? []).slice().reverse();
        $: sameTeam = teamA && teamB && teamA === teamB;
        $: hasTeams = owners.length >= 2;

        const MEETING_PREVIEW = 5;
        let showAllMeetings = false;
        // Collapse the meeting log back to a preview whenever the opponent changes.
        $: teamB, (showAllMeetings = false);
        $: visibleMeetings = showAllMeetings ? meetings : meetings.slice(0, MEETING_PREVIEW);

        $: nameFor = (key) => owners.find((o) => o.owner === key)?.ownerName ?? key;
        $: displayA = h2h?.teamAName ?? nameFor(teamA);
        $: displayB = h2h?.teamBName ?? nameFor(teamB);

        const initials = (name) =>
                (name || '?')
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase() || '?';

        const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

        function navigate(a, b) {
                const params = new URLSearchParams();
                if (a) params.set('team_a', a);
                if (b) params.set('team_b', b);
                goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
        }

        function onMain(e) {
                const a = e.target.value;
                // If the new main team is also the current opponent, bump the opponent to
                // the first available other manager so the comparison stays valid.
                const b = teamB === a ? (owners.find((o) => o.owner !== a)?.owner ?? null) : teamB;
                navigate(a, b);
        }
        function onB(e) {
                navigate(teamA, e.target.value);
        }

        function openRival(opponentOwner) {
                if (teamA && opponentOwner) navigate(teamA, opponentOwner);
        }
</script>

<svelte:head>
        <title>Rivalry Week | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">Head To Head</span>
                        <h1 class="sn-pagetitle"><span class="accent">RIVALRY</span> WEEK</h1>
                        <p class="sn-pagesub">
                                Pick two teams and settle the score. Every meeting across league history, tallied head-to-head.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                {#if !hasTeams}
                        <div class="sn-empty">
                                <div class="sn-empty-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                                <h3>Not Enough History Yet</h3>
                                <p>Once at least two seasons of games are in the archive, you'll be able to pit teams against each other here.</p>
                        </div>
                {:else}
                        <div class="main-team-bar">
                                <span class="main-team-label">Main team</span>
                                <select class="sn-select" value={teamA} on:change={onMain} aria-label="Select main team">
                                        {#each owners as o}
                                                <option value={o.owner}>{o.ownerName}</option>
                                        {/each}
                                </select>
                                <span class="main-team-hint">Drives every metric below</span>
                        </div>

                        {#if rivalAwards.length}
                                <div class="sn-section-header" style="margin-bottom:20px;">
                                        <h2 class="sn-section-title">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ccff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                                                {rivals?.ownerName ? `${rivals.ownerName}'s Rivals` : 'Rivals'}
                                        </h2>
                                        <p class="sn-section-sub">{mainName}'s personal hall of heroes and villains across league history. Tap any card for the full series.</p>
                                </div>

                                <div class="rival-grid">
                                        {#each rivalAwards as a}
                                                <button type="button" class="sn-card rival-card rival-{a.key}" on:click={() => openRival(a.owner)} title={a.tagline}>
                                                        <span class="rival-emoji">{a.emoji}</span>
                                                        <span class="rival-body">
                                                                <span class="rival-title">{a.title}</span>
                                                                <span class="rival-line">
                                                                        <span class="rival-owner">{a.ownerName}</span>
                                                                        <span class="rival-stat">{a.stat}</span>
                                                                </span>
                                                                <span class="rival-sub">{a.sub}</span>
                                                        </span>
                                                </button>
                                        {/each}
                                </div>

                                <div class="sn-section-header" style="margin-top:40px;margin-bottom:20px;">
                                        <h2 class="sn-section-title">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                                Settle The Score
                                        </h2>
                                        <p class="sn-section-sub">{mainName} vs anyone — pick an opponent to see every head-to-head meeting.</p>
                                </div>
                        {/if}

                        <div class="rivalry-selectors">
                                <div class="main-fixed" aria-label="Main team">
                                        <span class="main-fixed-tag">Main</span>
                                        <span class="main-fixed-name">{mainName}</span>
                                </div>
                                <div class="vs-pill">VS</div>
                                <select class="sn-select" value={teamB} on:change={onB} aria-label="Select opponent">
                                        {#each opponents as o}
                                                <option value={o.owner}>{o.ownerName}</option>
                                        {/each}
                                </select>
                        </div>

                        {#if sameTeam}
                                <div class="sn-empty" style="margin-top:32px;">
                                        <h3>Pick Two Different Teams</h3>
                                        <p>A team can't have a rivalry with itself. Choose another opponent above.</p>
                                </div>
                        {:else}
                                <div class="matchup">
                                        <div class="sn-card sn-card-gradient sn-card-pad team-card cyan">
                                                <div class="sn-avatar xl">{initials(displayA)}</div>
                                                <div class="team-name">{displayA}</div>
                                                <div class="team-record">{summary?.winsA ?? 0}</div>
                                                <div class="team-record-label">Wins</div>
                                        </div>

                                        <div class="vs-divider">
                                                <div class="vs-circle">VS</div>
                                        </div>

                                        <div class="sn-card sn-card-gradient sn-card-pad team-card purple">
                                                <div class="sn-avatar xl">{initials(displayB)}</div>
                                                <div class="team-name">{displayB}</div>
                                                <div class="team-record">{summary?.winsB ?? 0}</div>
                                                <div class="team-record-label">Wins</div>
                                        </div>
                                </div>

                                {#if summary && summary.games > 0}
                                        <div class="sn-stat-grid" style="margin-top:36px;">
                                                <div class="sn-stat">
                                                        <div class="sn-stat-label">All-Time Series</div>
                                                        <div class="sn-stat-value lime">{summary.winsA}-{summary.winsB}{summary.ties ? `-${summary.ties}` : ''}</div>
                                                        <div class="sn-stat-meta">{summary.games} meeting{summary.games === 1 ? '' : 's'}</div>
                                                </div>
                                                <div class="sn-stat">
                                                        <div class="sn-stat-label">Avg Score ({displayA})</div>
                                                        <div class="sn-stat-value cyan">{fmt(summary.avgA)}</div>
                                                        <div class="sn-stat-meta">{fmt(summary.totalA)} total</div>
                                                </div>
                                                <div class="sn-stat">
                                                        <div class="sn-stat-label">Avg Score ({displayB})</div>
                                                        <div class="sn-stat-value purple">{fmt(summary.avgB)}</div>
                                                        <div class="sn-stat-meta">{fmt(summary.totalB)} total</div>
                                                </div>
                                        </div>

                                        <div class="sn-section-header" style="margin-top:40px;">
                                                <h2 class="sn-section-title">
                                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                                                        Every Meeting
                                                </h2>
                                                <span class="sn-badge">{meetings.length} game{meetings.length === 1 ? '' : 's'}</span>
                                        </div>

                                        <div class="sn-card">
                                                <div style="overflow-x:auto;">
                                                        <table class="sn-table">
                                                                <thead>
                                                                        <tr>
                                                                                <th>Season</th>
                                                                                <th class="center">Week</th>
                                                                                <th class="right">{displayA}</th>
                                                                                <th class="right">{displayB}</th>
                                                                                <th class="center">Winner</th>
                                                                        </tr>
                                                                </thead>
                                                                <tbody>
                                                                        {#each visibleMeetings as m}
                                                                                <tr>
                                                                                        <td class="sn-num">{m.year}{m.isPlayoffs ? ' 🏆' : ''}</td>
                                                                                        <td class="center sn-num">{m.week}</td>
                                                                                        <td class="right sn-num" class:lime={m.pointsA > m.pointsB}>{fmt(m.pointsA)}{#if m.teamAName}<div class="h2h-team">{m.teamAName}</div>{/if}</td>
                                                                                        <td class="right sn-num" class:lime={m.pointsB > m.pointsA}>{fmt(m.pointsB)}{#if m.teamBName}<div class="h2h-team">{m.teamBName}</div>{/if}</td>
                                                                                        <td class="center sn-team-name">
                                                                                                {m.pointsA === m.pointsB ? 'Tie' : m.pointsA > m.pointsB ? displayA : displayB}
                                                                                        </td>
                                                                                </tr>
                                                                        {/each}
                                                                </tbody>
                                                        </table>
                                                </div>
                                                {#if meetings.length > MEETING_PREVIEW}
                                                        <button type="button" class="meetings-toggle" on:click={() => (showAllMeetings = !showAllMeetings)}>
                                                                {showAllMeetings ? 'Show less' : `Show all ${meetings.length} meetings`}
                                                        </button>
                                                {/if}
                                        </div>
                                {:else}
                                        <div class="sn-empty" style="margin-top:36px;">
                                                <h3>No Meetings On Record</h3>
                                                <p>{displayA} and {displayB} haven't faced off in any archived season yet.</p>
                                        </div>
                                {/if}
                        {/if}
                {/if}
        </div>
</div>

<style>
        .main-team-bar {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                padding: 14px 18px;
                margin-bottom: 28px;
                border: 1px solid var(--sn-border);
                border-radius: 12px;
                background: var(--sn-surface-2);
        }
        .main-team-label {
                font-size: 11px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--sn-text-faint);
        }
        .main-team-bar .sn-select { min-width: 200px; }
        .main-team-hint {
                font-size: 12px;
                color: var(--sn-text-faint);
                font-style: italic;
        }

        .rivalry-selectors {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                flex-wrap: wrap;
        }
        .rivalry-selectors .sn-select { min-width: 220px; }
        .main-fixed {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                min-width: 220px;
                padding: 0 16px;
                height: 44px;
                border: 1px solid rgba(0, 240, 255, 0.45);
                border-radius: 10px;
                background: var(--sn-surface-3);
        }
        .main-fixed-tag {
                font-size: 10px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: #0f1115;
                background: var(--sn-cyan, #00f0ff);
                padding: 2px 7px;
                border-radius: 999px;
        }
        .main-fixed-name {
                font-weight: 800;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
        }

        .sn-section-sub {
                margin: 6px 0 0;
                font-size: 0.9rem;
                color: var(--sn-text-faint);
                max-width: 640px;
        }

        .rival-grid {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 16px;
        }

        .rival-card {
                flex: 1 1 280px;
                max-width: 360px;
                position: relative;
                display: grid;
                grid-template-columns: auto 1fr;
                align-items: center;
                gap: 14px;
                padding: 14px 16px;
                text-align: left;
                cursor: pointer;
                border: 1px solid var(--sn-border);
                background: var(--sn-surface-2);
                transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
                font: inherit;
                color: inherit;
        }
        .rival-card:hover {
                transform: translateY(-2px);
                border-color: rgba(204, 255, 0, 0.5);
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
        }
        .rival-card:focus-visible {
                outline: 2px solid var(--sn-lime);
                outline-offset: 2px;
        }

        .rival-emoji {
                font-size: 1.75rem;
                line-height: 1;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                background: var(--sn-surface-3);
                border: 1px solid var(--sn-border);
        }

        .rival-body {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
        }
        .rival-title {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-size: 0.72rem;
                color: var(--sn-lime);
        }
        .rival-line {
                display: flex;
                align-items: baseline;
                gap: 8px;
                flex-wrap: wrap;
        }
        .rival-owner {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                font-size: 1.05rem;
                color: #fff;
                line-height: 1.1;
        }
        .rival-stat {
                font-family: monospace;
                font-weight: 900;
                font-size: 0.92rem;
                color: var(--sn-cyan, #00f0ff);
        }
        .rival-sub {
                font-size: 10px;
                color: var(--sn-text-faint);
                margin-top: 1px;
        }

        .meetings-toggle {
                width: 100%;
                padding: 12px;
                background: transparent;
                border: none;
                border-top: 1px solid var(--sn-border);
                color: var(--sn-cyan, #00f0ff);
                font: inherit;
                font-size: 12px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                cursor: pointer;
                transition: background 0.12s ease;
        }
        .meetings-toggle:hover { background: var(--sn-surface-3); }

        .rival-card.rival-nemesis .rival-title,
        .rival-card.rival-kryptonite .rival-title { color: #ff5470; }
        .rival-card.rival-nemesis .rival-stat,
        .rival-card.rival-kryptonite .rival-stat,
        .rival-card.rival-heartbreaker .rival-stat { color: #ff5470; }

        .h2h-team {
                font-family: inherit;
                font-weight: 600;
                font-size: 10px;
                color: var(--sn-text-faint);
                margin-top: 2px;
                max-width: 160px;
                margin-left: auto;
                white-space: normal;
        }

        .vs-pill {
                font-weight: 900;
                font-style: italic;
                font-size: 1.1rem;
                color: var(--sn-lime);
                letter-spacing: 0.05em;
        }

        .matchup {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                gap: 20px;
                margin-top: 36px;
        }

        .team-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
        }
        .team-card.cyan { border-color: rgba(0,240,255,0.35); }
        .team-card.purple { border-color: rgba(112,0,255,0.4); }
        .team-card .sn-avatar { margin-bottom: 16px; }
        .team-card.cyan .sn-avatar { border-color: rgba(0,240,255,0.5); }
        .team-card.purple .sn-avatar { border-color: rgba(112,0,255,0.55); }

        .team-name {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-size: 1.3rem;
                color: #fff;
        }

        .team-record {
                font-family: monospace;
                font-size: 2.4rem;
                font-weight: 900;
                color: #fff;
                margin-top: 18px;
        }

        .team-record-label {
                font-size: 10px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: var(--sn-text-faint);
                margin-top: 6px;
        }

        .vs-divider { display: flex; align-items: center; justify-content: center; }

        .vs-circle {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: var(--sn-surface-3);
                border: 2px solid var(--sn-border);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-style: italic;
                font-size: 1.2rem;
                color: var(--sn-lime);
                box-shadow: 0 0 24px rgba(204,255,0,0.12);
        }

        @media (max-width: 700px) {
                .matchup { grid-template-columns: 1fr; }
                .vs-divider { padding: 8px 0; }
                .rivalry-selectors .sn-select { min-width: 0; width: 100%; }
        }
</style>
