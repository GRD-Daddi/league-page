<script>
	export let data;

	const teams = data?.leagueTeamManagersData ?? {};
	const rosters = data?.rosters ?? {};

	function initials(name) {
		return (name ?? '??')
			.split(' ')
			.filter(Boolean)
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '??';
	}

	function rosterForTeam(user) {
		const teamKey = user?.metadata?.team_key;
		if (!teamKey || !rosters) return null;
		return Object.values(rosters).find((r) => r?.metadata?.team_key === teamKey) ?? null;
	}

	const cards = Object.values(teams)
		.map((user) => {
			const roster = rosterForTeam(user);
			const teamName = user?.metadata?.team_name ?? user?.display_name ?? 'Unknown Team';
			const nickname = user?.metadata?.manager_nickname ?? null;
			const s = roster?.settings ?? null;
			return {
				teamName,
				nickname: nickname && nickname !== teamName ? nickname : null,
				logo: roster?.metadata?.team_logo ?? user?.avatar ?? null,
				isCommish: !!user?.metadata?.is_commissioner,
				rosterId: roster?.roster_id ?? null,
				wins: s?.wins ?? null,
				losses: s?.losses ?? null,
				ties: s?.ties ?? null,
				fpts: s?.fpts ?? null
			};
		})
		.sort((a, b) => a.teamName.localeCompare(b.teamName));
</script>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<div class="sn-eyebrow">Minnesota Slopes</div>
			<h1 class="sn-pagetitle">THE <span class="accent">MANAGERS</span></h1>
			<p class="sn-pagesub">
				The men and women behind the franchises. Meet every owner in the league and dive into their
				teams.
			</p>
		</div>
	</div>

	<div class="sn-container">
		{#if cards.length}
			<div class="sn-grid-3">
				{#each cards as c}
					<svelte:element
						this={c.rosterId != null ? 'a' : 'div'}
						href={c.rosterId != null ? `/manager?roster=${c.rosterId}` : undefined}
						class="sn-card sn-card-pad manager-card"
					>
						<div class="manager-top">
							<div class="sn-avatar xl">
								{#if c.logo}
									<img src={c.logo} alt={c.teamName} />
								{:else}
									{initials(c.teamName)}
								{/if}
							</div>
							{#if c.isCommish}
								<span class="sn-badge purple commish">Commissioner</span>
							{/if}
						</div>

						<div class="manager-name-block">
							<div class="sn-team-name">{c.teamName}</div>
							{#if c.nickname}
								<div class="sn-team-meta">{c.nickname}</div>
							{/if}
						</div>

						<div class="manager-stats">
							<div class="manager-stat">
								<div class="manager-stat-label">Record</div>
								<div class="sn-num cyan">
									{#if c.wins != null}
										{c.wins}-{c.losses}{c.ties ? `-${c.ties}` : ''}
									{:else}
										&mdash;
									{/if}
								</div>
							</div>
							<div class="manager-stat">
								<div class="manager-stat-label">Points For</div>
								<div class="sn-num lime">
									{c.fpts != null ? c.fpts.toFixed(1) : '—'}
								</div>
							</div>
						</div>

						{#if c.rosterId != null}
							<div class="manager-cta">
								View Profile
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg
								>
							</div>
						{/if}
					</svelte:element>
				{/each}
			</div>
		{:else}
			<div class="sn-empty">
				<h3>No Managers Yet</h3>
				<p>
					League teams will appear here once your Yahoo league is connected and rosters are
					available.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.manager-card {
		display: flex;
		flex-direction: column;
		gap: 16px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, transform 0.15s;
	}
	a.manager-card:hover {
		border-color: var(--sn-cyan);
		transform: translateY(-2px);
	}
	a.manager-card:hover .sn-team-name {
		color: var(--sn-cyan);
	}

	.manager-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	.commish {
		flex-shrink: 0;
	}

	.manager-name-block {
		min-width: 0;
	}
	.manager-card .sn-team-name {
		font-size: 1.15rem;
	}

	.manager-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		border-top: 1px solid var(--sn-border);
		padding-top: 16px;
		margin-top: auto;
	}
	.manager-stat-label {
		font-size: 10px;
		font-weight: 900;
		color: var(--sn-text-mute);
		text-transform: uppercase;
		letter-spacing: 0.14em;
		margin-bottom: 6px;
	}

	.manager-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--sn-cyan);
	}
</style>
