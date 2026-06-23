<script>
	export let data;
	const { leagueTeamManagersData } = data;

	const teamCount = leagueTeamManagersData ? Object.keys(leagueTeamManagersData).length : 0;

	const allTimeRecords = [
		{ label: 'Most Points (Game)', meta: 'Single-game scoring high' },
		{ label: 'Biggest Blowout', meta: 'Largest margin of victory' },
		{ label: 'Longest Win Streak', meta: 'Consecutive wins' },
		{ label: 'Highest Scoring Season', meta: 'Total points in a year' }
	];

	const seasonRecords = [
		{ label: 'Most Wins', meta: 'Best regular-season record' },
		{ label: 'Most Points For', meta: 'Top scorer of the season' },
		{ label: 'Most Points Against', meta: 'Toughest schedule' },
		{ label: 'Highest Single Week', meta: 'Best weekly performance' }
	];
</script>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<span class="sn-eyebrow">League Info</span>
			<h1 class="sn-pagetitle">LEAGUE <span class="accent">RECORDS</span></h1>
			<p class="sn-pagesub">
				The record books. Every milestone and benchmark, tracked across every season of the league.
			</p>
		</div>
	</div>

	<div class="sn-container">
		<section class="records-section">
			<div class="sn-section-header">
				<h2 class="sn-section-title">ALL-TIME RECORDS</h2>
			</div>
			<div class="sn-grid-2">
				{#each allTimeRecords as record}
					<div class="sn-card sn-card-pad record-card">
						<div class="record-head">
							<span class="record-label">{record.label}</span>
							<span class="sn-badge">Locked</span>
						</div>
						<div class="sn-empty record-empty">
							<h3>—</h3>
							<p>{record.meta}. Will populate once the season is underway.</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="records-section">
			<div class="sn-section-header">
				<h2 class="sn-section-title">SINGLE-SEASON RECORDS</h2>
			</div>
			<div class="sn-grid-2">
				{#each seasonRecords as record}
					<div class="sn-card sn-card-pad record-card">
						<div class="record-head">
							<span class="record-label">{record.label}</span>
							<span class="sn-badge">Locked</span>
						</div>
						<div class="sn-empty record-empty">
							<h3>—</h3>
							<p>{record.meta}. Will populate once the season is underway.</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<div class="sn-empty footer-note">
			<h3>Records Will Populate Once The Season Is Underway</h3>
			<p>
				{#if teamCount}
					{teamCount} teams are locked in and ready. Once games are played, every league record will
					be tracked and ranked right here.
				{:else}
					Once games are played, every league record will be tracked and ranked right here.
				{/if}
			</p>
		</div>
	</div>
</div>

<style>
	.records-section {
		margin-bottom: 48px;
	}

	.record-card {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.record-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.record-label {
		font-size: 1.1rem;
		font-weight: 900;
		font-style: italic;
		text-transform: uppercase;
		letter-spacing: -0.01em;
		color: #fff;
	}

	.record-empty {
		padding: 28px 16px;
	}

	.record-empty h3 {
		font-size: 2rem;
		color: var(--sn-text-faint);
	}

	.footer-note {
		margin-top: 8px;
	}
</style>
