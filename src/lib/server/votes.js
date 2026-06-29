import { query } from './db.js';
import { isCommissioner } from './commissioner.js';

/**
 * League rule-change votes — server-authoritative logic.
 *
 * Proposals move pending -> open (commissioner approval) -> closed (deadline or
 * manual close). Each owner gets one ballot per proposal (upsert lets them change
 * it while the vote is open). Imported Google Forms votes are stored already
 * closed, with their tallies baked into imported_tally because there are no
 * per-owner ballots to recompute from.
 */

/**
 * Resolves the logged-in owner's stable identity + display name from the session.
 * ownerId backs the one-ballot-per-owner constraint; ownerName is for display.
 */
export function getCurrentOwner(session) {
        if (!session?.userId) return null;
        const meta = session.managerInfo?.metadata || {};
        const name =
                meta.team_name ||
                meta.manager_nickname ||
                session.managerInfo?.username ||
                session.managerInfo?.display_name ||
                'Owner';
        return { ownerId: session.userId, ownerName: name };
}

function normalizeOption(value) {
        return (value ?? '').toString().trim();
}

/**
 * Computes per-option counts + the winning option for a proposal. App votes tally
 * their ballots; imported votes use their stored imported_tally map. Returns
 * { counts: [{option, votes}], totalVotes, winningOption } with counts ordered to
 * match the proposal's option set (extra/unknown options are appended).
 */
function buildTally(proposal, ballots) {
        const options = Array.isArray(proposal.options) ? proposal.options.map(normalizeOption) : [];
        const tally = new Map();
        for (const opt of options) tally.set(opt, 0);

        if (proposal.source === 'imported' && proposal.imported_tally) {
                for (const [opt, n] of Object.entries(proposal.imported_tally)) {
                        const key = normalizeOption(opt);
                        tally.set(key, (tally.get(key) || 0) + (Number(n) || 0));
                }
        } else {
                for (const b of ballots || []) {
                        const key = normalizeOption(b.choice);
                        if (!key) continue;
                        tally.set(key, (tally.get(key) || 0) + 1);
                }
        }

        const counts = [...tally.entries()].map(([option, votes]) => ({ option, votes }));
        const totalVotes = counts.reduce((sum, c) => sum + c.votes, 0);

        // Winner = most votes; first-listed option breaks ties for determinism.
        let winningOption = null;
        let best = -1;
        for (const c of counts) {
                if (c.votes > best) {
                        best = c.votes;
                        winningOption = c.option;
                }
        }
        if (totalVotes === 0) winningOption = null;

        return { counts, totalVotes, winningOption };
}

/**
 * Auto-closes any open proposal whose deadline has passed, recording the winner.
 * Best-effort: run before listing so the page reflects expired votes without a
 * manual close. Returns the number of proposals closed.
 */
export async function autoCloseExpired() {
        const { rows } = await query(
                `SELECT id FROM vote_proposals
                 WHERE status = 'open' AND deadline IS NOT NULL AND deadline <= now()`
        );
        let closed = 0;
        for (const r of rows) {
                await closeProposal(r.id);
                closed++;
        }
        return closed;
}

/**
 * Builds the "who has voted / who hasn't" roster for an open proposal by joining
 * the league's owner list to the proposal's ballots.
 *
 * Privacy: this exposes only *whether* each owner has voted, never their choice.
 * Individual ballot choices stay anonymous both while the vote is open and after
 * it closes — only aggregate tallies are ever shown. The roster exists so a
 * commissioner can chase down owners who haven't voted before the deadline.
 *
 * Matching is defensive because Yahoo masks most managers' GUIDs as
 * "--hidden--" (see leagueAdapter): a ballot's owner_id is the voter's real
 * GUID, but a league-user entry may only carry a team_key fallback. We therefore
 * match on GUID, on the user's stable id, and finally on display name.
 */
function buildVoterRoster(leagueUsers, ballots) {
        const owners = Array.isArray(leagueUsers) ? leagueUsers : [];

        const votedIds = new Set();
        const votedNames = new Set();
        for (const b of ballots || []) {
                if (b.owner_id) votedIds.add(String(b.owner_id));
                if (b.owner_name) votedNames.add(b.owner_name.toString().trim().toLowerCase());
        }

        const roster = owners.map((u) => {
                const guid = u?.metadata?.yahoo_guid || null;
                const id = u?.user_id || null;
                const name = (u?.display_name || u?.username || 'Owner').toString();
                const voted =
                        (guid && votedIds.has(String(guid))) ||
                        (id && votedIds.has(String(id))) ||
                        votedNames.has(name.trim().toLowerCase());
                return { name, voted, avatar: u?.avatar || null };
        });

        // Owners who still need to vote float to the top so they're easy to chase.
        roster.sort((a, b) => {
                if (a.voted !== b.voted) return a.voted ? 1 : -1;
                return a.name.localeCompare(b.name);
        });

        const votedCount = roster.filter((r) => r.voted).length;
        return { roster, votedCount, totalOwners: roster.length };
}

/**
 * Returns the full vote board for the current session: open votes (with the
 * owner's own ballot), pending proposals (commissioner-relevant), and the closed
 * archive — every proposal annotated with its tally and winner.
 *
 * `leagueUsers` (from loadLeagueUsers) powers the voted/not-voted roster shown on
 * open proposals; pass an empty array to skip it.
 */
export async function listProposals(session, leagueUsers = []) {
        await autoCloseExpired();

        const owner = getCurrentOwner(session);
        const { rows: proposals } = await query(
                `SELECT id, title, description, type, options, status, deadline,
                        created_by, created_by_name, winning_option, source, imported_tally,
                        year, created_at, closed_at
                 FROM vote_proposals
                 ORDER BY created_at DESC, id DESC`
        );

        const ids = proposals.map((p) => p.id);
        const ballotsByProposal = new Map();
        let myBallots = new Map();
        if (ids.length) {
                const { rows: ballots } = await query(
                        `SELECT proposal_id, owner_id, owner_name, choice FROM vote_ballots
                         WHERE proposal_id = ANY($1::int[])`,
                        [ids]
                );
                for (const b of ballots) {
                        if (!ballotsByProposal.has(b.proposal_id)) ballotsByProposal.set(b.proposal_id, []);
                        ballotsByProposal.get(b.proposal_id).push(b);
                        if (owner && b.owner_id === owner.ownerId) myBallots.set(b.proposal_id, b.choice);
                }
        }

        const decorated = proposals.map((p) => {
                const ballots = ballotsByProposal.get(p.id) || [];
                const tally = buildTally(p, ballots);
                // Only open app votes have live per-owner ballots worth a roster;
                // imported/closed votes carry no recoverable per-owner data.
                const voterRoster =
                        p.status === 'open' && p.source !== 'imported'
                                ? buildVoterRoster(leagueUsers, ballots)
                                : null;
                return {
                        id: p.id,
                        title: p.title,
                        description: p.description || '',
                        type: p.type,
                        options: Array.isArray(p.options) ? p.options : [],
                        status: p.status,
                        deadline: p.deadline,
                        createdBy: p.created_by,
                        createdByName: p.created_by_name,
                        source: p.source,
                        year: p.year,
                        createdAt: p.created_at,
                        closedAt: p.closed_at,
                        winningOption: p.status === 'closed' ? p.winning_option : null,
                        counts: tally.counts,
                        totalVotes: tally.totalVotes,
                        myChoice: myBallots.get(p.id) || null,
                        voterRoster
                };
        });

        return {
                open: decorated.filter((p) => p.status === 'open'),
                pending: decorated.filter((p) => p.status === 'pending'),
                closed: decorated.filter((p) => p.status === 'closed')
        };
}

// Open votes closing within this window are flagged so the homepage banner can
// nudge owners who still haven't cast a ballot before the deadline lapses.
const CLOSING_SOON_MS = 48 * 60 * 60 * 1000;

/**
 * Lightweight notification feed for the homepage banner. Returns the open votes
 * the current owner still needs to weigh in on, newest deadline first, each
 * flagged when its deadline is approaching so the banner can surface a reminder.
 *
 * Shape: { open, pending, closingSoon, needsVote: [{ id, title, deadline,
 * closingSoon, hoursLeft }] }. Returns an empty feed for logged-out visitors.
 */
export async function getOpenVoteAlerts(session) {
        const owner = getCurrentOwner(session);
        if (!owner) return { open: 0, pending: 0, closingSoon: false, needsVote: [] };

        // Sweep expired votes first so a lapsed deadline never shows as "open".
        await autoCloseExpired();

        const { rows: open } = await query(
                `SELECT id, title, deadline FROM vote_proposals
                 WHERE status = 'open'
                 ORDER BY deadline ASC NULLS LAST, created_at DESC`
        );
        if (!open.length) return { open: 0, pending: 0, closingSoon: false, needsVote: [] };

        const ids = open.map((p) => p.id);
        const { rows: mine } = await query(
                `SELECT proposal_id FROM vote_ballots
                 WHERE owner_id = $1 AND proposal_id = ANY($2::int[])`,
                [owner.ownerId, ids]
        );
        const voted = new Set(mine.map((b) => b.proposal_id));

        const now = Date.now();
        const needsVote = open
                .filter((p) => !voted.has(p.id))
                .map((p) => {
                        const deadlineMs = p.deadline ? new Date(p.deadline).getTime() : null;
                        const msLeft = deadlineMs != null ? deadlineMs - now : null;
                        const closingSoon = msLeft != null && msLeft > 0 && msLeft <= CLOSING_SOON_MS;
                        return {
                                id: p.id,
                                title: p.title,
                                deadline: p.deadline,
                                closingSoon,
                                hoursLeft: msLeft != null ? Math.max(0, Math.ceil(msLeft / (60 * 60 * 1000))) : null
                        };
                });

        return {
                open: open.length,
                pending: needsVote.length,
                closingSoon: needsVote.some((p) => p.closingSoon),
                needsVote
        };
}

/**
 * Creates a new proposal in 'pending' state. Any logged-in owner may propose;
 * it stays hidden from voting until a commissioner approves it. Validates the
 * option set (yes/no is fixed; multiple-choice needs >= 2 distinct options).
 */
export async function createProposal(session, { title, description, type, options, deadline }) {
        const owner = getCurrentOwner(session);
        if (!owner) return { ok: false, error: 'You must be logged in to propose a vote.' };

        const cleanTitle = (title || '').toString().trim();
        if (!cleanTitle) return { ok: false, error: 'A title is required.' };

        const voteType = type === 'yesno' ? 'yesno' : 'multiple';
        let opts;
        if (voteType === 'yesno') {
                opts = ['Yes', 'No'];
        } else {
                const seen = new Set();
                opts = [];
                for (const raw of options || []) {
                        const o = normalizeOption(raw);
                        if (!o) continue;
                        const dedupeKey = o.toLowerCase();
                        if (seen.has(dedupeKey)) continue;
                        seen.add(dedupeKey);
                        opts.push(o);
                }
                if (opts.length < 2) {
                        return { ok: false, error: 'Add at least two distinct options for a multiple-choice vote.' };
                }
        }

        let deadlineValue = null;
        if (deadline) {
                const d = new Date(deadline);
                if (!Number.isNaN(d.getTime())) deadlineValue = d.toISOString();
        }

        await query(
                `INSERT INTO vote_proposals
                        (title, description, type, options, status, deadline, created_by, created_by_name, source)
                 VALUES ($1,$2,$3,$4::jsonb,'pending',$5,$6,$7,'app')`,
                [
                        cleanTitle,
                        (description || '').toString().trim() || null,
                        voteType,
                        JSON.stringify(opts),
                        deadlineValue,
                        owner.ownerId,
                        owner.ownerName
                ]
        );
        return { ok: true };
}

async function getProposalRow(id) {
        const { rows } = await query(`SELECT * FROM vote_proposals WHERE id = $1`, [id]);
        return rows[0] || null;
}

/**
 * Commissioner approval: moves a pending proposal to open so owners can vote.
 */
export async function approveProposal(session, id) {
        if (!isCommissioner(session)) return { ok: false, error: 'Commissioner access required.' };
        const proposal = await getProposalRow(id);
        if (!proposal) return { ok: false, error: 'Proposal not found.' };
        if (proposal.status !== 'pending') return { ok: false, error: 'Only pending proposals can be approved.' };
        await query(
                `UPDATE vote_proposals SET status = 'open', updated_at = now() WHERE id = $1`,
                [id]
        );
        return { ok: true };
}

/**
 * Commissioner rejection: removes a pending proposal entirely. Only pending
 * proposals (never an open/closed vote with real ballots) can be rejected.
 */
export async function rejectProposal(session, id) {
        if (!isCommissioner(session)) return { ok: false, error: 'Commissioner access required.' };
        const proposal = await getProposalRow(id);
        if (!proposal) return { ok: false, error: 'Proposal not found.' };
        if (proposal.status !== 'pending') return { ok: false, error: 'Only pending proposals can be rejected.' };
        await query(`DELETE FROM vote_proposals WHERE id = $1`, [id]);
        return { ok: true };
}

/**
 * Casts or changes the current owner's ballot. Allowed only while the proposal is
 * open and the chosen option is one of the proposal's options. Upsert keyed on
 * (proposal_id, owner_id) lets the owner change their vote until it closes.
 */
export async function castBallot(session, id, choice) {
        const owner = getCurrentOwner(session);
        if (!owner) return { ok: false, error: 'You must be logged in to vote.' };

        const proposal = await getProposalRow(id);
        if (!proposal) return { ok: false, error: 'Proposal not found.' };
        if (proposal.status !== 'open') return { ok: false, error: 'This vote is not open.' };

        // Deadline can lapse between page load and submit — close + reject the vote.
        if (proposal.deadline && new Date(proposal.deadline).getTime() <= Date.now()) {
                await closeProposal(id);
                return { ok: false, error: 'This vote has closed.' };
        }

        const opts = Array.isArray(proposal.options) ? proposal.options.map(normalizeOption) : [];
        const cleanChoice = normalizeOption(choice);
        if (!opts.includes(cleanChoice)) return { ok: false, error: 'That option is not valid for this vote.' };

        await query(
                `INSERT INTO vote_ballots (proposal_id, owner_id, owner_name, choice, updated_at)
                 VALUES ($1,$2,$3,$4, now())
                 ON CONFLICT (proposal_id, owner_id)
                 DO UPDATE SET choice = EXCLUDED.choice, owner_name = EXCLUDED.owner_name, updated_at = now()`,
                [id, owner.ownerId, owner.ownerName, cleanChoice]
        );
        return { ok: true };
}

/**
 * Closes a proposal and records its winning option from the final tally. Used by
 * both the commissioner's manual close and the deadline auto-close, so it does not
 * itself check permissions — callers gate that.
 */
export async function closeProposal(id) {
        const proposal = await getProposalRow(id);
        if (!proposal) return { ok: false, error: 'Proposal not found.' };
        if (proposal.status === 'closed') return { ok: true };

        const { rows: ballots } = await query(
                `SELECT choice FROM vote_ballots WHERE proposal_id = $1`,
                [id]
        );
        const tally = buildTally(proposal, ballots);

        await query(
                `UPDATE vote_proposals
                 SET status = 'closed', winning_option = $2, closed_at = now(), updated_at = now()
                 WHERE id = $1`,
                [id, tally.winningOption]
        );
        return { ok: true, winningOption: tally.winningOption };
}

/**
 * Commissioner-only manual close.
 */
export async function commissionerClose(session, id) {
        if (!isCommissioner(session)) return { ok: false, error: 'Commissioner access required.' };
        const proposal = await getProposalRow(id);
        if (!proposal) return { ok: false, error: 'Proposal not found.' };
        if (proposal.status !== 'open') return { ok: false, error: 'Only open votes can be closed.' };
        return closeProposal(id);
}

/**
 * Detects the field delimiter used by a CSV by counting unquoted candidate
 * delimiters in the header line. Supports comma (Google Forms / US Sheets),
 * semicolon (European Excel locales) and tab (TSV exports). Defaults to comma
 * when nothing clearly wins, so well-formed comma CSVs are never misread.
 */
function detectDelimiter(text) {
        const firstLine = (text || '').split('\n')[0] || '';
        const candidates = [',', ';', '\t'];
        let best = ',';
        let bestCount = 0;
        for (const d of candidates) {
                let count = 0;
                let inQuotes = false;
                for (let i = 0; i < firstLine.length; i++) {
                        const ch = firstLine[i];
                        if (ch === '"') {
                                if (inQuotes && firstLine[i + 1] === '"') i++;
                                else inQuotes = !inQuotes;
                        } else if (ch === d && !inQuotes) {
                                count++;
                        }
                }
                if (count > bestCount) {
                        bestCount = count;
                        best = d;
                }
        }
        return best;
}

/**
 * Parses CSV text into an array of string-cell rows. Handles quoted fields,
 * escaped quotes ("") and delimiters/newlines inside quotes — the format Google
 * Forms / Sheets exports use. A leading UTF-8 BOM (common in Excel exports) is
 * stripped so the first header is not corrupted. The delimiter is auto-detected
 * (comma / semicolon / tab) unless one is passed explicitly. Blank lines dropped.
 */
export function parseCsv(text, delimiter) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        let s = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Strip a leading UTF-8 BOM so the first header cell stays clean.
        if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
        const delim = delimiter || detectDelimiter(s);

        for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                if (inQuotes) {
                        if (ch === '"') {
                                if (s[i + 1] === '"') {
                                        field += '"';
                                        i++;
                                } else {
                                        inQuotes = false;
                                }
                        } else {
                                field += ch;
                        }
                } else if (ch === '"') {
                        inQuotes = true;
                } else if (ch === delim) {
                        row.push(field);
                        field = '';
                } else if (ch === '\n') {
                        row.push(field);
                        rows.push(row);
                        row = [];
                        field = '';
                } else {
                        field += ch;
                }
        }
        // Flush the final field/row if there's anything pending.
        if (field.length > 0 || row.length > 0) {
                row.push(field);
                rows.push(row);
        }

        // Drop fully-empty rows.
        return rows.filter((r) => r.some((c) => (c || '').trim() !== ''));
}

const IDENTITY_HEADERS = new Set(['timestamp', 'username', 'email', 'email address', 'name']);

/**
 * Imports historical votes from pasted Google Forms / spreadsheet CSV.
 *
 * Expects the wide Google Forms response format: a header row, then one row per
 * respondent. The first columns are identity columns (Timestamp / Username /
 * Email) and every remaining column is a question. Each question column becomes a
 * closed, imported proposal whose options + tallies are derived by counting the
 * answers down that column; the winning option is the most-voted answer. The
 * season year is taken from the first parseable timestamp.
 *
 * Returns { ok, imported, skipped, errors } — malformed input surfaces errors
 * rather than silently dropping rows.
 */
export async function importHistoricalVotes(session, csvText) {
        if (!isCommissioner(session)) return { ok: false, error: 'Commissioner access required.' };

        const text = (csvText || '').trim();
        if (!text) return { ok: false, error: 'Paste the CSV data to import.' };

        let rows;
        try {
                rows = parseCsv(text);
        } catch (e) {
                return { ok: false, error: `Could not parse the CSV: ${e.message}` };
        }
        if (rows.length < 2) {
                return { ok: false, error: 'Need a header row plus at least one response row.' };
        }

        const header = rows[0].map((h) => (h || '').trim());
        const dataRows = rows.slice(1);

        // Question columns are everything that isn't an identity column.
        const questionCols = [];
        for (let c = 0; c < header.length; c++) {
                const name = header[c].toLowerCase();
                if (IDENTITY_HEADERS.has(name)) continue;
                if (!header[c]) continue;
                questionCols.push(c);
        }
        if (!questionCols.length) {
                return {
                        ok: false,
                        error: 'No question columns found. Expecting a Google Forms export with Timestamp/Username columns followed by question columns.'
                };
        }

        // Derive the season year from the first parseable timestamp in any row.
        let year = null;
        const tsCol = header.findIndex((h) => h.toLowerCase() === 'timestamp');
        for (const r of dataRows) {
                const candidate = tsCol >= 0 ? r[tsCol] : r[0];
                const d = new Date((candidate || '').trim());
                if (!Number.isNaN(d.getTime())) {
                        year = d.getFullYear();
                        break;
                }
        }

        let imported = 0;
        const skipped = [];
        const errors = [];
        // Two columns can share a header; only the first is imported (the second
        // would otherwise collide on title+year), so flag the rest explicitly.
        const seenTitles = new Set();

        for (const col of questionCols) {
                const questionTitle = header[col];

                const titleKey = questionTitle.toLowerCase();
                if (seenTitles.has(titleKey)) {
                        skipped.push(`"${questionTitle}" — duplicate column in this file`);
                        continue;
                }
                seenTitles.add(titleKey);

                // Tally distinct answers down the column, preserving first-seen order.
                const order = [];
                const tally = new Map();
                for (const r of dataRows) {
                        const answer = normalizeOption(r[col]);
                        if (!answer) continue;
                        if (!tally.has(answer)) {
                                tally.set(answer, 0);
                                order.push(answer);
                        }
                        tally.set(answer, tally.get(answer) + 1);
                }

                if (!order.length) {
                        skipped.push(`"${questionTitle}" — no responses`);
                        continue;
                }

                // Skip duplicate re-imports of the same question for the same season.
                const { rows: existing } = await query(
                        `SELECT id FROM vote_proposals
                         WHERE source = 'imported' AND title = $1 AND year IS NOT DISTINCT FROM $2`,
                        [questionTitle, year]
                );
                if (existing.length) {
                        skipped.push(`"${questionTitle}" — already imported`);
                        continue;
                }

                const options = order;
                const tallyObj = {};
                for (const opt of order) tallyObj[opt] = tally.get(opt);

                // Winner = most votes, first-listed breaks ties (matches buildTally).
                let winningOption = order[0];
                let best = -1;
                for (const opt of order) {
                        if (tally.get(opt) > best) {
                                best = tally.get(opt);
                                winningOption = opt;
                        }
                }

                const isYesNo =
                        options.length === 2 &&
                        options.every((o) => ['yes', 'no'].includes(o.toLowerCase()));

                try {
                        await query(
                                `INSERT INTO vote_proposals
                                        (title, description, type, options, status, winning_option, source, imported_tally, year, closed_at)
                                 VALUES ($1,$2,$3,$4::jsonb,'closed',$5,'imported',$6::jsonb,$7, now())`,
                                [
                                        questionTitle,
                                        'Imported from a historical Google Forms vote.',
                                        isYesNo ? 'yesno' : 'multiple',
                                        JSON.stringify(options),
                                        winningOption,
                                        JSON.stringify(tallyObj),
                                        year
                                ]
                        );
                        imported++;
                } catch (e) {
                        errors.push(`"${questionTitle}" — ${e.message}`);
                }
        }

        if (imported === 0 && errors.length === 0 && skipped.length) {
                return { ok: false, error: `Nothing imported. ${skipped.join('; ')}.`, skipped };
        }

        return { ok: true, imported, skipped, errors, year };
}
