<script>
        import { page } from '$app/state';

        export let data;

        const reasonMessages = {
                credentials_missing: 'The app is not configured with Yahoo API credentials.',
                no_code: 'Yahoo did not return an authorization code.',
                invalid_state: 'The login request could not be verified. Please try again.',
                token_exchange_failed: 'Yahoo rejected the authorization. Please try again.',
                no_access_token: 'Yahoo did not return an access token.',
                token_refresh_failed: 'Your session expired and could not be renewed.',
                not_league_member: 'That Yahoo account is not a member of this league, so it cannot access the site. Sign in with the Yahoo account that owns your team in the league.',
                unexpected: 'An unexpected error occurred during login.'
        };

        const reason = page.url.searchParams.get('reason') || 'unexpected';
        const message = reasonMessages[reason] || reasonMessages.unexpected;

        // Yahoo rejects any redirect URI that isn't registered EXACTLY in the
        // developer app. The most common failure (the generic Yahoo "Uh oh"
        // page, or a token-exchange rejection) is a redirect-URI mismatch, so
        // surface the precise URL this app sends — copy it into the Yahoo app's
        // "Redirect URI(s)" field.
        const showRedirectHint = reason === 'token_exchange_failed' || reason === 'credentials_missing' || reason === 'unexpected';
        const redirectUri = data?.redirectUri || '';
        let copied = false;
        function copyRedirect() {
                if (!redirectUri) return;
                navigator.clipboard?.writeText(redirectUri).then(() => {
                        copied = true;
                        setTimeout(() => (copied = false), 2000);
                });
        }
</script>

<style>
        .error-page {
                min-height: 60vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
        }

        .error-card {
                background: #0f1115;
                border: 1px solid #1f2937;
                border-radius: 12px;
                padding: 2.5rem 3rem;
                max-width: 480px;
                width: 100%;
                text-align: center;
        }

        .icon {
                font-size: 3rem;
                margin-bottom: 1rem;
        }

        h1 {
                font-size: 1.5rem;
                font-weight: 700;
                color: #fff;
                margin: 0 0 0.75rem;
        }

        p {
                color: #9ca3af;
                margin: 0 0 2rem;
                line-height: 1.6;
        }

        .hint {
                text-align: left;
                background: #0a0a0c;
                border: 1px solid #1f2937;
                border-radius: 8px;
                padding: 1rem 1.1rem;
                margin: 0 0 1.75rem;
        }

        .hint-label {
                color: #9ca3af;
                font-size: 0.82rem;
                line-height: 1.5;
                margin: 0 0 0.65rem;
        }

        .hint-label strong { color: #fff; }
        .hint-label em { color: #00f0ff; font-style: normal; }

        .hint-uri {
                display: block;
                font-family: monospace;
                font-size: 0.78rem;
                color: #ccff00;
                word-break: break-all;
                background: #050507;
                border: 1px solid #1f2937;
                border-radius: 6px;
                padding: 0.6rem 0.7rem;
                margin-bottom: 0.65rem;
        }

        .copy {
                background: transparent;
                border: 1px solid #374151;
                color: #9ca3af;
                font-weight: 700;
                font-size: 0.78rem;
                padding: 0.4rem 0.9rem;
                border-radius: 6px;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.15s;
        }

        .copy:hover { border-color: #00f0ff; color: #00f0ff; }

        .actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
        }

        a {
                display: inline-flex;
                align-items: center;
                padding: 0.6rem 1.4rem;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.9rem;
                text-decoration: none;
                transition: all 0.15s;
        }

        .retry {
                background: linear-gradient(135deg, #00f0ff22, #7000ff22);
                border: 1px solid rgba(0, 240, 255, 0.4);
                color: #00f0ff;
        }

        .retry:hover {
                background: linear-gradient(135deg, #00f0ff33, #7000ff33);
                border-color: rgba(0, 240, 255, 0.7);
        }

        .home {
                border: 1px solid #374151;
                color: #9ca3af;
        }

        .home:hover {
                border-color: #6b7280;
                color: #fff;
        }
</style>

<div class="error-page">
        <div class="error-card">
                <div class="icon">⚠️</div>
                <h1>Login failed</h1>
                <p>{message}</p>
                {#if showRedirectHint && redirectUri}
                        <div class="hint">
                                <p class="hint-label">If Yahoo shows an "invalid request" page, the callback URL below must be registered <strong>exactly</strong> in your Yahoo app's <em>Redirect URI(s)</em> field at developer.yahoo.com/apps:</p>
                                <code class="hint-uri">{redirectUri}</code>
                                <button type="button" class="copy" on:click={copyRedirect}>{copied ? 'Copied!' : 'Copy URL'}</button>
                        </div>
                {/if}
                <div class="actions">
                        <a href="/auth/login" class="retry">Try again</a>
                        <a href="/" class="home">Go home</a>
                </div>
        </div>
</div>
