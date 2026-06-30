<script>
	import { leagueName } from '$lib/utils/leagueInfo';
        export let data;
        $: trophyRoom = data?.trophyRoom ?? [];
        $: titleCounts = data?.titleCounts ?? [];
        $: latest = trophyRoom[0] ?? null;
        $: maxTitles = titleCounts.reduce((m, t) => Math.max(m, t.titles), 0);
        const uniqueTeams = (names) => [...new Set(names ?? [])];

        const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
</script>

<svelte:head>
        <title>Trophy Room | {leagueName}</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">Hall of Champions</span>
                        <h1 class="sn-pagetitle">TROPHY <span class="accent">ROOM</span></h1>
                        <p class="sn-pagesub">
                                Every banner, every trophy, every bragging right. The legends of the
                                {leagueName}, immortalized season by season.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                {#if !trophyRoom.length}
                        <div class="sn-empty" style="margin-top:24px;">
                                <h3>No Seasons Completed Yet</h3>
                                <p>Champions and award winners will be crowned here once the first season wraps up.</p>
                        </div>
                {:else}
                        <!-- REIGNING PODIUM (most recent completed season) -->
                        <div class="sn-section-header">
                                <h2 class="sn-section-title">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ccff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                                        {latest.year} Podium
                                </h2>
                                <span class="sn-badge lime">Reigning</span>
                        </div>

                        <div class="podium">
                                <div class="podium-card">
                                        <div class="sn-card sn-card-gradient sn-card-pad podium-inner">
                                                <div class="place-badge cyan">#2</div>
                                                <div class="podium-title">{latest.runnerUp || '—'}</div>
                                                {#if latest.runnerUpOwner}<div class="podium-owner">{latest.runnerUpOwner}</div>{/if}
                                                <div class="podium-sub">Runner-Up</div>
                                                <div class="podium-status">Silver</div>
                                        </div>
                                </div>
                                <div class="podium-card champ">
                                        <div class="sn-card sn-card-gradient sn-card-pad podium-inner">
                                                <div class="place-badge lime">#1</div>
                                                <div class="podium-title">{latest.champion || '—'}</div>
                                                {#if latest.championOwner}<div class="podium-owner">{latest.championOwner}</div>{/if}
                                                <div class="podium-sub">Champion</div>
                                                <div class="podium-status">{latest.numTeams ? `${latest.numTeams}-team title` : 'League Title'}</div>
                                        </div>
                                </div>
                                <div class="podium-card">
                                        <div class="sn-card sn-card-gradient sn-card-pad podium-inner">
                                                <div class="place-badge purple">#3</div>
                                                <div class="podium-title">{latest.third || '—'}</div>
                                                {#if latest.thirdOwner}<div class="podium-owner">{latest.thirdOwner}</div>{/if}
                                                <div class="podium-sub">Third Place</div>
                                                <div class="podium-status">Bronze</div>
                                        </div>
                                </div>
                        </div>

                        <!-- MOST TITLES -->
                        {#if titleCounts.length}
                                <div class="sn-section-header" style="margin-top:56px;">
                                        <h2 class="sn-section-title">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                                                Most Titles
                                        </h2>
                                </div>
                                <div class="sn-grid-3">
                                        {#each titleCounts as t}
                                                <div class="sn-card award-card" class:leader={t.titles === maxTitles && maxTitles > 1}>
                                                        {#if t.titles === maxTitles && maxTitles > 1}
                                                                <span class="leader-flag">👑 G.O.A.T.</span>
                                                        {/if}
                                                        <div class="award-trophy">
                                                                <span class="award-trophy-icon">🏆</span>
                                                                <span class="award-trophy-count">{t.titles}×</span>
                                                        </div>
                                                        <div class="award-body">
                                                                <div class="award-name">{t.ownerName}</div>
                                                                <div class="award-years">
                                                                        {#each t.years as y}<span class="year-chip">{y}</span>{/each}
                                                                </div>
                                                                {#if uniqueTeams(t.teamNames).length}
                                                                        <div class="award-teams">as {uniqueTeams(t.teamNames).join(' · ')}</div>
                                                                {/if}
                                                        </div>
                                                </div>
                                        {/each}
                                </div>
                        {/if}

                        <!-- SEASON-BY-SEASON -->
                        <div class="sn-section-header" style="margin-top:56px;">
                                <h2 class="sn-section-title">Season By Season</h2>
                        </div>
                        <div class="sn-grid-2">
                                {#each trophyRoom as s}
                                        <a class="sn-card sn-card-pad season-card" href="/standings?year={s.year}">
                                                <div class="season-head">
                                                        <span class="season-year">{s.year}</span>
                                                        <span class="sn-badge">{s.numTeams ? `${s.numTeams} teams` : ''}</span>
                                                </div>
                                                <div class="season-rows">
                                                        <div class="season-row champ-row">
                                                                <span class="rank-tag lime">🏆 Champion</span>
                                                                <span class="team-name" title={s.championOwner ? `Owner: ${s.championOwner}` : ''}>{s.champion || '—'}</span>
                                                        </div>
                                                        <div class="season-row">
                                                                <span class="rank-tag cyan">Runner-Up</span>
                                                                <span class="team-name" title={s.runnerUpOwner ? `Owner: ${s.runnerUpOwner}` : ''}>{s.runnerUp || '—'}</span>
                                                        </div>
                                                        <div class="season-row">
                                                                <span class="rank-tag purple">Third</span>
                                                                <span class="team-name" title={s.thirdOwner ? `Owner: ${s.thirdOwner}` : ''}>{s.third || '—'}</span>
                                                        </div>
                                                        {#if s.pointsLeader}
                                                                <div class="season-row sub-row">
                                                                        <span class="rank-tag muted">Scoring Title</span>
                                                                        <span class="team-name" title={s.pointsLeaderOwner ? `Owner: ${s.pointsLeaderOwner}` : ''}>{s.pointsLeader} <span class="dim">({fmt(s.pointsLeaderPf)})</span></span>
                                                                </div>
                                                        {/if}
                                                        {#if s.woodenSpoon}
                                                                <div class="season-row sub-row">
                                                                        <span class="rank-tag muted">Toilet Bowl</span>
                                                                        <span class="team-name" title={s.woodenSpoonOwner ? `Owner: ${s.woodenSpoonOwner}` : ''}>{s.woodenSpoon}</span>
                                                                </div>
                                                        {/if}
                                                </div>
                                                <span class="season-cta">View {s.year} season →</span>
                                        </a>
                                {/each}
                        </div>
                {/if}
        </div>
</div>

<style>
        .podium {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
                align-items: end;
        }
        .podium-card.champ { transform: translateY(-24px); }
        .podium-inner {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                position: relative;
        }
        .podium-card.champ .podium-inner {
                border-color: rgba(204, 255, 0, 0.4);
                box-shadow: 0 25px 60px rgba(204, 255, 0, 0.12);
        }
        .place-badge {
                position: absolute;
                top: 14px;
                right: 16px;
                font-family: monospace;
                font-weight: 900;
                font-size: 1.1rem;
                color: #4b5563;
        }
        .place-badge.cyan { color: var(--sn-cyan); }
        .place-badge.lime { color: var(--sn-lime); }
        .place-badge.purple { color: #b388ff; }
        .podium-title {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-size: 1.25rem;
                color: #fff;
                margin-top: 8px;
        }
        .podium-card.champ .podium-title { font-size: 1.5rem; }
        .podium-sub {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.14em;
                color: var(--sn-text-mute);
                margin-top: 4px;
        }
        .podium-status {
                margin-top: 16px;
                font-family: monospace;
                font-size: 0.85rem;
                font-weight: 700;
                color: var(--sn-text-dim);
                border-top: 1px dashed var(--sn-border);
                padding-top: 14px;
                width: 100%;
        }
        .award-card {
                position: relative;
                display: grid;
                grid-template-columns: auto 1fr;
                align-items: center;
                gap: 16px;
                padding: 18px;
                overflow: hidden;
        }
        .award-card.leader {
                border-color: rgba(204, 255, 0, 0.45);
                box-shadow: 0 0 30px rgba(204, 255, 0, 0.08);
        }
        .leader-flag {
                position: absolute;
                top: 10px;
                right: 12px;
                font-size: 9px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: var(--sn-lime);
        }
        .award-trophy {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 60px;
                height: 60px;
                border-radius: 16px;
                background: var(--sn-surface-3);
                border: 1px solid var(--sn-border);
                flex-shrink: 0;
        }
        .award-card.leader .award-trophy {
                background: linear-gradient(135deg, rgba(204, 255, 0, 0.18), rgba(204, 255, 0, 0.03));
                border-color: rgba(204, 255, 0, 0.4);
        }
        .award-trophy-icon { font-size: 1.5rem; line-height: 1; }
        .award-trophy-count {
                font-family: monospace;
                font-weight: 900;
                font-size: 0.8rem;
                color: var(--sn-lime);
                margin-top: 3px;
        }
        .award-body { min-width: 0; }
        .award-name {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-size: 1.15rem;
                color: #fff;
        }
        .award-years {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 8px;
        }
        .year-chip {
                font-family: monospace;
                font-size: 10px;
                font-weight: 700;
                color: var(--sn-text-mute);
                background: var(--sn-surface-3);
                border: 1px solid var(--sn-border);
                border-radius: 999px;
                padding: 2px 8px;
        }
        .award-card.leader .year-chip {
                color: var(--sn-lime);
                border-color: rgba(204, 255, 0, 0.3);
        }
        .award-teams {
                font-size: 11px;
                color: var(--sn-text-faint);
                margin-top: 8px;
                line-height: 1.4;
        }
        .season-card {
                display: flex;
                flex-direction: column;
                gap: 14px;
                text-decoration: none;
                color: inherit;
                transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
        }
        .season-card:hover {
                transform: translateY(-3px);
                border-color: rgba(204, 255, 0, 0.5);
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
        }
        .season-card:hover .season-cta { color: var(--sn-lime); }
        .season-cta {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--sn-text-faint);
                text-align: right;
                margin-top: 2px;
                transition: color 0.12s ease;
        }
        .season-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
        }
        .season-year {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.5rem;
                color: #fff;
        }
        .season-rows { display: flex; flex-direction: column; gap: 8px; }
        .season-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 8px 0;
                border-top: 1px dashed var(--sn-border);
        }
        .season-row.champ-row { border-top: none; }
        .season-row.sub-row { opacity: 0.75; }
        .rank-tag {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                white-space: nowrap;
        }
        .rank-tag.lime { color: var(--sn-lime); }
        .rank-tag.cyan { color: var(--sn-cyan); }
        .rank-tag.purple { color: #b388ff; }
        .rank-tag.muted { color: var(--sn-text-faint); }
        .team-name {
                font-weight: 700;
                color: #fff;
                text-align: right;
        }
        .team-name .dim { color: var(--sn-text-mute); font-weight: 600; font-family: monospace; }
        .podium-owner {
                font-size: 12px;
                font-weight: 600;
                color: var(--sn-text-mute);
                margin-top: 4px;
        }

        @media (max-width: 700px) {
                .podium { grid-template-columns: 1fr; align-items: stretch; }
                .podium-card.champ { transform: none; }
                .podium-card.champ .podium-inner { order: -1; }
        }
</style>
