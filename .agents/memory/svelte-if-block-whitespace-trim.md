---
name: Svelte {#if} whitespace trimming
description: Why a literal space inside an {#if} block disappears at render, and how to keep inline spacing.
---

A literal space placed at the boundary of an `{#if}…{/if}` block is trimmed by the Svelte compiler, so adjacent inline text/tags render with no gap.

**Symptom:** two-tone brand `{#if brandLead}{brandLead} {/if}<em>{brandTail}</em>` rendered as `TheLeague` (no space) instead of `The League`. The trailing space lived just before `{/if}` and got stripped.

**Why:** Svelte collapses/trims insignificant whitespace adjacent to block tags (`{/if}`, `{:else}`, etc.). A space that is the last thing inside a block is treated as trimmable.

**How to apply:** Keep required inline spacing inside a *text expression*, not at a block edge. Use `{brandLead ? brandLead + ' ' : ''}<em>{brandTail}</em>` (the space is part of the JS string, never trimmed). This also handles the single-word case (no leading space). Same fix applied to nav brand and homepage footer brand.
