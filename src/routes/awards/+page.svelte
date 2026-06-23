<script>
        export let data;
        const { leagueTeamManagersData } = data;

        const teams = Object.values(leagueTeamManagersData || {});
        const teamCount = teams.length;

        const podium = [
                {
                        place: 2,
                        title: 'Runner-Up',
                        sub: 'Silver Medal',
                        accent: 'cyan',
                        label: 'To Be Decided',
                },
                {
                        place: 1,
                        title: 'Champion',
                        sub: 'League Title',
                        accent: 'lime',
                        label: 'To Be Crowned',
                },
                {
                        place: 3,
                        title: 'Third Place',
                        sub: 'Bronze Medal',
                        accent: 'purple',
                        label: 'To Be Decided',
                },
        ];

        const seasonalAwards = [
                { title: 'Regular Season Champ', meta: 'Best regular-season record', accent: 'lime' },
                { title: 'Scoring Title', meta: 'Most total points for', accent: 'cyan' },
                { title: 'Highest Single Game', meta: 'Top one-week explosion', accent: 'purple' },
                { title: 'Biggest Blowout', meta: 'Largest margin of victory', accent: 'cyan' },
                { title: 'Manager of the Year', meta: 'Smartest moves all season', accent: 'lime' },
                { title: 'Toilet Bowl', meta: 'Last place "honors"', accent: 'purple' },
        ];
</script>

<svelte:head>
        <title>Trophy Room | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">Hall of Champions</span>
                        <h1 class="sn-pagetitle">TROPHY <span class="accent">ROOM</span></h1>
                        <p class="sn-pagesub">
                                Every banner, every trophy, every bragging right. The legends of the
                                Minnesota Slopes will be immortalized here once the season concludes.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                <!-- PODIUM -->
                <div class="sn-section-header">
                        <h2 class="sn-section-title">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ccff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                                The Podium
                        </h2>
                        <span class="sn-badge purple">Season In Progress</span>
                </div>

                <div class="podium">
                        {#each podium as spot}
                                <div class="podium-card {spot.place === 1 ? 'champ' : ''}">
                                        <div class="sn-card sn-card-gradient sn-card-pad podium-inner">
                                                <div class="place-badge {spot.accent}">#{spot.place}</div>
                                                <div class="sn-avatar xl locked {spot.accent}">
                                                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                </div>
                                                <div class="podium-title">{spot.title}</div>
                                                <div class="podium-sub">{spot.sub}</div>
                                                <div class="podium-status">{spot.label}</div>
                                        </div>
                                </div>
                        {/each}
                </div>

                <!-- SEASONAL AWARDS -->
                <div class="sn-section-header" style="margin-top:56px;">
                        <h2 class="sn-section-title">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                                Seasonal Awards
                        </h2>
                </div>

                <div class="sn-grid-3">
                        {#each seasonalAwards as award}
                                <div class="sn-card sn-card-pad award-card">
                                        <div class="award-head">
                                                <span class="sn-badge {award.accent}">Locked</span>
                                                <svg class="award-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                                        </div>
                                        <div class="award-title">{award.title}</div>
                                        <div class="award-meta">{award.meta}</div>
                                        <div class="award-winner">Awaiting a worthy winner</div>
                                </div>
                        {/each}
                </div>

                <div class="sn-empty" style="margin-top:48px;">
                        <div class="sn-empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                        </div>
                        <h3>No Seasons Completed Yet</h3>
                        <p>
                                {#if teamCount}
                                        {teamCount} teams are battling it out. Champions and award winners
                                        will be crowned here once the first season wraps up.
                                {:else}
                                        Awards will populate here once the first season is complete.
                                {/if}
                        </p>
                </div>
        </div>
</div>

<style>
        .podium {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
                align-items: end;
        }

        .podium-card.champ {
                transform: translateY(-24px);
        }

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

        .sn-avatar.locked {
                color: #4b5563;
                margin-bottom: 18px;
        }
        .sn-avatar.locked.cyan { border-color: rgba(0,240,255,0.4); color: var(--sn-cyan); }
        .sn-avatar.locked.lime { border-color: rgba(204,255,0,0.45); color: var(--sn-lime); }
        .sn-avatar.locked.purple { border-color: rgba(112,0,255,0.5); color: #b388ff; }

        .podium-title {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-size: 1.25rem;
                color: #fff;
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

        .award-card { display: flex; flex-direction: column; }

        .award-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
        }

        .award-title {
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: -0.01em;
                font-size: 1.05rem;
                color: #fff;
        }

        .award-meta {
                font-size: 12px;
                color: var(--sn-text-mute);
                margin-top: 6px;
                line-height: 1.5;
        }

        .award-winner {
                margin-top: 16px;
                padding-top: 14px;
                border-top: 1px dashed var(--sn-border);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                color: var(--sn-text-faint);
                font-style: italic;
        }

        @media (max-width: 700px) {
                .podium { grid-template-columns: 1fr; align-items: stretch; }
                .podium-card.champ { transform: none; }
                .podium-card.champ .podium-inner { order: -1; }
        }
</style>
