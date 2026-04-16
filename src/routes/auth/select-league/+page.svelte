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
		max-width: 700px;
		margin: 3rem auto;
		padding: 0 1rem;
	}

	h1 {
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--g555, #555);
		margin-bottom: 2rem;
		font-size: 0.95rem;
	}

	.league-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.league-card {
		border: 2px solid var(--border, #ddd);
		border-radius: 10px;
		padding: 1rem 1.25rem;
		cursor: pointer;
		background: var(--surface, #fff);
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.league-card:hover {
		border-color: var(--primary, #1a73e8);
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
	}

	.league-card:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.league-name {
		font-weight: 600;
		font-size: 1.05rem;
	}

	.league-meta {
		font-size: 0.85rem;
		color: var(--g555, #666);
		margin-top: 0.2rem;
	}

	.league-key {
		font-family: monospace;
		font-size: 0.8rem;
		background: var(--code-bg, #f5f5f5);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		color: var(--g555, #444);
	}

	.loading, .empty {
		text-align: center;
		padding: 3rem 0;
		color: var(--g555, #666);
	}

	.error-msg {
		color: #c00;
		padding: 1rem;
		background: #fdd;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.spinner {
		display: inline-block;
		width: 20px;
		height: 20px;
		border: 3px solid var(--border, #ccc);
		border-top-color: var(--primary, #1a73e8);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		margin-right: 0.5rem;
		vertical-align: middle;
	}

	@keyframes spin { to { transform: rotate(360deg); } }
</style>

<div class="page">
	<h1>Select Your League</h1>
	<p class="subtitle">Choose the league and season you want to use for this site.</p>

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
