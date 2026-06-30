import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

// Minimal Vitest config: resolve the SvelteKit `$lib` alias so server modules
// can be imported directly in Node, without booting the full SvelteKit/Vite
// plugin chain. The Svelte plugin is included so component-level tests can
// import and server-render `.svelte` files (e.g. SplitMismatchNote) to assert
// rendered output, not just pure logic.
export default defineConfig({
        plugins: [svelte({ compilerOptions: { dev: false } })],
        resolve: {
                alias: {
                        $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
                        '$app/environment': fileURLToPath(
                                new URL('./src/lib/server/__test-stubs__/app-environment.js', import.meta.url)
                        ),
                        '$app/forms': fileURLToPath(
                                new URL('./src/lib/server/__test-stubs__/app-forms.js', import.meta.url)
                        )
                }
        },
        test: {
                environment: 'node',
                include: ['src/**/*.{test,spec}.{js,mjs}']
        }
});
