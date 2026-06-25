import { query } from '../src/lib/server/db.js';
import { createAuthenticatedClient, rawYahooGet } from '../src/lib/yahoo-adapter/yahooClient.js';

function deepFindTeams(node, out) {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) {
		for (const v of node) deepFindTeams(v, out);
		return;
	}
	if (node.team) deepFindTeams(node.team, out);
	// A team is an array of segments; look for name + managers
	for (const v of Object.values(node)) deepFindTeams(v, out);
}

function extractTeams(json) {
	const results = [];
	// Walk the teams collection: league[1].teams { "0": {team:[...]}, ... }
	const teamsContainer = json?.fantasy_content?.league?.[1]?.teams
		|| json?.fantasy_content?.league?.find?.((x) => x?.teams)?.teams;
	const container = teamsContainer || {};
	for (const [k, v] of Object.entries(container)) {
		if (k === 'count') continue;
		const segments = v?.team?.[0];
		if (!Array.isArray(segments)) continue;
		let teamName = null;
		const managers = [];
		for (const seg of segments) {
			if (seg && seg.name) teamName = seg.name;
			if (seg && seg.managers) {
				for (const m of seg.managers) {
					const mgr = m?.manager;
					if (mgr) managers.push({ guid: mgr.guid, nickname: mgr.nickname });
				}
			}
		}
		results.push({ teamName, managers });
	}
	return results;
}

async function main() {
	const sess = await query(
		`SELECT data FROM sessions WHERE expires_at > now() ORDER BY updated_at DESC NULLS LAST LIMIT 1`
	);
	if (!sess.rows[0]) {
		console.log('NO_ACTIVE_SESSION');
		process.exit(0);
	}
	const data = sess.rows[0].data;
	const access = data?.tokens?.access_token;
	const refresh = data?.tokens?.refresh_token;
	if (!access) {
		console.log('SESSION_HAS_NO_ACCESS_TOKEN');
		process.exit(0);
	}

	const client = createAuthenticatedClient(access, refresh);
	if (!client) {
		console.log('NO_CLIENT (creds missing)');
		process.exit(0);
	}

	const seasons = await query(`SELECT year, league_key FROM season_archive ORDER BY year`);
	for (const { year, league_key } of seasons.rows) {
		try {
			const json = await rawYahooGet(
				`https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams`,
				client
			);
			const teams = extractTeams(json);
			const withGuid = teams.filter((t) => t.managers.some((m) => m.guid));
			console.log(`\n=== ${year} (${league_key}) — ${teams.length} teams, ${withGuid.length} with guid ===`);
			for (const t of teams) {
				const mg = t.managers
					.map((m) => `${m.nickname ?? '?'}|${m.guid ? m.guid.slice(0, 10) + '…' : 'NO_GUID'}`)
					.join(', ');
				console.log(`  ${t.teamName ?? '?'}  ->  ${mg || 'NO_MANAGERS'}`);
			}
		} catch (err) {
			console.log(`\n=== ${year} (${league_key}) — ERROR: ${err.message}`);
		}
	}
	process.exit(0);
}

main().catch((e) => {
	console.error('FATAL', e);
	process.exit(1);
});
