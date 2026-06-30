<script>
        import { leagueName } from '$lib/utils/leagueInfo';
        import { goto } from '$app/navigation';
        import { page as pageStore } from '$app/stores';
        import { TransactionsPage } from '$lib/components';

        export let data;

        $: years = data?.years ?? [];
        $: selectedYear = data?.selectedYear;
        $: isLive = data?.isLive;
        $: show = data?.show;
        $: query = data?.query;
        $: queryPage = data?.page;
        $: playersData = data?.playersData;
        $: transactions = data?.transactions ?? [];
        $: leagueTeamManagers = data?.leagueTeamManagersData ?? {};

        const perPage = 10;

        function selectYear(y) {
                const params = new URLSearchParams($pageStore.url.searchParams);
                params.set('year', y);
                params.delete('page');
                goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
        }
</script>

<svelte:head>
        <title>Trades &amp; Waivers | {leagueName}</title>
</svelte:head>

<style>
        #main {
                position: relative;
                z-index: 1;
                display: block;
                margin: 30px auto;
                width: 95%;
                max-width: 1000px;
                overflow-y: hidden;
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
</style>

<div id="main">
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

        {#key selectedYear}
                <TransactionsPage
                        playersInfo={playersData}
                        {transactions}
                        {show}
                        {query}
                        queryPage={queryPage}
                        year={selectedYear}
                        {perPage}
                        postUpdate={true}
                        {leagueTeamManagers}
                />
        {/key}
</div>
