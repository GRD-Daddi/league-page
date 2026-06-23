<!-- __layout.svelte -->
<script>
	import { Nav, Footer } from "$lib/components"
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<svelte:head>
	<style>
		html, body {
			background-color: #0a0a0c !important;
			color: #fff;
			margin: 0;
			padding: 0;
		}
	</style>
</svelte:head>

<main>
	<Nav />

	<slot />

	<Footer />
</main>
