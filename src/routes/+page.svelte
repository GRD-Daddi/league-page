<script>
  import { leagueName, enableBlog } from '$lib/utils/helper';
  import { MAX_PICKS_PER_ROUND } from '$lib/utils/draftRules.js';
  import { HomePost } from '$lib/components';

  export let data;

  function getStandings(rosters, users) {
    if (!rosters) return [];
    return Object.values(rosters)
      .sort((a, b) => {
        const winDiff = (b.settings?.wins ?? 0) - (a.settings?.wins ?? 0);
        if (winDiff !== 0) return winDiff;
        return (b.settings?.fpts ?? 0) - (a.settings?.fpts ?? 0);
      })
      .map((r, i) => {
        const user = Array.isArray(users)
          ? users.find(u => u.user_id === r.owner_id)
          : null;
        const teamName = r.metadata?.team_name ?? r.team_name ?? 'Unknown Team';
        const nickname = user?.metadata?.manager_nickname ?? null;
        return {
          rank: i + 1,
          team: teamName,
          manager: nickname && nickname !== teamName ? nickname : '—',
          w: r.settings?.wins ?? 0,
          l: r.settings?.losses ?? 0,
          points: r.settings?.fpts ?? 0,
        };
      });
  }

  $: standings = getStandings(data?.rosters, data?.users);

  $: weekLabel = (() => {
    const s = data?.nflState;
    if (!s) return null;
    if (s.season_type === 'pre') return 'Preseason';
    if (s.season_type === 'post') return 'Playoffs';
    return s.week > 0 ? `Week ${s.week}` : 'Season';
  })();

  $: seasonLabel = data?.nflState?.season ? `${data.nflState.season} Season` : 'Fantasy Football';

  function initials(name) {
    return (name ?? '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  $: pot = data?.potData ?? null;

  // Projection: until every member has paid their buy-in, the pot and pool read
  // low (only collected funds count). Show the projected figures with a clear
  // "estimated" flag, and the real numbers once all funds are in. Projections are
  // a PRE-SEASON forecast only — once the season is live (regular/playoffs) the
  // pot shows the actual collected balance, never a "Projected" headline.
  $: projection = pot?.projection ?? null;
  $: poolIsEstimate = isDraftPrep && !!projection && !projection.fullyCollected && projection.expectedMembers > 0;
  $: displayPotTotal = poolIsEstimate ? projection.potTotalProjected : pot?.potTotal ?? 0;
  $: displayPoolTotal = poolIsEstimate ? projection.payoutPoolProjected : pot?.payoutPool?.remaining ?? 0;
  $: personToBeat = !!(pot?.champion?.reigning && !pot?.champion?.potClaimed);
  $: beatBackToBack = !!pot?.champion?.backToBackAchieved;

  // Permanent record of who has won (claimed) the carryover pot, newest first.
  $: potWinners = Array.isArray(data?.potWinners)
    ? [...data.potWinners].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    : [];

  $: loginHref = data?.loginReturnTo
    ? `/auth/login?returnTo=${encodeURIComponent(data.loginReturnTo)}`
    : '/auth/login';

  $: phase = data?.seasonPhase ?? 'regular';
  $: isDraftPrep = phase === 'preseason' || phase === 'offseason';

  // Hero badge honors the resolved season phase (the single source of truth) — a
  // pulsing "Live" badge only appears when the season is actually live. In the
  // pre-season/off-season it reads the phase plainly instead of "Live • Season".
  $: isLivePhase = phase === 'regular' || phase === 'playoffs';
  $: heroBadge = (() => {
    if (phase === 'preseason') return 'Preseason';
    if (phase === 'offseason') return 'Offseason';
    if (phase === 'playoffs') return 'Playoffs';
    const s = data?.nflState;
    return s?.week > 0 ? `Week ${s.week}` : 'Regular Season';
  })();

  $: podium = data?.lastSeasonPodium ?? null;

  // Most recent recorded champion (used as a fallback when the full podium
  // can't be resolved from Yahoo final standings).
  $: lastChampion = (() => {
    const hist = pot?.championHistory;
    if (!Array.isArray(hist) || hist.length === 0) return null;
    return [...hist].sort((a, b) => b.year - a.year)[0];
  })();

  // Live league teams for the draft-prep placeholders. Built from rosters/users
  // so each team appears even before any draft data exists.
  $: teams = (() => {
    if (!data?.rosters) return [];
    const list = Object.values(data.rosters).map((r) => {
      const teamName = r.metadata?.team_name ?? r.team_name ?? 'Unknown Team';
      const teamKey = r.metadata?.team_key ?? null;
      const m = typeof teamKey === 'string' ? teamKey.match(/\.t\.(\d+)/) : null;
      const teamNum = m ? parseInt(m[1]) : null;
      const draftSlot = data?.draftOrder?.[teamNum] ?? r.metadata?.draft_position ?? null;
      const user = Array.isArray(data.users)
        ? data.users.find((u) => u.user_id === r.owner_id)
        : null;
      const nickname = user?.metadata?.manager_nickname ?? null;
      return {
        name: teamName,
        owner: nickname && nickname !== teamName ? nickname : null,
        logo: r.metadata?.team_logo ?? null,
        rosterId: r.roster_id ?? teamKey ?? teamName,
        teamNum,
        draftSlot
      };
    });
    // When a draft order is set, show teams in that order (1 = first overall).
    if (list.some((t) => t.draftSlot)) {
      list.sort((a, b) => (a.draftSlot ?? 999) - (b.draftSlot ?? 999));
    }
    return list;
  })();

  $: hasDraftOrder = teams.some((t) => t.draftSlot);

  const PLACE_LABELS = { 1: '1st', 2: '2nd', 3: '3rd' };
  const PLACE_TONE = { 1: 'gold', 2: 'silver', 3: 'bronze' };

  // Draft rounds come from the league's real roster size (Yahoo).
  $: draftRoundCount = Math.min(Math.max(data?.draftRounds ?? 0, 0), 40);
  $: DRAFT_ROUNDS = Array.from({ length: draftRoundCount }, (_, i) => i + 1);

  // Real per-team pick ownership for the upcoming draft, keyed by Yahoo team
  // number (built server-side from traded picks). Falls back to one pick per
  // round when no ownership data is available.
  $: draftPicksByTeam = data?.draftPicksByTeam ?? null;
  function picksForRound(team, rnd) {
    const map = draftPicksByTeam?.[team?.teamNum];
    if (map) return map[rnd] ?? 0;
    return 1;
  }

  // Open votes this owner still needs to weigh in on (server-computed). Drives
  // the in-app banner that nudges owners to vote — and reminds them when a
  // deadline is approaching.
  $: voteAlerts = data?.voteAlerts ?? null;
  $: pendingVotes = Array.isArray(voteAlerts?.needsVote) ? voteAlerts.needsVote : [];
  $: hasVoteAlerts = pendingVotes.length > 0;
  $: voteAlertClosingSoon = !!voteAlerts?.closingSoon;

  // Marquee players forced back into the draft pool because they hit the keeper
  // season cap (computed server-side; only the genuinely full-term keepers).
  $: returningPlayers = Array.isArray(data?.returningPlayers) ? data.returningPlayers : [];
  $: hasReturningPlayers = returningPlayers.length > 0;
  $: keeperMaxSeasons = data?.keeperMaxSeasons ?? 3;

  function deadlineLabel(p) {
    if (!p?.deadline) return 'No deadline';
    const h = p.hoursLeft;
    if (h == null) return 'No deadline';
    if (h <= 0) return 'Closing now';
    if (h < 24) return `Closes in ${h} hour${h === 1 ? '' : 's'}`;
    const days = Math.ceil(h / 24);
    return `Closes in ${days} day${days === 1 ? '' : 's'}`;
  }

  // Comma-separated preview of the open vote titles for the multi-vote banner.
  $: voteTitlesSummary = (() => {
    const titles = pendingVotes.map((p) => p.title);
    if (titles.length <= 3) return titles.join(', ');
    return `${titles.slice(0, 3).join(', ')} and ${titles.length - 3} more`;
  })();
</script>

<style>
  /* ── Stadium Night Homepage ── */

  .sn-page {
    min-height: 100vh;
    background-color: #0a0a0c;
    color: #fff;
    font-family: inherit;
  }

  /* ── Hero ── */
  .hero {
    position: relative;
    border-bottom: 1px solid #1f2937;
    overflow: hidden;
    background-color: #0f1115;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .hero-bg img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.18;
    display: block;
  }

  .hero-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, #0a0a0c 0%, transparent 60%),
                linear-gradient(to right, #0a0a0c 0%, rgba(10,10,12,0.5) 50%, transparent 100%);
  }

  .hero-inner {
    position: relative;
    z-index: 1;
    max-width: 1280px;
    margin: 0 auto;
    padding: 44px 24px 40px;
  }

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(112, 0, 255, 0.15);
    color: #ccff00;
    border: 1px solid rgba(112, 0, 255, 0.4);
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .live-badge.idle {
    background: rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.3);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ccff00;
    animation: pulse 2s infinite;
  }

  .live-badge.idle .live-dot {
    background: #94a3b8;
    animation: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .hero-title {
    font-size: clamp(2.4rem, 6vw, 4.25rem);
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.03em;
    line-height: 0.9;
    margin: 0 0 18px;
  }

  .hero-title .line1 {
    display: block;
    background: linear-gradient(to right, #fff, #9ca3af);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-title .line2 {
    display: block;
    background: linear-gradient(to right, #00f0ff, #7000ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 0.95rem;
    color: #9ca3af;
    max-width: 560px;
    margin: 0 0 24px;
    border-left: 4px solid #00f0ff;
    padding-left: 16px;
    line-height: 1.5;
    font-weight: 500;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ccff00;
    color: #000;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0 28px;
    height: 52px;
    border: none;
    cursor: pointer;
    transform: skewX(-10deg);
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
    box-shadow: 0 0 20px rgba(204,255,0,0.2);
  }

  .btn-primary:hover {
    background: #aacc00;
    box-shadow: 0 0 30px rgba(204,255,0,0.4);
  }

  .btn-primary span,
  .btn-secondary span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transform: skewX(10deg);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    background: transparent;
    color: #fff;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0 28px;
    height: 52px;
    border: 1px solid #374151;
    cursor: pointer;
    transform: skewX(-10deg);
    text-decoration: none;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .btn-secondary:hover {
    background: #1f2937;
    color: #00f0ff;
    border-color: #4b5563;
  }

  /* ── Open Vote Nudge banner ── */
  .vote-banner {
    border-bottom: 1px solid #1f2937;
    background:
      radial-gradient(700px 200px at 12% -40%, rgba(0,240,255,0.12), transparent 70%),
      #0c0d11;
  }

  .vote-banner.soon {
    background:
      radial-gradient(700px 200px at 12% -40%, rgba(250,204,21,0.16), transparent 70%),
      #0c0d11;
  }

  .vote-banner-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 18px 24px;
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .vote-banner-icon {
    flex: 0 0 auto;
    width: 46px;
    height: 46px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #00f0ff;
    background: rgba(0, 240, 255, 0.1);
    border: 1px solid rgba(0, 240, 255, 0.4);
  }

  .vote-banner.soon .vote-banner-icon {
    color: #facc15;
    background: rgba(250, 204, 21, 0.12);
    border-color: rgba(250, 204, 21, 0.45);
  }

  .vote-banner-body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .vote-banner-eyebrow {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #00f0ff;
    margin-bottom: 4px;
  }

  .vote-banner.soon .vote-banner-eyebrow {
    color: #facc15;
  }

  .vote-banner-title {
    font-size: 1.1rem;
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vote-banner-sub {
    font-size: 0.85rem;
    color: #9ca3af;
    margin-top: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vote-banner-cta {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    background: #00f0ff;
    color: #000;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0 22px;
    height: 46px;
    border: none;
    cursor: pointer;
    transform: skewX(-10deg);
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
  }

  .vote-banner-cta:hover {
    background: #33f4ff;
    box-shadow: 0 0 30px rgba(0, 240, 255, 0.4);
  }

  .vote-banner.soon .vote-banner-cta {
    background: #facc15;
    box-shadow: 0 0 20px rgba(250, 204, 21, 0.25);
  }

  .vote-banner.soon .vote-banner-cta:hover {
    background: #fbd84a;
    box-shadow: 0 0 30px rgba(250, 204, 21, 0.45);
  }

  .vote-banner-cta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transform: skewX(10deg);
  }

  @media (max-width: 640px) {
    .vote-banner-inner { flex-wrap: wrap; }
    .vote-banner-cta { width: 100%; justify-content: center; }
  }

  /* ── League Pot band ── */
  .pot-band {
    border-bottom: 1px solid #1f2937;
    background:
      radial-gradient(900px 240px at 20% -40%, rgba(204,255,0,0.10), transparent 70%),
      radial-gradient(900px 240px at 90% 0%, rgba(112,0,255,0.14), transparent 70%),
      #0c0d11;
  }

  .pot-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 48px 24px;
  }

  .pot-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 32px;
    align-items: stretch;
  }

  @media (max-width: 880px) {
    .pot-grid { grid-template-columns: 1fr; }
  }

  .pot-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #ccff00;
    margin-bottom: 10px;
  }

  .pot-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #ccff00; box-shadow: 0 0 12px #ccff00;
    animation: pulse 2s infinite;
  }

  .pot-amount {
    font-family: monospace;
    font-size: clamp(3rem, 9vw, 5.5rem);
    font-weight: 900;
    line-height: 0.95;
    color: #ccff00;
    text-shadow: 0 0 40px rgba(204,255,0,0.25);
    letter-spacing: -0.02em;
  }

  .proj-badge {
    display: inline-flex;
    align-items: center;
    margin-top: 12px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #facc15;
    background: rgba(250, 204, 21, 0.12);
    border: 1px solid rgba(250, 204, 21, 0.35);
  }

  .proj-badge.confirmed {
    color: #ccff00;
    background: rgba(204, 255, 0, 0.1);
    border-color: rgba(204, 255, 0, 0.35);
  }

  .proj-note {
    margin-top: 8px;
    color: #9ca3af;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .pot-desc {
    color: #9ca3af;
    max-width: 520px;
    margin: 16px 0 24px;
    line-height: 1.6;
    font-size: 0.95rem;
  }

  .pot-desc strong { color: #fff; }

  .pot-amount-pill {
    display: flex;
    width: fit-content;
    align-items: center;
    gap: 16px;
    margin-top: 6px;
    padding: 10px 26px;
    border-radius: 16px;
    border: 1px solid rgba(204,255,0,0.55);
    background: rgba(204,255,0,0.04);
    box-shadow: 0 0 44px rgba(204,255,0,0.16);
  }
  .pot-crown { flex-shrink: 0; color: #ccff00; }

  .trophy-card.gold.is-beat {
    border-color: rgba(204,255,0,0.55);
    box-shadow: 0 0 44px rgba(204,255,0,0.16);
  }

  .beat-badge {
    position: absolute;
    top: 12px; right: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px;
    border-radius: 999px;
    background: rgba(204,255,0,0.12);
    border: 1px solid rgba(204,255,0,0.4);
    color: #ccff00;
    z-index: 1;
  }

  .beat-tag {
    margin-top: 8px;
    font-size: 0.72rem; font-weight: 800; color: #ccff00;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  .beat-tag.hot { color: #ff6b6b; }

  .pool-card {
    background: linear-gradient(135deg, #1a1d24, #0f1115);
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
  }

  .pool-head {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
  }

  .pool-label {
    font-size: 12px; font-weight: 900; letter-spacing: 0.12em;
    text-transform: uppercase; color: #00f0ff;
  }

  .pool-total {
    font-family: monospace; font-size: 2rem; font-weight: 900; color: #fff;
  }

  .pool-sub { font-size: 12px; color: #6b7280; margin: 4px 0 18px; }

  .pool-rows { display: flex; flex-direction: column; gap: 10px; }

  .pool-row {
    display: flex; align-items: center; gap: 12px;
    background: #0a0a0c; border: 1px solid #1f2937; border-radius: 8px;
    padding: 12px 14px;
  }

  .place {
    font-weight: 900; font-size: 0.85rem; width: 38px;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .place.gold { color: #ffd24a; }
  .place.silver { color: #cbd5e1; }
  .place.bronze { color: #d8915a; }

  .place-amt { flex: 1; font-family: monospace; font-weight: 700; font-size: 1.05rem; color: #ccff00; }

  .status {
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: #6b7280; border: 1px solid #374151; border-radius: 999px; padding: 4px 10px;
  }
  .status.paid { color: #ccff00; border-color: rgba(204,255,0,0.4); background: rgba(204,255,0,0.1); }

  .pl-bonus {
    margin-top: 14px; padding: 14px;
    background: rgba(112,0,255,0.08); border: 1px solid rgba(112,0,255,0.35);
    border-radius: 8px;
  }
  .pl-bonus-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .pl-bonus-label {
    font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #b794ff;
  }
  .pl-bonus-amt { font-family: monospace; font-weight: 700; font-size: 1.05rem; color: #b794ff; }
  .pl-bonus-sub { margin-top: 6px; font-size: 12px; color: #9ca3af; line-height: 1.5; }

  .pool-foot { margin-top: auto; padding-top: 16px; font-size: 12px; color: #6b7280; }

  .winners-card {
    margin-top: 24px;
    background: linear-gradient(135deg, #1a1d24, #0f1115);
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 24px;
  }
  .winners-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .winners-label {
    font-size: 12px; font-weight: 900; letter-spacing: 0.12em;
    text-transform: uppercase; color: #ccff00;
  }
  .winners-sub { font-size: 12px; color: #6b7280; }
  .winners-list { display: flex; flex-direction: column; gap: 10px; }
  .winner-row {
    display: flex; align-items: center; gap: 12px;
    background: #0a0a0c; border: 1px solid #1f2937; border-radius: 8px;
    padding: 12px 14px;
  }
  .winner-span {
    font-family: monospace; font-weight: 800; font-size: 0.85rem; color: #00f0ff;
    white-space: nowrap;
  }
  .winner-name { flex: 1; font-weight: 700; color: #fff; }
  .winner-amt { font-family: monospace; font-weight: 700; color: #ccff00; }

  /* ── Main content ── */
  .content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 64px 24px;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 48px;
  }

  @media (max-width: 960px) {
    .content {
      grid-template-columns: 1fr;
    }
  }

  /* ── Section headers ── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #1f2937;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 1.4rem;
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }

  .section-title svg {
    flex-shrink: 0;
  }

  .section-link {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #00f0ff;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: color 0.15s;
  }

  .section-link:hover {
    color: #fff;
  }

  /* ── Standings Table ── */
  .standings-card {
    background: #0f1115;
    border: 1px solid #1f2937;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  }

  .standings-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .standings-table thead tr {
    background: #1a1d24;
  }

  .standings-table thead th {
    padding: 14px 16px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6b7280;
  }

  .standings-table thead th.center { text-align: center; }
  .standings-table thead th.right  { text-align: right; }

  .standings-table tbody tr {
    border-top: 1px solid #1f2937;
    transition: background 0.1s;
  }

  .standings-table tbody tr:hover {
    background: #1a1d24;
  }

  .standings-table td {
    padding: 14px 16px;
  }

  .rank-cell {
    text-align: center;
    font-weight: 900;
    font-size: 1.25rem;
    color: #4b5563;
    transition: color 0.1s;
    width: 56px;
  }

  tr:hover .rank-cell { color: #fff; }

  .team-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1f2937, #111827);
    border: 2px solid #1f2937;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    color: #00f0ff;
    flex-shrink: 0;
    transition: border-color 0.15s;
  }

  tr:hover .avatar {
    border-color: #00f0ff;
  }

  .team-name {
    font-weight: 700;
    font-size: 1rem;
    color: #fff;
    transition: color 0.15s;
  }

  tr:hover .team-name { color: #00f0ff; }

  .draft-team-id { min-width: 0; }

  .team-sub {
    font-size: 0.72rem;
    font-weight: 600;
    color: #6b7280;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .manager-name {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 2px;
  }

  .record-cell {
    text-align: center;
    font-family: monospace;
    font-weight: 700;
    font-size: 1.1rem;
    color: #e5e7eb;
  }

  .points-cell {
    text-align: right;
    font-family: monospace;
    font-weight: 700;
    font-size: 1.1rem;
    color: #ccff00;
  }

  /* ── Auth gate ── */
  .auth-gate {
    text-align: center;
    padding: 48px 24px;
    color: #6b7280;
  }

  .auth-gate p {
    margin: 0 0 20px;
    font-size: 0.95rem;
  }

  .auth-gate a {
    display: inline-flex;
    align-items: center;
    background: #ccff00;
    color: #000;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0 24px;
    height: 44px;
    text-decoration: none;
    transform: skewX(-10deg);
    transition: background 0.15s;
  }

  .auth-gate a span {
    transform: skewX(10deg);
  }

  .auth-gate a:hover {
    background: #aacc00;
  }

  /* ── Right column ── */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .btn-outline-full {
    display: block;
    width: 100%;
    text-align: center;
    padding: 12px;
    background: transparent;
    border: 1px solid #1f2937;
    color: #6b7280;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
  }

  .btn-outline-full:hover {
    background: #1f2937;
    color: #fff;
  }

  /* ── Quick stats card ── */
  .stats-card {
    background: linear-gradient(135deg, #1a1d24, #0f1115);
    border: 1px solid #1f2937;
    border-radius: 12px;
    overflow: hidden;
  }

  .stat-row {
    padding: 20px 24px;
    border-bottom: 1px solid #1f2937;
  }

  .stat-label {
    font-size: 11px;
    font-weight: 900;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 6px;
  }

  .stat-value-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .stat-value {
    font-family: monospace;
    font-size: 2rem;
    font-weight: 900;
  }

  .stat-value.cyan   { color: #00f0ff; }
  .stat-value.purple { color: #7000ff; }

  .stat-meta {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    text-align: right;
    line-height: 1.4;
  }

  .stat-meta span {
    display: block;
    font-weight: 400;
    color: #9ca3af;
  }

  .stat-cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: rgba(204,255,0,0.05);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s;
  }

  .stat-cta:hover {
    background: rgba(204,255,0,0.1);
  }

  .stat-cta-label {
    font-weight: 700;
    color: #ccff00;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 12px;
  }

  /* ── Footer (page-level) ── */
  .sn-footer {
    border-top: 1px solid #1f2937;
    background: #0f1115;
    padding: 48px 24px;
    margin-top: 48px;
  }

  .footer-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    text-align: center;
  }

  @media (min-width: 768px) {
    .footer-inner {
      flex-direction: row;
      justify-content: space-between;
      text-align: left;
    }
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .footer-logo-mark {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #1f2937, #111);
    border: 1px solid #374151;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: skewX(-8deg);
  }

  .footer-brand-name {
    font-weight: 900;
    font-size: 1.1rem;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    font-style: italic;
    color: #6b7280;
  }

  .footer-brand-name strong {
    color: #9ca3af;
    font-weight: inherit;
  }

  .footer-links {
    display: flex;
    gap: 24px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .footer-links a {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #4b5563;
    text-decoration: none;
    transition: color 0.15s;
  }

  .footer-links a:hover { color: #fff; }

  .footer-copy {
    font-size: 11px;
    color: #374151;
    font-weight: 500;
  }

  /* ── no-data placeholder ── */
  .placeholder-box {
    background: #0f1115;
    border: 1px dashed #1f2937;
    border-radius: 8px;
    padding: 32px 24px;
    text-align: center;
    color: #4b5563;
    font-size: 0.875rem;
  }

  /* ── Last season podium (inside pot section) ── */
  .podium-block {
    margin-top: 4px;
  }

  .podium-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    align-items: end;
  }

  @media (max-width: 760px) {
    .podium-grid { grid-template-columns: 1fr; }
  }

  .trophy-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: linear-gradient(135deg, #1a1d24, #0f1115);
    border: 1px solid #1f2937;
    border-radius: 14px;
    padding: 18px 20px;
    text-align: center;
    overflow: hidden;
  }

  .trophy-card.gold   { border-color: rgba(255,210,74,0.5); box-shadow: 0 0 40px rgba(255,210,74,0.12); }
  .trophy-card.silver { border-color: rgba(203,213,225,0.35); }
  .trophy-card.bronze { border-color: rgba(216,145,90,0.35); }

  /* Staircase (3rd → 2nd → 1st) — cards bottom-aligned via .podium-grid align-items:end; content centered */
  .trophy-card.bronze { min-height: 168px; }
  .trophy-card.silver { min-height: 196px; }
  .trophy-card.gold   { min-height: 224px; }

  @media (max-width: 760px) {
    .trophy-card.bronze,
    .trophy-card.silver,
    .trophy-card.gold { min-height: 0; }
  }

  .trophy-place {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .trophy-place.gold { color: #ffd24a; }
  .trophy-place.silver { color: #cbd5e1; }
  .trophy-place.bronze { color: #d8915a; }

  .trophy-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    margin: 0 auto 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1f2937, #111827);
    border: 2px solid #374151;
    font-weight: 900;
    font-size: 1.1rem;
    color: #fff;
    overflow: hidden;
  }
  .trophy-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .trophy-card.bronze .trophy-avatar { width: 60px; height: 60px; margin-bottom: 8px; }
  .trophy-card.gold .trophy-avatar { width: 88px; height: 88px; border-color: #ffd24a; }

  .trophy-team {
    font-size: 1.1rem;
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    color: #fff;
  }

  .trophy-sub {
    font-size: 0.8rem;
    font-weight: 700;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #9ca3af;
    margin-top: 3px;
  }

  .trophy-meta {
    font-family: monospace;
    font-size: 0.85rem;
    color: #9ca3af;
    margin-top: 6px;
  }

  .trophy-empty {
    color: #4b5563;
    font-weight: 800;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* ── Draft prep ── */
  .draft-prep-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .draft-team-card {
    background: #0f1115;
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 18px;
  }

  .draft-team-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .draft-slot {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    color: #00f0ff;
    background: rgba(0, 240, 255, 0.08);
    border: 1px solid rgba(0, 240, 255, 0.35);
  }

  .picks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 6px;
  }
  .pick-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 2px;
    border: 1px solid var(--sn-border);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
  }
  .pick-cell .pick-round {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--sn-text-faint);
  }
  .pick-cell .pick-count {
    font-size: 0.95rem;
    font-weight: 900;
    color: #fff;
  }
  .pick-cell.empty {
    opacity: 0.4;
  }
  .pick-cell.empty .pick-count {
    color: var(--sn-text-faint);
  }

  .returning-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .returning-slot {
    background: #0f1115;
    border: 1px dashed #1f2937;
    border-radius: 12px;
    padding: 22px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .returning-orb {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1f2937, #111827);
    border: 1px solid #374151;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4b5563;
    flex-shrink: 0;
  }

  .returning-text .rt-name {
    font-weight: 800;
    color: #6b7280;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-size: 0.95rem;
  }
  .returning-text .rt-sub {
    font-size: 11px;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 2px;
  }

  .returning-slot.filled {
    border: 1px solid #26303d;
    border-style: solid;
  }
  .returning-orb.filled {
    background: linear-gradient(135deg, #2a1a4a, #1a1030);
    border-color: #4c1d95;
    color: #a78bfa;
    overflow: hidden;
  }
  .returning-text .rt-name.filled {
    color: #e5e7eb;
    font-style: normal;
  }
  .returning-text .rt-sub.filled {
    color: #9ca3af;
  }
  .returning-text .rt-team {
    font-size: 11px;
    color: #a78bfa;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 3px;
  }
</style>

<div class="sn-page">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-bg">
      <img src="/stadium-hero.png" alt="Stadium" />
    </div>
    <div class="hero-inner">
      {#if heroBadge}
        <div class="live-badge" class:idle={!isLivePhase}>
          <span class="live-dot"></span>
          {#if isLivePhase}Live &bull; {heroBadge}{:else}{heroBadge}{/if}
        </div>
      {/if}

      <h1 class="hero-title">
        <span class="line1">The Battle</span>
        <span class="line2">For The North</span>
      </h1>

      <p class="hero-subtitle">
        Welcome to the premier fantasy football league of the frozen tundra.
        Where championships are forged in the cold and legends never die.
      </p>

      <div class="hero-actions">
        <a href="/matchups" class="btn-primary">
          <span>
            View Matchups
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </a>
        <a href="/constitution" class="btn-secondary">
          <span>League Rules</span>
        </a>
      </div>
    </div>
  </div>

  <!-- Open Vote Nudge -->
  {#if hasVoteAlerts}
    <div class="vote-banner" class:soon={voteAlertClosingSoon}>
      <div class="vote-banner-inner">
        <div class="vote-banner-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V7Z"/><path d="M22 19a2 2 0 0 1-2 2H7"/></svg>
        </div>
        <div class="vote-banner-body">
          <div class="vote-banner-eyebrow">
            {#if voteAlertClosingSoon}Vote Closing Soon{:else}League Vote Open{/if}
          </div>
          <div class="vote-banner-title">
            {#if pendingVotes.length === 1}
              {pendingVotes[0].title}
            {:else}
              {pendingVotes.length} open votes need your ballot
            {/if}
          </div>
          <div class="vote-banner-sub">
            {#if pendingVotes.length === 1}
              {deadlineLabel(pendingVotes[0])} · cast your vote before it closes.
            {:else}
              {voteTitlesSummary} · head to the votes page to weigh in.
            {/if}
          </div>
        </div>
        <a href="/votes" class="vote-banner-cta">
          <span>
            Vote Now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </a>
      </div>
    </div>
  {/if}

  <!-- League Pot & Payouts -->
  {#if pot && !data?.requiresAuth}
    <div class="pot-band">
      <div class="pot-inner">
        <div class="pot-grid">

          <!-- Carryover pot + person to beat -->
          <div class="pot-main">
            <div class="pot-label"><span class="pot-dot"></span> The Carryover Pot</div>
            <div class="pot-amount-pill">
              <svg class="pot-crown" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>
              <div class="pot-amount">{money(displayPotTotal)}</div>
            </div>

            <div class="podium-block">
              {#if podium?.podium?.length}
                <div class="podium-grid">
                  {#each [3, 2, 1] as place}
                    {@const t = podium.podium.find((p) => p.place === place)}
                    <div class="trophy-card {PLACE_TONE[place]}{place === 1 && personToBeat ? ' is-beat' : ''}">
                      {#if place === 1 && personToBeat}
                        <div class="beat-badge" title="Win it again this year and take the entire pot">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>
                        </div>
                      {/if}
                      <div class="trophy-place {PLACE_TONE[place]}">{PLACE_LABELS[place]} Place</div>
                      {#if t}
                        <div class="trophy-avatar">
                          {#if t.logo}<img src={t.logo} alt={t.ownerName ?? t.name} />{:else}{initials(t.ownerName ?? t.name)}{/if}
                        </div>
                        <div class="trophy-team">{t.ownerName ?? t.name}</div>
                        {#if t.ownerName && t.name}<div class="trophy-sub">{t.name}</div>{/if}
                        {#if t.wins != null}
                          <div class="trophy-meta">{t.wins}-{t.losses}{#if t.pointsFor != null} &bull; {t.pointsFor.toFixed(0)} PF{/if}</div>
                        {/if}
                        {#if place === 1 && personToBeat}
                          <div class="beat-tag {beatBackToBack ? 'hot' : ''}">{beatBackToBack ? '🏆 Win again, claim the pot' : 'Win again, take the pot'}</div>
                        {/if}
                      {:else}
                        <div class="trophy-avatar"><span class="trophy-empty">?</span></div>
                        <div class="trophy-empty">To be decided</div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else if lastChampion?.name}
                <div class="podium-grid">
                  <div class="trophy-card bronze">
                    <div class="trophy-place bronze">3rd Place</div>
                    <div class="trophy-avatar"><span class="trophy-empty">?</span></div>
                    <div class="trophy-empty">Not recorded</div>
                  </div>
                  <div class="trophy-card silver">
                    <div class="trophy-place silver">2nd Place</div>
                    <div class="trophy-avatar"><span class="trophy-empty">?</span></div>
                    <div class="trophy-empty">Not recorded</div>
                  </div>
                  <div class="trophy-card gold{personToBeat ? ' is-beat' : ''}">
                    {#if personToBeat}
                      <div class="beat-badge" title="Win it again this year and take the entire pot">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>
                      </div>
                    {/if}
                    <div class="trophy-place gold">Champion</div>
                    <div class="trophy-avatar">{initials(lastChampion.name)}</div>
                    <div class="trophy-team">{lastChampion.name}</div>
                    <div class="trophy-meta">{lastChampion.year} Champion</div>
                    {#if personToBeat}
                      <div class="beat-tag {beatBackToBack ? 'hot' : ''}">{beatBackToBack ? '🏆 Win again, claim the pot' : 'Win again, take the pot'}</div>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="podium-grid">
                  {#each [3, 2, 1] as place}
                    <div class="trophy-card {PLACE_TONE[place]}">
                      <div class="trophy-place {PLACE_TONE[place]}">{place === 1 ? 'Champion' : `${PLACE_LABELS[place]} Place`}</div>
                      <div class="trophy-avatar"><span class="trophy-empty">?</span></div>
                      <div class="trophy-empty">To be crowned</div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- This year's payout pool -->
          <div class="pool-card">
            <div class="pool-head">
              <span class="pool-label">{pot.year} Payout Pool</span>
              <span class="pool-total">{money(displayPoolTotal)}</span>
            </div>
            <div class="pool-sub">Split among the top finishers</div>

            <div class="pool-rows">
              {#if pot.payoutPool.first.enabled}
                <div class="pool-row">
                  <span class="place gold">1st</span>
                  <span class="place-amt">{money(pot.payoutPool.first.amount)}</span>
                  <span class="status {pot.payoutPool.first.paid ? 'paid' : ''}">{pot.payoutPool.first.paid ? 'Paid' : 'Pending'}</span>
                </div>
              {/if}
              {#if pot.payoutPool.second.enabled}
                <div class="pool-row">
                  <span class="place silver">2nd</span>
                  <span class="place-amt">{money(pot.payoutPool.second.amount)}</span>
                  <span class="status {pot.payoutPool.second.paid ? 'paid' : ''}">{pot.payoutPool.second.paid ? 'Paid' : 'Pending'}</span>
                </div>
              {/if}
              {#if pot.payoutPool.third.enabled}
                <div class="pool-row">
                  <span class="place bronze">3rd</span>
                  <span class="place-amt">{money(pot.payoutPool.third.amount)}</span>
                  <span class="status {pot.payoutPool.third.paid ? 'paid' : ''}">{pot.payoutPool.third.paid ? 'Paid' : 'Pending'}</span>
                </div>
              {/if}
            </div>

            {#if pot.pointsLeader && pot.pointsLeader.amount > 0}
              <div class="pl-bonus">
                <div class="pl-bonus-head">
                  <span class="pl-bonus-label">Points Leader Bonus</span>
                  <span class="pl-bonus-amt">{money(pot.pointsLeader.total)}</span>
                </div>
                <div class="pl-bonus-sub">
                  {#if pot.pointsLeader.recorded && pot.pointsLeader.name}
                    {pot.pointsLeader.name} collects {money(pot.pointsLeader.amount)} from every other member{pot.pointsLeader.paid ? ' — settled' : ''}.
                  {:else}
                    The season points leader collects {money(pot.pointsLeader.amount)} from every other member.
                  {/if}
                </div>
              </div>
            {/if}

            <div class="pool-foot">
              {#if poolIsEstimate}
                {projection.paidMembers} of {projection.expectedMembers} members paid in · {money(projection.outstanding)} outstanding
              {:else}
                {pot.paidThisYear} member{pot.paidThisYear === 1 ? '' : 's'} paid in this season
              {/if}
            </div>
          </div>

          {#if potWinners.length}
            <div class="winners-card">
              <div class="winners-head">
                <span class="winners-label">Pot Winners</span>
                <span class="winners-sub">Back-to-back champions who took it all</span>
              </div>
              <div class="winners-list">
                {#each potWinners as w}
                  <div class="winner-row">
                    <span class="winner-span">{w.span ?? w.year ?? '—'}</span>
                    <span class="winner-name">{w.name ?? 'Unknown'}</span>
                    <span class="winner-amt">{money(w.amount)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

        </div>
      </div>
    </div>
  {/if}

  {#if isDraftPrep}
    <!-- Draft Prep (preseason / offseason) -->
    <div class="content" style="display:block;">

      <!-- Key Players Returning to the Draft -->
      <div style="margin-bottom: 56px;">
        <div class="section-header">
          <h2 class="section-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7000ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/></svg>
            Key Players Returning to the Draft
          </h2>
          <a href="/keepers" class="section-link">
            Keepers
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        {#if hasReturningPlayers}
          <div class="returning-grid">
            {#each returningPlayers as p}
              <div class="returning-slot filled">
                <div class="returning-orb filled">
                  {#if p.img}
                    <img src={p.img} alt={p.name} style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />
                  {:else}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                  {/if}
                </div>
                <div class="returning-text">
                  <div class="rt-name filled">{p.name}</div>
                  <div class="rt-sub filled">{[p.pos, p.nflTeam, p.costRound ? `R${p.costRound}` : null].filter(Boolean).join(' · ')}</div>
                  {#if p.teamName}<div class="rt-team">{p.teamName}</div>{/if}
                </div>
              </div>
            {/each}
          </div>
          <p style="color:#4b5563; font-size:12px; margin-top:14px; text-transform:uppercase; letter-spacing:0.08em;">
            Hit the {keeperMaxSeasons}-season keeper limit — back in the draft pool.
          </p>
        {:else}
          <div class="returning-grid">
            {#each Array(6) as _, i}
              <div class="returning-slot">
                <div class="returning-orb">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                </div>
                <div class="returning-text">
                  <div class="rt-name">Player Slot {i + 1}</div>
                  <div class="rt-sub">To be announced</div>
                </div>
              </div>
            {/each}
          </div>
          <p style="color:#4b5563; font-size:12px; margin-top:14px; text-transform:uppercase; letter-spacing:0.08em;">
            The notable players re-entering the draft pool will be revealed before draft day.
          </p>
        {/if}
      </div>

      <!-- Draft Picks by Team -->
      <div style="margin-bottom: 56px;">
        <div class="section-header">
          <h2 class="section-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Draft Picks by Team
          </h2>
          <a href="/drafts" class="section-link">
            Draft Room
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        {#if data?.requiresAuth}
          <div class="placeholder-box">
            <p style="margin:0 0 16px;">Log in with Yahoo to see each team's draft picks.</p>
            <a href={loginHref} class="btn-primary" style="height:44px;"><span>Login with Yahoo</span></a>
          </div>
        {:else if teams.length > 0}
          <div class="draft-prep-grid">
            {#each teams as team}
              <div class="draft-team-card">
                <div class="draft-team-head">
                  {#if team.draftSlot}
                    <div class="draft-slot" title="Draft pick #{team.draftSlot}">{team.draftSlot}</div>
                  {/if}
                  <div class="avatar">
                    {#if team.logo}<img src={team.logo} alt={team.owner ?? team.name} style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />{:else}{initials(team.owner ?? team.name)}{/if}
                  </div>
                  <div class="draft-team-id">
                    <div class="team-name" style="font-size:0.95rem;">{team.owner ?? team.name}</div>
                    {#if team.owner}<div class="team-sub">{team.name}</div>{/if}
                  </div>
                </div>
                <div class="picks-grid">
                  {#each DRAFT_ROUNDS as rnd}
                    {@const count = picksForRound(team, rnd)}
                    <div class="pick-cell {count === 0 ? 'empty' : ''}" title="Round {rnd}: {count} pick{count === 1 ? '' : 's'}">
                      <span class="pick-round">R{rnd}</span>
                      <span class="pick-count">{count}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
          <p style="color:#00f0ff; font-size:12px; margin-top:14px; text-transform:uppercase; letter-spacing:0.08em; font-weight:800;">
            League rule: max {MAX_PICKS_PER_ROUND} picks per round.
          </p>
          <p style="color:#4b5563; font-size:12px; margin-top:8px; text-transform:uppercase; letter-spacing:0.08em;">
            {#if hasDraftOrder}
              Ordered by draft slot.
            {/if}
            {#if draftPicksByTeam && data?.draftPicksSource === 'commissioner'}
              Pick ownership set by the commissioner.
            {:else if draftPicksByTeam}
              Live pick ownership from Yahoo, including traded picks.
            {:else}
              Picks are tradeable — final pick ownership will appear here once entered.
            {/if}
          </p>
        {:else}
          <div class="placeholder-box">
            <p style="margin:0;">Draft picks will appear here once the league is configured.</p>
          </div>
        {/if}
      </div>

    </div>
  {:else}
  <!-- Main Content -->
  <div class="content">

    <!-- Left: Standings -->
    <div>
      <div class="section-header">
        <h2 class="section-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ccff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          Current Standings
        </h2>
        <a href="/standings" class="section-link">
          Full Standings
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>

      {#if data?.requiresAuth}
        <div class="standings-card">
          <div class="auth-gate">
            <p>Log in with Yahoo to view your league standings.</p>
            <a href={loginHref}><span>Login with Yahoo</span></a>
          </div>
        </div>
      {:else if standings.length > 0}
        <div class="standings-card">
          <div style="overflow-x: auto;">
            <table class="standings-table">
              <thead>
                <tr>
                  <th class="center">Rnk</th>
                  <th>Team</th>
                  <th class="center">W-L</th>
                  <th class="right">Points</th>
                </tr>
              </thead>
              <tbody>
                {#each standings as team}
                  <tr>
                    <td class="rank-cell">{team.rank}</td>
                    <td>
                      <div class="team-cell">
                        <div class="avatar">{initials(team.team)}</div>
                        <div>
                          <div class="team-name">{team.team}</div>
                          {#if team.manager !== '—'}
                            <div class="manager-name">{team.manager}</div>
                          {/if}
                        </div>
                      </div>
                    </td>
                    <td class="record-cell">{team.w}-{team.l}</td>
                    <td class="points-cell">{team.points.toFixed(1)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="standings-card">
          <div class="auth-gate">
            <p>Configure your Yahoo league to view standings.</p>
            <a href="/auth/login"><span>Connect League</span></a>
          </div>
        </div>
      {/if}

      {#if enableBlog}
        <div style="margin-top: 48px;">
          <HomePost />
        </div>
      {/if}
    </div>

    <!-- Right column -->
    <div class="right-col">

      <!-- Recent Moves -->
      <div>
        <div class="section-header">
          <h2 class="section-title" style="font-size:1.1rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Recent Moves
          </h2>
        </div>

        <div class="placeholder-box">
          <p style="margin:0 0 8px;">No recent transactions to display.</p>
          <a href="/transactions" style="color:#00f0ff; text-decoration:none; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">View All Transactions →</a>
        </div>
      </div>

      <!-- Quick Stats -->
      <div>
        <div class="section-header">
          <h2 class="section-title" style="font-size:1.1rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7000ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Season Stats
          </h2>
        </div>

        <div class="stats-card">
          {#if standings.length > 0}
            {@const topScorer = standings.slice().sort((a,b) => b.points - a.points)[0]}
            <div class="stat-row">
              <div class="stat-label">Most Points</div>
              <div class="stat-value-row">
                <div class="stat-value cyan">{topScorer.points.toFixed(1)}</div>
                <div class="stat-meta">
                  {topScorer.team}
                  <span>Leader</span>
                </div>
              </div>
            </div>
            {@const leader = standings[0]}
            <div class="stat-row">
              <div class="stat-label">Current Leader</div>
              <div class="stat-value-row">
                <div class="stat-value purple">{leader.w}-{leader.l}</div>
                <div class="stat-meta">
                  {leader.team}
                  <span>Record</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="stat-row">
              <div class="stat-label">NFL Season</div>
              <div class="stat-value-row">
                <div class="stat-value cyan">{data?.nflState?.season ?? '—'}</div>
                <div class="stat-meta">
                  {seasonLabel}
                  <span>{weekLabel ?? ''}</span>
                </div>
              </div>
            </div>
          {/if}
          <a href="/records" class="stat-cta">
            <span class="stat-cta-label">View Power Rankings</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccff00" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>

    </div>
  </div>
  {/if}

  <!-- Footer -->
  <footer class="sn-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
        </div>
        <span class="footer-brand-name">Minnesota <strong>Slopes</strong></span>
      </div>
      <ul class="footer-links">
        <li><a href="/constitution">Rules</a></li>
        <li><a href="/records">History</a></li>
        <li><a href="/managers">Managers</a></li>
      </ul>
      <p class="footer-copy">© {new Date().getFullYear()} Minnesota Slopes FF. All rights reserved.</p>
    </div>
  </footer>

</div>
