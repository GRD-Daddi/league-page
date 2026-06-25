---
name: Indentation conventions
description: Per-directory indentation split in this SvelteKit repo — easy to get wrong, mixing causes diffs/lint noise.
---

This repo mixes indentation by location. Match the file you are editing.

- **Route files** (`src/routes/**` — both `+page.svelte` and `+page.server.js`): TABS.
- **Server lib** (`src/lib/server/*.js`, e.g. pot.js, archive.js, db.js, archiveStats.js): SPACES, 8 per level (no tabs at all).

**Why:** The two areas were authored under different settings; a new `src/lib/server` file written with tabs (or a route written with spaces) stands out immediately and produces noisy diffs. archiveStats.js was first written with tabs and had to be re-expanded to 8-space to match its neighbors.

**How to apply:** Before writing a new file, check a sibling in the same directory (`cat -A` / `od -c` on leading whitespace). For a new `src/lib/server` file, use 8-space indent. For anything under `src/routes`, use tabs.
