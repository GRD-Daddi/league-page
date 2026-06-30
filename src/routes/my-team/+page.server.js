import { loadLeagueData, loadLeagueRostersWithFallback, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { ownerDisplayName } from '$lib/utils/ownerNames.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey, session } = locals;
	const myTeamKey = session?.managerInfo?.metadata?.team_key ?? null;

	// Stream the heavier Yahoo load so the page shell paints immediately and the
	// roster fills in once Yahoo responds (mirrors the rosters page pattern).
	const teamInfo = buildMyTeam(yahooClient, leagueKey, fetch, myTeamKey);

	return { teamInfo };
}

async function buildMyTeam(yahooClient, leagueKey, fetch, myTeamKey) {
	if (!myTeamKey) {
		return { error: 'no-team', team: null };
	}

	const [leagueData, rostersResult, users, playersInfo] = await waitForAll(
		loadLeagueData(yahooClient, leagueKey),
		loadLeagueRostersWithFallback(yahooClient, leagueKey),
		loadLeagueUsers(yahooClient, leagueKey),
		loadPlayers(fetch)
	);

	if (!rostersResult) {
		return { error: 'unavailable', team: null };
	}

	// Live Yahoo rosters carry player detail inline (keyed by Yahoo player_key);
	// merge them over the Sleeper-keyed map so getPlayer resolves either source.
	const players = { ...(playersInfo?.players ?? {}), ...(rostersResult?.yahooPlayers ?? {}) };
	const usersMap = toMap(users);
	const myRoster = Object.values(rostersResult?.rosters ?? {}).find(
		(r) => r?.metadata?.team_key === myTeamKey
	);

	if (!myRoster) {
		return { error: 'not-found', team: null, fromSeason: rostersResult?.fromSeason ?? null };
	}

	const user = findUser(myRoster, usersMap);
	const teamName = myRoster.metadata?.team_name ?? user?.metadata?.team_name ?? 'My Team';
	const nickname = user?.metadata?.manager_nickname ?? null;
	const manager = nickname && nickname !== teamName ? ownerDisplayName(nickname) : null;

	const starterIds = myRoster.starters ?? [];
	const starterSet = new Set(starterIds);
	const benchIds = (myRoster.players ?? []).filter((id) => !starterSet.has(id));

	const s = myRoster.settings ?? {};
	const m = myRoster.metadata ?? {};
	const wins = s.wins ?? 0;
	const losses = s.losses ?? 0;
	const ties = s.ties ?? 0;

	const team = {
		teamName,
		manager,
		logo: m.team_logo ?? null,
		record: s.record ?? `${wins}-${losses}${ties ? `-${ties}` : ''}`,
		ties,
		rank: m.rank ?? null,
		moves: Number.isFinite(s.total_moves) ? s.total_moves : null,
		pointsFor: fmtPoints(s.fpts),
		pointsAgainst: fmtPoints(s.fpts_against),
		starters: starterIds.map((id) => getPlayer(id, players)),
		bench: benchIds.map((id) => getPlayer(id, players)),
		hasPlayers: starterIds.length > 0 || benchIds.length > 0
	};

	return {
		error: null,
		team,
		fromSeason: rostersResult?.fromSeason ?? null,
		leagueName: leagueData?.name ?? null,
		season: leagueData?.season ?? null
	};
}

// Yahoo points come through as numeric strings; surface a 2-decimal figure and
// treat 0 / non-numeric as "no data" so empty preseason tiles stay hidden.
function fmtPoints(v) {
	const n = Number(v);
	if (!Number.isFinite(n) || n === 0) return null;
	return n.toFixed(2);
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}

// Yahoo masks manager guids, so match the owner on the stable team_key first and
// only fall back to owner_id (mirrors the rosters page lookup).
function findUser(roster, users) {
	const teamKey = roster?.metadata?.team_key;
	if (teamKey) {
		for (const id in users) {
			if (users[id]?.metadata?.team_key === teamKey) return users[id];
		}
	}
	if (roster?.owner_id && users[roster.owner_id]) return users[roster.owner_id];
	return null;
}

function getPlayer(id, players) {
	const p = players?.[id];
	if (p) {
		const name = `${p.fn ?? ''} ${p.ln ?? ''}`.trim();
		return { name: name || String(id), pos: p.pos ?? null, team: p.t ?? null, img: p.img ?? null };
	}
	return { name: String(id), pos: null, team: null, img: null };
}
