import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
        plugins: [sveltekit()],
        server: {
                host: '0.0.0.0',
                port: 5000,
                strictPort: false,
                allowedHosts: true,
                hmr: {
                        clientPort: 5000
                }
        },
        preview: {
                host: '0.0.0.0',
                port: 5000,
                strictPort: false
        }
};

export default config;
