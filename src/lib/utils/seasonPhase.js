import { seasonPhase as configuredPhase } from '$lib/utils/leagueInfo.js';

export const SEASON_PHASES = ['preseason', 'regular', 'playoffs', 'offseason'];

/**
 * Resolves the home page season phase. When the league config sets an explicit
 * phase it wins; otherwise we derive it from Yahoo's league draft status and the
 * NFL calendar state. Always returns one of SEASON_PHASES.
 */
export function resolveSeasonPhase(nflState = null, leagueData = null) {
	const override = String(configuredPhase || 'auto').toLowerCase();
	if (SEASON_PHASES.includes(override)) return override;

	const status = leagueData?.status;
	if (status === 'pre_draft' || status === 'drafting') return 'preseason';
	if (status === 'complete') return 'offseason';
	if (status === 'in_season') {
		return nflState?.season_type === 'post' ? 'playoffs' : 'regular';
	}

	const type = nflState?.season_type;
	if (type === 'regular') return 'regular';
	if (type === 'post') return 'playoffs';
	if (type === 'pre') return 'preseason';
	if (type === 'off') return 'offseason';

	return 'regular';
}

/**
 * Phases where the home page shows the draft-prep view (last season's trophies,
 * returning players, and each team's draft picks) instead of live standings.
 */
export function isDraftPrepPhase(phase) {
	return phase === 'preseason' || phase === 'offseason';
}

const PHASE_LABELS = {
	preseason: 'Preseason',
	regular: 'Regular Season',
	playoffs: 'Playoffs',
	offseason: 'Offseason'
};

export function seasonPhaseLabel(phase) {
	return PHASE_LABELS[phase] || 'Season';
}
