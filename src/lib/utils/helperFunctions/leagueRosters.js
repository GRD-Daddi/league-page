import { leagueID } from '$lib/utils/leagueInfo';
import { get } from 'svelte/store';
import { rostersStore } from '$lib/stores';
import { getLeagueRosters as getLeagueRostersApi } from '$lib/utils/platformApi';

export const getLeagueRosters = async (queryLeagueID = leagueID) => {
    const storedRoster = get(rostersStore)[queryLeagueID];
        if(
        storedRoster
        && typeof storedRoster.rosters === 'object' &&
        !Array.isArray(storedRoster.rosters) &&
        storedRoster.rosters !== null
    ) {
                return storedRoster;
        }
    const data = await getLeagueRostersApi(queryLeagueID).catch((err) => { console.error(err); });
        
        const processedRosters = processRosters(data);
        rostersStore.update(r => {r[queryLeagueID] = processedRosters; return r});
        return processedRosters;
}

const processRosters = (rosters) => {
        const startersAndReserve = [];
    const rosterMap = {};
        for(const roster of rosters) {
                for(const starter of roster.starters) {
                        startersAndReserve.push(starter);
                }
                if(roster.reserve) {
                        for(const ir of roster.reserve) {
                                startersAndReserve.push(ir);
                        }
                }
        rosterMap[roster.roster_id] = roster;
        }
        return {rosters: rosterMap, startersAndReserve};
}