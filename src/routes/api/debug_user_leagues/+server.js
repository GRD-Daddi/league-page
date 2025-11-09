import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
        if (!locals.yahooClient) {
                return json({ error: 'Not authenticated' }, { status: 401 });
        }
        
        try {
                const userGames = await locals.yahooClient.user.games();
                console.log('[Debug] User games:', JSON.stringify(userGames, null, 2));
                
                // Try to get leagues for each game
                const gameKeys = userGames?.users?.[0]?.user?.[1]?.games;
                console.log('[Debug] Game keys:', JSON.stringify(gameKeys, null, 2));
                
                return json({ userGames, gameKeys });
        } catch (error) {
                console.error('[Debug] Error:', error);
                return json({ error: error.message, details: error }, { status: 500 });
        }
}
