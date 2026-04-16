import { json } from '@sveltejs/kit';

const NFL_GAME_KEYS = ['461', '449', '423', '414', '406', '399', '390', '380', '371'];

export async function GET({ locals }) {
	if (!locals.yahooClient) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const leagues = [];

	for (const gameKey of NFL_GAME_KEYS) {
		try {
			const result = await locals.yahooClient.user.game_leagues(gameKey);
			const gamesArr = result?.users?.[0]?.user?.[1]?.games || [];
			const game = Array.isArray(gamesArr) ? gamesArr.find(g => g?.game?.[0]?.game_key === gameKey) : null;
			const leaguesArr = game?.game?.[1]?.leagues || [];

			const leagueList = Array.isArray(leaguesArr) ? leaguesArr : [];
			for (const item of leagueList) {
				const league = Array.isArray(item?.league) ? item.league[0] : item?.league;
				if (!league) continue;
				leagues.push({
					league_key: league.league_key,
					name: league.name,
					season: league.season,
					num_teams: league.num_teams,
					game_key: gameKey,
					url: league.url
				});
			}
		} catch (err) {
			// This game key may not have leagues for this user — skip silently
		}
	}

	return json({ leagues });
}
