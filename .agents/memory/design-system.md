---
name: design-system
description: The UI design system for this SvelteKit site — plain Svelte + stadium.css, SMUI fully removed.
---

# Design system: Stadium Night (plain Svelte/CSS)

SMUI / `@smui/*` / `smui-theme` / `static/smui*.css` / `src/theme/` are fully removed. Do NOT reintroduce them — they were dropped for slow dev compile/HMR and flaky prod builds.

Build any new UI with plain Svelte/HTML/CSS reusing the shared design-system classes in `src/lib/styles/stadium.css`:
- `.sn-table` (data tables), `.sn-card`, `.sn-btn` (`primary`/`secondary`/`ghost`), `.sn-input`, `.sn-select`, `.sn-loading`.
- For progress bars use `src/lib/LinearProgress.svelte` (drop-in: `indeterminate`, `progress`, `closed` props).
- Theme CSS vars live inline in `src/app.html` (`<style>` block), not in external smui css. Material Icons come from a Google Fonts link in `src/app.html`.

**Why:** SMUI bloated compile time and broke prod builds; the whole library was migrated out in Task #12. Future components must match the dark/neon-cyan look via stadium.css, never SMUI.
