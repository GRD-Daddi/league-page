<script>
        import { leagueName } from '$lib/utils/leagueInfo';
        export let data;
        $: careers = data?.careers ?? [];

        function initials(name) {
                return (
                        (name ?? '??')
                                .split(' ')
                                .filter(Boolean)
                                .map((w) => w[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || '??'
                );
        }

        const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
        const fmt0 = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }));
</script>

<svelte:head>
        <title>The Managers | {leagueName}</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <div class="sn-eyebrow">{leagueName}</div>
                        <h1 class="sn-pagetitle">THE <span class="accent">MANAGERS</span></h1>
                        <p class="sn-pagesub">
                                The franchises behind the dynasty. Every team's all-time résumé across league history — click in for the full story.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                {#if careers.length}
                        <div class="sn-grid-3">
                                {#each careers as c}
                                        <a class="sn-card sn-card-pad manager-card" href={`/manager?owner=${encodeURIComponent(c.owner)}`}>
                                                <div class="manager-top">
                                                        <div class="sn-avatar xl">{initials(c.ownerName)}</div>
                                                        {#if c.titles > 0}
                                                                <span class="sn-badge lime commish">{c.titles}× Champ</span>
                                                        {/if}
                                                </div>

                                                <div class="manager-name-block">
                                                        <div class="sn-team-name">{c.ownerName}</div>
                                                        <div class="sn-team-meta">{c.seasons} season{c.seasons === 1 ? '' : 's'} · best finish #{c.bestFinish ?? '—'}{c.latestTeam ? ' · ' + c.latestTeam : ''}</div>
                                                </div>

                                                <div class="manager-stats">
                                                        <div class="manager-stat">
                                                                <div class="manager-stat-label">All-Time</div>
                                                                <div class="sn-num cyan">{c.wins}-{c.losses}{c.ties ? `-${c.ties}` : ''}</div>
                                                        </div>
                                                        <div class="manager-stat">
                                                                <div class="manager-stat-label">Win %</div>
                                                                <div class="sn-num lime">{pct(c.winPct)}</div>
                                                        </div>
                                                        <div class="manager-stat">
                                                                <div class="manager-stat-label">Points For</div>
                                                                <div class="sn-num">{fmt0(c.pointsFor)}</div>
                                                        </div>
                                                        <div class="manager-stat">
                                                                <div class="manager-stat-label">Podiums</div>
                                                                <div class="sn-num purple">{c.podiums}</div>
                                                        </div>
                                                </div>

                                                <div class="manager-cta">
                                                        View Profile
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                                                </div>
                                        </a>
                                {/each}
                        </div>
                {:else}
                        <div class="sn-empty">
                                <h3>No Manager History Yet</h3>
                                <p>Career profiles will appear here once at least one season is archived.</p>
                        </div>
                {/if}
        </div>
</div>

<style>
        .manager-card {
                display: flex;
                flex-direction: column;
                gap: 16px;
                text-decoration: none;
                color: inherit;
                transition: border-color 0.15s, transform 0.15s;
        }
        a.manager-card:hover {
                border-color: var(--sn-cyan);
                transform: translateY(-2px);
        }
        a.manager-card:hover .sn-team-name {
                color: var(--sn-cyan);
        }

        .manager-top {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
        }
        .commish {
                flex-shrink: 0;
        }

        .manager-name-block {
                min-width: 0;
        }
        .manager-card .sn-team-name {
                font-size: 1.15rem;
        }

        .manager-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px 12px;
                border-top: 1px solid var(--sn-border);
                padding-top: 16px;
                margin-top: auto;
        }
        .manager-stat-label {
                font-size: 10px;
                font-weight: 900;
                color: var(--sn-text-mute);
                text-transform: uppercase;
                letter-spacing: 0.14em;
                margin-bottom: 6px;
        }

        .manager-cta {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--sn-cyan);
        }
</style>
