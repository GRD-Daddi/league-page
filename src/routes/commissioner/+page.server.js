import { error, fail } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/authGuard.js';
import { isCommissioner } from '$lib/server/commissioner.js';
import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { query } from '$lib/server/db.js';
import {
        getCommissionerData,
        getCurrentSeasonYear,
        getPotTotal,
        getChampionHistory,
        computeChampionStatus,
        setManualPotTotal,
        getSettings,
        getExpectedMembers,
        backfillArchive
} from '$lib/server/pot.js';
import { getArchivedSeasons } from '$lib/server/archive.js';
import { getDraftPickOwnership, saveDraftPickOwnership, DRAFT_ROUNDS } from '$lib/server/draftPicks.js';
import { getYahooTradedPicks, teamNumFromKey } from '$lib/yahoo-adapter/index.js';

function parseYear(value, fallback) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) && n > 1900 && n < 3000 ? n : fallback;
}

function parseMoney(value) {
        const n = parseFloat(value);
        return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function guard(locals, url) {
        requireAuth(locals, url);
        if (!isCommissioner(locals.session)) {
                throw error(403, 'You must be the league commissioner to access this page.');
        }
}

export async function load({ locals, url }) {
        await guard(locals, url);

        const year = parseYear(url.searchParams.get('year'), getCurrentSeasonYear());

        let leagueUsers = [];
        try {
                leagueUsers = (await loadLeagueUsers(locals.yahooClient, locals.leagueKey)) || [];
        } catch (err) {
                console.error('[commissioner] Error loading league users:', err.message);
        }

        const data = await getCommissionerData(year, leagueUsers, locals.yahooClient, locals.leagueKey);

        let archivedSeasons = [];
        try {
                archivedSeasons = await getArchivedSeasons();
        } catch (err) {
                console.error('[commissioner] Error loading archived seasons:', err.message);
        }

        let draftPicks = { rounds: DRAFT_ROUNDS, teams: [] };
        try {
                draftPicks = await getDraftPickOwnership(year);
        } catch (err) {
                console.error('[commissioner] Error loading draft pick ownership:', err.message);
        }

        // Auto-seed grid derived from Yahoo's actual traded picks. Each member starts
        // with one pick per round; a traded pick moves a pick from its original team to
        // its current owner. This is only a STARTING POINT for the editor when nothing
        // has been saved yet — far more accurate than the screenshot prefill. The
        // commissioner-saved DB values (draftPicks) always remain authoritative.
        let yahooDraftPicks = [];
        try {
                const members = data.members || [];
                if (members.length && locals.yahooClient && locals.leagueKey) {
                        const numToTeamKey = new Map();
                        const grid = new Map();
                        for (const m of members) {
                                const num = teamNumFromKey(m.teamKey);
                                if (num == null) continue;
                                numToTeamKey.set(num, m.teamKey);
                                grid.set(m.teamKey, Array.from({ length: DRAFT_ROUNDS }, () => 1));
                        }

                        const tradedPicks = await getYahooTradedPicks(locals.leagueKey, locals.yahooClient);
                        for (const pick of tradedPicks) {
                                const { round, roster_id: original, owner_id: owner } = pick;
                                if (!round || round > DRAFT_ROUNDS) continue;
                                const origKey = numToTeamKey.get(original);
                                const ownerKey = numToTeamKey.get(owner);
                                if (origKey && grid.has(origKey)) {
                                        grid.get(origKey)[round - 1] = Math.max(0, grid.get(origKey)[round - 1] - 1);
                                }
                                if (ownerKey && grid.has(ownerKey)) {
                                        grid.get(ownerKey)[round - 1] += 1;
                                }
                        }

                        yahooDraftPicks = members
                                .filter((m) => grid.has(m.teamKey))
                                .map((m) => ({ teamKey: m.teamKey, teamName: m.name, picks: grid.get(m.teamKey) }));
                }
        } catch (err) {
                console.error('[commissioner] Error building Yahoo draft-pick seed:', err.message);
                yahooDraftPicks = [];
        }

        return {
                commissioner: {
                        ...data,
                        leagueUsersAvailable: leagueUsers.length > 0,
                        archivedSeasons,
                        draftPicks,
                        yahooDraftPicks,
                        draftRounds: DRAFT_ROUNDS
                }
        };
}

async function ensureCommissioner(locals) {
        if (!locals?.session?.userId) {
                return fail(401, { error: 'Not authenticated' });
        }
        if (!isCommissioner(locals.session)) {
                return fail(403, { error: 'Commissioner access required' });
        }
        return null;
}

async function upsertSeason(year) {
        await query(
                `INSERT INTO season_records (year) VALUES ($1) ON CONFLICT (year) DO NOTHING`,
                [year]
        );
}

export const actions = {
        updateSettings: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const buyIn = parseMoney(form.get('buyIn'));
                const pointsLeaderAmount = parseMoney(form.get('pointsLeaderAmount'));

                // The payout amounts drive the pool (see setPayouts), so here we only
                // update the buy-in / bonus and keep pot_split_pct in sync with the
                // existing pool share. pool_share is re-clamped to the new buy-in.
                const settings = await getSettings();
                const poolShare = Math.min(buyIn, Math.max(0, settings.poolShare));
                const potSplitPct = buyIn > 0 ? ((buyIn - poolShare) / buyIn) * 100 : 0;

                await query(
                        `UPDATE pot_settings
                         SET buy_in_amount = $1, pool_share = $2, pot_split_pct = $3, points_leader_amount = $4, updated_at = now()
                         WHERE id = 1`,
                        [buyIn, poolShare, potSplitPct, pointsLeaderAmount]
                );
                return { success: true, action: 'updateSettings' };
        },

        setPotTotal: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const target = parseMoney(form.get('potTotal'));

                await setManualPotTotal(target);
                return { success: true, action: 'setPotTotal' };
        },

        toggleBuyin: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const teamKey = (form.get('teamKey') || '').toString().trim();
                const memberName = (form.get('memberName') || '').toString().trim() || null;
                const paid = form.get('paid') === 'true';

                if (!teamKey) return fail(400, { error: 'Missing team key' });

                await query(
                        `INSERT INTO member_buyins (year, team_key, member_name, paid, updated_at)
                         VALUES ($1, $2, $3, $4, now())
                         ON CONFLICT (year, team_key)
                         DO UPDATE SET paid = EXCLUDED.paid, member_name = EXCLUDED.member_name, updated_at = now()`,
                        [year, teamKey, memberName, paid]
                );
                return { success: true, action: 'toggleBuyin', teamKey };
        },

        setPayouts: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const first = parseMoney(form.get('first'));
                const second = parseMoney(form.get('second'));
                const third = parseMoney(form.get('third'));

                // Payout dollars drive the pool. The total payout pool is the sum of the
                // place payouts; the per-member pool share = total / members, and the
                // remainder of the buy-in feeds the carryover pot. We also derive each
                // place's % of the pool for redisplay.
                const settings = await getSettings();
                const members = await getExpectedMembers(year);
                const totalPool = first + second + third;
                const firstPct = totalPool > 0 ? (first / totalPool) * 100 : 0;
                const secondPct = totalPool > 0 ? (second / totalPool) * 100 : 0;
                const thirdPct = totalPool > 0 ? (third / totalPool) * 100 : 0;

                await upsertSeason(year);
                await query(
                        `UPDATE season_records
                         SET payout_first = $2, payout_second = $3, payout_third = $4,
                                 payout_first_pct = $5, payout_second_pct = $6, payout_third_pct = $7,
                                 updated_at = now()
                         WHERE year = $1`,
                        [year, first, second, third, firstPct, secondPct, thirdPct]
                );

                // The active season's payouts set the global pool share / split. Past
                // seasons are left alone so editing history can't clobber current settings.
                if (year === getCurrentSeasonYear()) {
                        let poolShare = members > 0 ? totalPool / members : 0;
                        poolShare = Math.min(settings.buyIn, Math.max(0, poolShare));
                        const potSplitPct = settings.buyIn > 0 ? ((settings.buyIn - poolShare) / settings.buyIn) * 100 : 0;
                        await query(
                                `UPDATE pot_settings SET pool_share = $1, pot_split_pct = $2, updated_at = now() WHERE id = 1`,
                                [poolShare, potSplitPct]
                        );
                }
                return { success: true, action: 'setPayouts' };
        },

        togglePayoutPaid: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const place = (form.get('place') || '').toString();
                const paid = form.get('paid') === 'true';

                const column = { first: 'first_paid', second: 'second_paid', third: 'third_paid' }[place];
                const enabledColumn = { first: 'first_enabled', second: 'second_enabled', third: 'third_enabled' }[place];
                if (!column) return fail(400, { error: 'Invalid payout place' });

                await upsertSeason(year);
                // Only a place that is currently enabled can be marked paid — this guards
                // against a direct POST flipping paid on a disabled place, which would
                // reduce the pool the moment it's re-enabled.
                await query(
                        `UPDATE season_records SET ${column} = $2, updated_at = now()
                         WHERE year = $1 AND ${enabledColumn} = true`,
                        [year, paid]
                );
                return { success: true, action: 'togglePayoutPaid', place };
        },

        togglePayoutEnabled: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const place = (form.get('place') || '').toString();
                const enabled = form.get('enabled') === 'true';

                const column = { first: 'first_enabled', second: 'second_enabled', third: 'third_enabled' }[place];
                const paidColumn = { first: 'first_paid', second: 'second_paid', third: 'third_paid' }[place];
                if (!column) return fail(400, { error: 'Invalid payout place' });

                await upsertSeason(year);
                // When disabling a place, also clear its paid flag so no stale "paid" state
                // lingers to reduce the pool if the place is re-enabled later.
                await query(
                        `UPDATE season_records
                         SET ${column} = $2,
                                 ${paidColumn} = CASE WHEN $2 = false THEN false ELSE ${paidColumn} END,
                                 updated_at = now()
                         WHERE year = $1`,
                        [year, enabled]
                );
                return { success: true, action: 'togglePayoutEnabled', place };
        },

        recordPointsLeader: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const teamKey = (form.get('pointsLeaderTeamKey') || '').toString().trim() || null;
                const name = (form.get('pointsLeaderName') || '').toString().trim();

                await upsertSeason(year);
                await query(
                        `UPDATE season_records
                         SET points_leader_team_key = $2, points_leader_name = $3,
                                 points_leader_recorded = $4, updated_at = now()
                         WHERE year = $1`,
                        [year, teamKey, name || null, name.length > 0]
                );
                return { success: true, action: 'recordPointsLeader' };
        },

        togglePointsLeaderPaid: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const paid = form.get('paid') === 'true';

                await upsertSeason(year);
                await query(
                        `UPDATE season_records SET points_leader_paid = $2, updated_at = now() WHERE year = $1`,
                        [year, paid]
                );
                return { success: true, action: 'togglePointsLeaderPaid' };
        },

        recordChampion: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const teamKey = (form.get('championTeamKey') || '').toString().trim() || null;
                const name = (form.get('championName') || '').toString().trim();

                if (!name) return fail(400, { error: 'Champion name is required' });

                await upsertSeason(year);
                await query(
                        `UPDATE season_records
                         SET champion_team_key = $2, champion_name = $3, champion_recorded = true,
                                 champion_source = 'manual', updated_at = now()
                         WHERE year = $1`,
                        [year, teamKey, name]
                );
                return { success: true, action: 'recordChampion' };
        },

        awardPot: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());
                const winnerTeamKey = (form.get('winnerTeamKey') || '').toString().trim() || null;
                const winnerName = (form.get('winnerName') || '').toString().trim();

                if (!winnerName) return fail(400, { error: 'Winner name is required' });

                // The pot only resets when a champion goes back-to-back. Enforce that
                // business rule on the server — never trust the UI to gate this.
                const history = await getChampionHistory(locals.yahooClient, locals.leagueKey);
                const status = computeChampionStatus(history);
                if (!status.backToBackAchieved || !status.reigning) {
                        return fail(400, {
                                error: 'The pot can only be awarded after a champion wins back-to-back titles.'
                        });
                }

                const reigning = status.reigning;
                const matchesReigning =
                        (winnerTeamKey && reigning.teamKey && winnerTeamKey === reigning.teamKey) ||
                        (winnerName && reigning.name && winnerName.toLowerCase() === reigning.name.toLowerCase());
                if (!matchesReigning) {
                        return fail(400, {
                                error: `Only the back-to-back champion (${reigning.name}) can be awarded the pot.`
                        });
                }

                const amount = await getPotTotal();
                if (amount <= 0) {
                        return fail(400, { error: 'The pot is currently empty — nothing to award.' });
                }

                // Record the pot against the reigning champion's year (server-derived),
                // not the form's year. The "throne reset" check (potClaimed) looks up the
                // ledger by the reigning year, so these must stay in lockstep.
                await query(
                        `INSERT INTO pot_ledger (year, winner_team_key, winner_name, amount, note, created_at)
                         VALUES ($1, $2, $3, $4, $5, now())`,
                        [reigning.year, winnerTeamKey, winnerName, amount, 'Back-to-back pot awarded']
                );
                return { success: true, action: 'awardPot', amount };
        },

        backfillArchive: async ({ locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                if (!locals.yahooClient || !locals.leagueKey) {
                        return fail(400, { error: 'Yahoo login is required to backfill the archive.' });
                }

                const result = await backfillArchive(locals.yahooClient, locals.leagueKey);
                if (!result.ok) {
                        return fail(400, {
                                error: result.error || 'No seasons could be archived. Check that you are logged in to Yahoo.'
                        });
                }
                return { success: true, action: 'backfillArchive', backfill: result };
        },

        saveDraftPicks: async ({ request, locals }) => {
                const denied = await ensureCommissioner(locals);
                if (denied) return denied;

                const form = await request.formData();
                const year = parseYear(form.get('year'), getCurrentSeasonYear());

                let entries = [];
                try {
                        entries = JSON.parse(form.get('payload') || '[]');
                } catch {
                        entries = [];
                }
                if (!Array.isArray(entries)) entries = [];

                await saveDraftPickOwnership(year, entries);
                return { success: true, action: 'saveDraftPicks' };
        }
};
