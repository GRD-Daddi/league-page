<script>
	import LinearProgress from '@smui/linear-progress';

	export let data;
	const rostersInfo = data.rostersInfo;

	let filter = '';

	function initials(name) {
		return (name ?? '??')
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function findUser(roster, users) {
		const teamKey = roster?.metadata?.team_key;
		if (teamKey) {
			for (const id in users) {
				if (users[id]?.metadata?.team_key === teamKey) return users[id];
			}
		}
		if (roster?.owner_id && users[roster.owner_id]) return users[roster.owner_id];
		return null;
	}

	function getPlayer(id, players) {
		const p = players?.[id];
		if (p) {
			const name = `${p.fn ?? ''} ${p.ln ?? ''}`.trim();
			return { name: name || String(id), pos: p.pos ?? null, team: p.t ?? null };
		}
		return { name: String(id), pos: null, team: null };
	}

	function buildTeams(rosterData, users, players) {
		const rosterMap = rosterData?.rosters ?? {};
		return Object.values(rosterMap)
			.slice()
			.sort((a, b) => (a.metadata?.rank ?? a.roster_id) - (b.metadata?.rank ?? b.roster_id))
			.map((r) => {
				const user = findUser(r, users);
				const teamName = r.metadata?.team_name ?? user?.metadata?.team_name ?? 'Unknown Team';
				const nickname = user?.metadata?.manager_nickname ?? null;
				const starterIds = r.starters ?? [];
				const starterSet = new Set(starterIds);
				const benchIds = (r.players ?? []).filter((id) => !starterSet.has(id));
				return {
					teamName,
					manager: nickname && nickname !== teamName ? nickname : null,
					logo: r.metadata?.team_logo ?? null,
					record: r.settings?.record ?? `${r.settings?.wins ?? 0}-${r.settings?.losses ?? 0}`,
					starters: starterIds.map((id) => getPlayer(id, players)),
					bench: benchIds.map((id) => getPlayer(id, players)),
					hasPlayers: starterIds.length > 0 || benchIds.length > 0
				};
			});
	}
</script>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<span class="sn-eyebrow">The Roster</span>
			<h1 class="sn-pagetitle">TEAM <span class="accent">ROSTERS</span></h1>
			<p class="sn-pagesub">
				Every lineup in the league — starters locked in, bench warming up. Scout the competition.
			</p>
		</div>
	</div>

	<div class="sn-container">
		{#await rostersInfo}
			<div class="sn-loading">
				<p>Retrieving roster data…</p>
				<br />
				<LinearProgress indeterminate />
			</div>
		{:then [leagueData, rosterData, leagueTeamManagers, playersInfo]}
			{@const players = playersInfo?.players ?? {}}
			{@const teams = buildTeams(rosterData, leagueTeamManagers ?? {}, players)}
			{#if teams.length === 0}
				<div class="sn-empty">
					<h3>No Rosters Yet</h3>
					<p>Team rosters will appear once your league is connected.</p>
				</div>
			{:else}
				<div style="margin-bottom: 28px; max-width: 360px;">
					<input
						class="sn-input"
						style="width: 100%;"
						type="text"
						placeholder="Filter teams…"
						bind:value={filter}
					/>
				</div>

				{@const filtered = teams.filter((t) => t.teamName.toLowerCase().includes(filter.trim().toLowerCase()))}
				{#if filtered.length === 0}
					<div class="sn-empty">
						<h3>No Teams Found</h3>
						<p>No teams match "{filter}".</p>
					</div>
				{:else}
					<div class="roster-grid">
						{#each filtered as team}
							<div class="sn-card sn-card-pad">
								<div class="team-header">
									<div class="sn-avatar lg">
										{#if team.logo}
											<img src={team.logo} alt={team.teamName} />
										{:else}
											{initials(team.teamName)}
										{/if}
									</div>
									<div class="team-header-text">
										<div class="sn-team-name" style="font-size: 1.15rem;">{team.teamName}</div>
										{#if team.manager}
											<div class="sn-team-meta">{team.manager}</div>
										{/if}
										<div class="record">{team.record}</div>
									</div>
								</div>

								{#if !team.hasPlayers}
									<div class="sn-empty" style="padding: 32px 16px; margin-top: 16px;">
										<h3>No Players</h3>
										<p>Roster data is not available for this team yet.</p>
									</div>
								{:else}
									<div class="roster-section">
										<div class="roster-section-title">
											<span class="sn-badge lime">Starters</span>
										</div>
										{#each team.starters as player}
											<div class="player-row">
												<span class="player-name">{player.name}</span>
												{#if player.pos}
													<span class="sn-badge cyan">{player.pos}</span>
												{/if}
											</div>
										{/each}
									</div>

									{#if team.bench.length}
										<div class="roster-section">
											<div class="roster-section-title">
												<span class="sn-badge">Bench</span>
											</div>
											{#each team.bench as player}
												<div class="player-row">
													<span class="player-name muted">{player.name}</span>
													{#if player.pos}
														<span class="sn-badge">{player.pos}</span>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		{:catch error}
			<div class="sn-empty">
				<h3>Something Went Wrong</h3>
				<p>{error.message}</p>
			</div>
		{/await}
	</div>
</div>

<style>
	.roster-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 24px;
	}

	.team-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding-bottom: 18px;
		border-bottom: 1px solid #1f2937;
	}

	.team-header-text {
		min-width: 0;
	}

	.record {
		font-family: monospace;
		font-weight: 700;
		font-size: 1rem;
		color: #ccff00;
		margin-top: 4px;
	}

	.roster-section {
		margin-top: 18px;
	}

	.roster-section-title {
		margin-bottom: 10px;
	}

	.player-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-bottom: 1px solid rgba(31, 41, 55, 0.5);
	}

	.player-row:last-child {
		border-bottom: none;
	}

	.player-name {
		font-weight: 600;
		font-size: 0.92rem;
		color: #fff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.player-name.muted {
		color: #9ca3af;
		font-weight: 500;
	}
</style>
