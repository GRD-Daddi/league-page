<script>
	export let data;
	$: records = data?.records ?? [];
	$: titleCounts = data?.titleCounts ?? [];
	$: careers = data?.careers ?? [];

	const fmt = (n, d = 2) =>
		n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
	const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

	let expanded = {};
	const toggle = (owner) => (expanded = { ...expanded, [owner]: !expanded[owner] });

	const rankLabel = (r) => {
		if (r == null) return '—';
		if (r === 1) return '🏆 #1';
		if (r === 2) return '#2';
		if (r === 3) return '#3';
		return `#${r}`;
	};

	const GAME_KEYS = new Set(['highGame', 'lowGame', 'blowout', 'nailBiter', 'highCombined']);
	function recordHref(r) {
		if (!r || r.year == null) return null;
		if (GAME_KEYS.has(r.key) && r.week != null) {
			const p = new URLSearchParams({ year: String(r.year), week: String(r.week) });
			if (r.matchupId != null) p.set('matchup', String(r.matchupId));
			return `/matchups?${p.toString()}`;
		}
		const p = new URLSearchParams({ year: String(r.year) });
		if (r.teamName) p.set('team', r.teamName);
		return `/standings?${p.toString()}`;
	}
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
						<a class="record-card-link" href={recordHref(r)} data-sveltekit-preload-data="hover">
						<div class="sn-card sn-card-pad record-card">
							<div class="record-head">
								<span class="record-label">{r.label}</span>
								<span class="sn-badge lime">{r.year}{r.week ? ` · Wk ${r.week}` : ''}</span>
							</div>
							<div class="record-body">
								<div class="record-value">{fmt(r.value)}</div>
								{#if r.ownerNameB}
								<div class="record-holder">{r.ownerName ?? r.teamName} <span class="record-joiner">{r.joiner ?? '&'}</span> {r.ownerNameB}</div>
								{:else}
								<div class="record-holder">{r.ownerName ?? r.teamName}</div>
								{/if}
								{#if r.teamName}<div class="record-team">{r.teamName}{#if r.teamBName} <span class="record-joiner">{r.joiner ?? '&'}</span> {r.teamBName}{/if}</div>{/if}
								{#if r.detail}<div class="record-detail">{r.detail}</div>{/if}
								<div class="record-go">{GAME_KEYS.has(r.key) ? 'View matchup' : 'View standings'} &rarr;</div>
							</div>
						</div>
						</a>
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
							<div class="title-name">{t.ownerName}</div>
							<div class="title-years">{t.years.join(' · ')}</div>
							{#if t.teamNames && t.teamNames.length}
								<div class="title-teams">{[...new Set(t.teamNames)].join(' · ')}</div>
							{/if}
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
				<p class="standings-hint">Grouped by manager. Click a row to see every season and the team name they used.</p>
				<div class="sn-card career-table-wrap">
					<table class="career-table">
						<thead>
							<tr>
								<th class="left">Manager</th>
								<th>Seasons</th>
								<th>W-L-T</th>
								<th>Win %</th>
								<th>PF</th>
								<th>Titles</th>
								<th>Best</th>
								<th aria-label="Expand"></th>
							</tr>
						</thead>
						<tbody>
							{#each careers as c, i}
								<tr class="career-row" class:open={expanded[c.owner]} on:click={() => toggle(c.owner)}>
									<td class="left">
										<span class="rank-num">{i + 1}</span>
										<span class="c-name">{c.ownerName}</span>
										{#if c.latestTeam}<span class="c-team">{c.latestTeam}</span>{/if}
									</td>
									<td>{c.seasons}</td>
									<td class="mono">{c.wins}-{c.losses}{c.ties ? `-${c.ties}` : ''}</td>
									<td class="mono">{pct(c.winPct)}</td>
									<td class="mono">{fmt(c.pointsFor, 0)}</td>
									<td>{c.titles || '—'}</td>
									<td>{c.bestFinish ?? '—'}</td>
									<td class="chev"><span class="chev-icon" class:open={expanded[c.owner]}>▸</span></td>
								</tr>
								{#if expanded[c.owner]}
									<tr class="career-detail-row">
										<td colspan="8">
											<div class="season-breakdown">
												{#each c.seasonsList as s}
													<div class="season-line">
														<span class="s-year">{s.year}</span>
														<span class="s-team">{s.teamName ?? '—'}</span>
														<span class="s-rec mono">{s.wins ?? 0}-{s.losses ?? 0}{s.ties ? `-${s.ties}` : ''}</span>
														<span class="s-pf mono">{fmt(s.pointsFor, 0)} PF</span>
														<span class="s-finish" class:champ={s.finalRank === 1}>{rankLabel(s.finalRank)}</span>
													</div>
												{/each}
											</div>
										</td>
									</tr>
								{/if}
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
	.record-team { font-size: 13px; color: var(--sn-text-dim); }
	.record-detail { font-size: 12px; color: var(--sn-text-mute); }
	.record-joiner { color: var(--sn-text-faint); font-weight: 600; font-style: italic; }
	.record-card-link { text-decoration: none; color: inherit; display: block; transition: transform 0.12s ease; }
	.record-card-link:hover { transform: translateY(-2px); }
	.record-card-link:hover .record-card { border-color: var(--sn-lime); }
	.record-go { font-size: 11px; color: var(--sn-text-faint); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 6px; transition: color 0.12s ease; }
	.record-card-link:hover .record-go { color: var(--sn-lime); }

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
	.title-teams { font-size: 11px; color: var(--sn-text-faint); margin-top: 6px; }

	.standings-hint { color: var(--sn-text-mute); font-size: 13px; margin: 0 0 16px; }
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
	.c-team {
		display: block;
		margin-left: 22px;
		font-size: 11px;
		color: var(--sn-text-faint);
		font-weight: 500;
	}
	.career-row { cursor: pointer; transition: background 0.12s; }
	.career-row:hover { background: var(--sn-surface-2); }
	.career-row.open { background: var(--sn-surface-2); }
	.chev { width: 28px; }
	.chev-icon {
		display: inline-block;
		color: var(--sn-text-faint);
		transition: transform 0.15s;
	}
	.chev-icon.open { transform: rotate(90deg); color: var(--sn-lime); }

	.career-detail-row td { padding: 0; background: var(--sn-surface); }
	.season-breakdown {
		display: flex;
		flex-direction: column;
		padding: 4px 14px 14px;
	}
	.season-line {
		display: grid;
		grid-template-columns: 56px 1fr 90px 110px 90px;
		align-items: center;
		gap: 10px;
		padding: 7px 0;
		border-bottom: 1px solid var(--sn-border);
	}
	.season-line:last-child { border-bottom: none; }
	.s-year { font-family: monospace; font-weight: 700; color: var(--sn-cyan); }
	.s-team { color: #fff; font-weight: 600; white-space: normal; }
	.s-rec, .s-pf { color: var(--sn-text-dim); text-align: right; }
	.s-finish { text-align: right; color: var(--sn-text-mute); font-weight: 700; }
	.s-finish.champ { color: var(--sn-lime); }

	@media (max-width: 640px) {
		.season-line { grid-template-columns: 44px 1fr auto; }
		.s-pf, .s-finish { display: none; }
	}
</style>
