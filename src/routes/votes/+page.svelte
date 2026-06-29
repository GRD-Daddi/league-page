<script>
        import { enhance } from '$app/forms';

        let { data, form } = $props();

        let v = $derived(data.votes);
        let isCommish = $derived(!!v?.isCommissioner);

        let openVotes = $derived(v?.open || []);
        let pendingVotes = $derived(v?.pending || []);
        let closedVotes = $derived(v?.closed || []);

        let activeTab = $state('open');

        // ── Propose form state ──
        let proposeOpen = $state(false);
        let newType = $state('yesno');
        let newOptions = $state(['', '']);

        function addOption() {
                newOptions = [...newOptions, ''];
        }
        function removeOption(i) {
                newOptions = newOptions.filter((_, idx) => idx !== i);
        }

        // Reset the propose form after a successful create.
        $effect(() => {
                if (form?.success && form?.action === 'create') {
                        proposeOpen = false;
                        newType = 'yesno';
                        newOptions = ['', ''];
                }
        });

        function pct(count, total) {
                if (!total) return 0;
                return Math.round((count / total) * 100);
        }

        function fmtDate(value) {
                if (!value) return null;
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        function fmtDeadline(value) {
                if (!value) return null;
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                const now = Date.now();
                const diffMs = d.getTime() - now;
                const day = 24 * 60 * 60 * 1000;
                const label = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                if (diffMs <= 0) return { label, urgent: true, text: 'closing' };
                const days = Math.ceil(diffMs / day);
                return { label, urgent: days <= 2, text: days <= 1 ? 'closes today' : `${days} days left` };
        }

        // CSV import box.
        let csvText = $state('');
        $effect(() => {
                if (form?.success && form?.action === 'import') csvText = '';
        });
</script>

<svelte:head>
        <title>League Votes | Minnesota Slopes</title>
</svelte:head>

<div class="sn-page">
        <div class="sn-pagehead">
                <div class="sn-pagehead-inner">
                        <span class="sn-eyebrow">League Info</span>
                        <h1 class="sn-pagetitle">LEAGUE <span class="accent">VOTES</span></h1>
                        <p class="sn-pagesub">
                                Propose rule changes, vote on what's open, and review the league's voting history — all
                                in one place.
                        </p>
                </div>
        </div>

        <div class="sn-container narrow">
                {#if form?.error}
                        <div class="banner error">{form.error}</div>
                {:else if form?.success && form?.action === 'import'}
                        <div class="banner ok">
                                Imported {form.imported} vote{form.imported === 1 ? '' : 's'}.
                                {#if form.skipped?.length}<br /><span class="muted">Skipped: {form.skipped.join('; ')}.</span>{/if}
                                {#if form.errors?.length}<br /><span class="muted">Errors: {form.errors.join('; ')}.</span>{/if}
                        </div>
                {:else if form?.success}
                        <div class="banner ok">Saved.</div>
                {/if}

                <div class="toolbar">
                        <nav class="sn-tabs">
                                <button type="button" class="sn-btn ghost" class:active={activeTab === 'open'} onclick={() => (activeTab = 'open')}>
                                        <span>Open · {openVotes.length}</span>
                                </button>
                                {#if isCommish}
                                        <button type="button" class="sn-btn ghost" class:active={activeTab === 'pending'} onclick={() => (activeTab = 'pending')}>
                                                <span>Pending · {pendingVotes.length}</span>
                                        </button>
                                {/if}
                                <button type="button" class="sn-btn ghost" class:active={activeTab === 'archive'} onclick={() => (activeTab = 'archive')}>
                                        <span>Archive · {closedVotes.length}</span>
                                </button>
                        </nav>
                        <button type="button" class="sn-btn primary" onclick={() => (proposeOpen = !proposeOpen)}>
                                <span>{proposeOpen ? 'Cancel' : 'Propose a Vote'}</span>
                        </button>
                </div>

                {#if proposeOpen}
                        <section class="sn-card sn-card-pad propose">
                                <h2 class="block-title">New Rule Proposal</h2>
                                <p class="block-sub">Submit a proposal for the commissioner to approve. Once approved, every owner can cast a vote.</p>
                                <form method="POST" action="?/create" use:enhance>
                                        <label class="field">
                                                <span>Title</span>
                                                <input class="sn-input" type="text" name="title" placeholder="e.g. Expand to a 12-team league?" required />
                                        </label>
                                        <label class="field">
                                                <span>Description <em>(optional)</em></span>
                                                <textarea class="sn-input" name="description" rows="3" placeholder="Explain the rule change and why it's being proposed."></textarea>
                                        </label>
                                        <label class="field">
                                                <span>Vote type</span>
                                                <select class="sn-select" name="type" bind:value={newType}>
                                                        <option value="yesno">Yes / No</option>
                                                        <option value="multiple">Multiple choice</option>
                                                </select>
                                        </label>

                                        {#if newType === 'multiple'}
                                                <div class="field">
                                                        <span>Options</span>
                                                        {#each newOptions as opt, i}
                                                                <div class="opt-row">
                                                                        <input class="sn-input" type="text" name="options" placeholder={`Option ${i + 1}`} bind:value={newOptions[i]} />
                                                                        {#if newOptions.length > 2}
                                                                                <button type="button" class="sn-btn ghost sm" onclick={() => removeOption(i)}><span>Remove</span></button>
                                                                        {/if}
                                                                </div>
                                                        {/each}
                                                        <button type="button" class="sn-btn secondary sm" onclick={addOption}><span>+ Add option</span></button>
                                                </div>
                                        {/if}

                                        <label class="field">
                                                <span>Deadline <em>(optional — auto-closes the vote)</em></span>
                                                <input class="sn-input" type="datetime-local" name="deadline" />
                                        </label>

                                        <button class="sn-btn primary" type="submit"><span>Submit Proposal</span></button>
                                </form>
                        </section>
                {/if}

                <!-- ── OPEN VOTES ── -->
                {#if activeTab === 'open'}
                        {#if openVotes.length === 0}
                                <div class="sn-empty">
                                        <h3>No open votes</h3>
                                        <p>There's nothing to vote on right now. Propose a rule change to get one started.</p>
                                </div>
                        {:else}
                                {#each openVotes as p (p.id)}
                                        {@const deadline = fmtDeadline(p.deadline)}
                                        <section class="sn-card sn-card-pad vote">
                                                <div class="vote-head">
                                                        <div>
                                                                <h2 class="block-title">{p.title}</h2>
                                                                {#if p.description}<p class="block-sub">{p.description}</p>{/if}
                                                        </div>
                                                        <div class="vote-meta">
                                                                {#if deadline}
                                                                        <span class="sn-badge {deadline.urgent ? 'lime' : 'cyan'}">{deadline.text}</span>
                                                                {/if}
                                                                {#if p.createdByName}<span class="by">by {p.createdByName}</span>{/if}
                                                        </div>
                                                </div>

                                                <form method="POST" action="?/vote" use:enhance class="options">
                                                        <input type="hidden" name="proposalId" value={p.id} />
                                                        {#each p.counts as c (c.option)}
                                                                {@const chosen = p.myChoice === c.option}
                                                                <button type="submit" name="choice" value={c.option} class="option-bar" class:chosen>
                                                                        <span class="fill" style={`width:${pct(c.votes, p.totalVotes)}%`}></span>
                                                                        <span class="opt-label">
                                                                                {#if chosen}<span class="check">✓</span>{/if}
                                                                                {c.option}
                                                                        </span>
                                                                        <span class="opt-count">{c.votes} · {pct(c.votes, p.totalVotes)}%</span>
                                                                </button>
                                                        {/each}
                                                </form>

                                                <div class="vote-foot">
                                                        <span class="muted">{p.totalVotes} vote{p.totalVotes === 1 ? '' : 's'} cast</span>
                                                        {#if p.myChoice}
                                                                <span class="muted">You voted <strong>{p.myChoice}</strong> — tap another option to change it.</span>
                                                        {:else}
                                                                <span class="muted">Tap an option to cast your vote.</span>
                                                        {/if}
                                                        {#if isCommish}
                                                                <form method="POST" action="?/close" use:enhance class="inline">
                                                                        <input type="hidden" name="proposalId" value={p.id} />
                                                                        <button type="submit" class="sn-btn ghost sm"><span>Close Vote</span></button>
                                                                </form>
                                                        {/if}
                                                </div>
                                        </section>
                                {/each}
                        {/if}
                {/if}

                <!-- ── PENDING (commissioner only) ── -->
                {#if activeTab === 'pending' && isCommish}
                        {#if pendingVotes.length === 0}
                                <div class="sn-empty">
                                        <h3>Nothing pending</h3>
                                        <p>New owner proposals will appear here for you to approve or reject.</p>
                                </div>
                        {:else}
                                {#each pendingVotes as p (p.id)}
                                        <section class="sn-card sn-card-pad vote pending">
                                                <div class="vote-head">
                                                        <div>
                                                                <h2 class="block-title">{p.title}</h2>
                                                                {#if p.description}<p class="block-sub">{p.description}</p>{/if}
                                                        </div>
                                                        <span class="sn-badge purple">Pending</span>
                                                </div>
                                                <div class="opt-preview">
                                                        {#each p.options as o}<span class="chip">{o}</span>{/each}
                                                </div>
                                                <div class="vote-foot">
                                                        {#if p.createdByName}<span class="muted">Proposed by {p.createdByName}</span>{/if}
                                                        {#if p.deadline}<span class="muted">Deadline {fmtDate(p.deadline)}</span>{/if}
                                                        <div class="actions">
                                                                <form method="POST" action="?/approve" use:enhance class="inline">
                                                                        <input type="hidden" name="proposalId" value={p.id} />
                                                                        <button type="submit" class="sn-btn primary sm"><span>Approve & Open</span></button>
                                                                </form>
                                                                <form method="POST" action="?/reject" use:enhance class="inline">
                                                                        <input type="hidden" name="proposalId" value={p.id} />
                                                                        <button type="submit" class="sn-btn ghost sm"><span>Reject</span></button>
                                                                </form>
                                                        </div>
                                                </div>
                                        </section>
                                {/each}
                        {/if}
                {/if}

                <!-- ── ARCHIVE ── -->
                {#if activeTab === 'archive'}
                        {#if isCommish}
                                <section class="sn-card sn-card-pad import">
                                        <h2 class="block-title">Import Historical Votes</h2>
                                        <p class="block-sub">
                                                Paste a Google Forms / spreadsheet CSV export (Timestamp, Username, then one column per
                                                question). Each question becomes an archived vote, with options and the winner derived
                                                from the responses.
                                        </p>
                                        <form method="POST" action="?/import" use:enhance>
                                                <textarea class="sn-input mono" name="csv" rows="6" placeholder={'"Timestamp","Username","Keep keepers this year?"\n"2021/08/04 9:53 AM","you@example.com","Yes - 3 keepers"'} bind:value={csvText}></textarea>
                                                <button class="sn-btn secondary sm" type="submit"><span>Import CSV</span></button>
                                        </form>
                                </section>
                        {/if}

                        {#if closedVotes.length === 0}
                                <div class="sn-empty">
                                        <h3>No past votes yet</h3>
                                        <p>Closed and imported votes will be archived here with their final results.</p>
                                </div>
                        {:else}
                                {#each closedVotes as p (p.id)}
                                        <section class="sn-card sn-card-pad vote closed">
                                                <div class="vote-head">
                                                        <div>
                                                                <h2 class="block-title">{p.title}</h2>
                                                                {#if p.description && p.source !== 'imported'}<p class="block-sub">{p.description}</p>{/if}
                                                        </div>
                                                        <div class="vote-meta">
                                                                {#if p.source === 'imported'}<span class="sn-badge">{p.year || 'Imported'}</span>{/if}
                                                                <span class="sn-badge cyan">Closed</span>
                                                        </div>
                                                </div>

                                                {#if p.winningOption}
                                                        <div class="winner">
                                                                <span class="winner-label">Winner</span>
                                                                <strong>{p.winningOption}</strong>
                                                        </div>
                                                {:else}
                                                        <div class="winner none"><span class="winner-label">No votes recorded</span></div>
                                                {/if}

                                                <div class="results">
                                                        {#each p.counts as c (c.option)}
                                                                <div class="result-row" class:won={c.option === p.winningOption}>
                                                                        <span class="fill" style={`width:${pct(c.votes, p.totalVotes)}%`}></span>
                                                                        <span class="opt-label">{c.option}</span>
                                                                        <span class="opt-count">{c.votes} · {pct(c.votes, p.totalVotes)}%</span>
                                                                </div>
                                                        {/each}
                                                </div>

                                                <div class="vote-foot">
                                                        <span class="muted">{p.totalVotes} vote{p.totalVotes === 1 ? '' : 's'}</span>
                                                        {#if p.closedAt}<span class="muted">Closed {fmtDate(p.closedAt)}</span>{/if}
                                                </div>
                                        </section>
                                {/each}
                        {/if}
                {/if}
        </div>
</div>

<style>
        .banner {
                border-radius: 10px;
                padding: 14px 18px;
                margin-bottom: 20px;
                font-weight: 600;
                font-size: 0.92rem;
        }
        .banner.error { background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.4); color: #fda4af; }
        .banner.ok { background: rgba(204, 255, 0, 0.1); border: 1px solid rgba(204, 255, 0, 0.35); color: var(--sn-lime); }
        .banner .muted { color: var(--sn-text-dim); font-weight: 500; font-size: 0.85rem; }

        .toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                flex-wrap: wrap;
                margin-bottom: 24px;
        }

        .block-title {
                font-size: 1.25rem;
                font-weight: 900;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: -0.02em;
                margin: 0;
        }
        .block-sub { color: var(--sn-text-dim); font-size: 0.92rem; line-height: 1.55; margin: 8px 0 0; }

        .propose, .import, .vote { margin-bottom: 20px; }

        .field { display: block; margin: 16px 0; }
        .field > span { display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sn-text-mute); margin-bottom: 8px; }
        .field > span em { text-transform: none; letter-spacing: 0; font-weight: 500; color: var(--sn-text-faint); }
        .field .sn-input, .field .sn-select { width: 100%; box-sizing: border-box; }
        textarea.sn-input { resize: vertical; line-height: 1.5; }
        textarea.mono { font-family: monospace; font-size: 12px; }

        .opt-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
        .opt-row .sn-input { flex: 1; }

        .sn-btn.sm { height: 34px; padding: 0 14px; font-size: 11px; }

        .vote-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .vote-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .vote-meta .by { font-size: 11px; color: var(--sn-text-mute); }

        .options { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
        .option-bar {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: 100%;
                padding: 14px 16px;
                background: var(--sn-surface-3);
                border: 1px solid var(--sn-border);
                border-radius: 8px;
                cursor: pointer;
                overflow: hidden;
                font-family: inherit;
                text-align: left;
                transition: border-color 0.15s;
        }
        .option-bar:hover { border-color: var(--sn-cyan); }
        .option-bar.chosen { border-color: var(--sn-lime); }
        .option-bar .fill {
                position: absolute;
                left: 0; top: 0; bottom: 0;
                background: rgba(0, 240, 255, 0.1);
                transition: width 0.3s ease;
                z-index: 0;
        }
        .option-bar.chosen .fill { background: rgba(204, 255, 0, 0.14); }
        .opt-label { position: relative; z-index: 1; font-weight: 700; color: #fff; }
        .opt-count { position: relative; z-index: 1; font-family: monospace; font-size: 0.9rem; color: var(--sn-text-dim); flex-shrink: 0; }
        .check { color: var(--sn-lime); margin-right: 6px; }

        .vote-foot { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 16px; }
        .vote-foot .muted { font-size: 0.82rem; color: var(--sn-text-mute); }
        .vote-foot .muted strong { color: var(--sn-lime); }
        .vote-foot .actions { display: flex; gap: 8px; margin-left: auto; }
        .vote-foot form.inline { margin: 0; }
        .vote-foot form.inline:last-child:not(.actions form) { margin-left: auto; }

        .opt-preview { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .chip {
                font-size: 12px;
                font-weight: 700;
                padding: 5px 12px;
                border-radius: 999px;
                background: var(--sn-surface-3);
                border: 1px solid var(--sn-border);
                color: var(--sn-text-dim);
        }

        .winner {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-top: 16px;
                padding: 12px 16px;
                background: rgba(204, 255, 0, 0.08);
                border: 1px solid rgba(204, 255, 0, 0.3);
                border-radius: 8px;
        }
        .winner.none { background: var(--sn-surface-3); border-color: var(--sn-border); }
        .winner-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: var(--sn-text-mute); }
        .winner strong { font-size: 1.05rem; color: var(--sn-lime); font-weight: 900; }

        .results { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
        .result-row {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 14px;
                background: var(--sn-surface-2);
                border: 1px solid var(--sn-border-soft);
                border-radius: 6px;
                overflow: hidden;
        }
        .result-row .fill { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,0.04); z-index: 0; }
        .result-row.won .fill { background: rgba(204, 255, 0, 0.12); }
        .result-row.won .opt-label { color: var(--sn-lime); }

        @media (max-width: 600px) {
                .toolbar { flex-direction: column; align-items: stretch; }
                .vote-head { flex-direction: column; }
                .vote-meta { flex-direction: row; align-items: center; }
        }
</style>
