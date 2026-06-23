<script>
        export let data;
        const { leagueTeamManagerData, playerOne, playerTwo } = data;

        const teams = Object.values(leagueTeamManagerData || {});
        const hasTeams = teams.length >= 2;

        const teamName = (t) => t?.metadata?.team_name || t?.display_name || t?.username || 'Unknown Team';
        const managerName = (t) => t?.metadata?.manager_nickname || null;

        const initials = (name) =>
                (name || '?')
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase() || '?';

        let oneId = playerOne || teams[0]?.user_id || '';
        let twoId = playerTwo || teams[1]?.user_id || '';

        $: teamA = leagueTeamManagerData?.[oneId];
        $: teamB = leagueTeamManagerData?.[twoId];
        $: sameTeam = oneId && twoId && oneId === twoId;
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
                                Pick two teams and settle the score. All-time matchup history will light
                                up here once the games start being played.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                {#if !hasTeams}
                        <div class="sn-empty">
                                <div class="sn-empty-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </div>
                                <h3>No Teams Available</h3>
                                <p>Once your league roster loads, you'll be able to pit teams against each other here.</p>
                        </div>
                {:else}
                        <!-- SELECTORS -->
                        <div class="rivalry-selectors">
                                <select class="sn-select" bind:value={oneId} aria-label="Select first team">
                                        {#each teams as t}
                                                <option value={t.user_id}>{teamName(t)}</option>
                                        {/each}
                                </select>
                                <div class="vs-pill">VS</div>
                                <select class="sn-select" bind:value={twoId} aria-label="Select second team">
                                        {#each teams as t}
                                                <option value={t.user_id}>{teamName(t)}</option>
                                        {/each}
                                </select>
                        </div>

                        {#if sameTeam}
                                <div class="sn-empty" style="margin-top:32px;">
                                        <h3>Pick Two Different Teams</h3>
                                        <p>A team can't have a rivalry with itself. Choose another opponent above.</p>
                                </div>
                        {:else}
                                <!-- TEAM CARDS -->
                                <div class="matchup">
                                        <div class="sn-card sn-card-gradient sn-card-pad team-card cyan">
                                                <div class="sn-avatar xl">
                                                        {#if teamA?.avatar}
                                                                <img src={teamA.avatar} alt={teamName(teamA)} />
                                                        {:else}
                                                                {initials(teamName(teamA))}
                                                        {/if}
                                                </div>
                                                <div class="team-name">{teamName(teamA)}</div>
                                                {#if managerName(teamA)}
                                                        <div class="team-manager">{managerName(teamA)}</div>
                                                {/if}
                                                {#if teamA?.metadata?.is_commissioner}
                                                        <span class="sn-badge cyan" style="margin-top:12px;">Commissioner</span>
                                                {/if}
                                                <div class="team-record">— · — · —</div>
                                                <div class="team-record-label">Record Coming Soon</div>
                                        </div>

                                        <div class="vs-divider">
                                                <div class="vs-circle">VS</div>
                                        </div>

                                        <div class="sn-card sn-card-gradient sn-card-pad team-card purple">
                                                <div class="sn-avatar xl">
                                                        {#if teamB?.avatar}
                                                                <img src={teamB.avatar} alt={teamName(teamB)} />
                                                        {:else}
                                                                {initials(teamName(teamB))}
                                                        {/if}
                                                </div>
                                                <div class="team-name">{teamName(teamB)}</div>
                                                {#if managerName(teamB)}
                                                        <div class="team-manager">{managerName(teamB)}</div>
                                                {/if}
                                                {#if teamB?.metadata?.is_commissioner}
                                                        <span class="sn-badge purple" style="margin-top:12px;">Commissioner</span>
                                                {/if}
                                                <div class="team-record">— · — · —</div>
                                                <div class="team-record-label">Record Coming Soon</div>
                                        </div>
                                </div>

                                <!-- H2H HISTORY -->
                                <div class="sn-section-header" style="margin-top:56px;">
                                        <h2 class="sn-section-title">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                                                All-Time Head-to-Head
                                        </h2>
                                </div>

                                <div class="sn-empty">
                                        <div class="sn-empty-icon">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 18h6"/><path d="M9 12h2"/></svg>
                                        </div>
                                        <h3>No Matchups Played Yet</h3>
                                        <p>Head-to-head history between these two teams will appear here once they face off on the field.</p>
                                </div>
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

        .team-manager {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--sn-text-mute);
                margin-top: 6px;
        }

        .team-record {
                font-family: monospace;
                font-size: 1.6rem;
                font-weight: 900;
                color: var(--sn-text-dim);
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
