<script>
        let { session = { authenticated: false } } = $props();

        let open = $state(false);
        let menuEl = $state(null);

        const teamName = $derived(
                session?.managerInfo?.teamName ||
                session?.managerInfo?.metadata?.team_name ||
                session?.managerInfo?.metadata?.manager_nickname ||
                'Manager'
        );

        function teamInitials() {
                const parts = teamName.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
                return (parts.slice(0, 2).map((w) => w[0]).join('') || 'M').toUpperCase();
        }

        const toggle = () => (open = !open);
        const close = () => (open = false);

        function onWindowClick(e) {
                if (open && menuEl && !menuEl.contains(e.target)) close();
        }

        function onKeydown(e) {
                if (e.key === 'Escape') close();
        }

        function handleLogout() {
                window.location.href = '/auth/logout';
        }
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

<style>
        .auth-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-weight: 900;
                font-size: 11px;
                letter-spacing: 0.15em;
                text-transform: uppercase;
                padding: 0 18px;
                height: 36px;
                border: none;
                cursor: pointer;
                text-decoration: none;
                transition: background 0.15s, box-shadow 0.15s;
                white-space: nowrap;
                font-family: inherit;
        }

        .login-btn {
                background: #ccff00;
                color: #000;
                transform: skewX(-10deg);
                box-shadow: 0 0 16px rgba(204, 255, 0, 0.2);
        }

        .login-btn:hover {
                background: #aacc00;
                box-shadow: 0 0 24px rgba(204, 255, 0, 0.35);
        }

        .login-btn span {
                transform: skewX(10deg);
                display: inline-flex;
                align-items: center;
                gap: 5px;
        }

        /* Account flyout */
        .account {
                position: relative;
                display: inline-flex;
        }

        .account-trigger {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                height: 36px;
                padding: 0 8px 0 5px;
                background: transparent;
                border: 1px solid #1f2937;
                border-radius: 999px;
                color: #e5e7eb;
                font-family: inherit;
                cursor: pointer;
                transition: border-color 0.15s, background 0.15s;
        }

        .account-trigger:hover,
        .account-trigger.open {
                border-color: #00f0ff;
                background: rgba(0, 240, 255, 0.06);
        }

        .avatar {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                border-radius: 7px;
                font-weight: 900;
                font-size: 11px;
                letter-spacing: -0.02em;
                color: #000;
                background: linear-gradient(135deg, #00f0ff, #7000ff);
                flex-shrink: 0;
        }

        .avatar.lg {
                width: 38px;
                height: 38px;
                border-radius: 9px;
                font-size: 14px;
                box-shadow: 0 0 16px rgba(0, 240, 255, 0.25);
        }

        .trigger-name {
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #fff;
                max-width: 130px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }

        .caret {
                font-size: 18px;
                color: #6b7280;
                transition: transform 0.15s ease;
        }

        .account-trigger.open .caret {
                transform: rotate(180deg);
        }

        .menu {
                position: absolute;
                top: calc(100% + 10px);
                right: 0;
                min-width: 230px;
                background-color: #0f1115;
                border: 1px solid #1f2937;
                border-radius: 10px;
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 240, 255, 0.15);
                padding: 8px;
                z-index: 70;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-6px);
                transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
        }

        .menu.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
        }

        .menu-head {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 10px 12px;
        }

        .head-text {
                display: flex;
                flex-direction: column;
                min-width: 0;
        }

        .head-name {
                font-weight: 800;
                font-size: 0.95rem;
                color: #fff;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 150px;
        }

        .head-sub {
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: #00f0ff;
                margin-top: 2px;
        }

        .menu-divider {
                height: 1px;
                background: #1f2937;
                margin: 0 2px 6px;
        }

        .menu-item {
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                padding: 10px 12px;
                border: none;
                border-radius: 7px;
                background: transparent;
                color: #9ca3af;
                font-family: inherit;
                font-size: 0.85rem;
                font-weight: 600;
                text-align: left;
                text-decoration: none;
                white-space: nowrap;
                cursor: pointer;
                transition: background 0.15s, color 0.15s;
        }

        .menu-item .material-icons {
                font-size: 19px;
                flex-shrink: 0;
        }

        .menu-item:hover {
                background: rgba(255, 255, 255, 0.04);
                color: #fff;
        }

        .menu-item.danger:hover {
                background: rgba(255, 84, 112, 0.1);
                color: #ff5470;
        }

        @media (max-width: 600px) {
                .trigger-name {
                        display: none;
                }
        }
</style>

{#if session?.authenticated}
        <div class="account" bind:this={menuEl}>
                <button
                        type="button"
                        class="account-trigger"
                        class:open
                        aria-haspopup="true"
                        aria-expanded={open}
                        aria-label="Account menu"
                        onclick={toggle}
                >
                        <span class="avatar">{teamInitials()}</span>
                        <span class="trigger-name">{teamName}</span>
                        <span class="caret material-icons" aria-hidden="true">expand_more</span>
                </button>

                <div class="menu" class:open role="menu">
                        <div class="menu-head">
                                <span class="avatar lg">{teamInitials()}</span>
                                <span class="head-text">
                                        <span class="head-name">{teamName}</span>
                                        <span class="head-sub">Signed in</span>
                                </span>
                        </div>
                        <div class="menu-divider"></div>
                        <a class="menu-item" href="/auth/select-league" role="menuitem" onclick={close}>
                                <span class="material-icons" aria-hidden="true">swap_horiz</span>
                                <span>Change League</span>
                        </a>
                        <button class="menu-item danger" type="button" role="menuitem" onclick={handleLogout}>
                                <span class="material-icons" aria-hidden="true">logout</span>
                                <span>Logout</span>
                        </button>
                </div>
        </div>
{:else}
        <a href="/auth/login" class="auth-btn login-btn">
                <span>Login</span>
        </a>
{/if}
