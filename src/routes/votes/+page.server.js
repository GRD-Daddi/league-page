import { fail } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/authGuard.js';
import { isCommissioner } from '$lib/server/commissioner.js';
import {
        listProposals,
        createProposal,
        approveProposal,
        rejectProposal,
        castBallot,
        commissionerClose,
        importHistoricalVotes
} from '$lib/server/votes.js';

// Vote data is gated behind login like the other league-data pages.
export async function load({ locals, url }) {
        requireAuth(locals, url);

        const proposals = await listProposals(locals.session);
        return {
                votes: {
                        ...proposals,
                        isCommissioner: isCommissioner(locals.session)
                }
        };
}

function requireLogin(locals) {
        if (!locals?.session?.userId) return fail(401, { error: 'You must be logged in.' });
        return null;
}

function parseId(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
}

export const actions = {
        create: async ({ request, locals }) => {
                const denied = requireLogin(locals);
                if (denied) return denied;

                const form = await request.formData();
                const title = (form.get('title') || '').toString();
                const description = (form.get('description') || '').toString();
                const type = (form.get('type') || 'yesno').toString();
                const deadline = (form.get('deadline') || '').toString().trim() || null;
                const options = form.getAll('options').map((o) => o.toString());

                const res = await createProposal(locals.session, { title, description, type, options, deadline });
                if (!res.ok) return fail(400, { error: res.error });
                return { success: true, action: 'create' };
        },

        vote: async ({ request, locals }) => {
                const denied = requireLogin(locals);
                if (denied) return denied;

                const form = await request.formData();
                const id = parseId(form.get('proposalId'));
                const choice = (form.get('choice') || '').toString();
                if (id === null) return fail(400, { error: 'Missing proposal.' });

                const res = await castBallot(locals.session, id, choice);
                if (!res.ok) return fail(400, { error: res.error });
                return { success: true, action: 'vote' };
        },

        approve: async ({ request, locals }) => {
                const denied = requireLogin(locals);
                if (denied) return denied;

                const form = await request.formData();
                const id = parseId(form.get('proposalId'));
                if (id === null) return fail(400, { error: 'Missing proposal.' });

                const res = await approveProposal(locals.session, id);
                if (!res.ok) return fail(res.error.includes('access') ? 403 : 400, { error: res.error });
                return { success: true, action: 'approve' };
        },

        reject: async ({ request, locals }) => {
                const denied = requireLogin(locals);
                if (denied) return denied;

                const form = await request.formData();
                const id = parseId(form.get('proposalId'));
                if (id === null) return fail(400, { error: 'Missing proposal.' });

                const res = await rejectProposal(locals.session, id);
                if (!res.ok) return fail(res.error.includes('access') ? 403 : 400, { error: res.error });
                return { success: true, action: 'reject' };
        },

        close: async ({ request, locals }) => {
                const denied = requireLogin(locals);
                if (denied) return denied;

                const form = await request.formData();
                const id = parseId(form.get('proposalId'));
                if (id === null) return fail(400, { error: 'Missing proposal.' });

                const res = await commissionerClose(locals.session, id);
                if (!res.ok) return fail(res.error.includes('access') ? 403 : 400, { error: res.error });
                return { success: true, action: 'close' };
        },

        import: async ({ request, locals }) => {
                const denied = requireLogin(locals);
                if (denied) return denied;

                const form = await request.formData();
                const csv = (form.get('csv') || '').toString();

                const res = await importHistoricalVotes(locals.session, csv);
                if (!res.ok) return fail(res.error.includes('access') ? 403 : 400, { error: res.error });
                return {
                        success: true,
                        action: 'import',
                        imported: res.imported,
                        skipped: res.skipped || [],
                        errors: res.errors || []
                };
        }
};
