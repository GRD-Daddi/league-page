<script>
        import { goto } from '$app/navigation';

        export let data;

        $: owners = data?.owners ?? [];
        $: teamA = data?.teamA ?? null;
        $: teamB = data?.teamB ?? null;
        $: h2h = data?.h2h ?? null;
        $: summary = h2h?.summary ?? null;
        $: meetings = (h2h?.meetings ?? []).slice().reverse();
        $: sameTeam = teamA && teamB && teamA === teamB;
        $: hasTeams = owners.length >= 2;

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

        function onA(e) {
                navigate(e.target.value, teamB);
        }
        function onB(e) {
                navigate(teamA, e.target.value);
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
                        <div class="rivalry-selectors">
                                <select class="sn-select" value={teamA} on:change={onA} aria-label="Select first manager">
                                        {#each owners as o}
                                                <option value={o.owner}>{o.ownerName}</option>
                                        {/each}
                                </select>
                                <div class="vs-pill">VS</div>
                                <select class="sn-select" value={teamB} on:change={onB} aria-label="Select second manager">
                                        {#each owners as o}
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

                                        <div class="sn-section-header" style="margin-top:56px;">
                                                <h2 class="sn-section-title">
                                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                                                        Every Meeting
                                                </h2>
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
                                                                        {#each meetings as m}
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
        .rivalry-selectors {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                flex-wrap: wrap;
        }
        .rivalry-selectors .sn-select { min-width: 220px; }

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
