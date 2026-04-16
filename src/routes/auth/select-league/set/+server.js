import { json } from '@sveltejs/kit';

export async function POST({ request, cookies, locals }) {
	if (!locals.session?.userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { leagueKey } = await request.json();

	if (!leagueKey || typeof leagueKey !== 'string') {
		return json({ error: 'Invalid league key' }, { status: 400 });
	}

	cookies.set('selected_league_key', leagueKey, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 365 * 24 * 60 * 60
	});

	return json({ ok: true, leagueKey });
}
