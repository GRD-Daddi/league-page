<script>
	export let data;
	const { upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData } = data;

	const players = playersData?.players ?? {};

	function buildDrafts(prev, upcoming) {
		if (Array.isArray(prev) && prev.length) {
			return [...prev].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
		}
		if (Array.isArray(upcoming) && upcoming.length) {
			return [{ year: new Date().getFullYear(), draft: upcoming }];
		}
		return [];
	}

	const drafts = buildDrafts(previousDraftsData, upcomingDraftData);

	let selectedYear;
	$: if (selectedYear == null && drafts.length) selectedYear = drafts[0].year;

	$: selectedDraft = drafts.find((d) => d.year === selectedYear) ?? drafts[0];

	function groupByRound(picks) {
		if (!Array.isArray(picks) || !picks.length) return [];
		const map = {};
		for (const p of picks) {
			const r = p.round ?? 0;
			if (!map[r]) map[r] = [];
			map[r].push(p);
		}
		return Object.keys(map)
			.sort((a, b) => Number(a) - Number(b))
			.map((r) => ({
				round: Number(r),
				picks: map[r].sort((a, b) => (a.pick_no ?? 0) - (b.pick_no ?? 0))
			}));
	}

	$: rounds = groupByRound(selectedDraft?.draft);

	function buildRosterMap(users) {
		const map = {};
		for (const id in users || {}) {
			const u = users[id];
			const tk = u?.metadata?.team_key;
			const m = tk && tk.match(/\.t\.(\d+)/);
			if (m) map[Number(m[1])] = u;
		}
		return map;
	}

	const rosterMap = buildRosterMap(leagueTeamManagersData);

	function teamName(rosterId) {
		const u = rosterMap[rosterId];
		return u?.metadata?.team_name || u?.display_name || (rosterId ? `Team ${rosterId}` : 'Unknown Team');
	}

	function teamManager(rosterId) {
		const u = rosterMap[rosterId];
		const nick = u?.metadata?.manager_nickname;
		const team = u?.metadata?.team_name;
		return nick && nick !== team ? nick : null;
	}

	function initials(name) {
		return (name ?? '??')
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function playerName(pid) {
		const p = players?.[pid];
		if (p) return `${p.fn ?? ''} ${p.ln ?? ''}`.trim() || pid;
		return pid ?? 'Unknown';
	}

	function playerPos(pid) {
		return players?.[pid]?.pos || null;
	}

	function playerTeam(pid) {
		return players?.[pid]?.t || null;
	}

	function posClass(pos) {
		switch ((pos || '').toUpperCase()) {
			case 'QB':
				return 'cyan';
			case 'RB':
				return 'lime';
			case 'WR':
				return 'purple';
			default:
				return '';
		}
	}
</script>

<div class="sn-page">
	<div class="sn-pagehead">
		<div class="sn-pagehead-inner">
			<span class="sn-eyebrow">League Info</span>
			<h1 class="sn-pagetitle">DRAFT <span class="accent">ROOM</span></h1>
			<p class="sn-pagesub">Every pick, every round. Relive the draft that built this league.</p>
		</div>
	</div>

	<div class="sn-container">
		{#if drafts.length}
			<div class="sn-section-header">
				<h2 class="sn-section-title">
					{selectedDraft?.year} DRAFT BOARD
				</h2>
				{#if drafts.length > 1}
					<select class="sn-select" bind:value={selectedYear}>
						{#each drafts as d}
							<option value={d.year}>{d.year} Season</option>
						{/each}
					</select>
				{/if}
			</div>

			{#if rounds.length}
				<div class="draft-board">
					{#each rounds as round}
						<div class="round-col">
							<div class="round-head">Round {round.round}</div>
							{#each round.picks as pick}
								{@const pos = playerPos(pick.player_id)}
								<div class="sn-card flat pick-card">
									<div class="pick-top">
										<span class="pick-no">#{pick.pick_no}</span>
										{#if pick.is_keeper}
											<span class="sn-badge lime">Keeper</span>
										{/if}
									</div>
									<div class="pick-player">
										<span class="pick-name">{playerName(pick.player_id)}</span>
										<div class="pick-tags">
											{#if pos}
												<span class="sn-badge {posClass(pos)}">{pos}</span>
											{/if}
											{#if playerTeam(pick.player_id)}
												<span class="pick-team-nfl">{playerTeam(pick.player_id)}</span>
											{/if}
										</div>
									</div>
									<div class="pick-owner">
										<div class="sn-avatar">{initials(teamName(pick.roster_id))}</div>
										<div class="pick-owner-text">
											<div class="sn-team-name">{teamName(pick.roster_id)}</div>
											{#if teamManager(pick.roster_id)}
												<div class="sn-team-meta">{teamManager(pick.roster_id)}</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				<div class="sn-empty">
					<h3>No Picks Recorded</h3>
					<p>This draft has no recorded picks yet.</p>
				</div>
			{/if}
		{:else}
			<div class="sn-empty">
				<h3>Draft Hasn't Happened Yet</h3>
				<p>
					The draft board will light up here once the league completes its draft. Check back when
					it's go time.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.draft-board {
		display: flex;
		gap: 20px;
		overflow-x: auto;
		padding-bottom: 16px;
	}

	.round-col {
		flex: 0 0 280px;
		min-width: 280px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.round-head {
		font-size: 13px;
		font-weight: 900;
		font-style: italic;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--sn-cyan);
		padding: 8px 4px;
		border-bottom: 2px solid var(--sn-border);
		position: sticky;
		top: 0;
	}

	.pick-card {
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.pick-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pick-no {
		font-family: monospace;
		font-weight: 900;
		font-size: 1.1rem;
		color: var(--sn-text-faint);
	}

	.pick-player {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.pick-name {
		font-weight: 700;
		font-size: 1.05rem;
		color: #fff;
	}

	.pick-tags {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pick-team-nfl {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--sn-text-mute);
		text-transform: uppercase;
	}

	.pick-owner {
		display: flex;
		align-items: center;
		gap: 10px;
		border-top: 1px solid var(--sn-border);
		padding-top: 12px;
	}

	.pick-owner-text {
		min-width: 0;
	}
</style>
