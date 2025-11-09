import { get } from 'svelte/store';
import {leagueData} from '$lib/stores';
import { leagueID } from '$lib/utils/leagueInfo';
import { getLeagueData as getLeagueDataApi } from '$lib/utils/platformApi';

export const getLeagueData = async (queryLeagueID = leagueID) => {
        if(get(leagueData)[queryLeagueID]) {
                return get(leagueData)[queryLeagueID];
        }
    const data = await getLeagueDataApi(queryLeagueID).catch((err) => { console.error(err); });
        
        leagueData.update(ld => {ld[queryLeagueID] = data; return ld});
        return data;
}