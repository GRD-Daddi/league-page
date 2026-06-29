// Test-only stub for SvelteKit's `$app/environment` virtual module so server
// modules can be imported directly under Vitest (running in plain Node, outside
// the SvelteKit runtime). Mirrors a server, production-off context.
export const browser = false;
export const dev = true;
export const building = false;
export const version = 'test';
