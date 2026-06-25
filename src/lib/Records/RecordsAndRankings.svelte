<script>
    import { generateGraph, gotoManager, round } from '$lib/utils/helper';

        import RecordTeam from './RecordTeam.svelte';
        import BarChart from '$lib/BarChart.svelte';

    export let key, tradesData, waiversData, weekRecords, weekLows, seasonLongRecords, seasonLongLows, showTies, winPercentages, fptsHistories, lineupIQs, prefix, blowouts, closestMatchups, allTime=false, leagueTeamManagers;

    let graphs = [];
    let curTable = 0;
    let curGraph = 0;

    let iqOffset = 0;
    let tables = [
        "Win Percentages",
        "Points",
        "Transactions",
    ]

    const year = allTime ? null : prefix;

    const changeTable = (newGraph) => {
        switch (newGraph) {
            case 0 - iqOffset:
            case (4 + (99 * iqOffset)):
                curTable = 0;
                break;
            case 1 - iqOffset:
            case 2 - iqOffset:
                curTable = 1 - iqOffset;
                break;
            case 3 - iqOffset:
                curTable = 2 - iqOffset;
                break;
            case 5 - (2 * iqOffset):
            case 6 - (2 * iqOffset):
                curTable = 3 - iqOffset;
                break;
            default:
                curTable = 0;
                break;
        }
    }

    const changeGraph = (newTable) => {
        switch (newTable) {
            case 0 - iqOffset:
                if(curGraph == 0 || curGraph == 4) {
                    break;
                }
                curGraph = 0;
                break;
            case 1 - iqOffset:
                if(curGraph == 1 - iqOffset || curGraph == 2 - iqOffset) {
                    break;
                }
                curGraph = 1 - iqOffset;
                break;
            case 2 - iqOffset:
                curGraph = 3 - iqOffset;
                break;
            case 3 - iqOffset:
                if(curGraph == 5 - (2 * iqOffset) || curGraph == 6 - (2 * iqOffset)) {
                    break;
                }
                curGraph = 5 - (2 * iqOffset);
                break;
            default:
                curGraph = 0;
                break;
        }
    }

    const setGraphs = (wD) => {
        const lineupIQGraph = {
            stats: lineupIQs,
            x: "Lineup IQ",
            stat: "%",
            header: "Manager Lineup IQ",
            field: "iq",
            short: "Lineup IQ"
        }

        const potentialPointsGraph = {
            stats: lineupIQs,
            x: "Points",
            stat: "",
            header: "Potential Points vs Points",
            field: "potentialPoints",
            secondField: "fpts",
            short: "Potential Points"
        }

        const winsGraph = {
            stats: winPercentages,
            x: "Wins",
            stat: "",
            header: "Team Wins",
            field: "wins",
            short: "Wins"
        }

        const winPercentagesGraph = {
            stats: winPercentages,
            x: "Win Percentage",
            stat: "%",
            header: "Team Win Percentages",
            field: "percentage",
            short: "Win Percentage"
        }

        const fptsHistoriesGraph = {
            stats: fptsHistories,
            x: "Fantasy Points",
            stat: "",
            header: "Team Fantasy Points",
            field: "fptsFor",
            short: "Fantasy Points"
        }

        const tradesGraph = {
            stats: tradesData,
            x: "# of trades",
            stat: "",
            header: "Number of Trades Managers Have Made",
            field: "trades",
            short: "Trades"
        }

        const waiversGraph = {
            stats: wD,
            x: "# of Waiver Moves",
            stat: "",
            header: "Waivers Moves Managers Have Made",
            field: "waivers",
            short: "Waivers"
        }
        const gs = [];

        if(lineupIQs[0]?.potentialPoints) {
            gs.push(generateGraph(lineupIQGraph, year));
        }
        gs.push(generateGraph(winsGraph, year, 5));
        gs.push(generateGraph(winPercentagesGraph, year));
        gs.push(generateGraph(fptsHistoriesGraph, year));
        if(lineupIQs[0]?.potentialPoints) {
            gs.push(generateGraph(potentialPointsGraph, year, 10, 0));
        }
        if(key == "regularSeasonData") {
            gs.push(generateGraph(tradesGraph, year));
            gs.push(generateGraph(waiversGraph, year));
        }

        curGraph = 0;
        graphs = gs;
    }

    const setTransactionsAndGraphs = (wD) => {
        if(wD[0].rosterID) {
            for(let i = 1; i <= waiversData.length; i++) {
                if(!tradesData.find(t => t.rosterID == i)) {
                    tradesData.push({
                        rosterID: i,
                        trades: 0,
                    })
                }
            }
        }
        if(wD[0].managerID) {
            for(const userID in leagueTeamManagers.users) {
                if(!tradesData.find(t => t.managerID == userID)) {
                    tradesData.push({
                        managerID: userID,
                        trades: 0,
                    })
                }
            }
        }
        const transactions = [];

        for(const w of wD) {
            let trades = 0;
            if(tradesData[0].managerID) {
                trades = tradesData.find(t => t.managerID == w.managerID)?.trades || 0;
            } else if(tradesData[0].rosterID) {
                trades = tradesData.find(t => t.rosterID == w.rosterID)?.trades || 0;
            }
            const waivers = w.waivers;
            transactions.push({
                rosterID: w.rosterID,
                managerID: w.managerID,
                trades,
                waivers,
            })
        }

        setGraphs(wD)
        return transactions;
    }

    const setTables = (lIQs) => {
        const t = [
            "Win Percentages",
            "Points",
        ]
        if(key == "regularSeasonData") {
            t.push("Transactions")
        }
        if(!lIQs[0]?.potentialPoints) {
            iqOffset = 1;
        } else {
            t.unshift('Lineup IQs');
        }
        tables = t
    }

    $: transactions =  setTransactionsAndGraphs(waiversData)
    $: changeTable(curGraph);
    $: changeGraph(curTable);
    $: setTables(lineupIQs)
    
    let innerWidth;

</script>

<svelte:window bind:innerWidth={innerWidth} />

<style>
    :global(.headerPrimary) {
        background-color: var(--headerPrimary);
        text-align: center;
    }

    .italic {
        display: block;
        font-style: italic;
        font-size: 0.9em;
        color: var(--g999);
    }

    :global(.recordTable) {
        box-shadow: 0px 3px 3px -2px var(--boxShadowOne), 0px 3px 4px 0px var(--boxShadowTwo), 0px 1px 8px 0px var(--boxShadowThree);
        margin: 2em;
    }

    :global(.rankingTable) {
        display: table;
        box-shadow: 0px 3px 3px -2px var(--boxShadowOne), 0px 3px 4px 0px var(--boxShadowTwo), 0px 1px 8px 0px var(--boxShadowThree);
        margin: 2em auto 0.5em;
    }

    .fullFlex {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        margin: 3em auto 5em;
    }

    .rankingHolder {
        display: block;
        width: 100%;
        overflow-x: hidden;
    }

    .subTitle {
        font-style: italic;
        font-size: 0.7em;
        color: #888;
        line-height: 1.2em;
    }

    h4 {
        text-align: center;
        margin: 2em 0 1em;
    }

    .rankingTableWrapper {
        width: 25%;
    }

    .rankingInner {
        position: relative;
        display: flex;
        flex-wrap: nowrap;
        width: 400%;
                transition: margin-left 0.8s;
    }

    .buttonHolder {
        text-align: center;
        margin: 2em 0 4em;
    }

    .sn-btn-group { display: inline-flex; flex-wrap: wrap; gap: 8px; }

    :global(.cellName) {
        cursor: pointer;
        line-height: 1.2em;
        padding-left: 8px;
    }

    :global(.differentialName) {
        padding: 0.7em 0;
    }

    :global(.rank) {
        padding-right: 0;
    }

    .vs {
        padding-left: 0.6em;
        margin: 0.5em 0;
    }

    :global(.mdc-data-table__cell, .mdc-data-table__header-cell) {
        border-bottom-color: var(--borderOverride);
    }

    /* Start button resizing */

    @media (max-width: 540px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.6em;
        }
    }

    @media (max-width: 415px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.5em;
            padding: 0 6px;
            height: 30px;
        }
    }

    @media (max-width: 315px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.45em;
            padding: 0 3px;
        }
    }

    @media (max-width: 265px) {
        :global(.buttonHolder .selectionButtons) {
            font-size: 0.4em;
            padding: 0 2px;
            height: 24px;
            min-width: 40px;
        }
    }

    /* End button resizing */

    /* Start record table resizing */

    @media (max-width: 510px) {
        :global(.recordTable th) {
            font-size: 0.8em;
            padding: 1px 12px;
        }
        :global(.recordTable td) {
            font-size: 0.8em;
            padding: 1px 12px;
        }

        .vsRecord {
            margin: .6em 0;
        }
    }

    @media (max-width: 480px) {
        :global(.rank) {
            padding: 1px 0 1px 5px !important;
        }
        :global(.rank) {
            padding: 1px 0 1px 5px !important;
        }
    }

    @media (max-width: 460px) {
        :global(.recordTable th) {
            font-size: 0.6em;
            padding: 1px 12px;
        }
        :global(.recordTable td) {
            font-size: 0.6em;
            padding: 1px 12px;
        }
    }

    @media (max-width: 365px) {
        :global(.recordTable th) {
            font-size: 0.5em;
            padding: 1px 8px;
        }
        :global(.recordTable td) {
            font-size: 0.5em;
            padding: 1px 8px;
        }
    }

    @media (max-width: 265px) {
        :global(.recordTable th) {
            font-size: 0.4em;
            padding: 1px 5px;
        }
        :global(.recordTable td) {
            font-size: 0.4em;
            padding: 1px 5px;
        }
    }

    /* END record table resizing */

    /* Start ranking table resizing */

    @media (max-width: 570px) {
        :global(.rankingTable th) {
            font-size: 0.8em;
            max-width: 110px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
        :global(.rankingTable td) {
            font-size: 0.8em;
            max-width: 110px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
    }

    @media (max-width: 410px) {
        :global(.rankingTable th) {
            font-size: 0.6em;
            max-width: 90px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
        :global(.rankingTable td) {
            font-size: 0.6em;
            max-width: 90px;
            white-space: break-spaces;
            padding: 1px 12px;
        }
    }

    @media (max-width: 340px) {
        :global(.rankingTable th) {
            font-size: 0.55em;
            max-width: 80px;
            white-space: break-spaces;
            padding: 1px 6px;
        }
        :global(.rankingTable td) {
            font-size: 0.55em;
            max-width: 80px;
            white-space: break-spaces;
            padding: 1px 6px;
        }
    }

    /* END ranking table resizing */
</style>

<h4>{prefix} Records</h4>

<div class="fullFlex">
    {#if weekRecords && weekRecords.length}
        <table class="sn-table recordTable">
            <thead>
                <tr class="rTableHeader">
                    <th class="header headerPrimary" colspan="4">{prefix} {key == "playoffData" ? "Playoff " : ""}Single Week Scoring Records</th>
                </tr>
                <tr>
                    <th class="header rank"></th>
                    <th class="header">Manager</th>
                    <th class="header">Week</th>
                    <th class="header">Total Points</th>
                </tr>
            </thead>
            <tbody>
                {#each weekRecords as leagueWeekRecord, ix}
                    <tr>
                        <td class="rank">{ix + 1}</td>
                        <td class="cellName" onclick={() => gotoManager({year: leagueWeekRecord.year || prefix, leagueTeamManagers, rosterID: leagueWeekRecord.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={leagueWeekRecord.rosterID} year={allTime ? leagueWeekRecord.year : prefix} />
                        </td>
                        <td>{allTime ? leagueWeekRecord.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{leagueWeekRecord.week}</td>
                        <td>{round(leagueWeekRecord.fpts)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    {#if weekLows && weekLows.length}
        <table class="sn-table recordTable">
            <thead>
                <tr>
                    <th class="header headerPrimary" colspan="4">{prefix} {key == "playoffData" ? "Playoff " : ""}Single Week Scoring Lows</th>
                </tr>
                <tr>
                    <th class="header rank"></th>
                    <th class="header">Manager</th>
                    <th class="header">Week</th>
                    <th class="header">Total Points</th>
                </tr>
            </thead>
            <tbody>
                {#each weekLows as leagueWeekLow, ix}
                    <tr>
                        <td class="rank">{ix + 1}</td>
                        <td class="cellName" onclick={() => gotoManager({year: leagueWeekLow.year || prefix, leagueTeamManagers, rosterID: leagueWeekLow.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={leagueWeekLow.rosterID} year={allTime ? leagueWeekLow.year : prefix} />
                        </td>
                        <td>{allTime ? leagueWeekLow.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{leagueWeekLow.week}</td>
                        <td>{round(leagueWeekLow.fpts)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    {#if allTime && key == "regularSeasonData"}
        <table class="sn-table recordTable">
            <thead>
                <tr>
                    <th class="header headerPrimary" colspan="5">All-Time Highest Season Points<span class="italic">Ranked by PPG</span></th>
                </tr>
                <tr>
                    <th class="header rank"></th>
                    <th class="header">Manager</th>
                    <th class="header">Year</th>
                    <th class="header">Total Points</th>
                    <th class="header">PPG</th>
                </tr>
            </thead>
            <tbody>
                {#each seasonLongRecords as mostSeasonLongPoint, ix}
                    <tr>
                        <td class="rank">{ix + 1}</td>
                        <td class="cellName" onclick={() => gotoManager({year: mostSeasonLongPoint.year, leagueTeamManagers, rosterID: mostSeasonLongPoint.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={mostSeasonLongPoint.rosterID} year={mostSeasonLongPoint.year} />
                        </td>
                        <td>{mostSeasonLongPoint.year}</td>
                        <td>{round(mostSeasonLongPoint.fpts)}</td>
                        <td>{mostSeasonLongPoint.fptsPerGame}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
    
    {#if allTime && key == "regularSeasonData"}
        <table class="sn-table recordTable">
            <thead>
                <tr>
                    <th class="header headerPrimary" colspan="5">All-Time Lowest Season Points<span class="italic">Ranked by PPG</span></th>
                </tr>
                <tr>
                    <th class="header rank"></th>
                    <th class="header">Manager</th>
                    <th class="header">Year</th>
                    <th class="header">Total Points</th>
                    <th class="header">PPG</th>
                </tr>
            </thead>
            <tbody>
                {#each seasonLongLows as leastSeasonLongPoint, ix}
                    <tr>
                        <td class="rank">{ix + 1}</td>
                        <td class="cellName" onclick={() => gotoManager({year: leastSeasonLongPoint.year, leagueTeamManagers, rosterID: leastSeasonLongPoint.rosterID})}>
                            <RecordTeam {leagueTeamManagers} rosterID={leastSeasonLongPoint.rosterID} year={leastSeasonLongPoint.year} />
                        </td>
                        <td>{leastSeasonLongPoint.year}</td>
                        <td>{round(leastSeasonLongPoint.fpts)}</td>
                        <td>{leastSeasonLongPoint.fptsPerGame}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    {#if blowouts && blowouts.length}
        <table class="sn-table recordTable">
            <thead>
                <tr>
                    <th class="header headerPrimary" colspan="4">{prefix} Largest {key == "playoffData" ? "Playoff " : ""}Blowouts</th>
                </tr>
                <tr>
                    <th class="header rank"></th>
                    <th class="header">Matchup</th>
                    <th class="header">Week</th>
                    <th class="header">Differential</th>
                </tr>
            </thead>
            <tbody>
                {#each blowouts as blowout, ix}
                    <tr>
                        <td class="rank">{ix + 1}</td>
                        <td class="cellName differentialName">
                            <div class="vsRecord">
                                <div onclick={() => gotoManager({year: blowout.year || prefix, leagueTeamManagers, rosterID: blowout.home.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={blowout.home.rosterID} year={allTime ? blowout.year : prefix} compressed={true} points={round(blowout.home.fpts)} />
                                </div>
                                <p class="vs">
                                    vs
                                </p>
                                <div onclick={() => gotoManager({year: blowout.year || prefix, leagueTeamManagers, rosterID: blowout.away.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={blowout.away.rosterID} year={allTime ? blowout.year : prefix} compressed={true} points={round(blowout.away.fpts)} />
                                </div>
                            </div>
                        </td>
                        <td>{allTime ? blowout.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{blowout.week}</td>
                        <td>{round(blowout.differential)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    {#if closestMatchups && closestMatchups.length}
        <table class="sn-table recordTable">
            <thead>
                <tr>
                    <th class="header headerPrimary" colspan="4">{prefix} Narrowest {key == "playoffData" ? "Playoff " : ""}Wins</th>
                </tr>
                <tr>
                    <th class="header rank"></th>
                    <th class="header">Matchup</th>
                    <th class="header">Week</th>
                    <th class="header">Differential</th>
                </tr>
            </thead>
            <tbody>
                {#each closestMatchups as closestMatchup, ix}
                    <tr>
                        <td class="rank">{ix + 1}</td>
                        <td class="cellName differentialName">
                            <div class="vsRecord">
                                <div onclick={() => gotoManager({year: closestMatchup.year || prefix, leagueTeamManagers, rosterID: closestMatchup.home.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={closestMatchup.home.rosterID} year={allTime ? closestMatchup.year : prefix} compressed={true} points={round(closestMatchup.home.fpts)} />
                                </div>
                                <p class="vs">
                                    vs
                                </p>
                                <div onclick={() => gotoManager({year: closestMatchup.year || prefix, leagueTeamManagers, rosterID: closestMatchup.away.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} rosterID={closestMatchup.away.rosterID} year={allTime ? closestMatchup.year : prefix} compressed={true} points={round(closestMatchup.away.fpts)} />
                                </div>
                            </div>
                        </td>
                        <td>{allTime ? closestMatchup.year + " " : "" }{key == "regularSeasonData" ? "Week " : ""}{closestMatchup.week}</td>
                        <td>{round(closestMatchup.differential)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<h4>{prefix} {key == "playoffData" ? "Playoff " : ""}Rankings</h4>

{#if graphs.length}
    <BarChart {graphs} bind:curGraph={curGraph} {leagueTeamManagers} />
{/if}

<div class="rankingHolder">
    <div class="rankingInner" style="margin-left: -{100 * curTable}%;">
        {#if lineupIQs[0]?.potentialPoints}
            <div class="rankingTableWrapper">
                <table class="sn-table rankingTable">
                    <thead>
                        <tr>
                            <th class="header headerPrimary" colspan="5">
                                {prefix} {key == "playoffData" ? "Playoff " : ""}Lineup IQ Rankings
                                <div class="subTitle">
                                    The percentage of potential points each manager has captured
                                </div>
                            </th>
                        </tr>
                        <tr>
                            <th class="header"></th>
                            <th class="header">Manager</th>
                            <th class="header">Lineup IQ</th>
                            <th class="header">Points</th>
                            <th class="header">Potential Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each lineupIQs as lineupIQ, ix}
                            <tr>
                                <td>{ix + 1}</td>
                                <td class="cellName" onclick={() => gotoManager({year: lineupIQ.year || prefix, leagueTeamManagers, managerID: lineupIQ.managerID, rosterID: lineupIQ.rosterID})}>
                                    <RecordTeam {leagueTeamManagers} managerID={lineupIQ.managerID} rosterID={lineupIQ.rosterID} year={allTime ? lineupIQ.year : prefix} />
                                </td>
                                <td>{lineupIQ.iq}%</td>
                                <td>{round(lineupIQ.fpts)}</td>
                                <td>{round(lineupIQ.potentialPoints)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

        <div class="rankingTableWrapper">
            <table class="sn-table rankingTable">
                <thead>
                    <tr>
                        <th class="header headerPrimary" colspan="6">{prefix} {key == "playoffData" ? "Playoff " : ""}Win Percentages Rankings</th>
                    </tr>
                    <tr>
                        <th class="header"></th>
                        <th class="header">Manager</th>
                        <th class="header">Win %</th>
                        <th class="header">Wins</th>
                        {#if showTies}
                            <th class="header">Ties</th>
                        {/if}
                        <th class="header">Losses</th>
                    </tr>
                </thead>
                <tbody>
                    {#each winPercentages as winPercentage, ix}
                        <tr>
                            <td>{ix + 1}</td>
                            <td class="cellName" onclick={() => gotoManager({year: winPercentage.year || prefix, leagueTeamManagers, rosterID: winPercentage.rosterID, managerID: winPercentage.managerID})}>
                                <RecordTeam {leagueTeamManagers} managerID={winPercentage.managerID} rosterID={winPercentage.rosterID} year={allTime ? winPercentage.year : prefix} />
                            </td>
                            <td>{winPercentage.percentage}%</td>
                            <td>{winPercentage.wins}</td>
                            {#if showTies}
                                <td>{winPercentage.ties}</td>
                            {/if}
                            <td>{winPercentage.losses}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <div class="rankingTableWrapper">
            <table class="sn-table rankingTable">
                <thead>
                    <tr>
                        <th class="header headerPrimary" colspan="5">
                            {prefix} {key == "playoffData" ? "Playoff " : ""}Fantasy Points Rankings
                        </th>
                    </tr>
                    <tr>
                        <th class="header"></th>
                        <th class="header">Manager</th>
                        <th class="header">Points For</th>
                        <th class="header">Points Against</th>
                        <th class="header">Points Per Game</th>
                    </tr>
                </thead>
                <tbody>
                    {#each fptsHistories as fptsHistory, ix}
                        <tr>
                            <td>{ix + 1}</td>
                            <td class="cellName" onclick={() => gotoManager({year: fptsHistory.year || prefix, leagueTeamManagers, rosterID: fptsHistory.rosterID, managerID: fptsHistory.managerID})}>
                                <RecordTeam {leagueTeamManagers} managerID={fptsHistory.managerID} rosterID={fptsHistory.rosterID} year={allTime ? fptsHistory.year : prefix} />
                            </td>
                            <td>{round(fptsHistory.fptsFor)}</td>
                            <td>{round(fptsHistory.fptsAgainst)}</td>
                            <td>{round(fptsHistory.fptsPerGame)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <div class="rankingTableWrapper">
            <table class="sn-table rankingTable">
                <thead>
                    <tr>
                        <th class="header headerPrimary" colspan="4">
                            {prefix} Transaction Totals
                        </th>
                    </tr>
                    <tr>
                        <th class="header"></th>
                        <th class="header">Manager</th>
                        <th class="header">Trades</th>
                        <th class="header">Waivers</th>
                    </tr>
                </thead>
                <tbody>
                    {#each transactions as transaction, ix}
                        <tr>
                            <td>{ix + 1}</td>
                            <td class="cellName" onclick={() => gotoManager({year: transaction.year || prefix, leagueTeamManagers, rosterID: transaction.rosterID, managerID: transaction.managerID})}>
                                <RecordTeam {leagueTeamManagers} managerID={transaction.managerID} rosterID={transaction.rosterID} year={allTime ? transaction.year : prefix} />
                            </td>
                            <td>{transaction.trades}</td>
                            <td>{transaction.waivers}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

    </div>
</div>

<div class="buttonHolder">
    <div class="sn-btn-group">
        {#each tables as table, ix}
            <button class="sn-btn ghost selectionButtons" class:active={curTable == ix} onclick={() => curTable = ix}>
                <span>{table}</span>
            </button>
        {/each}
    </div>
</div>