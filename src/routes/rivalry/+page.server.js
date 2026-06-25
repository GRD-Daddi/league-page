import { requireAuth } from '$lib/server/authGuard.js';
import {
        getArchiveOwners,
        getHeadToHead,
        getOwnerByTeamName,
        getOwnerRivalries
} from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
        requireAuth(locals, url);

        const owners = await getArchiveOwners();
        const ownerKeys = owners.map((o) => o.owner);

        // Default the first slot to the logged-in user's own owner identity (resolved
        // from their current team name); otherwise fall back to the first owner.
        const myTeam = locals.session?.managerInfo?.metadata?.team_name || null;
        const myOwner = myTeam ? await getOwnerByTeamName(myTeam) : null;
        const defaultA = myOwner && ownerKeys.includes(myOwner) ? myOwner : ownerKeys[0] || null;

        // teamA is the "main team" that drives every rivalry metric below; it doubles
        // as the first slot in the head-to-head picker. Defaults to the logged-in
        // user's owner, but the user can switch it to view any manager's rivalries.
        // Query params are validated against known owners so hand-edited URLs can't
        // produce an unknown/self-matched comparison.
        const reqA = url.searchParams.get('team_a');
        const reqB = url.searchParams.get('team_b');
        const teamA = (reqA && ownerKeys.includes(reqA) ? reqA : defaultA) || null;
        const teamB =
                (reqB && ownerKeys.includes(reqB) && reqB !== teamA ? reqB : null) ||
                ownerKeys.find((k) => k !== teamA) ||
                null;

        const [h2h, rivals] = await Promise.all([
                teamA && teamB && teamA !== teamB ? getHeadToHead(teamA, teamB) : null,
                teamA && ownerKeys.includes(teamA) ? getOwnerRivalries(teamA) : null
        ]);

        return { owners, teamA, teamB, h2h, myOwner, rivals };
}
