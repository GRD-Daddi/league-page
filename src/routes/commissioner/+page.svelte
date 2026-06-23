<script>
        import { enhance } from '$app/forms';

        let { data, form } = $props();

        let c = $derived(data.commissioner);

        function money(n) {
                return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
        }

        let buyIn = $state(0);
        let potSplitPct = $state(50);
        let first = $state(0);
        let second = $state(0);
        let third = $state(0);
        let championName = $state('');
        let championTeamKey = $state('');
        let winnerName = $state('');
        let winnerTeamKey = $state('');
        let potTotalInput = $state(0);

        $effect(() => {
                buyIn = c.settings.buyIn;
                potSplitPct = c.settings.potSplitPct;
                potTotalInput = c.potTotal;
                first = c.season.payoutFirst;
                second = c.season.payoutSecond;
                third = c.season.payoutThird;
                championName = c.season.championName || '';
                championTeamKey = c.season.championTeamKey || '';
                if (c.champion?.reigning) {
                        winnerName = c.champion.reigning.name || '';
                        winnerTeamKey = c.champion.reigning.teamKey || '';
                }
        });

        const submitting = $state({});
</script>

<svelte:head>
        <title>Commissioner | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
        <div class="wrap">
                <header class="page-head">
                        <div class="eyebrow"><span class="dot"></span> Commissioner Control</div>
                        <h1>League Pot &amp; Payouts</h1>
                        <p class="sub">Manage the buy-ins, the carryover pot, and this season's payout pool for the {c.year} season.</p>
                </header>

                {#if form?.error}
                        <div class="banner error">{form.error}</div>
                {:else if form?.success}
                        <div class="banner ok">Saved.</div>
                {/if}

                <!-- Summary tiles -->
                <div class="tiles">
                        <div class="tile pot">
                                <div class="tile-label">Carryover Pot</div>
                                <div class="tile-value">{money(c.potTotal)}</div>
                                <div class="tile-meta">{c.totalPaidAll} paid buy-in{c.totalPaidAll === 1 ? '' : 's'} all-time</div>
                        </div>
                        <div class="tile pool">
                                <div class="tile-label">{c.year} Payout Pool</div>
                                <div class="tile-value">{money(c.payoutPool.remaining)}</div>
                                <div class="tile-meta">{c.paidThisYear} paid this season</div>
                        </div>
                        <div class="tile champ">
                                <div class="tile-label">Reigning Champion</div>
                                <div class="tile-value sm">{c.champion?.reigning?.name || '—'}</div>
                                <div class="tile-meta">
                                        {#if c.champion?.backToBackAchieved}
                                                <span class="hot">Back-to-back achieved</span>
                                        {:else if c.champion?.reigning}
                                                The person to beat
                                        {:else}
                                                No champion recorded
                                        {/if}
                                </div>
                        </div>
                </div>

                <div class="grid">
                        <!-- Settings -->
                        <section class="card">
                                <h2>Buy-in &amp; Split</h2>
                                <p class="card-sub">Each buy-in splits into the carryover pot and this year's payout pool.</p>
                                <form method="POST" action="?/updateSettings" use:enhance>
                                        <label class="field">
                                                <span>Buy-in amount ($)</span>
                                                <input type="number" name="buyIn" min="0" step="1" bind:value={buyIn} />
                                        </label>
                                        <label class="field">
                                                <span>Pot split (% of buy-in to carryover pot)</span>
                                                <input type="number" name="potSplitPct" min="0" max="100" step="1" bind:value={potSplitPct} />
                                        </label>
                                        <div class="split-preview">
                                                <div><strong>{money(buyIn * (potSplitPct / 100))}</strong><span>to pot</span></div>
                                                <div><strong>{money(buyIn * ((100 - potSplitPct) / 100))}</strong><span>to payout pool</span></div>
                                        </div>
                                        <button class="btn" type="submit">Save Settings</button>
                                </form>

                                <div class="hr"></div>

                                <form method="POST" action="?/setPotTotal" use:enhance>
                                        <label class="field">
                                                <span>Set carryover pot total ($)</span>
                                                <input type="number" name="potTotal" min="0" step="1" bind:value={potTotalInput} />
                                        </label>
                                        <p class="card-sub note">Type the pot's current value to set it directly — useful for seeding a balance carried over from past seasons. Paid buy-ins keep adding on top of this amount.</p>
                                        <button class="btn" type="submit">Set Pot Total</button>
                                </form>
                        </section>

                        <!-- Payouts -->
                        <section class="card">
                                <h2>{c.year} Payout Amounts</h2>
                                <p class="card-sub">Enter the exact 1st / 2nd / 3rd place dollar amounts, then mark each as paid.</p>
                                <form method="POST" action="?/setPayouts" use:enhance>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>1st place ($)</span><input type="number" name="first" min="0" step="1" bind:value={first} /></label>
                                        <label class="field"><span>2nd place ($)</span><input type="number" name="second" min="0" step="1" bind:value={second} /></label>
                                        <label class="field"><span>3rd place ($)</span><input type="number" name="third" min="0" step="1" bind:value={third} /></label>
                                        <button class="btn" type="submit">Save Payouts</button>
                                </form>

                                <div class="payout-rows">
                                        {#each [ ['first','1st',c.payoutPool.first], ['second','2nd',c.payoutPool.second], ['third','3rd',c.payoutPool.third] ] as [place, label, info]}
                                                <div class="payout-row">
                                                        <span class="pl">{label}</span>
                                                        <span class="amt">{money(info.amount)}</span>
                                                        <form method="POST" action="?/togglePayoutPaid" use:enhance>
                                                                <input type="hidden" name="year" value={c.year} />
                                                                <input type="hidden" name="place" value={place} />
                                                                <input type="hidden" name="paid" value={(!info.paid).toString()} />
                                                                <button class="chip {info.paid ? 'paid' : ''}" type="submit">{info.paid ? 'Paid ✓' : 'Mark Paid'}</button>
                                                        </form>
                                                </div>
                                        {/each}
                                </div>
                        </section>

                        <!-- Champion -->
                        <section class="card">
                                <h2>Record Champion</h2>
                                <p class="card-sub">Confirm the {c.year} champion. Used to determine the "person to beat" and back-to-back status.</p>
                                <form method="POST" action="?/recordChampion" use:enhance>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>Champion name</span><input type="text" name="championName" placeholder="Team or manager name" bind:value={championName} /></label>
                                        <label class="field"><span>Team key (optional)</span><input type="text" name="championTeamKey" placeholder="nfl.l.xxxxxx.t.x" bind:value={championTeamKey} /></label>
                                        <button class="btn" type="submit">Record Champion</button>
                                </form>

                                {#if c.championHistory.length}
                                        <div class="history">
                                                <div class="history-title">Recorded champions</div>
                                                {#each [...c.championHistory].sort((a,b)=>b.year-a.year) as ch}
                                                        <div class="history-row"><span>{ch.year}</span><strong>{ch.name}</strong></div>
                                                {/each}
                                        </div>
                                {/if}
                        </section>

                        <!-- Award pot -->
                        <section class="card award">
                                <h2>Award the Pot</h2>
                                <p class="card-sub">When a champion wins two years in a row, award the entire carryover pot. This records the winner and resets the pot to $0.</p>
                                {#if c.champion?.backToBackAchieved}
                                        <div class="banner hotbanner">🏆 {c.champion.reigning.name} has gone back-to-back and can claim the pot.</div>
                                {/if}
                                <form method="POST" action="?/awardPot" use:enhance>
                                        <input type="hidden" name="year" value={c.year} />
                                        <label class="field"><span>Winner name</span><input type="text" name="winnerName" bind:value={winnerName} /></label>
                                        <label class="field"><span>Winner team key (optional)</span><input type="text" name="winnerTeamKey" bind:value={winnerTeamKey} /></label>
                                        <div class="award-amt">Current pot: <strong>{money(c.potTotal)}</strong></div>
                                        <button class="btn danger" type="submit" disabled={c.potTotal <= 0}>Award {money(c.potTotal)} &amp; Reset</button>
                                </form>
                        </section>
                </div>

                <!-- Member buy-ins -->
                <section class="card full">
                        <h2>{c.year} Buy-ins</h2>
                        <p class="card-sub">Check off each member who has paid their buy-in this season. Each paid member adds {money(c.settings.potShare)} to the pot and {money(c.settings.poolShare)} to the payout pool.</p>
                        {#if !c.leagueUsersAvailable}
                                <div class="banner error">Could not load league members from Yahoo. Make sure you're logged in and the league is connected.</div>
                        {:else}
                                <div class="members">
                                        {#each c.members as m}
                                                <div class="member {m.paid ? 'is-paid' : ''}">
                                                        <div class="m-info">
                                                                <span class="m-name">{m.name}</span>
                                                                {#if m.manager}<span class="m-manager">{m.manager}</span>{/if}
                                                        </div>
                                                        <form method="POST" action="?/toggleBuyin" use:enhance>
                                                                <input type="hidden" name="year" value={c.year} />
                                                                <input type="hidden" name="teamKey" value={m.teamKey} />
                                                                <input type="hidden" name="memberName" value={m.name} />
                                                                <input type="hidden" name="paid" value={(!m.paid).toString()} />
                                                                <button class="chip {m.paid ? 'paid' : ''}" type="submit">{m.paid ? 'Paid ✓' : 'Unpaid'}</button>
                                                        </form>
                                                </div>
                                        {/each}
                                </div>
                        {/if}
                </section>
        </div>
</div>

<style>
        .sn-page { min-height: 100vh; background: #0a0a0c; color: #fff; }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 48px 24px 96px; }

        .page-head { margin-bottom: 32px; }
        .eyebrow {
                display: inline-flex; align-items: center; gap: 8px;
                color: #ccff00; font-size: 11px; font-weight: 900; letter-spacing: 0.2em;
                text-transform: uppercase; margin-bottom: 14px;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #ccff00; box-shadow: 0 0 10px #ccff00; }
        h1 {
                font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; font-style: italic;
                text-transform: uppercase; letter-spacing: -0.03em; margin: 0 0 12px;
                background: linear-gradient(to right, #00f0ff, #7000ff);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sub { color: #9ca3af; margin: 0; max-width: 640px; }

        .banner { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-weight: 700; font-size: 0.9rem; }
        .banner.ok { background: rgba(204,255,0,0.12); color: #ccff00; border: 1px solid rgba(204,255,0,0.3); }
        .banner.error { background: rgba(255,60,60,0.12); color: #ff8080; border: 1px solid rgba(255,60,60,0.3); }
        .hotbanner { background: rgba(112,0,255,0.18); color: #c4a6ff; border: 1px solid rgba(112,0,255,0.4); }

        .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        @media (max-width: 760px) { .tiles { grid-template-columns: 1fr; } }
        .tile {
                background: linear-gradient(135deg, #1a1d24, #0f1115);
                border: 1px solid #1f2937; border-radius: 12px; padding: 22px;
        }
        .tile-label { font-size: 11px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
        .tile-value { font-family: monospace; font-size: 2.2rem; font-weight: 900; }
        .tile-value.sm { font-size: 1.4rem; font-family: inherit; font-style: italic; }
        .tile.pot .tile-value { color: #ccff00; }
        .tile.pool .tile-value { color: #00f0ff; }
        .tile.champ .tile-value { color: #fff; }
        .tile-meta { font-size: 12px; color: #6b7280; margin-top: 8px; }
        .tile-meta .hot { color: #c4a6ff; font-weight: 800; }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }

        .card {
                background: #0f1115; border: 1px solid #1f2937; border-radius: 12px; padding: 24px;
        }
        .card.full { margin-top: 16px; }
        .card.award { border-color: rgba(112,0,255,0.35); }
        .card h2 { font-size: 1.1rem; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.01em; margin: 0 0 6px; }
        .card-sub { color: #6b7280; font-size: 0.82rem; margin: 0 0 18px; line-height: 1.5; }
        .card-sub.note { margin: -4px 0 16px; }
        .hr { height: 1px; background: #1f2937; margin: 22px 0; }

        .field { display: block; margin-bottom: 14px; }
        .field span { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 6px; }
        .field input {
                width: 100%; box-sizing: border-box; background: #0a0a0c; border: 1px solid #374151;
                color: #fff; border-radius: 8px; padding: 10px 12px; font-size: 0.95rem; font-family: inherit;
        }
        .field input:focus { outline: none; border-color: #00f0ff; }

        .split-preview { display: flex; gap: 18px; margin: 4px 0 16px; }
        .split-preview div { display: flex; flex-direction: column; }
        .split-preview strong { font-family: monospace; font-size: 1.2rem; color: #ccff00; }
        .split-preview span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }

        .btn {
                display: inline-flex; align-items: center; justify-content: center;
                background: #ccff00; color: #000; font-weight: 900; font-size: 12px;
                letter-spacing: 0.12em; text-transform: uppercase; padding: 0 22px; height: 44px;
                border: none; border-radius: 6px; cursor: pointer; font-family: inherit;
                transition: background 0.15s, box-shadow 0.15s;
        }
        .btn:hover { background: #aacc00; box-shadow: 0 0 20px rgba(204,255,0,0.25); }
        .btn.danger { background: #7000ff; color: #fff; }
        .btn.danger:hover { background: #5e00d6; box-shadow: 0 0 20px rgba(112,0,255,0.4); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

        .payout-rows { margin-top: 18px; border-top: 1px solid #1f2937; padding-top: 14px; }
        .payout-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .payout-row .pl { width: 36px; font-weight: 900; color: #6b7280; }
        .payout-row .amt { flex: 1; font-family: monospace; font-weight: 700; color: #00f0ff; }

        .chip {
                background: transparent; border: 1px solid #374151; color: #9ca3af;
                font-weight: 800; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
                padding: 7px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .chip:hover { border-color: #00f0ff; color: #00f0ff; }
        .chip.paid { background: rgba(204,255,0,0.15); border-color: rgba(204,255,0,0.4); color: #ccff00; }

        .award-amt { font-size: 0.9rem; color: #9ca3af; margin-bottom: 14px; }
        .award-amt strong { color: #ccff00; font-family: monospace; }

        .history { margin-top: 18px; border-top: 1px solid #1f2937; padding-top: 14px; }
        .history-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 8px; }
        .history-row { display: flex; gap: 12px; padding: 4px 0; font-size: 0.9rem; }
        .history-row span { color: #6b7280; font-family: monospace; width: 48px; }

        .members { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        @media (max-width: 600px) { .members { grid-template-columns: 1fr; } }
        .member {
                display: flex; align-items: center; justify-content: space-between; gap: 12px;
                background: #0a0a0c; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 14px;
        }
        .member.is-paid { border-color: rgba(204,255,0,0.3); }
        .m-info { display: flex; flex-direction: column; min-width: 0; }
        .m-name { font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .m-manager { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
</style>
