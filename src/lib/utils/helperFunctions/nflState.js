import { get } from 'svelte/store';
import {nflState} from '$lib/stores';
import { getNFLState as getNFLStateApi } from '$lib/utils/platformApi';

export const getNflState = async () => {
        if(get(nflState).season) {
                return get(nflState);
        }
    const data = await getNFLStateApi().catch((err) => { console.error(err); });
        
        nflState.update(() => data);
        return data;
}