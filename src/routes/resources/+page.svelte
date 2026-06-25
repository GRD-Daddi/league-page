<script>
        import LinearProgress from '$lib/LinearProgress.svelte';

        export let data;
        const articlesData = data.articlesData;

        const links = [
                {
                        name: 'FantasyPros',
                        desc: 'Rankings, projections & expert consensus advice.',
                        url: 'https://www.fantasypros.com/nfl/',
                        accent: 'cyan'
                },
                {
                        name: 'Yahoo Fantasy',
                        desc: 'Manage your Minnesota Slopes team on Yahoo.',
                        url: 'https://football.fantasysports.yahoo.com/',
                        accent: 'purple'
                },
                {
                        name: 'Sleeper',
                        desc: 'News, trends & player research.',
                        url: 'https://sleeper.com/',
                        accent: 'lime'
                },
                {
                        name: 'ESPN Fantasy',
                        desc: 'Analysis, injury news & player updates.',
                        url: 'https://www.espn.com/fantasy/football/',
                        accent: 'cyan'
                },
                {
                        name: 'Pro Football Reference',
                        desc: 'Historical stats & advanced metrics.',
                        url: 'https://www.pro-football-reference.com/',
                        accent: 'purple'
                },
                {
                        name: 'NFL.com',
                        desc: 'Official scores, schedules & news.',
                        url: 'https://www.nfl.com/',
                        accent: 'lime'
                }
        ];
</script>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <div class="sn-eyebrow">Minnesota Slopes</div>
                        <h1 class="sn-pagetitle">LEAGUE <span class="accent">RESOURCES</span></h1>
                        <p class="sn-pagesub">
                                Everything you need to dominate your draft and run your roster — plus the latest fantasy
                                football headlines.
                        </p>
                </div>
        </div>

        <div class="sn-container">
                <!-- Useful links -->
                <div class="sn-section-header">
                        <h2 class="sn-section-title">
                                <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#00f0ff"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
                                                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                                        /></svg
                                >
                                Useful Links
                        </h2>
                </div>

                <div class="sn-grid-3" style="margin-bottom:56px;">
                        {#each links as link}
                                <a class="sn-card sn-card-pad link-card" href={link.url} target="_blank" rel="noreferrer">
                                        <div class="link-top">
                                                <span class="sn-badge {link.accent}">{link.name}</span>
                                                <svg
                                                        class="link-arrow"
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2.5"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        ><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg
                                                >
                                        </div>
                                        <p class="link-desc">{link.desc}</p>
                                </a>
                        {/each}
                </div>

                <!-- News feed -->
                <div class="sn-section-header">
                        <h2 class="sn-section-title">
                                <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#ccff00"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        ><path
                                                d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"
                                        /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg
                                >
                                Fantasy News
                        </h2>
                </div>

                {#await articlesData}
                        <div class="sn-loading">
                                <p>Retrieving fantasy news...</p>
                                <LinearProgress indeterminate />
                        </div>
                {:then news}
                        {@const articles = news?.articles ?? []}
                        {#if articles.length}
                                <div class="news-list">
                                        {#each articles.slice(0, 24) as article}
                                                <svelte:element
                                                        this={article.link ? 'a' : 'div'}
                                                        href={article.link || undefined}
                                                        target={article.link ? '_blank' : undefined}
                                                        rel={article.link ? 'noreferrer' : undefined}
                                                        class="sn-card news-card"
                                                >
                                                        <div class="news-icon">
                                                                {#if article.icon}
                                                                        <img src={article.icon} alt="" />
                                                                {:else}
                                                                        <svg
                                                                                width="20"
                                                                                height="20"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="#00f0ff"
                                                                                stroke-width="2"
                                                                                stroke-linecap="round"
                                                                                stroke-linejoin="round"
                                                                                ><path
                                                                                        d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z"
                                                                                /><path d="M18 14h-8" /><path d="M15 18h-5" /></svg
                                                                        >
                                                                {/if}
                                                        </div>
                                                        <div class="news-body">
                                                                <div class="news-title">{article.title}</div>
                                                                <div class="news-meta">
                                                                        {#if article.author}<span class="news-source">{article.author}</span>{/if}
                                                                        {#if article.date}<span class="news-date">{article.date}</span>{/if}
                                                                </div>
                                                        </div>
                                                        {#if article.link}
                                                                <svg
                                                                        class="news-arrow"
                                                                        width="16"
                                                                        height="16"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        stroke-width="2.5"
                                                                        stroke-linecap="round"
                                                                        stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg
                                                                >
                                                        {/if}
                                                </svelte:element>
                                        {/each}
                                </div>
                        {:else}
                                <div class="sn-empty">
                                        <h3>No News Right Now</h3>
                                        <p>Fantasy headlines will appear here as soon as they're available.</p>
                                </div>
                        {/if}
                {:catch error}
                        <div class="sn-empty">
                                <h3>Couldn't Load News</h3>
                                <p>{error.message}</p>
                        </div>
                {/await}
        </div>
</div>

<style>
        .link-card {
                display: flex;
                flex-direction: column;
                gap: 14px;
                text-decoration: none;
                color: inherit;
                transition: border-color 0.15s, transform 0.15s;
        }
        .link-card:hover {
                border-color: var(--sn-cyan);
                transform: translateY(-2px);
        }
        .link-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
        }
        .link-arrow {
                color: var(--sn-text-mute);
                transition: color 0.15s;
        }
        .link-card:hover .link-arrow {
                color: var(--sn-cyan);
        }
        .link-desc {
                margin: 0;
                color: var(--sn-text-dim);
                font-size: 0.9rem;
                line-height: 1.5;
        }

        .news-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
        }
        .news-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 20px;
                text-decoration: none;
                color: inherit;
                transition: border-color 0.15s, background 0.15s;
        }
        a.news-card:hover {
                border-color: var(--sn-cyan);
                background: var(--sn-surface-3);
        }
        .news-icon {
                width: 44px;
                height: 44px;
                border-radius: 8px;
                overflow: hidden;
                flex-shrink: 0;
                background: var(--sn-surface-3);
                border: 1px solid var(--sn-border);
                display: flex;
                align-items: center;
                justify-content: center;
        }
        .news-icon img {
                width: 100%;
                height: 100%;
                object-fit: cover;
        }
        .news-body {
                flex: 1;
                min-width: 0;
        }
        .news-title {
                font-weight: 700;
                color: #fff;
                font-size: 0.98rem;
                line-height: 1.35;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
        }
        a.news-card:hover .news-title {
                color: var(--sn-cyan);
        }
        .news-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 6px 12px;
                margin-top: 6px;
        }
        .news-source {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--sn-text-mute);
        }
        .news-date {
                font-size: 11px;
                color: var(--sn-text-faint);
                font-style: italic;
        }
        .news-arrow {
                color: var(--sn-text-mute);
                flex-shrink: 0;
        }
</style>
