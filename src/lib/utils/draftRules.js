// League rule: a team may hold at most this many draft picks in any single round.
// Codified in the constitution (§1.2.6), surfaced across every draft-pick UI, and
// enforced in the commissioner editor (with a server-side backstop in
// $lib/server/draftPicks.js). Keep this client-safe — it is imported by Svelte
// components, so it must not pull in any server-only code.
export const MAX_PICKS_PER_ROUND = 2;
