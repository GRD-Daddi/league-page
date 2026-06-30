import { rawYahooGet } from '$lib/yahoo-adapter/yahooClient.js';

/**
 * Raw, token-only historical fetchers for the durable archive.
 *
 * Why this exists: during the offseason Yahoo's team-collection helpers in the
 * `yahoo-fantasy` library throw (and the library's response mapping mangles the
 * count-keyed JSON), so the previous backfill captured team names but ZERO real
 * stats. These functions hit Yahoo's REST endpoints directly via rawYahooGet —
 * which keep working year-round — and parse the raw `fantasy_content` shape, so
 * the archive captures real wins/points/standings/scores even out of season.
 *
 * Yahoo's JSON encodes lists as count-keyed objects: { count: N, "0": {...},
 * "1": {...} }. `collection()` normalises those to plain arrays. Team payloads
 * arrive as arrays of segments where the first segment is itself an array of
 * single-key objects; `mergeTeamSegments()` flattens all of that into one object.
 */

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

const num = (v) => {
	const n = typeof v === 'number' ? v : parseFloat(v);
	return Number.isFinite(n) ? n : null;
};
const int = (v) => {
	const n = typeof v === 'number' ? v : parseInt(v, 10);
	return Number.isFinite(n) ? n : null;
};

/** Normalise Yahoo's { count, "0":…, "1":… } collection object into an array. */
function collection(obj) {
	if (!obj || typeof obj !== 'object') return [];
	const count = int(obj.count);
	const out = [];
	if (Number.isFinite(count)) {
		for (let i = 0; i < count; i++) {
			if (obj[String(i)] !== undefined) out.push(obj[String(i)]);
		}
		return out;
	}
	// Fallback: any numeric-keyed entries, in order.
	for (const k of Object.keys(obj)) {
		if (/^\d+$/.test(k)) out.push(obj[k]);
	}
	return out;
}

/** Flatten a Yahoo team segment array (arrays-of-objects + plain objects) into one. */
function mergeTeamSegments(teamArr) {
	const flat = {};
	const segments = Array.isArray(teamArr) ? teamArr : [teamArr];
	for (const seg of segments) {
		if (!seg) continue;
		if (Array.isArray(seg)) {
			for (const x of seg) if (x && typeof x === 'object') Object.assign(flat, x);
		} else if (typeof seg === 'object') {
			Object.assign(flat, seg);
		}
	}
	return flat;
}

function teamLogo(flat) {
	const logos = flat.team_logos;
	if (Array.isArray(logos) && logos.length) return logos[0]?.team_logo?.url || null;
	return flat.team_logo || null;
}

function rosterIdFromKey(teamKey) {
	const m = (teamKey || '').match(/\.t\.(\d+)/);
	return m ? parseInt(m[1], 10) : null;
}

/**
 * Every league the logged-in user belongs to, one per
 * NFL season, newest data parsed from the raw users→games→leagues endpoint.
 * Filters by league name when one is supplied so unrelated leagues are skipped.
 * Returns [{ year, leagueKey, name, numTeams }] sorted oldest-first.
 */
export async function enumerateLeagueSeasons(yahooClient, leagueName = null) {
	const data = await rawYahooGet(`${BASE}/users;use_login=1/games;game_codes=nfl/leagues`, yahooClient);
	const usersObj = data?.fantasy_content?.users;
	const userArr = collection(usersObj)?.[0]?.user || usersObj?.['0']?.user;
	if (!userArr) return [];

	let gamesObj = null;
	for (const seg of Array.isArray(userArr) ? userArr : [userArr]) {
		if (seg && seg.games) gamesObj = seg.games;
	}
	if (!gamesObj) return [];

	const wanted = (leagueName || '').trim().toLowerCase();
	const byYear = new Map();

	for (const gWrap of collection(gamesObj)) {
		const gameArr = gWrap?.game;
		let leaguesObj = null;
		for (const seg of Array.isArray(gameArr) ? gameArr : [gameArr]) {
			if (seg && seg.leagues) leaguesObj = seg.leagues;
		}
		if (!leaguesObj) continue;

		for (const lWrap of collection(leaguesObj)) {
			const lg = Array.isArray(lWrap?.league) ? lWrap.league[0] : lWrap?.league;
			if (!lg?.league_key) continue;
			const name = (lg.name || '').trim();
			if (wanted && name.toLowerCase() !== wanted) continue;
			const year = int(lg.season);
			if (!Number.isFinite(year)) continue;
			// Keep the entry with the most teams if a year somehow appears twice.
			const existing = byYear.get(year);
			const numTeams = int(lg.num_teams) || 0;
			if (!existing || numTeams > (existing.numTeams || 0)) {
				byYear.set(year, { year, leagueKey: lg.league_key, name, numTeams });
			}
		}
	}

	return [...byYear.values()].sort((a, b) => a.year - b.year);
}

/** League header (season, name, team count, status, week bounds) from /metadata. */
export async function fetchLeagueMeta(yahooClient, leagueKey) {
	const data = await rawYahooGet(`${BASE}/league/${leagueKey}/metadata`, yahooClient);
	const league = data?.fantasy_content?.league;
	const flat = Array.isArray(league) ? Object.assign({}, ...league.filter((s) => s && typeof s === 'object')) : league || {};
	return {
		leagueKey: flat.league_key || leagueKey,
		name: flat.name || null,
		season: int(flat.season),
		numTeams: int(flat.num_teams),
		status: flat.draft_status === 'postdraft' && flat.is_finished ? 'complete' : flat.draft_status || null,
		isFinished: flat.is_finished === 1 || flat.is_finished === '1',
		startWeek: int(flat.start_week) || 1,
		endWeek: int(flat.end_week) || 17,
		playoffStartWeek: int(flat.settings?.playoff_start_week) || null
	};
}

/** Real per-team final standings for a season, parsed from /standings. */
export async function fetchStandings(yahooClient, leagueKey) {
	const data = await rawYahooGet(`${BASE}/league/${leagueKey}/standings`, yahooClient);
	const league = data?.fantasy_content?.league;
	const standingsNode = Array.isArray(league)
		? league.find((s) => s && s.standings)?.standings
		: league?.standings;
	const teamsObj = Array.isArray(standingsNode) ? standingsNode[0]?.teams : standingsNode?.teams;
	if (!teamsObj) return [];

	const rows = [];
	for (const tWrap of collection(teamsObj)) {
		const teamArr = tWrap?.team;
		const flat = mergeTeamSegments(teamArr);
		if (!flat.team_key) continue;
		const ts = (Array.isArray(teamArr) ? teamArr : [teamArr]).map((s) => s?.team_standings).find(Boolean) || flat.team_standings || {};
		const ot = ts.outcome_totals || {};
		rows.push({
			teamKey: flat.team_key,
			teamName: flat.name || null,
			logoUrl: teamLogo(flat),
			finalRank: int(ts.rank),
			playoffSeed: int(ts.playoff_seed),
			wins: int(ot.wins),
			losses: int(ot.losses),
			ties: int(ot.ties) || 0,
			pointsFor: num(ts.points_for),
			pointsAgainst: num(ts.points_against)
		});
	}
	return rows;
}

/** Real matchup sides for one week, parsed from /scoreboard;week=N. */
export async function fetchScoreboardWeek(yahooClient, leagueKey, week) {
	const data = await rawYahooGet(`${BASE}/league/${leagueKey}/scoreboard;week=${week}`, yahooClient);
	const league = data?.fantasy_content?.league;
	const scoreboard = Array.isArray(league)
		? league.find((s) => s && s.scoreboard)?.scoreboard
		: league?.scoreboard;
	const matchupsObj = scoreboard?.['0']?.matchups || scoreboard?.matchups;
	if (!matchupsObj) return [];

	const sides = [];
	let matchupId = 1;
	for (const mWrap of collection(matchupsObj)) {
		const m = mWrap?.matchup;
		if (!m) continue;
		const isPlayoffs = m.is_playoffs === '1' || m.is_playoffs === 1;
		const teamsObj = m['0']?.teams || m.teams;
		for (const tWrap of collection(teamsObj)) {
			const teamArr = tWrap?.team;
			const flat = mergeTeamSegments(teamArr);
			const teamKey = flat.team_key;
			const rosterId = rosterIdFromKey(teamKey);
			if (rosterId === null) continue;
			const tp = (Array.isArray(teamArr) ? teamArr : [teamArr]).map((s) => s?.team_points).find(Boolean) || flat.team_points || {};
			const pts = Array.isArray(tp) ? tp[0] : tp;
			sides.push({
				week: int(week),
				matchupId,
				rosterId,
				teamKey,
				teamName: flat.name || null,
				points: num(pts?.total),
				isPlayoffs
			});
		}
		matchupId++;
	}
	return sides;
}

/**
 * Full archive payload for one season's league: header, real standings, and
 * every week's real matchup scores. Weeks are fetched with light concurrency.
 */
export async function fetchSeasonArchiveData(yahooClient, leagueKey) {
	const meta = await fetchLeagueMeta(yahooClient, leagueKey);
	const standings = await fetchStandings(yahooClient, leagueKey);

	const weeks = [];
	for (let w = meta.startWeek; w <= meta.endWeek; w++) weeks.push(w);

	const sides = [];
	const CONCURRENCY = 4;
	for (let i = 0; i < weeks.length; i += CONCURRENCY) {
		const batch = weeks.slice(i, i + CONCURRENCY);
		const results = await Promise.all(
			batch.map((w) => fetchScoreboardWeek(yahooClient, leagueKey, w).catch(() => []))
		);
		for (const r of results) sides.push(...r);
	}

	return { meta, standings, sides };
}
