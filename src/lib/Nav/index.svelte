<script>
        import NavSmall from './NavSmall.svelte';
        import NavLarge from './NavLarge.svelte';
        import AuthButton from './AuthButton.svelte';
        import { page } from '$app/state';

        let { session = { authenticated: false }, potTotal = 0 } = $props();

        function money(n) {
                return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
</script>

<svelte:head>
        <title>{!page.url.pathname[1] ? 'Home' : page.url.pathname[1].toUpperCase() + page.url.pathname.slice(2)} | Minnesota Slopes</title>
</svelte:head>

<style>
        nav {
                background-color: #0a0a0c;
                position: sticky;
                top: 0;
                z-index: 50;
                border-bottom: 1px solid #1f2937;
                box-shadow: 0 1px 0 0 rgba(0, 240, 255, 0.08);
        }

        .nav-inner {
                max-width: 1280px;
                margin: 0 auto;
                padding: 0 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 72px;
        }

        /* Brand */
        .brand {
                display: flex;
                align-items: center;
                gap: 10px;
                text-decoration: none;
                flex-shrink: 0;
        }

        .brand-mark {
                width: 38px;
                height: 38px;
                border-radius: 8px;
                background: linear-gradient(135deg, #00f0ff, #7000ff);
                display: flex;
                align-items: center;
                justify-content: center;
                transform: skewX(-10deg);
                border: 1px solid rgba(0, 240, 255, 0.25);
                box-shadow: 0 0 16px rgba(0, 240, 255, 0.25);
                flex-shrink: 0;
        }

        .brand-mark svg {
                transform: skewX(10deg);
        }

        .brand-name {
                font-weight: 900;
                font-size: 1.25rem;
                letter-spacing: -0.03em;
                text-transform: uppercase;
                font-style: italic;
                color: #fff;
                background: linear-gradient(to right, #fff, #9ca3af);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
        }

        .brand-name em {
                font-style: inherit;
                -webkit-text-fill-color: #00f0ff;
                color: #00f0ff;
        }

        /* Right side */
        .nav-right {
                display: flex;
                align-items: center;
                gap: 12px;
        }

        /* Always-visible pot pill */
        .pot-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                text-decoration: none;
                background: rgba(204, 255, 0, 0.08);
                border: 1px solid rgba(204, 255, 0, 0.3);
                color: #ccff00;
                padding: 6px 12px;
                border-radius: 999px;
                flex-shrink: 0;
                transition: background 0.15s, box-shadow 0.15s;
        }

        .pot-pill:hover {
                background: rgba(204, 255, 0, 0.14);
                box-shadow: 0 0 16px rgba(204, 255, 0, 0.2);
        }

        .pot-pill-amt {
                font-family: monospace;
                font-weight: 900;
                font-size: 0.95rem;
                letter-spacing: -0.01em;
        }

        .pot-pill-label {
                font-size: 9px;
                font-weight: 900;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #8a9a00;
        }

        .commish-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border: 1px solid #374151;
                border-radius: 6px;
                color: #9ca3af;
                text-decoration: none;
                flex-shrink: 0;
                transition: color 0.15s, border-color 0.15s, background 0.15s;
        }

        .commish-link:hover {
                color: #00f0ff;
                border-color: #00f0ff;
                background: rgba(0, 240, 255, 0.08);
        }

        @media (max-width: 600px) {
                .pot-pill-label { display: none; }
                .pot-pill { padding: 6px 10px; }
        }

        /* Large nav wrapper */
        .large {
                display: block;
        }

        .small {
                display: none;
        }

        @media (max-width: 950px) {
                .large {
                        display: none;
                }
                .small {
                        display: flex;
                        align-items: center;
                }
                .brand-name {
                        font-size: 1.05rem;
                }
        }

        /* Override SMUI tab styles for dark theme */
        :global(.mdc-tab) {
                color: #6b7280 !important;
                background: transparent !important;
        }

        :global(.mdc-tab .mdc-tab__text-label) {
                color: #6b7280 !important;
                font-weight: 700 !important;
                font-size: 12px !important;
                letter-spacing: 0.08em !important;
                text-transform: uppercase !important;
                transition: color 0.15s !important;
        }

        :global(.mdc-tab:hover .mdc-tab__text-label) {
                color: #00f0ff !important;
        }

        :global(.mdc-tab--active .mdc-tab__text-label) {
                color: #fff !important;
        }

        :global(.mdc-tab-indicator .mdc-tab-indicator__content--underline) {
                border-color: #00f0ff !important;
                border-top-width: 2px !important;
        }

        :global(.mdc-tab .mdc-tab__ripple::before),
        :global(.mdc-tab .mdc-tab__ripple::after) {
                background-color: #00f0ff !important;
        }

        :global(.mdc-tab-bar) {
                background: transparent !important;
        }

        :global(.mdc-tab .material-icons) {
                color: inherit !important;
        }

        /* Drawer dark override */
        :global(.mdc-drawer) {
                background-color: #0f1115 !important;
                border-right-color: #1f2937 !important;
        }

        :global(.mdc-drawer .mdc-drawer__title) {
                color: #fff !important;
        }

        :global(.mdc-list-item__primary-text),
        :global(.mdc-deprecated-list-item__primary-text) {
                color: #9ca3af !important;
        }

        :global(.mdc-list-item--activated .mdc-list-item__primary-text),
        :global(.mdc-deprecated-list-item--activated .mdc-deprecated-list-item__primary-text) {
                color: #00f0ff !important;
        }

        :global(.mdc-list-item--activated),
        :global(.mdc-deprecated-list-item--activated) {
                background-color: rgba(0, 240, 255, 0.08) !important;
        }

        /* Sub-menu dark */
        :global(.subMenu) {
                background-color: #0f1115 !important;
                border-color: #1f2937 !important;
        }
</style>

<nav>
        <div class="nav-inner">
                <!-- Brand -->
                <a href="/" class="brand">
                        <div class="brand-mark">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                        <path d="M4 22h16"/>
                                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                                </svg>
                        </div>
                        <span class="brand-name">Minnesota <em>Slopes</em></span>
                </a>

                <!-- Right: tabs + auth -->
                <div class="nav-right">
                        <div class="large">
                                <NavLarge />
                        </div>
                        <a class="pot-pill" href="/" title="Current carryover pot">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                <span class="pot-pill-amt">{money(potTotal)}</span>
                                <span class="pot-pill-label">Pot</span>
                        </a>
                        {#if session?.isCommissioner}
                                <a class="commish-link" href="/commissioner" title="Commissioner page" aria-label="Commissioner page">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                </a>
                        {/if}
                        <AuthButton {session} />
                        <div class="small">
                                <NavSmall />
                        </div>
                </div>
        </div>
</nav>
