import { json } from '@sveltejs/kit';

const NFL_GAME_KEYS = ['461', '449', '423', '414', '406', '399', '390', '380', '371', '359', '348', '331'];

export async function GET({ locals }) {
        if (!locals.yahooClient) {
                return json({ error: 'Not authenticated' }, { status: 401 });
        }

        try {
                const result = await locals.yahooClient.user.game_leagues(NFL_GAME_KEYS);
                const all = [];

                for (const game of (result.games || [])) {
                        for (const league of (game.leagues || [])) {
                                all.push({
                                        league_key: league.league_key,
                                        name: league.name,
                                        season: league.season,
                                        num_teams: league.num_teams,
                                        game_key: game.game_key,
                                        url: league.url,
                                        is_finished: String(league.is_finished) === '1'
                                });
                        }
                }

                let leagues = all.filter((l) => !l.is_finished);

                if (leagues.length === 0 && all.length > 0) {
                        const maxSeason = all.reduce((m, l) => Math.max(m, parseInt(l.season) || 0), 0);
                        leagues = all.filter((l) => (parseInt(l.season) || 0) === maxSeason);
                }

                leagues.sort((a, b) => (b.season || '').localeCompare(a.season || ''));

                return json({ leagues });
        } catch (err) {
                console.error('[my-leagues] Error fetching user leagues:', err.message, err);
                return json({ error: err.message, leagues: [] }, { status: 500 });
        }
}
