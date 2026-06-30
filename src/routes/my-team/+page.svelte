<script>
	import LinearProgress from '$lib/LinearProgress.svelte';

	export let data;

	function initials(name) {
		return (name ?? '??')
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<span class="sn-eyebrow">Your Franchise</span>
			<h1 class="sn-pagetitle">MY <span class="accent">TEAM</span></h1>
			<p class="sn-pagesub">
				Your squad at a glance — record, scoring, and the full roster you're rolling with.
			</p>
		</div>
	</div>

	<div class="sn-container">
		{#await data.teamInfo}
			<div class="sn-loading">
				<p>Loading your team…</p>
				<br />
				<LinearProgress indeterminate />
			</div>
		{:then info}
			{#if info.error || !info.team}
				<div class="sn-empty">
					<h3>
						{#if info.error === 'no-team'}
							No Team Linked
						{:else if info.error === 'not-found'}
							Team Not Found
						{:else}
							Team Unavailable
						{/if}
					</h3>
					<p>
						{#if info.error === 'no-team'}
							We couldn't match your Yahoo account to a team in this league. If you manage a
							team here, try logging out and back in.
						{:else if info.error === 'not-found'}
							Your team didn't turn up in the current roster data{info.fromSeason
								? ` (showing ${info.fromSeason} data)`
								: ''}. It may not be set up for this season yet.
						{:else}
							Roster data isn't available right now. Please try again shortly.
						{/if}
					</p>
				</div>
			{:else}
				{@const team = info.team}
				{#if info.fromSeason}
					<div class="sn-season-note">
						This season's roster isn't set yet — showing your final
						<strong>{info.fromSeason}</strong> team in the meantime.
					</div>
				{/if}

				<div class="sn-card sn-card-pad hero">
					<div class="hero-id">
						<div class="sn-avatar xl">
							{#if team.logo}
								<img src={team.logo} alt={team.teamName} />
							{:else}
								{initials(team.teamName)}
							{/if}
						</div>
						<div class="hero-text">
							<div class="sn-team-name hero-name">{team.teamName}</div>
							{#if team.manager}
								<div class="sn-team-meta">{team.manager}</div>
							{/if}
							<div class="hero-tags">
								<span class="sn-badge lime">{team.record}</span>
								{#if team.rank}
									<span class="sn-badge cyan">Rank #{team.rank}</span>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<div class="sn-stat-grid stat-row">
					<div class="sn-stat">
						<div class="sn-stat-label">Record</div>
						<div class="sn-stat-value lime">{team.record}</div>
						<div class="sn-stat-meta">Wins–Losses{team.ties ? '–Ties' : ''}</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">League Rank</div>
						<div class="sn-stat-value cyan">{team.rank ? `#${team.rank}` : '—'}</div>
						<div class="sn-stat-meta">Current standing</div>
					</div>
					{#if team.pointsFor}
						<div class="sn-stat">
							<div class="sn-stat-label">Points For</div>
							<div class="sn-stat-value">{team.pointsFor}</div>
							<div class="sn-stat-meta">Total scored</div>
						</div>
					{/if}
					{#if team.pointsAgainst}
						<div class="sn-stat">
							<div class="sn-stat-label">Points Against</div>
							<div class="sn-stat-value purple">{team.pointsAgainst}</div>
							<div class="sn-stat-meta">Total allowed</div>
						</div>
					{/if}
				</div>

				<div class="actions">
					<a class="sn-btn secondary" href="/matchups"><span>My Matchups</span></a>
					<a class="sn-btn secondary" href="/standings"><span>Standings</span></a>
					<a class="sn-btn secondary" href="/keepers"><span>Keepers</span></a>
					<a class="sn-btn ghost" href="/rosters"><span>All Rosters</span></a>
				</div>

				<div class="sn-section-header roster-head">
					<h2 class="sn-section-title">The Roster</h2>
				</div>

				{#if !team.hasPlayers}
					<div class="sn-empty">
						<h3>No Players Yet</h3>
						<p>Your roster will appear here once it's set for the season.</p>
					</div>
				{:else}
					<div class="sn-card sn-card-pad">
						<div class="roster-section">
							<div class="roster-section-title">
								<span class="sn-badge lime">Starters</span>
							</div>
							{#each team.starters as player}
								{@render playerRow(player, false)}
							{/each}
						</div>

						{#if team.bench.length}
							<div class="roster-section">
								<div class="roster-section-title">
									<span class="sn-badge">Bench</span>
								</div>
								{#each team.bench as player}
									{@render playerRow(player, true)}
								{/each}
							</div>
						{/if}
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

{#snippet playerRow(player, muted)}
	<div class="player-row">
		<div class="player-info">
			<div class="player-pic">
				{#if player.img}
					<img src={player.img} alt={player.name} loading="lazy" />
				{:else}
					{initials(player.name)}
				{/if}
			</div>
			<span class="player-name" class:muted>{player.name}</span>
		</div>
		{#if player.pos}
			<span class="sn-badge" class:cyan={!muted}>{player.pos}</span>
		{/if}
	</div>
{/snippet}

<style>
	.hero {
		margin-bottom: 24px;
	}
	.hero-id {
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.hero-text {
		min-width: 0;
	}
	.hero-name {
		font-size: 1.6rem;
		line-height: 1.15;
	}
	.hero-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
	}

	.stat-row {
		margin-bottom: 28px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 8px;
	}

	.roster-head {
		margin-top: 36px;
	}

	.roster-section {
		margin-top: 18px;
	}
	.roster-section:first-child {
		margin-top: 0;
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

	.player-info {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.player-pic {
		flex: 0 0 auto;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		overflow: hidden;
		background: #1f2937;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
		color: #9ca3af;
	}
	.player-pic img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
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

	.sn-season-note {
		margin-bottom: 24px;
		padding: 12px 18px;
		border: 1px solid rgba(204, 255, 0, 0.3);
		border-left: 3px solid #ccff00;
		border-radius: 8px;
		background: rgba(204, 255, 0, 0.06);
		color: #d1d5db;
		font-size: 0.9rem;
	}
	.sn-season-note strong {
		color: #ccff00;
	}
</style>
