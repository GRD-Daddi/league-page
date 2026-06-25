
<script>
        import LinearProgress from '$lib/LinearProgress.svelte';
        import MatchupWeeks from './MatchupWeeks.svelte';
        import Brackets from './Brackets.svelte';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { loadPlayers } from '$lib/utils/helper';

        export let queryWeek, leagueTeamManagersData, matchupsData, bracketsData, playersData;

    let players, matchupWeeks, year, week, regularSeasonLength, brackets, leagueTeamManagers;

    let loading = true;

    onMount(async () => {
        brackets = await bracketsData;
        const matchupsInfo = await matchupsData;
        leagueTeamManagers = await leagueTeamManagersData;
        matchupWeeks = matchupsInfo.matchupWeeks;
        year = matchupsInfo.year;
        week = matchupsInfo.week;
        regularSeasonLength = matchupsInfo.regularSeasonLength;
        const playersInfo = await playersData;
        players = playersInfo.players;
        loading = false;

        if(playersInfo.stale) {
            const newPlayersInfo = await loadPlayers(null, true);
            players = newPlayersInfo.players;
        }
    });

    const changeSelection = (s) => {
        if(s == 'regular') {
            queryWeek = 1;
            goto(`/matchups?week=1`, {noscroll: true});
        } else if(selection == 'regular') {
            queryWeek = 99;
            goto(`/matchups?week=99`, {noscroll: true});
        }
        selection = s;
    }

    let selection = 'regular';
</script>

<style>
    .message {
        display: block;
        width: 85%;
        max-width: 500px;
        margin: 80px auto;
    }

    .buttonHolder {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 3em 0;
        gap: 12px;
    }

    .sn-btn-group {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 8px;
    }
</style>



{#if loading}
    <!-- promise is pending -->
    <div class="message">
        <p>Loading league matchups...</p>
        <LinearProgress indeterminate />
    </div>
{:else}
    {#if matchupWeeks.length}
        <div class="buttonHolder">
            <div class="sn-btn-group">
                <!-- Regular Season -->
                <button class="sn-btn ghost selectionButtons" class:active={selection == 'regular'} onclick={() => changeSelection('regular')}>
                    <span>Regular Season</span>
                </button>
                <!-- Championship Bracket -->
                <button class="sn-btn ghost selectionButtons" class:active={selection == 'champions' || selection == 'losers'} onclick={() => changeSelection('champions')}>
                    <span>Playoffs</span>
                </button>
            </div>
            {#if selection == 'champions' || selection == 'losers'}
                <div class="sn-btn-group">
                    <!-- Championship Bracket -->
                    <button class="sn-btn ghost selectionButtons" class:active={selection == 'champions'} onclick={() => changeSelection('champions')}>
                        <span>Champions' Bracket</span>
                    </button>
                    <!-- Losers Bracket -->
                    <button class="sn-btn ghost selectionButtons" class:active={selection == 'losers'} onclick={() => changeSelection('losers')}>
                        <span>Losers' Bracket</span>
                    </button>
                </div>
            {/if}
        </div>
        {#if selection == 'regular'}
            <MatchupWeeks {players} {queryWeek} {matchupWeeks} {regularSeasonLength} {year} {week} bind:selection={selection} {leagueTeamManagers} />
        {/if}
    {:else}
        <div class="message">
            <p>No upcoming matchups...</p>
        </div>
    {/if}
    <!-- {promise has processed -->
    {#if brackets?.champs?.bracket?.[0]?.[0]?.[0]?.points && (selection == 'champions' || selection == 'losers')}
        <Brackets {queryWeek} {leagueTeamManagers} {players} {brackets} bind:selection={selection} />
    {/if}
{/if}