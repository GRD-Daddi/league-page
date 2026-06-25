<script>
	export let data;
	$: records = data?.records ?? [];
	$: titleCounts = data?.titleCounts ?? [];
	$: careers = data?.careers ?? [];

	const fmt = (n, d = 2) =>
		n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
	const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
</script>

<svelte:head>
	<title>League Records | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<span class="sn-eyebrow">League Info</span>
			<h1 class="sn-pagetitle">LEAGUE <span class="accent">RECORDS</span></h1>
			<p class="sn-pagesub">
				The record books. Every milestone and benchmark, tracked across every completed season of the league.
			</p>
		</div>
	</div>

	<div class="sn-container">
		<section class="records-section">
			<div class="sn-section-header">
				<h2 class="sn-section-title">ALL-TIME RECORDS</h2>
			</div>
			{#if records.length}
				<div class="sn-grid-2">
					{#each records as r}
						<div class="sn-card sn-card-pad record-card">
							<div class="record-head">
								<span class="record-label">{r.label}</span>
								<span class="sn-badge lime">{r.year}{r.week ? ` · Wk ${r.week}` : ''}</span>
							</div>
							<div class="record-body">
								<div class="record-value">{fmt(r.value)}</div>
								<div class="record-holder">{r.teamName}</div>
								{#if r.detail}<div class="record-detail">{r.detail}</div>{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="sn-empty"><h3>—</h3><p>Records will populate once a season is complete.</p></div>
			{/if}
		</section>

		{#if titleCounts.length}
			<section class="records-section">
				<div class="sn-section-header">
					<h2 class="sn-section-title">CHAMPIONSHIPS</h2>
				</div>
				<div class="sn-grid-3">
					{#each titleCounts as t}
						<div class="sn-card sn-card-pad title-card">
							<div class="title-count">{t.titles}</div>
							<div class="title-name">{t.teamName}</div>
							<div class="title-years">{t.years.join(' · ')}</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if careers.length}
			<section class="records-section">
				<div class="sn-section-header">
					<h2 class="sn-section-title">ALL-TIME STANDINGS</h2>
				</div>
				<div class="sn-card career-table-wrap">
					<table class="career-table">
						<thead>
							<tr>
								<th class="left">Team</th>
								<th>Seasons</th>
								<th>W-L-T</th>
								<th>Win %</th>
								<th>PF</th>
								<th>Titles</th>
								<th>Best</th>
							</tr>
						</thead>
						<tbody>
							{#each careers as c, i}
								<tr>
									<td class="left">
										<span class="rank-num">{i + 1}</span>
										<span class="c-name">{c.teamName}</span>
									</td>
									<td>{c.seasons}</td>
									<td class="mono">{c.wins}-{c.losses}{c.ties ? `-${c.ties}` : ''}</td>
									<td class="mono">{pct(c.winPct)}</td>
									<td class="mono">{fmt(c.pointsFor, 0)}</td>
									<td>{c.titles || '—'}</td>
									<td>{c.bestFinish ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.records-section { margin-bottom: 48px; }
	.record-card { display: flex; flex-direction: column; gap: 16px; }
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
	.record-body { display: flex; flex-direction: column; gap: 4px; }
	.record-value {
		font-family: monospace;
		font-size: 2.2rem;
		font-weight: 900;
		color: var(--sn-lime);
		line-height: 1;
	}
	.record-holder { font-weight: 800; color: #fff; }
	.record-detail { font-size: 12px; color: var(--sn-text-mute); }

	.title-card { text-align: center; }
	.title-count {
		font-family: monospace;
		font-size: 2.6rem;
		font-weight: 900;
		color: var(--sn-lime);
		line-height: 1;
	}
	.title-name { font-weight: 800; color: #fff; margin-top: 6px; }
	.title-years { font-size: 12px; color: var(--sn-text-mute); margin-top: 4px; font-family: monospace; }

	.career-table-wrap { overflow-x: auto; }
	.career-table { width: 100%; border-collapse: collapse; }
	.career-table th, .career-table td {
		padding: 12px 14px;
		text-align: center;
		border-bottom: 1px solid var(--sn-border);
		white-space: nowrap;
	}
	.career-table th {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--sn-text-mute);
		font-weight: 800;
	}
	.career-table td { color: var(--sn-text-dim); }
	.career-table .left { text-align: left; }
	.career-table .mono { font-family: monospace; }
	.rank-num {
		display: inline-block;
		width: 22px;
		font-family: monospace;
		color: var(--sn-text-faint);
		font-weight: 700;
	}
	.c-name { font-weight: 700; color: #fff; }
</style>
