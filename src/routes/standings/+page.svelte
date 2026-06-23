<script>
	export let data;
	const { standingsData, leagueTeamManagersData } = data;

	const rosters = standingsData?.rosters ?? null;
	const users = leagueTeamManagersData ?? {};

	function initials(name) {
		return (name ?? '??')
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function findUser(roster) {
		const teamKey = roster?.metadata?.team_key;
		if (teamKey) {
			for (const id in users) {
				if (users[id]?.metadata?.team_key === teamKey) return users[id];
			}
		}
		if (roster?.owner_id && users[roster.owner_id]) return users[roster.owner_id];
		return null;
	}

	function buildStandings(rostersMap) {
		if (!rostersMap) return [];
		return Object.values(rostersMap)
			.slice()
			.sort((a, b) => {
				const winDiff = (b.settings?.wins ?? 0) - (a.settings?.wins ?? 0);
				if (winDiff !== 0) return winDiff;
				return (b.settings?.fpts ?? 0) - (a.settings?.fpts ?? 0);
			})
			.map((r, i) => {
				const user = findUser(r);
				const teamName = r.metadata?.team_name ?? user?.metadata?.team_name ?? 'Unknown Team';
				const nickname = user?.metadata?.manager_nickname ?? null;
				const w = r.settings?.wins ?? 0;
				const l = r.settings?.losses ?? 0;
				const t = r.settings?.ties ?? 0;
				const games = w + l + t;
				const pct = games > 0 ? (w + t * 0.5) / games : 0;
				return {
					rank: i + 1,
					team: teamName,
					manager: nickname && nickname !== teamName ? nickname : null,
					logo: r.metadata?.team_logo ?? null,
					w,
					l,
					t,
					pct,
					pf: r.settings?.fpts ?? 0,
					pa: r.settings?.fpts_against ?? 0,
					streak: r.metadata?.streak ?? null
				};
			});
	}

	const standings = buildStandings(rosters);

	const topScorer = standings.length
		? standings.slice().sort((a, b) => b.pf - a.pf)[0]
		: null;
	const bestRecord = standings.length ? standings[0] : null;
	const mostAgainst = standings.length
		? standings.slice().sort((a, b) => b.pa - a.pa)[0]
		: null;

	const fmtPct = (p) => p.toFixed(3).replace(/^0/, '');
</script>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<span class="sn-eyebrow">The North</span>
			<h1 class="sn-pagetitle">LEAGUE <span class="accent">STANDINGS</span></h1>
			<p class="sn-pagesub">
				Where every team ranks in the battle for the frozen tundra. Sorted by record, broken by points.
			</p>
		</div>
	</div>

	<div class="sn-container">
		{#if standings.length === 0}
			<div class="sn-empty">
				<h3>No Standings Yet</h3>
				<p>Standings will appear once your league is connected and games are underway.</p>
			</div>
		{:else}
			<div class="sn-stat-grid" style="margin-bottom: 32px;">
				{#if topScorer}
					<div class="sn-stat">
						<div class="sn-stat-label">Top Scorer</div>
						<div class="sn-stat-value cyan">{topScorer.pf.toFixed(1)}</div>
						<div class="sn-stat-meta">{topScorer.team}</div>
					</div>
				{/if}
				{#if bestRecord}
					<div class="sn-stat">
						<div class="sn-stat-label">Best Record</div>
						<div class="sn-stat-value lime">{bestRecord.w}-{bestRecord.l}{bestRecord.t ? `-${bestRecord.t}` : ''}</div>
						<div class="sn-stat-meta">{bestRecord.team}</div>
					</div>
				{/if}
				{#if mostAgainst}
					<div class="sn-stat">
						<div class="sn-stat-label">Most Points Against</div>
						<div class="sn-stat-value purple">{mostAgainst.pa.toFixed(1)}</div>
						<div class="sn-stat-meta">{mostAgainst.team}</div>
					</div>
				{/if}
			</div>

			<div class="sn-card">
				<div style="overflow-x: auto;">
					<table class="sn-table">
						<thead>
							<tr>
								<th class="center">Rnk</th>
								<th>Team</th>
								<th class="center">W-L-T</th>
								<th class="center">PCT</th>
								<th class="right">PF</th>
								<th class="right">PA</th>
								<th class="center">Streak</th>
							</tr>
						</thead>
						<tbody>
							{#each standings as team}
								<tr>
									<td class="sn-rank">{team.rank}</td>
									<td>
										<div class="sn-team-cell">
											<div class="sn-avatar">
												{#if team.logo}
													<img src={team.logo} alt={team.team} />
												{:else}
													{initials(team.team)}
												{/if}
											</div>
											<div>
												<div class="sn-team-name">{team.team}</div>
												{#if team.manager}
													<div class="sn-team-meta">{team.manager}</div>
												{/if}
											</div>
										</div>
									</td>
									<td class="center sn-num">{team.w}-{team.l}{team.t ? `-${team.t}` : ''}</td>
									<td class="center sn-num">{fmtPct(team.pct)}</td>
									<td class="right sn-num lime">{team.pf.toFixed(1)}</td>
									<td class="right sn-num">{team.pa.toFixed(1)}</td>
									<td class="center sn-num cyan">{team.streak ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>
