import { loadLeagueData, loadLeagueRostersWithFallback, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { captureSeason, getArchivedRosters, getArchivedStandings, getRosterArchiveYears } from '$lib/server/archive.js';
import { getArchiveYears } from '$lib/server/archiveStats.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { ownerDisplayName } from '$lib/utils/ownerNames.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;
        const currentYear = getCurrentSeasonYear();
        const [allYears, rosterYears] = await waitForAll(getArchiveYears(), getRosterArchiveYears());

        // Only offer the live current season + past seasons that actually have a
        // captured ending roster. Older Yahoo seasons predate roster snapshotting
        // and have nothing to show, so they are not selectable.
        const rosterYearSet = new Set(rosterYears);
        const yearOptions = allYears
                .filter((y) => y.year === currentYear || rosterYearSet.has(y.year))
                .map((y) => ({ year: y.year, status: y.status }));

        const requested = parseInt(url.searchParams.get('year'), 10);
        const isSelectable = Number.isFinite(requested) && (requested === currentYear || rosterYearSet.has(requested));
        const selectedYear = isSelectable ? requested : (yearOptions[0]?.year ?? currentYear);
        const isLive = selectedYear === currentYear;

        // Past season: serve the durable archive, no Yahoo call needed.
        if (!isLive) {
                const [rosterRows, standingsRows] = await waitForAll(
                        getArchivedRosters(selectedYear),
                        getArchivedStandings(selectedYear)
                );

                // Records/seed live in the standings archive, keyed by team_key. Some
                // backfilled seasons have zeroed W/L stats while final_rank is valid, so
                // only surface a record when it carries real numbers.
                const metaByKey = new Map();
                for (const s of standingsRows) {
                        const wins = s.wins ?? 0;
                        const losses = s.losses ?? 0;
                        const ties = s.ties ?? 0;
                        metaByKey.set(s.team_key, {
                                record: wins || losses || ties ? `${wins}-${losses}${ties ? `-${ties}` : ''}` : null,
                                rank: s.final_rank ?? null
                        });
                }

                const toPlayer = (p) => ({
                        name: `${p.fn ?? ''} ${p.ln ?? ''}`.trim() || String(p.key ?? '?'),
                        pos: p.pos ?? null,
                        team: p.t ?? null,
                        img: p.img ?? null
                });

                const archivedTeams = rosterRows
                        .map((r) => {
                                const players = Array.isArray(r.players) ? r.players : [];
                                const meta = metaByKey.get(r.team_key) || {};
                                return {
                                        teamName: r.team_name ?? 'Unknown Team',
                                        manager: r.manager_name ? ownerDisplayName(r.manager_name) : null,
                                        logo: r.logo_url ?? null,
                                        record: meta.record ?? null,
                                        rank: meta.rank ?? null,
                                        starters: players.filter((p) => p.starter).map(toPlayer),
                                        bench: players.filter((p) => !p.starter).map(toPlayer),
                                        hasPlayers: players.length > 0
                                };
                        })
                        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.teamName.localeCompare(b.teamName));

                return { years: yearOptions, selectedYear, isLive, archivedTeams, rostersInfo: null };
        }

        // Current season: live (streamed) load with a best-effort archive snapshot.
        const rostersInfo = waitForAll(
                loadLeagueData(yahooClient, leagueKey),
                loadLeagueRostersWithFallback(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey),
                loadPlayers(fetch),
        );

        // When rosters came from a prior season via the renew-chain fallback, archive
        // under that season and skip the (current-season) league header so we don't
        // mislabel the year.
        rostersInfo
                .then(([leagueData, rostersResult]) => {
                        const fallback = rostersResult?.fromSeason ? parseInt(rostersResult.fromSeason, 10) : null;
                        const year = Number.isFinite(fallback) ? fallback : parseInt(leagueData?.season, 10);
                        if (!Number.isFinite(year) || !rostersResult) return;
                        const ld = Number.isFinite(fallback) ? null : leagueData;
                        return captureSeason(year, { leagueData: ld, rostersResult });
                })
                .catch((err) => console.error('[rosters] archive snapshot failed:', err?.message));

        return { years: yearOptions, selectedYear, isLive, archivedTeams: null, rostersInfo };
}

async function loadLeagueUsersAsMap(yahooClient, leagueKey) {
        const users = await loadLeagueUsers(yahooClient, leagueKey);
        return toMap(users);
}

function toMap(rawUsers) {
        const out = {};
        for (const user of rawUsers || []) out[user.user_id] = user;
        return out;
}
