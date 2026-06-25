<script>
	export let data;
	$: owner = data?.owner ?? null;
	$: ownerName = data?.ownerName ?? owner;
	$: seasons = data?.seasons ?? [];
	$: career = data?.career ?? null;

	function initials(name) {
		return (
			(name ?? '??')
				.split(' ')
				.filter(Boolean)
				.map((w) => w[0])
				.join('')
				.toUpperCase()
				.slice(0, 2) || '??'
		);
	}

	const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
	const fmt0 = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }));
	const fmt1 = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

	const rankLabel = (r) => {
		if (r == null) return '—';
		if (r === 1) return '🏆 Champion';
		if (r === 2) return 'Runner-Up';
		if (r === 3) return 'Third';
		return `#${r}`;
	};
</script>

<svelte:head>
	<title>{ownerName ? `${ownerName} | ` : ""}Manager Profile | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
	{#if owner && (career || seasons.length)}
		<div class="sn-pagehead">
			<div class="sn-pagehead-inner">
				<a href="/managers" class="back-link">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
					All Managers
				</a>
				<div class="profile-header">
					<div class="sn-avatar xl">{initials(ownerName)}</div>
					<div class="profile-id">
						<div class="sn-eyebrow profile-eyebrow">{career?.seasons ?? seasons.length} Season{(career?.seasons ?? seasons.length) === 1 ? '' : 's'}</div>
						<h1 class="sn-pagetitle profile-title">{ownerName}</h1>
						{#if career?.titles > 0}
							<span class="sn-badge lime">{career.titles}× Champion</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="sn-container">
			{#if career}
				<div class="sn-stat-grid" style="margin-bottom:48px;">
					<div class="sn-stat">
						<div class="sn-stat-label">All-Time Record</div>
						<div class="sn-stat-value cyan">{career.wins}-{career.losses}{career.ties ? `-${career.ties}` : ''}</div>
						<div class="sn-stat-meta">{pct(career.winPct)} win rate</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">Points For</div>
						<div class="sn-stat-value lime">{fmt0(career.pointsFor)}</div>
						<div class="sn-stat-meta">{fmt0(career.pointsAgainst)} against</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">Best Finish</div>
						<div class="sn-stat-value">{career.bestFinish ? `#${career.bestFinish}` : '—'}</div>
						<div class="sn-stat-meta">{career.podiums} podium{career.podiums === 1 ? '' : 's'}</div>
					</div>
					<div class="sn-stat">
						<div class="sn-stat-label">Titles</div>
						<div class="sn-stat-value purple">{career.titles}</div>
						<div class="sn-stat-meta">Championships</div>
					</div>
				</div>
			{/if}

			<div class="sn-section-header">
				<h2 class="sn-section-title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
					Season By Season
				</h2>
			</div>

			{#if seasons.length}
				<div class="sn-card">
					<div style="overflow-x:auto;">
						<table class="sn-table">
							<thead>
								<tr>
									<th>Season</th>
									<th>Team</th>
									<th class="center">W-L-T</th>
									<th class="right">PF</th>
									<th class="right">PA</th>
									<th class="center">Seed</th>
									<th class="right">Finish</th>
								</tr>
							</thead>
							<tbody>
								{#each seasons as s}
									<tr>
										<td class="sn-num">{s.year}</td>
										<td class="sn-team-name">{s.teamName ?? '—'}</td>
										<td class="center sn-num">{s.wins ?? 0}-{s.losses ?? 0}{s.ties ? `-${s.ties}` : ''}</td>
										<td class="right sn-num lime">{fmt1(s.pointsFor)}</td>
										<td class="right sn-num">{fmt1(s.pointsAgainst)}</td>
										<td class="center sn-num">{s.playoffSeed ?? '—'}</td>
										<td class="right sn-team-name" class:champ={s.finalRank === 1}>{rankLabel(s.finalRank)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{:else}
				<div class="sn-empty">
					<h3>No Completed Seasons</h3>
					<p>This team's season history will appear here once a season wraps up.</p>
				</div>
			{/if}
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
				<p>The team you're looking for isn't in the archive. Head back to browse all managers.</p>
				<div style="margin-top:20px;">
					<a href="/managers" class="sn-btn secondary"><span>All Managers</span></a>
				</div>
			</div>
		</div>
	{/if}
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
	.champ {
		color: var(--sn-lime);
	}
</style>
