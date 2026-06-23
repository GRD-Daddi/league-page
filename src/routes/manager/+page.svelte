<script>
	import LinearProgress from '@smui/linear-progress';

	export let data;
	const { roster: rosterId, team: teamKey, managersInfo } = data;

	function initials(name) {
		return (name ?? '??')
			.split(' ')
			.filter(Boolean)
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '??';
	}

	function findTarget(rosters) {
		if (!rosters) return null;
		if (rosterId != null && rosters[rosterId]) return rosters[rosterId];
		if (teamKey) return Object.values(rosters).find((r) => r?.metadata?.team_key === teamKey) ?? null;
		return null;
	}

	function findUser(target, leagueTeamManagers) {
		if (!target || !leagueTeamManagers) return null;
		const tk = target?.metadata?.team_key;
		return Object.values(leagueTeamManagers).find((u) => u?.metadata?.team_key === tk) ?? null;
	}

	function playerLine(key, players) {
		const p = players?.[key];
		if (!p) return { name: key, pos: null, team: null, logo: null };
		return {
			name: `${p.fn ?? p.first_name ?? ''} ${p.ln ?? p.last_name ?? ''}`.trim() || p.full_name || String(key),
			pos: p.pos ?? p.position ?? null,
			team: p.t ?? p.team ?? null,
			logo: p.metadata?.headshot_url ?? null
		};
	}
</script>

<div class="sn-page">
	{#await managersInfo}
		<div class="sn-loading">
			<p>Retrieving manager profile...</p>
			<LinearProgress indeterminate />
		</div>
	{:then [rostersData, leagueTeamManagers, leagueData, playersInfoWrap]}
		{@const rosters = rostersData?.rosters ?? {}}
		{@const target = findTarget(rosters)}
		{@const user = findUser(target, leagueTeamManagers)}
		{@const players = playersInfoWrap?.players ?? {}}
		{#if target}
			{@const teamName = target?.metadata?.team_name ?? user?.display_name ?? 'Unknown Team'}
			{@const nickname = user?.metadata?.manager_nickname ?? null}
			{@const s = target?.settings ?? {}}
			{@const logo = target?.metadata?.team_logo ?? user?.avatar ?? null}
			{@const starters = target?.starters ?? []}
			{@const benchKeys = (target?.players ?? []).filter((k) => !starters.includes(k))}

			<div class="sn-pagehead">
				<div class="sn-pagehead-inner">
					<a href="/managers" class="back-link">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg
						>
						All Managers
					</a>
					<div class="profile-header">
						<div class="sn-avatar xl">
							{#if logo}
								<img src={logo} alt={teamName} />
							{:else}
								{initials(teamName)}
							{/if}
						</div>
						<div class="profile-id">
							{#if nickname && nickname !== teamName}
								<div class="sn-eyebrow profile-eyebrow">{nickname}</div>
							{/if}
							<h1 class="sn-pagetitle profile-title">{teamName}</h1>
							{#if user?.metadata?.is_commissioner}
								<span class="sn-badge purple">Commissioner</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div class="sn-container">
				<!-- Season summary -->
				<div class="sn-stat-grid" style="margin-bottom:48px;">
					<div class="sn-stat">
						<div class="sn-stat-label">Record</div>
						<div class="sn-stat-value cyan">
							{s.wins ?? 0}-{s.losses ?? 0}{s.ties ? `-${s.ties}` : ''}
						</div>
						<div class="sn-stat-meta">Wins &bull; Losses{s.ties ? ' • Ties' : ''}</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">Points For</div>
						<div class="sn-stat-value lime">{(s.fpts ?? 0).toFixed(1)}</div>
						<div class="sn-stat-meta">Total scored</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">Points Against</div>
						<div class="sn-stat-value purple">{(s.fpts_against ?? 0).toFixed(1)}</div>
						<div class="sn-stat-meta">Total allowed</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">League Rank</div>
						<div class="sn-stat-value">{target?.metadata?.rank ?? '—'}</div>
						<div class="sn-stat-meta">
							{target?.metadata?.streak ? `Streak ${target.metadata.streak}` : 'Current standing'}
						</div>
					</div>
				</div>

				<!-- Roster -->
				<div class="sn-section-header">
					<h2 class="sn-section-title">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#00f0ff"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
								cx="9"
								cy="7"
								r="4"
							/><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg
						>
						Roster
					</h2>
					<a href="/rosters" class="sn-section-link">
						All Rosters
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
					</a>
				</div>

				{#if starters.length || benchKeys.length}
					<div class="sn-grid-2" style="margin-bottom:48px; align-items:start;">
						<div class="sn-card sn-card-pad">
							<h3 class="roster-group-title">Starters</h3>
							{#if starters.length}
								<ul class="player-list">
									{#each starters as key}
										{@const p = playerLine(key, players)}
										<li class="player-row">
											<div class="sn-avatar">
												{#if p.logo}
													<img src={p.logo} alt={p.name} />
												{:else}
													{initials(p.name)}
												{/if}
											</div>
											<div class="player-meta">
												<div class="player-name">{p.name}</div>
												{#if p.team}<div class="sn-team-meta">{p.team}</div>{/if}
											</div>
											{#if p.pos}<span class="sn-badge cyan">{p.pos}</span>{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="roster-note">No starters set.</p>
							{/if}
						</div>

						<div class="sn-card sn-card-pad">
							<h3 class="roster-group-title">Bench</h3>
							{#if benchKeys.length}
								<ul class="player-list">
									{#each benchKeys as key}
										{@const p = playerLine(key, players)}
										<li class="player-row">
											<div class="sn-avatar">
												{#if p.logo}
													<img src={p.logo} alt={p.name} />
												{:else}
													{initials(p.name)}
												{/if}
											</div>
											<div class="player-meta">
												<div class="player-name">{p.name}</div>
												{#if p.team}<div class="sn-team-meta">{p.team}</div>{/if}
											</div>
											{#if p.pos}<span class="sn-badge">{p.pos}</span>{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="roster-note">No bench players.</p>
							{/if}
						</div>
					</div>
				{:else}
					<div class="sn-empty" style="margin-bottom:48px;">
						<h3>Roster Not Available</h3>
						<p>This team's roster will appear here once the league is set up for the season.</p>
					</div>
				{/if}

				<!-- Recent activity -->
				<div class="sn-section-header">
					<h2 class="sn-section-title">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#ccff00"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg
						>
						Recent Activity
					</h2>
				</div>
				<div class="sn-empty">
					<h3>No Recent Activity</h3>
					<p>Transactions and roster moves for this manager will appear here once the season is underway.</p>
				</div>
			</div>
		{:else}
			<div class="sn-pagehead">
				<div class="sn-pagehead-inner">
					<h1 class="sn-pagetitle">MANAGER <span class="accent">NOT FOUND</span></h1>
				</div>
			</div>
			<div class="sn-container">
				<div class="sn-empty">
					<h3>We couldn't find that manager</h3>
					<p>The team you're looking for isn't available. Head back to browse all managers.</p>
					<div style="margin-top:20px;">
						<a href="/managers" class="sn-btn secondary"><span>All Managers</span></a>
					</div>
				</div>
			</div>
		{/if}
	{:catch error}
		<div class="sn-container">
			<div class="sn-empty">
				<h3>Something went wrong</h3>
				<p>{error.message}</p>
			</div>
		</div>
	{/await}
</div>

<style>
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--sn-text-mute);
		text-decoration: none;
		margin-bottom: 24px;
		transition: color 0.15s;
	}
	.back-link:hover {
		color: var(--sn-cyan);
	}

	.profile-header {
		display: flex;
		align-items: center;
		gap: 24px;
	}
	.profile-id {
		min-width: 0;
	}
	.profile-eyebrow {
		margin-bottom: 12px;
	}
	.profile-title {
		font-size: clamp(2rem, 4.5vw, 3.25rem);
	}
	.profile-id .sn-badge {
		margin-top: 14px;
	}

	.roster-group-title {
		font-size: 0.85rem;
		font-weight: 900;
		font-style: italic;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--sn-text-dim);
		margin: 0 0 16px;
	}

	.player-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.player-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--sn-border);
	}
	.player-row:first-child {
		border-top: none;
	}
	.player-meta {
		flex: 1;
		min-width: 0;
	}
	.player-name {
		font-weight: 700;
		color: #fff;
		font-size: 0.95rem;
	}
	.roster-note {
		color: var(--sn-text-mute);
		font-size: 0.9rem;
		margin: 0;
	}
</style>
