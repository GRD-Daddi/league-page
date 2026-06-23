import { commissionerAllowlist } from '$lib/utils/leagueInfo.js';

/**
 * Determines whether the logged-in session belongs to the league commissioner.
 *
 * Primary signal: the Yahoo `is_commissioner` / `is_owner` flag captured on the
 * manager record at login. Backup: a manual allowlist (Yahoo GUID or email) in
 * leagueInfo.js for cases where Yahoo's flag is unavailable.
 */
export function isCommissioner(session) {
	if (!session?.userId) return false;

	const managerInfo = session.managerInfo;
	if (managerInfo?.metadata?.is_commissioner === true) return true;
	if (managerInfo?.is_owner === true) return true;

	const allowlist = Array.isArray(commissionerAllowlist) ? commissionerAllowlist : [];
	if (allowlist.length === 0) return false;

	const guid = session.userId;
	const email = managerInfo?.metadata?.email;
	if (guid && allowlist.includes(guid)) return true;
	if (email && allowlist.includes(email)) return true;

	return false;
}
