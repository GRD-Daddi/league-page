import { describe, it, expect, beforeEach, vi } from 'vitest';

// importHistoricalVotes hits the DB (query) and the commissioner gate. Both are
// mocked: query records inserts in-memory and answers the dedup SELECT from that
// same store, so the importer's tallying / dedup / error behaviour can be
// asserted without a live Postgres or OAuth session. parseCsv is pure and is
// tested directly. These checks lock in that differently-shaped or malformed
// exports either parse correctly or fail loudly — never silently mis-tally.

let inserted;

vi.mock('./db.js', () => ({
        query: vi.fn(async (sql, params) => {
                if (/SELECT id FROM vote_proposals/.test(sql)) {
                        const [title, year] = params;
                        const matches = inserted.filter((r) => r.title === title && r.year === year);
                        return { rows: matches.map((_, i) => ({ id: i + 1 })) };
                }
                if (/INSERT INTO vote_proposals/.test(sql)) {
                        const [title, , type, optionsJson, winningOption, tallyJson, year] = params;
                        inserted.push({
                                title,
                                type,
                                options: JSON.parse(optionsJson),
                                winningOption,
                                tally: JSON.parse(tallyJson),
                                year
                        });
                        return { rows: [] };
                }
                return { rows: [] };
        })
}));

vi.mock('./commissioner.js', () => ({ isCommissioner: (session) => session?.isCommish === true }));

const { parseCsv, importHistoricalVotes } = await import('./votes.js');

const COMMISH = { isCommish: true };

beforeEach(() => {
        inserted = [];
});

// The real Google Forms export shipped in attached_assets (wide format, fully
// quoted fields, EST timestamps). Kept inline so the test is self-contained.
const REAL_SAMPLE = `"Timestamp","Username","Keeper league this year?","Commish Veto - group vote if collusion, all need to agree","Should we talk about weekly or season long payouts?","$50 of each teams buy-in, goes towards a pot that keeps growing, till someone wins b2b years. That winner gets the full pot.. conditional on keeper league"
"2021/08/04 9:53:56 AM EST","mattjdaddi@gmail.com","Yes - 3 keepers","Yes","Yes","Yes"
"2021/08/04 10:04:24 AM EST","ryanmdaddi@gmail.com","Yes - 3 keepers","Yes","Yes","No"
"2021/08/04 10:05:53 AM EST","ics152@gmail.com","Yes - 2 keepers","Yes","Yes","Yes"
"2021/08/04 10:06:05 AM EST","weaponx20x@yahoo.com","Yes - 2 keepers","Yes","Yes","No"
"2021/08/04 10:06:56 AM EST","anthonyliriano92@gmail.com","Yes - 2 keepers","Yes","Yes","No"
"2021/08/04 10:18:30 AM EST","csper11487@aol.com","Yes - 2 keepers","Yes","No","No"
"2021/08/04 10:26:18 AM EST","jessewarzocha@yahoo.com","Yes - 2 keepers","Yes","No","Yes"
"2021/08/04 6:18:13 PM EST","clayman2109@gmail.com","Yes - 3 keepers","Yes","No","Yes"
"2021/08/04 7:00:56 PM EST","tyreilly2511@gmail.com","No keepers","Yes","Yes","Yes"
"2021/08/04 8:04:46 PM EST","slamb923@gmail.com","Yes - 2 keepers","Yes","Yes","Yes"`;

describe('parseCsv', () => {
        it('parses a plain comma CSV into string-cell rows', () => {
                const rows = parseCsv('a,b,c\n1,2,3');
                expect(rows).toEqual([
                        ['a', 'b', 'c'],
                        ['1', '2', '3']
                ]);
        });

        it('keeps commas inside quoted fields as one cell', () => {
                const rows = parseCsv('Q1\n"Yes, definitely"\n"No, never"');
                expect(rows).toEqual([['Q1'], ['Yes, definitely'], ['No, never']]);
        });

        it('unescapes doubled quotes inside quoted fields', () => {
                const rows = parseCsv('Q1\n"She said ""hi"""');
                expect(rows).toEqual([['Q1'], ['She said "hi"']]);
        });

        it('keeps newlines inside quoted fields', () => {
                const rows = parseCsv('Q1\n"line one\nline two"\nplain');
                expect(rows).toEqual([['Q1'], ['line one\nline two'], ['plain']]);
        });

        it('normalises CRLF line endings', () => {
                const rows = parseCsv('a,b\r\n1,2\r\n');
                expect(rows).toEqual([
                        ['a', 'b'],
                        ['1', '2']
                ]);
        });

        it('drops fully blank lines', () => {
                const rows = parseCsv('a,b\n\n1,2\n\n');
                expect(rows).toEqual([
                        ['a', 'b'],
                        ['1', '2']
                ]);
        });

        it('strips a leading UTF-8 BOM from the first header', () => {
                const rows = parseCsv('\uFEFFTimestamp,Username,Q1\nt,u,Yes');
                expect(rows[0][0]).toBe('Timestamp');
        });

        it('auto-detects a semicolon delimiter (European Excel)', () => {
                const rows = parseCsv('Timestamp;Username;Q1\nt;u;Yes');
                expect(rows).toEqual([
                        ['Timestamp', 'Username', 'Q1'],
                        ['t', 'u', 'Yes']
                ]);
        });

        it('auto-detects a tab delimiter (TSV export)', () => {
                const rows = parseCsv('Timestamp\tUsername\tQ1\nt\tu\tYes');
                expect(rows).toEqual([
                        ['Timestamp', 'Username', 'Q1'],
                        ['t', 'u', 'Yes']
                ]);
        });

        it('does not split on a semicolon that lives inside a comma CSV field', () => {
                const rows = parseCsv('Timestamp,Username,"A; B; C"\nt,u,Yes');
                expect(rows[0]).toEqual(['Timestamp', 'Username', 'A; B; C']);
        });
});

describe('importHistoricalVotes', () => {
        it('rejects non-commissioners', async () => {
                const res = await importHistoricalVotes({ isCommish: false }, REAL_SAMPLE);
                expect(res.ok).toBe(false);
                expect(res.error).toMatch(/Commissioner/);
                expect(inserted).toHaveLength(0);
        });

        it('rejects empty input', async () => {
                const res = await importHistoricalVotes(COMMISH, '   ');
                expect(res.ok).toBe(false);
                expect(inserted).toHaveLength(0);
        });

        it('rejects a header-only file with no response rows', async () => {
                const res = await importHistoricalVotes(COMMISH, 'Timestamp,Username,Q1');
                expect(res.ok).toBe(false);
                expect(res.error).toMatch(/header row plus at least one response/i);
        });

        it('rejects a file with only identity columns and no questions', async () => {
                const res = await importHistoricalVotes(COMMISH, 'Timestamp,Username,Email\nt,u,e');
                expect(res.ok).toBe(false);
                expect(res.error).toMatch(/No question columns/i);
        });

        it('imports the real Google Forms sample with correct tallies', async () => {
                const res = await importHistoricalVotes(COMMISH, REAL_SAMPLE);
                expect(res.ok).toBe(true);
                expect(res.imported).toBe(4);
                expect(res.year).toBe(2021);

                const keeper = inserted.find((p) => p.title === 'Keeper league this year?');
                expect(keeper.type).toBe('multiple');
                expect(keeper.tally).toEqual({
                        'Yes - 3 keepers': 3,
                        'Yes - 2 keepers': 6,
                        'No keepers': 1
                });
                expect(keeper.winningOption).toBe('Yes - 2 keepers');

                const b2b = inserted.find((p) => p.title.startsWith('$50 of each'));
                expect(b2b.type).toBe('yesno');
                expect(b2b.tally).toEqual({ Yes: 6, No: 4 });
                expect(b2b.winningOption).toBe('Yes');
        });

        it('is idempotent — re-importing the same file imports nothing new', async () => {
                await importHistoricalVotes(COMMISH, REAL_SAMPLE);
                const before = inserted.length;
                const res = await importHistoricalVotes(COMMISH, REAL_SAMPLE);
                // Everything is already present, so the importer reports nothing imported
                // (ok:false) rather than silently creating duplicate tallies.
                expect(res.ok).toBe(false);
                expect(res.error).toMatch(/Nothing imported/i);
                expect(res.skipped.length).toBe(before);
                expect(res.skipped.every((s) => /already imported/.test(s))).toBe(true);
                expect(inserted).toHaveLength(before);
        });

        it('ignores empty answer cells when tallying', async () => {
                const csv = ['Timestamp,Username,Q1', '2022/01/01,a,Yes', '2022/01/01,b,', '2022/01/01,c,No'].join(
                        '\n'
                );
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                const q = inserted.find((p) => p.title === 'Q1');
                expect(q.tally).toEqual({ Yes: 1, No: 1 });
                expect(q.year).toBe(2022);
        });

        it('treats a quoted answer containing a comma as a single option', async () => {
                const csv = [
                        'Timestamp,Username,Q1',
                        '2023/01/01,a,"Trade, then keep"',
                        '2023/01/01,b,"Trade, then keep"',
                        '2023/01/01,c,Drop'
                ].join('\n');
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                const q = inserted.find((p) => p.title === 'Q1');
                expect(q.tally).toEqual({ 'Trade, then keep': 2, Drop: 1 });
                expect(q.winningOption).toBe('Trade, then keep');
        });

        it('imports a semicolon-delimited export correctly', async () => {
                const csv = ['Timestamp;Username;Q1', '2024/01/01;a;Yes', '2024/01/01;b;Yes', '2024/01/01;c;No'].join(
                        '\n'
                );
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                expect(res.imported).toBe(1);
                const q = inserted.find((p) => p.title === 'Q1');
                expect(q.tally).toEqual({ Yes: 2, No: 1 });
                expect(q.year).toBe(2024);
        });

        it('handles a leading BOM without creating a bogus Timestamp question', async () => {
                const csv = '\uFEFFTimestamp,Username,Q1\n2025/01/01,a,Yes\n2025/01/01,b,No';
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                expect(res.imported).toBe(1);
                expect(inserted.map((p) => p.title)).toEqual(['Q1']);
                expect(inserted[0].year).toBe(2025);
        });

        it('skips duplicate question columns within the same file predictably', async () => {
                const csv = [
                        'Timestamp,Username,Keep?,Keep?',
                        '2026/01/01,a,Yes,No',
                        '2026/01/01,b,Yes,No'
                ].join('\n');
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                expect(res.imported).toBe(1);
                expect(res.skipped).toEqual(['"Keep?" — duplicate column in this file']);
                const kept = inserted.filter((p) => p.title === 'Keep?');
                expect(kept).toHaveLength(1);
                // The first column wins; its tally is not polluted by the second column.
                expect(kept[0].tally).toEqual({ Yes: 2 });
        });

        it('imports with year=null when no timestamp is parseable', async () => {
                const csv = ['Question,Q1', 'not-a-date,Yes', 'still-not,No'].join('\n');
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                expect(res.year).toBe(null);
        });

        it('tolerates ragged rows with missing trailing cells', async () => {
                const csv = ['Timestamp,Username,Q1,Q2', '2027/01/01,a,Yes', '2027/01/01,b,No,Maybe'].join('\n');
                const res = await importHistoricalVotes(COMMISH, csv);
                expect(res.ok).toBe(true);
                const q1 = inserted.find((p) => p.title === 'Q1');
                const q2 = inserted.find((p) => p.title === 'Q2');
                expect(q1.tally).toEqual({ Yes: 1, No: 1 });
                expect(q2.tally).toEqual({ Maybe: 1 });
        });
});
