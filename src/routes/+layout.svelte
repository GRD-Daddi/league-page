<!-- __layout.svelte -->
<script>
        import '$lib/styles/stadium.css';
        import { Nav, Footer } from "$lib/components"
        import { dev } from '$app/environment';
        import { injectAnalytics } from '@vercel/analytics/sveltekit';

        let { data } = $props();

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
        <Nav session={data.session} />

        <slot />

        <Footer />
</main>
