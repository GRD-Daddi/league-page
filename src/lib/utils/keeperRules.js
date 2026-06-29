// League keeper rules — client-safe constants and helpers. Imported by both the
// server-side keeper engine and Svelte pages, so this file must NOT pull in any
// server-only code.

// A player may be designated a keeper for at most this many seasons in total.
// The season a player is drafted/acquired counts as season 1, so a player can be
// kept for at most (KEEPER_MAX_SEASONS - 1) additional seasons after that.
export const KEEPER_MAX_SEASONS = 3;

// A player acquired off waivers / free agency (i.e. never drafted in the current
// keeper lineage) carries this draft round as their keeper cost.
export const WAIVER_COST_ROUND = 6;

/**
 * Keeper years remaining (including the upcoming season) for a lineage that began
 * in `acquisitionYear`, evaluated for `upcomingYear`. >= 1 means the player can
 * still be kept; <= 0 means the 3-season designation is used up. Returns null
 * when the acquisition year is unknown.
 */
export function keeperYearsRemaining(acquisitionYear, upcomingYear) {
        if (!Number.isFinite(acquisitionYear) || !Number.isFinite(upcomingYear)) return null;
        return KEEPER_MAX_SEASONS - (upcomingYear - acquisitionYear);
}
