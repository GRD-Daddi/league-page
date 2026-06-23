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
        backfillArchive
} from '$lib/server/pot.js';
import { getArchivedSeasons } from '$lib/server/archive.js';

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

        return {
                commissioner: {
                        ...data,
                        leagueUsersAvailable: leagueUsers.length > 0,
                        archivedSeasons
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
                let split = parseFloat(form.get('potSplitPct'));
                if (!Number.isFinite(split) || split < 0) split = 0;
                if (split > 100) split = 100;
                const pointsLeaderAmount = parseMoney(form.get('pointsLeaderAmount'));

                await query(
                        `UPDATE pot_settings
                         SET buy_in_amount = $1, pot_split_pct = $2, points_leader_amount = $3, updated_at = now()
                         WHERE id = 1`,
                        [buyIn, split, pointsLeaderAmount]
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

                await upsertSeason(year);
                await query(
                        `UPDATE season_records
                         SET payout_first = $2, payout_second = $3, payout_third = $4, updated_at = now()
                         WHERE year = $1`,
                        [year, first, second, third]
                );
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
        }
};
