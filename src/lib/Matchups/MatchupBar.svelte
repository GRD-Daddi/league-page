<script>
    export let home = null;   // { name, sub, avatar, initials, points, projection }
    export let away = null;   // same shape, or null for a bye
    export let winner = null; // 'home' | 'away' | 'tie' | null
    export let expanded = false;
    export let showHint = true;
    export let onToggle = null;

    const fmt = (p) => (p == null ? '—' : Number(p).toFixed(2));

    const ini = (o) => {
        if (o?.initials) return o.initials;
        const parts = String(o?.name ?? '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        const first = parts[0][0] ?? '';
        const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return (first + last).toUpperCase() || '?';
    };

    $: hp = Number(home?.points) || 0;
    $: ap = Number(away?.points) || 0;
    $: total = hp + ap;
    $: homePct = home && away ? (total > 0 ? (hp / total) * 100 : 50) : home ? 100 : 0;
    $: awayPct = home && away ? 100 - homePct : away ? 100 : 0;

    const trigger = () => { if (onToggle) onToggle(); };
</script>

<button type="button" class="mb" class:expanded class:static={!onToggle} aria-expanded={onToggle ? expanded : null} on:click={trigger}>
    <div class="mb-track">
        {#if home}
            <div class="mb-fill home" class:win={winner === 'home'} style="width:{homePct}%"></div>
        {/if}
        {#if away}
            <div class="mb-fill away" class:win={winner === 'away'} style="width:{awayPct}%"></div>
        {/if}
    </div>

    <div class="mb-content" class:solo={!home || !away}>
        {#if home}
            <div
                class="mb-side home"
                class:win={winner === 'home'}
                class:lose={winner != null && winner !== 'tie' && winner !== 'home'}
            >
                <div class="mb-avatar">
                    {#if home.avatar}
                        <img src={home.avatar} alt="" />
                    {:else}
                        <span>{ini(home)}</span>
                    {/if}
                </div>
                <div class="mb-info">
                    <div class="mb-name">{home.name ?? 'Unknown'}</div>
                    {#if home.sub}<div class="mb-sub">{home.sub}</div>{/if}
                </div>
                <div class="mb-pts">
                    {fmt(home.points)}
                    {#if home.projection != null}<span class="mb-proj">{fmt(home.projection)}</span>{/if}
                </div>
            </div>
        {/if}

        {#if home && away}<div class="mb-vs">VS</div>{/if}

        {#if away}
            <div
                class="mb-side away"
                class:win={winner === 'away'}
                class:lose={winner != null && winner !== 'tie' && winner !== 'away'}
            >
                <div class="mb-pts">
                    {fmt(away.points)}
                    {#if away.projection != null}<span class="mb-proj">{fmt(away.projection)}</span>{/if}
                </div>
                <div class="mb-info">
                    <div class="mb-name">{away.name ?? 'Unknown'}</div>
                    {#if away.sub}<div class="mb-sub">{away.sub}</div>{/if}
                </div>
                <div class="mb-avatar">
                    {#if away.avatar}
                        <img src={away.avatar} alt="" />
                    {:else}
                        <span>{ini(away)}</span>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    {#if showHint}
        <span class="mb-hint">{expanded ? 'Hide lineups ▲' : 'View lineups ▼'}</span>
    {/if}
</button>

<style>
    .mb {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        text-align: inherit;
        font: inherit;
        color: inherit;
        cursor: pointer;
    }
    .mb.static { cursor: default; }

    /* proportional "tug of war" score fills */
    .mb-track {
        position: absolute;
        inset: 0;
        display: flex;
        pointer-events: none;
        z-index: 0;
    }
    .mb-fill {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .mb-fill.home {
        background: linear-gradient(to right, rgba(0, 240, 255, 0.20), rgba(0, 240, 255, 0.03));
    }
    .mb-fill.away {
        background: linear-gradient(to left, rgba(204, 255, 0, 0.20), rgba(204, 255, 0, 0.03));
    }
    .mb-fill.home.win {
        background: linear-gradient(to right, rgba(0, 240, 255, 0.32), rgba(0, 240, 255, 0.08));
        box-shadow: inset -2px 0 14px -2px var(--sn-cyan);
    }
    .mb-fill.away.win {
        background: linear-gradient(to left, rgba(204, 255, 0, 0.32), rgba(204, 255, 0, 0.08));
        box-shadow: inset 2px 0 14px -2px var(--sn-lime);
    }

    .mb-content {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: stretch;
    }
    .mb-content.solo .mb-side { justify-content: space-between; }

    .mb-side {
        flex: 1 1 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        min-width: 0;
    }
    .mb-side.home { justify-content: flex-start; }
    .mb-side.away { justify-content: flex-end; text-align: right; }

    .mb-avatar {
        flex: none;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--sn-surface-3);
        border: 1px solid var(--sn-border);
        color: var(--sn-text-dim);
        font-family: monospace;
        font-weight: 800;
        font-size: 0.85rem;
    }
    .mb-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .mb-side.home.win .mb-avatar {
        border-color: var(--sn-cyan);
        color: var(--sn-cyan);
        box-shadow: 0 0 10px -2px var(--sn-cyan);
    }
    .mb-side.away.win .mb-avatar {
        border-color: var(--sn-lime);
        color: var(--sn-lime);
        box-shadow: 0 0 10px -2px var(--sn-lime);
    }

    .mb-info { min-width: 0; flex: 1 1 auto; }
    .mb-side.away .mb-info { text-align: right; }
    .mb-name {
        font-weight: 800;
        font-style: italic;
        color: var(--sn-text-dim);
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .mb-sub {
        font-size: 12px;
        color: var(--sn-text-faint);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .mb-side.win .mb-name { color: #fff; }
    .mb-side.lose .mb-name,
    .mb-side.lose .mb-pts { color: var(--sn-text-faint); }

    .mb-pts {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: 1.05;
        font-family: monospace;
        font-weight: 900;
        font-size: 1.35rem;
        color: var(--sn-text-mute);
    }
    .mb-side.home .mb-pts { align-items: flex-start; }
    .mb-side.home.win .mb-pts { color: var(--sn-cyan); }
    .mb-side.away.win .mb-pts { color: var(--sn-lime); }
    .mb-proj {
        font-size: 0.55em;
        font-weight: 700;
        font-style: italic;
        color: var(--sn-text-faint);
    }

    .mb-vs {
        flex: none;
        align-self: center;
        padding: 0 8px;
        font-family: monospace;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.1em;
        color: var(--sn-text-faint);
    }

    .mb-hint {
        position: relative;
        z-index: 1;
        padding: 0 0 10px;
        text-align: center;
        font-family: monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--sn-text-faint);
        transition: color 0.15s ease;
    }
    .mb:hover .mb-hint { color: var(--sn-cyan); }

    @media (max-width: 560px) {
        .mb-avatar { display: none; }
        .mb-side { padding: 12px 12px; }
        .mb-pts { font-size: 1.15rem; }
        .mb-name { font-size: 0.85rem; }
    }
</style>
