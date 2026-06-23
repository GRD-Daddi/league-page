<script>
        import { onMount } from 'svelte';

        let leagues = $state([]);
        let loading = $state(true);
        let error = $state(null);
        let saving = $state(false);

        onMount(async () => {
                try {
                        const res = await fetch('/api/my-leagues');
                        if (!res.ok) throw new Error('Failed to load leagues');
                        const data = await res.json();
                        leagues = data.leagues || [];
                } catch (err) {
                        error = err.message;
                } finally {
                        loading = false;
                }
        });

        async function selectLeague(leagueKey, leagueName) {
                saving = true;
                try {
                        const res = await fetch('/auth/select-league/set', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ leagueKey })
                        });
                        if (res.ok) {
                                window.location.href = '/';
                        } else {
                                error = 'Failed to save league selection';
                                saving = false;
                        }
                } catch (err) {
                        error = err.message;
                        saving = false;
                }
        }

        const seasonLabel = (season) => {
                if (!season) return '';
                return `${season} Season`;
        };
</script>

<style>
        .page {
                max-width: 720px;
                margin: 4rem auto;
                padding: 0 1.25rem;
        }

        .eyebrow {
                display: inline-block;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                color: #00f0ff;
                margin-bottom: 0.75rem;
        }

        h1 {
                font-size: 2.25rem;
                font-weight: 900;
                letter-spacing: -0.02em;
                color: #fff;
                margin: 0 0 0.5rem;
                line-height: 1.05;
        }

        .subtitle {
                color: #8b8b94;
                margin-bottom: 2.5rem;
                font-size: 0.95rem;
        }

        .league-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
        }

        .league-card {
                position: relative;
                width: 100%;
                text-align: left;
                border: 1px solid #23232c;
                border-radius: 14px;
                padding: 1.1rem 1.35rem;
                cursor: pointer;
                background: #131318;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                font-family: inherit;
                transition: border-color 0.15s, box-shadow 0.15s, background 0.15s, transform 0.15s;
        }

        .league-card::before {
                content: '';
                position: absolute;
                left: 0;
                top: 12px;
                bottom: 12px;
                width: 3px;
                border-radius: 3px;
                background: linear-gradient(#00f0ff, #7000ff);
                opacity: 0;
                transition: opacity 0.15s;
        }

        .league-card:hover {
                border-color: #00f0ff;
                background: #16161d;
                box-shadow: 0 0 24px rgba(0, 240, 255, 0.12);
                transform: translateX(2px);
        }

        .league-card:hover::before {
                opacity: 1;
        }

        .league-card:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
        }

        .league-name {
                font-weight: 800;
                font-size: 1.05rem;
                color: #fff;
        }

        .league-meta {
                font-size: 0.82rem;
                color: #8b8b94;
                margin-top: 0.25rem;
                letter-spacing: 0.02em;
        }

        .league-key {
                font-family: 'SF Mono', 'Fira Code', monospace;
                font-size: 0.75rem;
                background: #0a0a0c;
                border: 1px solid #23232c;
                padding: 0.3rem 0.6rem;
                border-radius: 6px;
                color: #00f0ff;
                white-space: nowrap;
                flex-shrink: 0;
        }

        .loading, .empty {
                text-align: center;
                padding: 3.5rem 0;
                color: #8b8b94;
                font-size: 0.95rem;
        }

        .error-msg {
                color: #ff6b6b;
                padding: 1rem 1.25rem;
                background: rgba(255, 107, 107, 0.08);
                border: 1px solid rgba(255, 107, 107, 0.25);
                border-radius: 10px;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
        }

        .spinner {
                display: inline-block;
                width: 22px;
                height: 22px;
                border: 3px solid #23232c;
                border-top-color: #00f0ff;
                border-radius: 50%;
                animation: spin 0.7s linear infinite;
                margin-right: 0.6rem;
                vertical-align: middle;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
</style>

<div class="page">
        <span class="eyebrow">Setup</span>
        <h1>Select Your League</h1>
        <p class="subtitle">Choose the active league you want to power this site.</p>

        {#if error}
                <div class="error-msg">{error}</div>
        {/if}

        {#if loading}
                <div class="loading">
                        <span class="spinner"></span> Loading your Yahoo leagues...
                </div>
        {:else if leagues.length === 0}
                <div class="empty">
                        No Yahoo Fantasy Football leagues found in your account.
                </div>
        {:else}
                <div class="league-list">
                        {#each leagues as league}
                                <button
                                        class="league-card"
                                        disabled={saving}
                                        onclick={() => selectLeague(league.league_key, league.name)}
                                >
                                        <div>
                                                <div class="league-name">{league.name}</div>
                                                <div class="league-meta">
                                                        {seasonLabel(league.season)}
                                                        {#if league.num_teams} &middot; {league.num_teams} teams{/if}
                                                </div>
                                        </div>
                                        <span class="league-key">{league.league_key}</span>
                                </button>
                        {/each}
                </div>
        {/if}
</div>
