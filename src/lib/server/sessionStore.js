const sessions = new Map();

const CLEANUP_INTERVAL = 60 * 60 * 1000;
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

let cleanupTimer = null;

function startCleanup() {
        if (cleanupTimer) return;
        
        cleanupTimer = setInterval(() => {
                const now = Date.now();
                for (const [sessionId, session] of sessions.entries()) {
                        if (session.expiresAt < now) {
                                sessions.delete(sessionId);
                        }
                }
        }, CLEANUP_INTERVAL);
}

export function createSession(userId, tokens, managerInfo = null) {
        const sessionId = crypto.randomUUID();
        const expiresAt = Date.now() + SESSION_MAX_AGE;
        
        const session = {
                userId,
                tokens: {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_in: tokens.expires_in,
                        token_time: tokens.token_time || Date.now()
                },
                expiresAt,
                managerInfo,
                createdAt: Date.now()
        };
        
        sessions.set(sessionId, session);
        startCleanup();
        
        return sessionId;
}

export function getSession(sessionId) {
        if (!sessionId) return null;
        
        const session = sessions.get(sessionId);
        if (!session) return null;
        
        if (session.expiresAt < Date.now()) {
                sessions.delete(sessionId);
                return null;
        }
        
        return session;
}

export function updateSession(sessionId, updates) {
        const session = sessions.get(sessionId);
        if (!session) return false;
        
        const updatedSession = {
                ...session,
                ...updates,
                expiresAt: Date.now() + SESSION_MAX_AGE
        };
        
        sessions.set(sessionId, updatedSession);
        return true;
}

export function deleteSession(sessionId) {
        return sessions.delete(sessionId);
}

export function isTokenExpired(session) {
        if (!session || !session.tokens) return true;
        
        const tokenTime = session.tokens.token_time || 0;
        const expiresIn = session.tokens.expires_in || 3600;
        const expirationTime = tokenTime + (expiresIn * 1000);
        
        return Date.now() >= expirationTime - (5 * 60 * 1000);
}
