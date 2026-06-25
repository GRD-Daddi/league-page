/**
 * Owner identity helpers.
 *
 * Yahoo masks manager GUIDs ("--hidden--") but exposes each manager's first-name
 * NICKNAME, which stays consistent across every season. That nickname is the
 * stable cross-season identity we key all league history on (the raw value is
 * stored in team_season_archive.manager_name / roster_archive.manager_name).
 *
 * `ownerDisplayName` turns a raw nickname into the label shown in the UI:
 * capitalized first name, with overrides for nicknames that aren't real names.
 */

const OVERRIDES = {
	'*': 'Mystery'
};

export function ownerDisplayName(nickname) {
	if (nickname == null || nickname === '') return 'Unknown';
	if (Object.prototype.hasOwnProperty.call(OVERRIDES, nickname)) return OVERRIDES[nickname];
	return nickname.charAt(0).toUpperCase() + nickname.slice(1);
}
