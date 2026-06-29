import { fail } from '@sveltejs/kit';
import { isCommissioner } from '$lib/server/commissioner.js';
import { getCurrentSeasonYear, getSettings } from '$lib/server/pot.js';
import { getKeeperState, saveKeeperSelection, removeKeeperSelection } from '$lib/server/keepers.js';
import { captureKeeperData, getKeptKeepers } from '$lib/server/keeperArchive.js';
import { getArchivedRosters } from '$lib/server/archive.js';
import { loadLeagueData, loadNFLState, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { resolveSeasonPhase, isDraftPrepPhase } from '$lib/utils/seasonPhase.js';

// The Keepers page is PUBLIC: anyone can view the keeper room read-only. Only
// the select/unselect actions require a logged-in manager (enforced per-action).
export async function load({ locals, fetch }) {
        const { yahooClient, leagueKey } = locals;
        const year = getCurrentSeasonYear();

        // Fire-and-forget snapshot of the current league's draft + transactions so
        // the engine stays fresh without a manual backfill. Best-effort: failures
        // are logged inside captureKeeperData and never block the page. Skipped for
        // logged-out visitors who have no Yahoo client.
        if (yahooClient && leagueKey) {
                captureKeeperData(yahooClient, leagueKey).catch(() => {});
        }

        // Keeper SELECTION is a pre-season activity. Once the season is live
        // (regular/playoffs) the draft has already happened, so the page flips to a
        // read-only record of who was ACTUALLY kept this season instead of the
        // editable selection room.
        const [nflState, leagueData] = await Promise.all([
                loadNFLState(yahooClient).catch(() => null),
                leagueKey ? loadLeagueData(yahooClient, leagueKey).catch(() => null) : Promise.resolve(null)
        ]);
        const seasonPhase = resolveSeasonPhase(nflState, leagueData);

        if (!isDraftPrepPhase(seasonPhase)) {
                const [captured, settings] = await Promise.all([
                        buildCapturedKeepers(year, yahooClient, leagueKey, fetch),
                        getSettings().catch(() => ({ maxKeepers: 2 }))
                ]);
                return {
                        keepers: {
                                seasonPhase,
                                showCaptured: true,
                                upcomingYear: year,
                                capturedKeepers: captured,
                                maxKeepers: Math.max(1, Math.round(Number(settings?.maxKeepers) || 2)),
                                isLoggedIn: !!locals.session?.userId,
                                isCommissioner: isCommissioner(locals.session)
                        }
                };
        }

        // Scope the per-viewer Yahoo cache to this logged-in user so repeated
        // loads (e.g. after each Keep/Remove) are fast without ever sharing one
        // member's roster data with another viewer.
        const state = await getKeeperState(year, yahooClient, leagueKey, locals.session?.userId || null);
        const myTeamKey = locals.session?.managerInfo?.metadata?.team_key || null;

        // Logged-out visitors have no Yahoo client, so live rosters can't load.
        // Still expose a genuine read-only view of the keepers already locked in,
        // grouped by team (team names recovered from archived rosters).
        let publicTeams = null;
        if (state.requiresAuth) {
                publicTeams = await buildPublicView(state.selections, state.upcomingYear);
        }

        return {
                keepers: {
                        ...state,
                        seasonPhase,
                        myTeamKey,
                        isLoggedIn: !!locals.session?.userId,
                        isCommissioner: isCommissioner(locals.session),
                        publicTeams
                }
        };
}

// Group this season's ACTUALLY-kept players (captured draft results flagged
// is_keeper) by team for the live-season read-only view. Team names come from the
// live Yahoo owner list when available, else from archived rosters; player
// position/NFL team are bridged from the Sleeper-style players dataset.
async function buildCapturedKeepers(year, yahooClient, leagueKey, fetch) {
        const kept = await getKeptKeepers(year).catch(() => []);
        if (!kept.length) return [];

        const nameByTeam = new Map();
        const managerByTeam = new Map();
        if (yahooClient && leagueKey) {
                const users = await loadLeagueUsers(yahooClient, leagueKey).catch(() => []);
                for (const u of users || []) {
                        const tk = u?.metadata?.team_key;
                        if (!tk) continue;
                        nameByTeam.set(tk, u?.metadata?.team_name || null);
                        managerByTeam.set(tk, u?.metadata?.manager_nickname || null);
                }
        }
        if (!nameByTeam.size) {
                for (const y of [year, year - 1, year - 2]) {
                        const rows = await getArchivedRosters(y).catch(() => []);
                        for (const r of rows) {
                                if (r.team_key && !nameByTeam.has(r.team_key)) nameByTeam.set(r.team_key, r.team_name);
                        }
                        if (nameByTeam.size) break;
                }
        }

        const playersData = await loadPlayers(fetch).catch(() => null);
        const players = playersData?.players ?? {};
        const yahooIndex = {};
        for (const id in players) {
                const yh = players[id]?.yh;
                if (yh != null) yahooIndex[String(yh)] = players[id];
        }
        const resolvePlayer = (key) => {
                if (!key) return null;
                const k = String(key);
                if (players[k]) return players[k];
                const m = k.match(/\.p\.(\d+)/) || k.match(/^(\d+)$/);
                return m ? yahooIndex[m[1]] ?? null : null;
        };

        const byTeam = new Map();
        for (const row of kept) {
                const tk = row.team_key;
                if (!byTeam.has(tk)) {
                        byTeam.set(tk, {
                                teamKey: tk,
                                teamName: nameByTeam.get(tk) || 'Team',
                                manager: managerByTeam.get(tk) || null,
                                players: []
                        });
                }
                const p = resolvePlayer(row.player_id || row.player_key);
                byTeam.get(tk).players.push({
                        playerKey: row.player_key,
                        name: row.player_name || (p ? `${p.fn ?? ''} ${p.ln ?? ''}`.trim() : null) || 'Unknown Player',
                        pos: p?.pos || null,
                        nflTeam: p?.t || null,
                        costRound: row.cost ?? row.round ?? null
                });
        }
        return [...byTeam.values()].sort((a, b) => a.teamName.localeCompare(b.teamName));
}

async function buildPublicView(selections, upcomingYear) {
        const nameByTeam = new Map();
        for (const y of [upcomingYear, upcomingYear - 1, upcomingYear - 2]) {
                const rows = await getArchivedRosters(y).catch(() => []);
                for (const r of rows) {
                        if (r.team_key && !nameByTeam.has(r.team_key)) nameByTeam.set(r.team_key, r.team_name);
                }
                if (nameByTeam.size) break;
        }
        const byTeam = new Map();
        for (const s of selections || []) {
                if (!byTeam.has(s.team_key)) {
                        byTeam.set(s.team_key, {
                                teamKey: s.team_key,
                                teamName: nameByTeam.get(s.team_key) || 'Team',
                                players: []
                        });
                }
                byTeam.get(s.team_key).players.push(s);
        }
        return [...byTeam.values()].sort((a, b) => a.teamName.localeCompare(b.teamName));
}

function authForTeam(locals, teamKey) {
        if (!locals?.session?.userId) return fail(401, { error: 'Not authenticated' });
        const myTeamKey = locals.session?.managerInfo?.metadata?.team_key;
        // Everyone — including the commissioner — may only set keepers for their own
        // team here. Commissioner overrides happen in the commissioner settings, not
        // on the public keeper room.
        if (teamKey !== myTeamKey) {
                return fail(403, { error: 'You can only set keepers for your own team.' });
        }
        return null;
}

export const actions = {
        select: async ({ request, locals }) => {
                const form = await request.formData();
                const teamKey = (form.get('teamKey') || '').toString().trim();
                const playerKey = (form.get('playerKey') || '').toString().trim();

                const denied = authForTeam(locals, teamKey);
                if (denied) return denied;

                const res = await saveKeeperSelection({
                        year: getCurrentSeasonYear(),
                        teamKey,
                        playerKey,
                        submittedBy: locals.session.userId,
                        yahooClient: locals.yahooClient,
                        leagueKey: locals.leagueKey
                });
                if (!res.ok) return fail(400, { error: res.error });
                return { success: true, action: 'select' };
        },

        unselect: async ({ request, locals }) => {
                const form = await request.formData();
                const teamKey = (form.get('teamKey') || '').toString().trim();
                const playerKey = (form.get('playerKey') || '').toString().trim();

                const denied = authForTeam(locals, teamKey);
                if (denied) return denied;

                await removeKeeperSelection(getCurrentSeasonYear(), teamKey, playerKey);
                return { success: true, action: 'unselect' };
        }
};
