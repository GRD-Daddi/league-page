<script>
  import { leagueName, enableBlog } from '$lib/utils/helper';
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

  $: phase = data?.seasonPhase ?? 'regular';
  $: isDraftPrep = phase === 'preseason' || phase === 'offseason';

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
    return Object.values(data.rosters).map((r) => {
      const teamName = r.metadata?.team_name ?? r.team_name ?? 'Unknown Team';
      return {
        name: teamName,
        logo: r.metadata?.team_logo ?? null,
        rosterId: r.roster_id ?? r.metadata?.team_key ?? teamName
      };
    });
  })();

  const PLACE_LABELS = { 1: '1st', 2: '2nd', 3: '3rd' };
  const PLACE_TONE = { 1: 'gold', 2: 'silver', 3: 'bronze' };

  // Placeholder draft rounds shown per team until real pick data is wired in.
  const DRAFT_ROUNDS = [1, 2, 3, 4, 5];
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
    padding: 80px 24px 72px;
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
    margin-bottom: 24px;
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ccff00;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .hero-title {
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.03em;
    line-height: 0.88;
    margin: 0 0 24px;
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
    font-size: 1rem;
    color: #9ca3af;
    max-width: 560px;
    margin: 0 0 40px;
    border-left: 4px solid #00f0ff;
    padding-left: 16px;
    line-height: 1.6;
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

  .pot-desc {
    color: #9ca3af;
    max-width: 520px;
    margin: 16px 0 24px;
    line-height: 1.6;
    font-size: 0.95rem;
  }

  .pot-desc strong { color: #fff; }

  .beat-card {
    background: rgba(15,17,21,0.7);
    border: 1px solid #1f2937;
    border-left: 4px solid #ccff00;
    border-radius: 10px;
    padding: 18px 20px;
    max-width: 520px;
  }

  .beat-head {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 900; letter-spacing: 0.15em;
    text-transform: uppercase; color: #9ca3af; margin-bottom: 8px;
  }

  .beat-name {
    font-size: 1.6rem; font-weight: 900; font-style: italic;
    text-transform: uppercase; letter-spacing: -0.02em; color: #fff;
  }

  .beat-name.muted { color: #4b5563; }

  .beat-note { font-size: 0.85rem; color: #6b7280; margin-top: 6px; }
  .beat-note.hot { color: #c4a6ff; font-weight: 800; }

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

  .pool-foot { margin-top: auto; padding-top: 16px; font-size: 12px; color: #6b7280; }

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

  /* ── Last Season Trophies band ── */
  .trophy-band {
    border-bottom: 1px solid #1f2937;
    background:
      radial-gradient(900px 240px at 80% -40%, rgba(255,210,74,0.10), transparent 70%),
      radial-gradient(700px 200px at 10% 0%, rgba(0,240,255,0.08), transparent 70%),
      #0a0a0c;
  }

  .trophy-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 56px 24px;
  }

  .band-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #ffd24a;
    margin-bottom: 10px;
  }

  .band-title {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    margin: 0 0 6px;
    color: #fff;
  }

  .band-title .accent {
    background: linear-gradient(to right, #ffd24a, #ff8a3d);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .band-sub {
    color: #9ca3af;
    font-size: 0.95rem;
    margin: 0 0 28px;
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
    background: linear-gradient(135deg, #1a1d24, #0f1115);
    border: 1px solid #1f2937;
    border-radius: 14px;
    padding: 28px 24px;
    text-align: center;
    overflow: hidden;
  }

  .trophy-card.gold   { border-color: rgba(255,210,74,0.5); box-shadow: 0 0 40px rgba(255,210,74,0.12); }
  .trophy-card.silver { border-color: rgba(203,213,225,0.35); }
  .trophy-card.bronze { border-color: rgba(216,145,90,0.35); }

  .trophy-card.gold   { transform: translateY(-14px); }

  @media (max-width: 760px) {
    .trophy-card.gold { transform: none; }
  }

  .trophy-place {
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .trophy-place.gold { color: #ffd24a; }
  .trophy-place.silver { color: #cbd5e1; }
  .trophy-place.bronze { color: #d8915a; }

  .trophy-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    margin: 0 auto 16px;
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
  .trophy-card.gold .trophy-avatar { width: 88px; height: 88px; border-color: #ffd24a; }

  .trophy-team {
    font-size: 1.1rem;
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    color: #fff;
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

  .draft-picks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pick-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
    background: #0a0a0c;
    border: 1px dashed #1f2937;
    border-radius: 999px;
    padding: 6px 12px;
  }

  .pick-chip .rnd { color: #00f0ff; }
  .pick-chip .pick-count { color: #e5e7eb; font-weight: 800; }

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
</style>

<div class="sn-page">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-bg">
      <img src="/stadium-hero.png" alt="Stadium" />
    </div>
    <div class="hero-inner">
      {#if weekLabel}
        <div class="live-badge">
          <span class="live-dot"></span>
          Live &bull; {weekLabel}
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

  <!-- League Pot & Payouts -->
  {#if pot}
    <div class="pot-band">
      <div class="pot-inner">
        <div class="pot-grid">

          <!-- Carryover pot + person to beat -->
          <div class="pot-main">
            <div class="pot-label"><span class="pot-dot"></span> The Carryover Pot</div>
            <div class="pot-amount">{money(pot.potTotal)}</div>
            <div class="pot-desc">
              Half of every buy-in builds this pot. It keeps growing until a champion
              goes <strong>back-to-back</strong> — then they take it all and it resets to zero.
            </div>

            <div class="beat-card">
              {#if pot.champion?.reigning}
                <div class="beat-head">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccff00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  The Person To Beat
                </div>
                <div class="beat-name">{pot.champion.reigning.name}</div>
                {#if pot.champion.backToBackAchieved}
                  <div class="beat-note hot">🚨 Back-to-back achieved — they can claim the entire pot!</div>
                {:else}
                  <div class="beat-note">Reigning champ ({pot.champion.reigning.year}). Win again and they walk away with the pot.</div>
                {/if}
              {:else}
                <div class="beat-head">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  The Person To Beat
                </div>
                <div class="beat-name muted">To be crowned</div>
                <div class="beat-note">No reigning champion recorded yet.</div>
              {/if}
            </div>
          </div>

          <!-- This year's payout pool -->
          <div class="pool-card">
            <div class="pool-head">
              <span class="pool-label">{pot.year} Payout Pool</span>
              <span class="pool-total">{money(pot.payoutPool.remaining)}</span>
            </div>
            <div class="pool-sub">Split among the top three finishers</div>

            <div class="pool-rows">
              <div class="pool-row">
                <span class="place gold">1st</span>
                <span class="place-amt">{money(pot.payoutPool.first.amount)}</span>
                <span class="status {pot.payoutPool.first.paid ? 'paid' : ''}">{pot.payoutPool.first.paid ? 'Paid' : 'Pending'}</span>
              </div>
              <div class="pool-row">
                <span class="place silver">2nd</span>
                <span class="place-amt">{money(pot.payoutPool.second.amount)}</span>
                <span class="status {pot.payoutPool.second.paid ? 'paid' : ''}">{pot.payoutPool.second.paid ? 'Paid' : 'Pending'}</span>
              </div>
              <div class="pool-row">
                <span class="place bronze">3rd</span>
                <span class="place-amt">{money(pot.payoutPool.third.amount)}</span>
                <span class="status {pot.payoutPool.third.paid ? 'paid' : ''}">{pot.payoutPool.third.paid ? 'Paid' : 'Pending'}</span>
              </div>
            </div>

            <div class="pool-foot">{pot.paidThisYear} member{pot.paidThisYear === 1 ? '' : 's'} paid in this season</div>
          </div>

        </div>
      </div>
    </div>
  {/if}

  <!-- Last Season Trophies -->
  <div class="trophy-band">
    <div class="trophy-inner">
      <div class="band-eyebrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd24a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
        {podium?.year ?? lastChampion?.year ?? 'Last'} Season
      </div>
      <h2 class="band-title">THE <span class="accent">TROPHY ROOM</span></h2>
      <p class="band-sub">Last season's top three finishers.</p>

      {#if podium?.podium?.length}
        <div class="podium-grid">
          {#each [2, 1, 3] as place}
            {@const t = podium.podium.find((p) => p.place === place)}
            <div class="trophy-card {PLACE_TONE[place]}">
              <div class="trophy-place {PLACE_TONE[place]}">{PLACE_LABELS[place]} Place</div>
              {#if t}
                <div class="trophy-avatar">
                  {#if t.logo}<img src={t.logo} alt={t.name} />{:else}{initials(t.name)}{/if}
                </div>
                <div class="trophy-team">{t.name}</div>
                {#if t.wins != null}
                  <div class="trophy-meta">{t.wins}-{t.losses}{#if t.pointsFor != null} &bull; {t.pointsFor.toFixed(0)} PF{/if}</div>
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
          <div class="trophy-card silver">
            <div class="trophy-place silver">2nd Place</div>
            <div class="trophy-avatar"><span class="trophy-empty">?</span></div>
            <div class="trophy-empty">Not recorded</div>
          </div>
          <div class="trophy-card gold">
            <div class="trophy-place gold">Champion</div>
            <div class="trophy-avatar">{initials(lastChampion.name)}</div>
            <div class="trophy-team">{lastChampion.name}</div>
            <div class="trophy-meta">{lastChampion.year} Champion</div>
          </div>
          <div class="trophy-card bronze">
            <div class="trophy-place bronze">3rd Place</div>
            <div class="trophy-avatar"><span class="trophy-empty">?</span></div>
            <div class="trophy-empty">Not recorded</div>
          </div>
        </div>
      {:else}
        <div class="podium-grid">
          {#each [2, 1, 3] as place}
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

  {#if isDraftPrep}
    <!-- Draft Prep (preseason / offseason) -->
    <div class="content" style="display:block;">

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
            <a href="/auth/login" class="btn-primary" style="height:44px;"><span>Login with Yahoo</span></a>
          </div>
        {:else if teams.length > 0}
          <div class="draft-prep-grid">
            {#each teams as team}
              <div class="draft-team-card">
                <div class="draft-team-head">
                  <div class="avatar">
                    {#if team.logo}<img src={team.logo} alt={team.name} style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />{:else}{initials(team.name)}{/if}
                  </div>
                  <div class="team-name" style="font-size:0.95rem;">{team.name}</div>
                </div>
                <div class="draft-picks">
                  {#each DRAFT_ROUNDS as rnd}
                    <span class="pick-chip"><span class="rnd">R{rnd}</span> <span class="pick-count">×1</span></span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
          <p style="color:#4b5563; font-size:12px; margin-top:14px; text-transform:uppercase; letter-spacing:0.08em;">
            Picks are tradeable — final pick ownership will appear here once entered.
          </p>
        {:else}
          <div class="placeholder-box">
            <p style="margin:0;">Draft picks will appear here once the league is configured.</p>
          </div>
        {/if}
      </div>

      <!-- Key Players Returning to the Draft -->
      <div>
        <div class="section-header">
          <h2 class="section-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7000ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/></svg>
            Key Players Returning to the Draft
          </h2>
        </div>

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
            <a href="/auth/login"><span>Login with Yahoo</span></a>
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
