import node from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: node(),
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;
