---
name: Indentation conventions
description: Per-directory indentation split in this SvelteKit repo — easy to get wrong, mixing causes diffs/lint noise.
---

This repo mixes indentation **per file** — there is NO reliable blanket rule. Always `cat -A` the exact file (and its neighbor lines) before inserting code; never assume.

- **`src/routes/**/+page.svelte` VARIES file-to-file** — do NOT assume tabs. Observed: most page script blocks (votes, commissioner, rivalry, records, matchups, managers, awards, resources, transactions, standings) use **8 SPACES**; `manager/+page.svelte` uses **TABS**; root `src/routes/+page.svelte` uses **2 SPACES**. Match the line you are inserting next to, not a global rule.
- **`+page.server.js`**: tabs (verify per file).
- **Server lib** (`src/lib/server/*.js`, e.g. pot.js, archive.js, db.js, archiveStats.js): SPACES, 8 per level (no tabs at all).

**Why:** Files were authored under different editor settings. A blanket "routes = TABS" assumption is WRONG and silently produces mixed-indentation blocks (tab import line above 8-space siblings) that fail review. Bulk-inserting an import with `awk '... print "\timport ..."'` injected a tab into 8-space files and had to be re-fixed with `sed '2s/^\t/        /'`.

**How to apply:** Before editing, `cat -A` the target file's relevant lines. When inserting a line, copy the leading whitespace of the adjacent sibling line exactly. After any bulk/scripted insert across many files, re-verify with `cat -A` per file.
