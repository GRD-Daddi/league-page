<script>
	import { goto } from '$app/navigation';
	import { managers } from '$lib/utils/helper';
	import { tabs } from '$lib/utils/tabs';
	import { onMount } from 'svelte';

	let outOfDate = false;
	const year = new Date().getFullYear();

	onMount(async () => {
		try {
			const res = await fetch('/api/checkVersion', { compress: true });
			const needUpdate = await res.json();
			outOfDate = needUpdate;
		} catch (e) { /* ignore */ }
	});

	let managersOutOfDate = false;
	if (managers) {
		for (const manager of managers) {
			if (manager.roster && !manager.managerID) {
				managersOutOfDate = true;
				break;
			}
		}
	}
</script>

<style>
	footer {
		background-color: #0f1115;
		border-top: 1px solid #1f2937;
		padding: 40px 24px;
		text-align: center;
		color: #6b7280;
		font-size: 0.85rem;
		width: 100%;
		box-sizing: border-box;
	}

	#navigation {
		margin: 0 0 20px;
	}

	#navigation ul {
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0;
		list-style: none;
	}

	#navigation ul li {
		list-style-type: none;
		display: inline;
	}

	#navigation li:not(:first-child)::before {
		content: " | ";
		color: #374151;
	}

	.navLink {
		display: inline-block;
		cursor: pointer;
		padding: 4px 10px;
		color: #4b5563;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		transition: color 0.15s;
	}

	.navLink:hover {
		color: #00f0ff;
	}

	.updateNotice {
		color: #ef4444;
		font-style: italic;
		font-size: 0.8em;
		margin-bottom: 12px;
	}

	.updateNotice a {
		color: #00f0ff;
	}

	.copyright,
	.creator {
		display: block;
		color: #374151;
		font-size: 11px;
		margin-top: 4px;
	}

	.copyright a,
	.creator a {
		color: #4b5563;
		text-decoration: none;
		transition: color 0.15s;
	}

	.copyright a:hover,
	.creator a:hover {
		color: #9ca3af;
	}

	.donate {
		display: block;
		margin-top: 4px;
		color: #374151;
		font-size: 11px;
	}

	.donate a {
		color: #ccff00;
		text-decoration: none;
	}

	.donate a:hover {
		color: #aacc00;
	}
</style>

<footer>
	{#if outOfDate}
		<p class="updateNotice">
			There is an update available for your League Page.
			<a href="https://github.com/nmelhado/league-page/blob/master/TRAINING_WHEELS.md#iv-updates">Follow the Update Instructions</a>
			to get all of the newest features!
		</p>
	{/if}
	{#if managersOutOfDate}
		<p class="updateNotice">
			Your managers page needs an update,
			<a href="https://github.com/nmelhado/league-page/blob/master/TRAINING_WHEELS.md#2-add-managers">please follow the instructions</a>
			to get the most up-to-date experience.
		</p>
	{/if}

	<div id="navigation">
		<ul>
			{#each tabs as tab}
				{#if !tab.nest}
					<li><div class="navLink" role="button" tabindex="0" onclick={() => goto(tab.dest)} onkeydown={(e) => e.key === 'Enter' && goto(tab.dest)}>{tab.label}</div></li>
				{:else}
					{#each tab.children as child}
						{#if child.label !== "Managers" || managers.length > 0}
							<li>
								<div class="navLink" role="button" tabindex="0"
									onclick={() => child.label === "Go to Sleeper" ? (window.location = child.dest) : goto(child.dest)}
									onkeydown={(e) => e.key === 'Enter' && (child.label === "Go to Sleeper" ? (window.location = child.dest) : goto(child.dest))}
								>{child.label}</div>
							</li>
						{/if}
					{/each}
				{/if}
			{/each}
		</ul>
	</div>

	<!-- PLEASE DO NOT REMOVE THE COPYRIGHT -->
	<span class="copyright">&copy; 2021 - {year} <a href="https://github.com/nmelhado/league-page">League Page</a></span>
	<!-- PLEASE DO NOT REMOVE THE BUILT BY -->
	<span class="creator">Built by <a href="http://www.nmelhado.com/">Nicholas Melhado</a></span>
	<span class="donate">Love League Page? Please consider <a href="https://www.buymeacoffee.com/nmelhado">donating</a> to support enhancements!</span>
</footer>
