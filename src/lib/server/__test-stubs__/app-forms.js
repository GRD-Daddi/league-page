// Test-only stub for SvelteKit's `$app/forms` virtual module so components that
// import `enhance` can be server-rendered under Vitest (plain Node, outside the
// SvelteKit runtime). `use:enhance` actions never run during SSR, so a no-op
// action factory is sufficient.
export function enhance() {
        return { destroy() {} };
}

export function applyAction() {}
export function deserialize(text) {
        return JSON.parse(text);
}
