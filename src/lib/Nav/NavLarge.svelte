<script>
	import { tabs } from '$lib/utils/tabs';
	import { page } from '$app/state';
	import { preloadData } from '$app/navigation';
	import { enableBlog, managers } from '$lib/utils/leagueInfo';

	let open = $state(false);

	const isExternal = (dest) => typeof dest === 'string' && /^https?:/i.test(dest);

	const nested = $derived(tabs.find((t) => t.nest));
	const nestedChildren = $derived(
		nested ? nested.children.filter((c) => c.label !== 'Managers' || managers.length) : []
	);

	const path = $derived(page.url.pathname);
	const isActive = (dest) => dest === path;
	const nestedActive = $derived(
		nested ? nested.children.some((c) => c.dest === path) : false
	);

	const safePreload = (dest) => {
		if (!isExternal(dest)) preloadData(dest);
	};

	const closeMenu = () => (open = false);

	const onKeydown = (e) => {
		if (e.key === 'Escape') closeMenu();
	};
</script>

<svelte:window onkeydown={onKeydown} />

<nav class="nav-large" aria-label="Primary">
	{#each tabs as tab}
		{#if tab.nest}
			<div
				class="dropdown"
				role="presentation"
				onmouseenter={() => (open = true)}
				onmouseleave={closeMenu}
			>
				<button
					type="button"
					class="nav-link dropdown-toggle"
					class:active={nestedActive}
					aria-haspopup="true"
					aria-expanded={open}
					onclick={() => (open = !open)}
				>
					{tab.label}
					<span class="caret material-icons" aria-hidden="true">expand_more</span>
				</button>

				<div class="submenu" class:open>
					{#each nestedChildren as child}
						{#if isExternal(child.dest)}
							<a
								class="submenu-item"
								href={child.dest}
								target="_blank"
								rel="noopener noreferrer"
								onclick={closeMenu}
							>
								<span class="submenu-icon material-icons" aria-hidden="true">{child.icon}</span>
								<span class="submenu-label">{child.label}</span>
								<span class="submenu-ext material-icons" aria-hidden="true">open_in_new</span>
							</a>
						{:else}
							<a
								class="submenu-item"
								class:active={isActive(child.dest)}
								href={child.dest}
								onclick={closeMenu}
								ontouchstart={() => safePreload(child.dest)}
								onmouseover={() => safePreload(child.dest)}
								onfocus={() => safePreload(child.dest)}
							>
								<span class="submenu-icon material-icons" aria-hidden="true">{child.icon}</span>
								<span class="submenu-label">{child.label}</span>
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{:else if tab.label !== 'Blog' || enableBlog}
			<a
				class="nav-link"
				class:active={isActive(tab.dest)}
				href={tab.dest}
				ontouchstart={() => safePreload(tab.dest)}
				onmouseover={() => safePreload(tab.dest)}
				onfocus={() => safePreload(tab.dest)}
			>
				{tab.label}
			</a>
		{/if}
	{/each}
</nav>

<style>
	.nav-large {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		position: relative;
		height: 72px;
		padding: 0 14px;
		background: transparent;
		border: none;
		color: #6b7280;
		font-family: inherit;
		font-weight: 700;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
		transition: color 0.15s;
	}

	.nav-link::after {
		content: '';
		position: absolute;
		left: 14px;
		right: 14px;
		bottom: 0;
		height: 2px;
		background: #00f0ff;
		transform: scaleX(0);
		transition: transform 0.15s ease;
	}

	.nav-link:hover {
		color: #00f0ff;
	}

	.nav-link.active {
		color: #fff;
	}

	.nav-link.active::after {
		transform: scaleX(1);
	}

	.dropdown {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.dropdown-toggle .caret {
		font-size: 18px;
		transition: transform 0.15s ease;
	}

	.dropdown-toggle[aria-expanded='true'] .caret {
		transform: rotate(180deg);
	}

	.submenu {
		position: absolute;
		top: 72px;
		left: 0;
		min-width: 230px;
		background-color: #0f1115;
		border: 1px solid #1f2937;
		border-top: none;
		border-radius: 0 0 8px 8px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 240, 255, 0.15);
		padding: 6px;
		z-index: 5;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-6px);
		transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
	}

	.submenu.open {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}

	.submenu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 6px;
		color: #9ca3af;
		text-decoration: none;
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		transition: background 0.15s, color 0.15s;
	}

	.submenu-item:hover {
		background: rgba(255, 255, 255, 0.04);
		color: #fff;
	}

	.submenu-item.active {
		background: rgba(0, 240, 255, 0.08);
		color: #00f0ff;
	}

	.submenu-icon {
		font-size: 20px;
		flex-shrink: 0;
	}

	.submenu-label {
		flex: 1;
	}

	.submenu-ext {
		font-size: 15px;
		color: #4b5563;
		flex-shrink: 0;
	}
</style>
