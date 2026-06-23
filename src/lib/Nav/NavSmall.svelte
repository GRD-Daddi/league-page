<script>
        import { tabs } from '$lib/utils/tabs';
        import { goto, preloadData } from '$app/navigation';
        import { page } from '$app/state';
        import { leagueName } from '$lib/utils/helper';
        import { enableBlog, managers } from '$lib/utils/leagueInfo';

        let { session = { authenticated: false }, potTotal = 0 } = $props();

        let open = $state(false);

        const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

        let active = $derived(page.url.pathname);

        const isExternal = (dest) => typeof dest === 'string' && /^https?:/i.test(dest);

        const close = () => (open = false);

        const navigate = (dest) => {
                open = false;
                if (isExternal(dest)) {
                        window.location.href = dest;
                } else {
                        goto(dest);
                }
        };

        const safePreload = (dest) => {
                if (!isExternal(dest)) preloadData(dest);
        };

        const onKeydown = (e) => {
                if (e.key === 'Escape') close();
        };

        const topTabs = $derived(tabs.filter((t) => !t.nest && (t.label !== 'Blog' || enableBlog)));
        const nestedSections = $derived(tabs.filter((t) => t.nest));

        const visibleChildren = (children) =>
                children.filter((c) => c.label !== 'Managers' || managers.length);
</script>

<svelte:window onkeydown={onKeydown} />

<button
        class="hamburger"
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onclick={() => (open = true)}
>
        <span class="material-icons">menu</span>
</button>

<div
        class="scrim"
        class:show={open}
        onclick={close}
        role="presentation"
        aria-hidden="true"
></div>

<aside class="drawer" class:open aria-hidden={!open}>
        <div class="drawer-head">
                <span class="drawer-title">{leagueName}</span>
                <button class="close-btn" type="button" aria-label="Close menu" onclick={close}>
                        <span class="material-icons">close</span>
                </button>
        </div>

        <div class="drawer-actions">
                <a class="pot-chip" href="/" onclick={close}>
                        <span class="pot-amt">{money(potTotal)}</span>
                        <span class="pot-label">Carryover Pot</span>
                </a>
                {#if session?.authenticated}
                        <div class="who">
                                <svg class="who-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <span class="who-name">{session.managerInfo?.teamName || 'Manager'}</span>
                        </div>
                        <div class="auth-links">
                                <a href="/auth/select-league" class="auth-link">Change League</a>
                                <a href="/auth/logout" class="auth-link logout">Logout</a>
                        </div>
                {:else}
                        <a href="/auth/login" class="auth-link login">Login</a>
                {/if}
        </div>

        <nav class="drawer-body">
                {#each topTabs as tab}
                        <button
                                class="nav-row"
                                class:active={active === tab.dest}
                                type="button"
                                onclick={() => navigate(tab.dest)}
                                ontouchstart={() => safePreload(tab.dest)}
                                onmouseover={() => safePreload(tab.dest)}
                        >
                                <span class="material-icons row-icon">{tab.icon}</span>
                                <span class="row-label">{tab.label}</span>
                        </button>
                {/each}

                {#each nestedSections as section}
                        <div class="section-label">{section.label}</div>
                        {#each visibleChildren(section.children) as child}
                                <button
                                        class="nav-row"
                                        class:active={active === child.dest}
                                        type="button"
                                        onclick={() => navigate(child.dest)}
                                        ontouchstart={() => safePreload(child.dest)}
                                        onmouseover={() => safePreload(child.dest)}
                                >
                                        <span class="material-icons row-icon">{child.icon}</span>
                                        <span class="row-label">{child.label}</span>
                                        {#if isExternal(child.dest)}
                                                <span class="material-icons ext-icon">open_in_new</span>
                                        {/if}
                                </button>
                        {/each}
                {/each}

                {#if session?.isCommissioner}
                        <div class="section-label">Admin</div>
                        <button
                                class="nav-row commish"
                                class:active={active === '/commissioner'}
                                type="button"
                                onclick={() => navigate('/commissioner')}
                                ontouchstart={() => safePreload('/commissioner')}
                                onmouseover={() => safePreload('/commissioner')}
                        >
                                <span class="material-icons row-icon">settings</span>
                                <span class="row-label">Commissioner</span>
                        </button>
                {/if}
        </nav>
</aside>

<style>
        .hamburger {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                padding: 0;
                background: transparent;
                border: 1px solid #1f2937;
                border-radius: 8px;
                color: #e5e7eb;
                cursor: pointer;
                transition: border-color 0.15s, color 0.15s, background 0.15s;
        }

        .hamburger:hover {
                color: #00f0ff;
                border-color: #00f0ff;
                background: rgba(0, 240, 255, 0.08);
        }

        .hamburger .material-icons {
                font-size: 24px;
        }

        .scrim {
                position: fixed;
                inset: 0;
                z-index: 60;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(2px);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease;
        }

        .scrim.show {
                opacity: 1;
                pointer-events: auto;
        }

        .drawer {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 61;
                display: flex;
                flex-direction: column;
                width: 82vw;
                max-width: 320px;
                height: 100%;
                height: 100dvh;
                background: #0a0a0c;
                border-left: 1px solid #1f2937;
                box-shadow: -12px 0 40px rgba(0, 0, 0, 0.6);
                transform: translateX(100%);
                transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
                overflow: hidden;
        }

        .drawer.open {
                transform: translateX(0);
        }

        .drawer-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 18px 18px 16px;
                border-bottom: 1px solid #1f2937;
                flex-shrink: 0;
        }

        .drawer-title {
                font-weight: 900;
                font-size: 1rem;
                letter-spacing: -0.02em;
                text-transform: uppercase;
                font-style: italic;
                color: #fff;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .close-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                padding: 0;
                background: transparent;
                border: 1px solid #1f2937;
                border-radius: 8px;
                color: #9ca3af;
                cursor: pointer;
                flex-shrink: 0;
                transition: color 0.15s, border-color 0.15s;
        }

        .close-btn:hover {
                color: #ff5470;
                border-color: #ff5470;
        }

        .close-btn .material-icons {
                font-size: 22px;
        }

        .drawer-actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px 18px;
                border-bottom: 1px solid #1f2937;
                flex-shrink: 0;
        }

        .pot-chip {
                display: flex;
                align-items: baseline;
                gap: 8px;
                padding: 10px 14px;
                border: 1px solid rgba(204, 255, 0, 0.25);
                border-radius: 10px;
                background: rgba(204, 255, 0, 0.06);
                text-decoration: none;
        }

        .pot-amt {
                font-weight: 900;
                font-size: 1.15rem;
                color: #ccff00;
                letter-spacing: -0.02em;
        }

        .pot-label {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: #6b7280;
        }

        .who {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #fff;
                font-weight: 700;
                font-size: 0.9rem;
        }

        .who-icon {
                color: #00f0ff;
                flex-shrink: 0;
        }

        .who-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .auth-links {
                display: flex;
                align-items: center;
                gap: 10px;
        }

        .auth-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                height: 38px;
                padding: 0 16px;
                border-radius: 8px;
                font-weight: 900;
                font-size: 11px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                text-decoration: none;
                font-family: inherit;
        }

        .auth-link.login {
                flex: 1;
                background: #ccff00;
                color: #000;
                box-shadow: 0 0 16px rgba(204, 255, 0, 0.2);
        }

        .auth-link.logout {
                flex: 1;
                background: transparent;
                color: #9ca3af;
                border: 1px solid #374151;
        }

        .auth-link:not(.login):not(.logout) {
                flex: 1;
                background: rgba(255, 255, 255, 0.04);
                color: #9ca3af;
                border: 1px solid #1f2937;
        }

        .drawer-body {
                flex: 1;
                overflow-y: auto;
                padding: 12px 12px 32px;
                -webkit-overflow-scrolling: touch;
        }

        .section-label {
                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #4b5563;
                padding: 18px 12px 8px;
        }

        .nav-row {
                display: flex;
                align-items: center;
                gap: 14px;
                width: 100%;
                padding: 13px 12px;
                background: transparent;
                border: none;
                border-radius: 8px;
                color: #9ca3af;
                font-family: inherit;
                font-size: 0.95rem;
                font-weight: 600;
                text-align: left;
                cursor: pointer;
                transition: background 0.15s, color 0.15s;
        }

        .nav-row:hover {
                background: rgba(255, 255, 255, 0.04);
                color: #fff;
        }

        .nav-row.active {
                background: rgba(0, 240, 255, 0.08);
                color: #00f0ff;
        }

        .nav-row.commish.active {
                background: rgba(204, 255, 0, 0.1);
                color: #ccff00;
        }

        .row-icon {
                font-size: 22px;
                flex-shrink: 0;
        }

        .row-label {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .ext-icon {
                font-size: 16px;
                color: #4b5563;
                flex-shrink: 0;
        }
</style>
