<script>
        export let detail;
        export let winner = null;

        const fmt = (p) => (p == null ? '—' : Number(p).toFixed(2));

        $: home = detail?.home ?? null;
        $: away = detail?.away ?? null;

        function rows(side) {
                return side?.starters ?? [];
        }
</script>

{#if detail}
        <div class="md">
                <div class="md-head">
                        <div class="md-team" class:win={winner === home?.rosterId}>
                                <div class="md-team-name">{home?.ownerName ?? home?.teamName}</div>
                                <div class="md-team-pts">{fmt(home?.points)}</div>
                        </div>
                        <div class="md-vs">VS</div>
                        <div class="md-team right" class:win={winner === away?.rosterId}>
                                <div class="md-team-pts">{fmt(away?.points)}</div>
                                <div class="md-team-name">{away?.ownerName ?? away?.teamName}</div>
                        </div>
                </div>

                {#if !detail.hasPlayers}
                        <p class="md-empty">Player-level scores aren't available for this game.</p>
                {:else}
                        <div class="md-section-label">Starters</div>
                        <div class="md-lines">
                                {#each Array(Math.max(rows(home).length, rows(away).length)) as _, i}
                                        {@const h = rows(home)[i]}
                                        {@const a = rows(away)[i]}
                                        <div class="md-line">
                                                <div class="md-player left">
                                                        {#if h}
                                                                <span class="md-pos {h.pos}">{h.pos ?? '—'}</span>
                                                                <span class="md-pname">{h.name}{#if h.team}<span class="md-pteam">{h.team}</span>{/if}</span>
                                                        {/if}
                                                </div>
                                                <div class="md-pts" class:lead={h && a && h.points > a.points}>{fmt(h?.points)}</div>
                                                <div class="md-pts right" class:lead={h && a && a.points > h.points}>{fmt(a?.points)}</div>
                                                <div class="md-player right">
                                                        {#if a}
                                                                <span class="md-pname">{a.name}{#if a.team}<span class="md-pteam">{a.team}</span>{/if}</span>
                                                                <span class="md-pos {a.pos}">{a.pos ?? '—'}</span>
                                                        {/if}
                                                </div>
                                        </div>
                                {/each}
                        </div>

                        {#if (home?.bench?.length || away?.bench?.length)}
                                <div class="md-section-label">Bench</div>
                                <div class="md-lines bench">
                                        {#each Array(Math.max(home?.bench?.length ?? 0, away?.bench?.length ?? 0)) as _, i}
                                                {@const h = home?.bench?.[i]}
                                                {@const a = away?.bench?.[i]}
                                                <div class="md-line">
                                                        <div class="md-player left">
                                                                {#if h}
                                                                        <span class="md-pos {h.pos}">{h.pos ?? '—'}</span>
                                                                        <span class="md-pname">{h.name}{#if h.team}<span class="md-pteam">{h.team}</span>{/if}</span>
                                                                {/if}
                                                        </div>
                                                        <div class="md-pts">{fmt(h?.points)}</div>
                                                        <div class="md-pts right">{fmt(a?.points)}</div>
                                                        <div class="md-player right">
                                                                {#if a}
                                                                        <span class="md-pname">{a.name}{#if a.team}<span class="md-pteam">{a.team}</span>{/if}</span>
                                                                        <span class="md-pos {a.pos}">{a.pos ?? '—'}</span>
                                                                {/if}
                                                        </div>
                                                </div>
                                        {/each}
                                </div>
                        {/if}
                {/if}
        </div>
{/if}

<style>
        .md {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid var(--sn-border);
        }
        .md-head {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                gap: 10px;
                margin-bottom: 14px;
        }
        .md-team {
                display: flex;
                align-items: center;
                gap: 10px;
        }
        .md-team.right { justify-content: flex-end; }
        .md-team-name {
                font-weight: 800;
                color: var(--sn-text-mute);
                font-size: 0.9rem;
        }
        .md-team.win .md-team-name { color: #fff; }
        .md-team-pts {
                font-family: monospace;
                font-weight: 900;
                font-size: 1.1rem;
                color: var(--sn-text-dim);
        }
        .md-team.win .md-team-pts { color: var(--sn-lime); }
        .md-vs {
                font-family: monospace;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.1em;
                color: var(--sn-text-faint);
        }

        .md-section-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 700;
                color: var(--sn-text-faint);
                margin: 10px 0 6px;
        }
        .md-lines.bench { opacity: 0.78; }

        .md-line {
                display: grid;
                grid-template-columns: 1fr 48px 48px 1fr;
                align-items: center;
                gap: 6px;
                padding: 5px 0;
                border-top: 1px solid var(--sn-border);
        }
        .md-line:first-child { border-top: none; }

        .md-player {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
        }
        .md-player.right { justify-content: flex-end; }
        .md-pname {
                font-size: 0.82rem;
                color: var(--sn-text-mute);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
        }
        .md-pteam {
                font-size: 9px;
                color: var(--sn-text-faint);
                margin-left: 5px;
                font-family: monospace;
        }
        .md-pos {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 30px;
                height: 18px;
                border-radius: 5px;
                font-size: 9px;
                font-weight: 800;
                color: #0a0a0a;
                background: var(--sn-text-faint);
        }
        .md-pos.QB { background: #f8718c; }
        .md-pos.RB { background: #62d2c0; }
        .md-pos.WR { background: #56c1f5; }
        .md-pos.TE { background: #f5a85a; }
        .md-pos.K { background: #c79bf0; }
        .md-pos.DEF { background: #9aa6b2; }

        .md-pts {
                font-family: monospace;
                font-weight: 700;
                font-size: 0.82rem;
                text-align: right;
                color: var(--sn-text-faint);
        }
        .md-pts.right { text-align: left; }
        .md-pts.lead { color: var(--sn-text-dim); }

        .md-empty {
                font-size: 0.85rem;
                color: var(--sn-text-faint);
                font-style: italic;
                text-align: center;
                padding: 8px 0;
        }
</style>
