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
        computeChampionStatus
} from '$lib/server/pot.js';

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

        return {
                commissioner: {
                        ...data,
                        leagueUsersAvailable: leagueUsers.length > 0
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

                await query(
                        `UPDATE pot_settings SET buy_in_amount = $1, pot_split_pct = $2, updated_at = now() WHERE id = 1`,
                        [buyIn, split]
                );
                return { success: true, action: 'updateSettings' };
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
                if (!column) return fail(400, { error: 'Invalid payout place' });

                await upsertSeason(year);
                await query(`UPDATE season_records SET ${column} = $2, updated_at = now() WHERE year = $1`, [
                        year,
                        paid
                ]);
                return { success: true, action: 'togglePayoutPaid', place };
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
                         SET champion_team_key = $2, champion_name = $3, champion_recorded = true, updated_at = now()
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

                await query(
                        `INSERT INTO pot_ledger (year, winner_team_key, winner_name, amount, note, created_at)
                         VALUES ($1, $2, $3, $4, $5, now())`,
                        [year, winnerTeamKey, winnerName, amount, 'Back-to-back pot awarded']
                );
                return { success: true, action: 'awardPot', amount };
        }
};
