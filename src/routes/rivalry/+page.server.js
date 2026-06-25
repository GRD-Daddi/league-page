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

        const teamA = url.searchParams.get('team_a') || defaultA;
        const teamB = url.searchParams.get('team_b') || ownerKeys.find((k) => k !== teamA) || null;

        const [h2h, myRivals] = await Promise.all([
                teamA && teamB && teamA !== teamB ? getHeadToHead(teamA, teamB) : null,
                myOwner && ownerKeys.includes(myOwner) ? getOwnerRivalries(myOwner) : null
        ]);

        return { owners, teamA, teamB, h2h, myOwner, myRivals };
}
