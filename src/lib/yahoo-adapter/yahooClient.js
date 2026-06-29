import YahooFantasy from 'yahoo-fantasy';

let yahooClient = null;

function getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
                return process.env[name];
        }
        if (typeof import.meta !== 'undefined' && import.meta.env) {
                return import.meta.env[name];
        }
        return undefined;
}

export function initializeYahooClient(appKey, appSecret, tokenCallback = null, redirectUri = null) {
        if (!yahooClient) {
                yahooClient = new YahooFantasy(appKey, appSecret, tokenCallback, redirectUri);
        }
        return yahooClient;
}

/**
 * Returns the global Yahoo client singleton.
 * SECURITY WARNING: Never call setUserToken() on this — it's shared across all requests.
 * For authenticated requests, always use createAuthenticatedClient() instead.
 */
export function getYahooClient() {
        if (!yahooClient) {
                const appKey = getEnvVar('VITE_YAHOO_APP_KEY');
                const appSecret = getEnvVar('VITE_YAHOO_APP_SECRET');
                const redirectUri = getEnvVar('VITE_YAHOO_REDIRECT_URI') || 'http://localhost:5000/auth/yahoo/callback';

                if (!appKey || !appSecret) {
                        console.warn('[Yahoo Client] Credentials not configured (VITE_YAHOO_APP_KEY / VITE_YAHOO_APP_SECRET)');
                        return null;
                }

                yahooClient = new YahooFantasy(appKey, appSecret, null, redirectUri);
        }
        return yahooClient;
}

/**
 * Global concurrency limiter for Yahoo API calls.
 *
 * Yahoo throttles bursts of simultaneous requests on a single token and returns
 * a generic "There was a temporary problem with the server" error. The homepage
 * alone fans out ~8 top-level loads, several of which fan out again (one roster
 * call per team), producing 20+ concurrent requests. Funnelling every call
 * through this queue caps in-flight requests so Yahoo stops throttling us.
 */
const MAX_CONCURRENT_YAHOO_CALLS = 2;
let activeYahooCalls = 0;
const yahooWaitQueue = [];

function acquireYahooSlot() {
        if (activeYahooCalls < MAX_CONCURRENT_YAHOO_CALLS) {
                activeYahooCalls++;
                return Promise.resolve();
        }
        return new Promise((resolve) => yahooWaitQueue.push(resolve));
}

function releaseYahooSlot() {
        const next = yahooWaitQueue.shift();
        if (next) {
                // Hand the slot directly to the next waiter (count stays the same).
                next();
        } else {
                activeYahooCalls = Math.max(0, activeYahooCalls - 1);
        }
}

// A single hung upstream request must not monopolize a limited slot forever, so
// every call races against a timeout. The timeout error is retryable, so it
// triggers backoff + retry and (critically) the slot is released.
const YAHOO_CALL_TIMEOUT_MS = 15000;

function callWithTimeout(apiCall) {
        return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                        const err = new Error('Yahoo API call timed out');
                        err.description = 'timeout';
                        reject(err);
                }, YAHOO_CALL_TIMEOUT_MS);
                Promise.resolve()
                        .then(apiCall)
                        .then((value) => { clearTimeout(timer); resolve(value); })
                        .catch((error) => { clearTimeout(timer); reject(error); });
        });
}

/**
 * Executes a Yahoo API call through the global concurrency limiter, with
 * automatic retry + exponential backoff for intermittent Yahoo API failures.
 */
export async function withRetry(apiCall, maxRetries = 4) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
                await acquireYahooSlot();
                try {
                        const result = await callWithTimeout(apiCall);
                        releaseYahooSlot();
                        return result;
                } catch (error) {
                        // Release the slot before backing off so we never hold a slot while sleeping.
                        releaseYahooSlot();

                        const text = `${error?.description ?? ''} ${error?.message ?? ''}`;
                        // Yahoo intermittently returns these transient failures; retrying
                        // after a short backoff almost always succeeds.
                        const isRetryable = /consumer_key_unknown|temporary problem|try again|rate.?limit|timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|\b50[0234]\b/i.test(text);

                        const isLastAttempt = attempt === maxRetries - 1;

                        if (isRetryable && !isLastAttempt) {
                                // Exponential backoff with jitter: ~0.5s, 1s, 2s (+ up to 400ms).
                                const delayMs = Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 400);
                                console.warn(`[Yahoo API] transient error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms... — ${text.trim()}`);
                                await new Promise(resolve => setTimeout(resolve, delayMs));
                                continue;
                        }

                        throw error;
                }
        }
}

/**
 * Creates a new Yahoo client instance with user-specific access and refresh tokens.
 * SECURITY: Each call returns a NEW instance — never shared between users.
 */
export function createAuthenticatedClient(accessToken, refreshToken) {
        const appKey = getEnvVar('VITE_YAHOO_APP_KEY');
        const appSecret = getEnvVar('VITE_YAHOO_APP_SECRET');

        if (!appKey || !appSecret) {
                console.warn('[Yahoo Client] Credentials not configured.');
                return null;
        }

        const client = new YahooFantasy(appKey, appSecret);

        if (accessToken) client.setUserToken(accessToken);
        if (refreshToken) client.setRefreshToken(refreshToken);

        // HARDENING: the library's own api() does an unguarded JSON.parse inside an
        // https 'end' callback, so a plain-text Yahoo body ("Request denied" while
        // throttling) throws an uncaught exception that CRASHES the whole server and
        // leaves the request hanging. Every helper method (scoreboard, transactions,
        // meta, rosters, draft_results, ...) routes through api(), so we reroute the
        // GET+bearer-token path (everything our data loads use) through the defensive
        // rawYahooGet, which both resolve with the same parsed `data` shape. POSTs and
        // the unauthenticated oauth-signing path keep the original behavior.
        const originalApi = client.api.bind(client);
        client.api = (...args) => {
                const method = String(args[0] ?? 'GET').toUpperCase();
                const url = args[1];
                const hasPostData = args.length > 2 && args[2];
                if (method === 'GET' && typeof url === 'string' && !hasPostData && client.yahooUserToken) {
                        return rawYahooGet(url, client);
                }
                return originalApi(...args);
        };

        return client;
}

/**
 * Performs a raw Yahoo Fantasy GET that parses the response DEFENSIVELY.
 *
 * The `yahoo-fantasy` library's own `yf.api()` does an unguarded `JSON.parse()`
 * inside an https stream 'end' callback. When Yahoo returns a plain-text body
 * (e.g. "Request denied" while throttling a burst of requests), that parse throws
 * synchronously OUTSIDE any promise — an uncaught exception that crashes the whole
 * Node process (and leaves the original request hanging forever). We hit this during
 * archive backfill, which fans out many scoreboard calls.
 *
 * This helper reuses the client's bearer token but does the fetch + parse itself,
 * turning a non-JSON / error body into a normal thrown Error so `withRetry` can back
 * off and retry, and callers can catch it — instead of taking the server down.
 */
export async function rawYahooGet(url, yahooClient = null, _retried = false) {
        const client = yahooClient || getYahooClient();
        if (!client) throw new Error('Yahoo client not initialized');

        const token = client.yahooUserToken;
        const sep = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${sep}format=json`;

        // Yahoo's anti-abuse layer returns "999 Request denied" (a non-JSON body)
        // to API GETs that arrive without a browser-like User-Agent, especially
        // under burst load (e.g. the keeper/archive backfill fanning out many
        // calls). The default Node/undici UA trips this, so every transaction
        // capture silently failed and transaction_archive stayed empty. Sending a
        // browser UA makes Yahoo serve the JSON normally.
        const headers = {
                Accept: 'application/json',
                'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(fullUrl, { method: 'GET', headers });
        const body = await resp.text();

        let data;
        try {
                data = JSON.parse(body);
        } catch {
                const snippet = body.slice(0, 120).replace(/\s+/g, ' ').trim();
                const err = new Error(`Yahoo returned non-JSON response (status ${resp.status}): ${snippet}`);
                // "Request denied" / rate-limit notices are transient throttling — mark
                // them retryable so withRetry backs off instead of failing hard.
                err.description = /request denied|rate.?limit|temporary problem|try again|too many/i.test(body)
                        ? 'rate limit'
                        : `non-json ${resp.status}`;
                throw err;
        }

        if (data?.error) {
                const desc = data.error.description || JSON.stringify(data.error);
                // Because we bypass the library's api(), we also bypass its built-in
                // token_expired auto-refresh. Restore parity: refresh once and retry so a
                // long-running request (e.g. archive backfill) can survive mid-flight
                // token expiry instead of failing the call.
                if (!_retried && client.yahooRefreshToken && /token_expired/i.test(desc)) {
                        await new Promise((resolve, reject) =>
                                client.refreshToken((err) => (err ? reject(err) : resolve()))
                        );
                        return rawYahooGet(url, client, true);
                }
                const err = new Error(desc);
                err.description = desc;
                throw err;
        }

        return data;
}

export function setYahooUserToken(token) {
        const client = getYahooClient();
        if (client) client.setUserToken(token);
}

export function setYahooRefreshToken(token) {
        const client = getYahooClient();
        if (client) client.setRefreshToken(token);
}
