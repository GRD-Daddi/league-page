import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
        if (!locals.yahooClient) {
                return json({ error: 'Not authenticated' }, { status: 401 });
        }

        try {
                const userGames = await locals.yahooClient.user.games();

                const gameKeys = (userGames.games || [])
                        .filter((g) => g && g.code === 'nfl' && g.game_key)
                        .map((g) => g.game_key);

                if (gameKeys.length === 0) {
                        return json({ leagues: [] });
                }

                const result = await locals.yahooClient.user.game_leagues(gameKeys);

                const all = [];
                for (const game of (result.games || [])) {
                        const gameSeason = parseInt(game.season) || 0;
                        for (const league of (game.leagues || [])) {
                                if (!league.league_key) continue;
                                all.push({
                                        league_key: league.league_key,
                                        name: league.name,
                                        season: league.season || game.season,
                                        seasonNum: parseInt(league.season) || gameSeason,
                                        num_teams: league.num_teams,
                                        game_key: game.game_key,
                                        url: league.url
                                });
                        }
                }

                if (all.length === 0) {
                        return json({ leagues: [] });
                }

                const maxSeason = all.reduce((m, l) => Math.max(m, l.seasonNum), 0);
                const leagues = all.filter((l) => l.seasonNum === maxSeason);

                leagues.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                return json({ leagues });
        } catch (err) {
                console.error('[my-leagues] Error fetching user leagues:', err.message, err);
                return json({ error: err.message, leagues: [] }, { status: 500 });
        }
}
