import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
        if (!locals.session) {
                return json({ authenticated: false }, { status: 401 });
        }
        
        return json({
                authenticated: true,
                userId: locals.session.userId,
                managerInfo: locals.session.managerInfo,
                createdAt: locals.session.createdAt
        });
}
