/**
 * Builds the upcoming draft's pick order from the most recent completed season's
 * final standings.
 *
 * League rule: the draft order is the REVERSE of last completed season's FINAL
 * standings. The worst finisher (consolation-bracket winner, highest
 * `final_rank` number) gets Pick 1; the champion (`final_rank` 1) picks last.
 * Callers therefore pass standings already ordered WORST-FIRST (final_rank
 * DESC — see archive.getLatestCompletedStandings) and we number them 1..N.
 *
 * Each entry is bridged to the CURRENT league's team/owner so the planning view
 * shows present-day names. Bridging is by owner identity (manager nickname)
 * first, then an unambiguous team-name match — never the `.t.N` team index,
 * which Yahoo reshuffles every season. When no current match exists we fall back
 * to the archived names so the order still renders.
 */

// Normalize an identity for cross-season matching (case/space-insensitive).
// Yahoo masks hidden managers as "--hidden--"; treat that as no identity so a
// hidden owner never produces a spurious match.
function normalize(name) {
        const n = (name || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
        if (!n || n === '--hidden--') return '';
        return n;
}

export function buildDraftOrder(standings = [], currentUsers = []) {
        // Index current league owners by manager identity and by team name, dropping
        // any ambiguous (duplicated) keys so a collision can't mis-assign a name.
        const currentByManager = new Map();
        const currentByName = new Map();
        const dupManager = new Set();
        const dupName = new Set();
        for (const u of currentUsers || []) {
                const meta = u?.metadata || {};
                const entry = {
                        teamKey: meta.team_key || null,
                        teamName: meta.team_name || u?.display_name || null,
                        managerName: meta.manager_nickname || u?.display_name || null
                };
                const mn = normalize(meta.manager_nickname || u?.display_name);
                if (mn) {
                        if (currentByManager.has(mn)) dupManager.add(mn);
                        else currentByManager.set(mn, entry);
                }
                const tn = normalize(meta.team_name);
                if (tn) {
                        if (currentByName.has(tn)) dupName.add(tn);
                        else currentByName.set(tn, entry);
                }
        }
        for (const mn of dupManager) currentByManager.delete(mn);
        for (const tn of dupName) currentByName.delete(tn);

        const order = [];
        let pick = 1;
        for (const row of standings || []) {
                const mn = normalize(row?.manager_name);
                const tn = normalize(row?.team_name);
                const current = (mn && currentByManager.get(mn)) || (tn && currentByName.get(tn)) || null;
                const archivedManager =
                        row?.manager_name && row.manager_name !== '--hidden--' ? row.manager_name : null;
                order.push({
                        pick: pick++,
                        finalRank: row?.final_rank ?? null,
                        teamKey: current?.teamKey || row?.team_key || null,
                        teamName: current?.teamName || row?.team_name || 'Unknown Team',
                        managerName: current?.managerName || archivedManager
                });
        }
        return order;
}
