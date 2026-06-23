import crypto from 'crypto';

const COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function getKey() {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		throw new Error('SESSION_SECRET environment variable is not set');
	}
	return crypto.createHash('sha256').update(secret).digest();
}

export function encodeSession(data) {
	const key = getKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const json = JSON.stringify(data);
	const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decodeSession(cookieValue) {
	if (!cookieValue) return null;
	try {
		const key = getKey();
		const buf = Buffer.from(cookieValue, 'base64url');
		if (buf.length < 28) return null;
		const iv = buf.subarray(0, 12);
		const tag = buf.subarray(12, 28);
		const ciphertext = buf.subarray(28);
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(tag);
		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
		return JSON.parse(decrypted);
	} catch {
		return null;
	}
}

export function setSessionCookie(cookies, sessionData) {
	const encoded = encodeSession(sessionData);
	cookies.set(COOKIE_NAME, encoded, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_MAX_AGE
	});
}

export function clearSessionCookie(cookies) {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export function readSessionCookie(cookies) {
	return decodeSession(cookies.get(COOKIE_NAME));
}

export { COOKIE_NAME };
