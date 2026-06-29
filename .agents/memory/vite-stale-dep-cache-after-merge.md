---
name: Vite stale dep cache breaks hydration (esp. after a task merge)
description: Missing optimize-deps chunk 404s kill client JS/hydration so the whole UI goes non-interactive; clear node_modules/.vite and restart.
---

# Vite stale dep cache breaks hydration

## Symptom
A user reports something interactive "doesn't work anymore" — e.g. a nav dropdown/
flyout won't open, buttons don't respond — while the page still renders and SSR
content looks correct. Workflow/browser logs show repeated:
`The file does not exist at ".../node_modules/.vite/deps/chunk-XXataXXX.js?v=HASH"
which is in the optimize deps directory.`

## Cause
Vite's dependency pre-bundle cache (`node_modules/.vite`) went stale — the served
HTML references chunk hashes from a previous optimize run that no longer exist, so
the client bundle 404s and **hydration never completes**. Nothing JS-driven works.
This commonly happens right after a **project task is merged** (the post-merge
reinstall of dependencies invalidates the cache) but the running dev server keeps
pointing at the old hashes.

## Fix
`rm -rf node_modules/.vite .svelte-kit/output` then restart the "Start application"
workflow. A real browser load (screenshot tool, not curl) re-triggers a clean
optimize run. **curl can't reveal this** — it only fetches HTML, not JS chunks, so
always confirm with a browser load + browser console (look for `[vite] connected`
and absence of the chunk-missing error).

**Why it matters:** the instinct is to debug the component code (the dropdown markup
looked fine here); the real fault is the environment cache. Check the logs for the
optimize-deps 404 before touching component code.
