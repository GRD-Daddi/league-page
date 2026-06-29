import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Minimal Vitest config: resolve the SvelteKit `$lib` alias so server modules
// can be imported directly in Node, without booting the full SvelteKit/Vite
// plugin chain. Tests target pure logic only.
export default defineConfig({
        resolve: {
                alias: {
                        $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
                        '$app/environment': fileURLToPath(
                                new URL('./src/lib/server/__test-stubs__/app-environment.js', import.meta.url)
                        )
                }
        },
        test: {
                environment: 'node',
                include: ['src/**/*.{test,spec}.{js,mjs}']
        }
});
