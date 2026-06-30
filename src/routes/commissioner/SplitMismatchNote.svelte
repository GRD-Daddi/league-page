<script>
        import { isSplitMismatch, splitTotal } from './potSplit.js';

        // The per-member payout-pool share + per-member carryover-pot share are
        // entered by hand and should add up to the buy-in. When they don't, this
        // advisory warning is shown so a mismatched split can't be saved silently.
        let { poolShare, potShare, buyIn } = $props();

        function money(n) {
                return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
        }

        let mismatch = $derived(isSplitMismatch(poolShare, potShare, buyIn));
        let total = $derived(splitTotal(poolShare, potShare));
</script>

{#if mismatch}
        <p class="card-sub note warn">Pool {money(poolShare)} + pot {money(potShare)} = {money(total)}, which doesn't match the {money(buyIn)} buy-in.</p>
{/if}

<style>
        .card-sub { color: #6b7280; font-size: 0.82rem; line-height: 1.5; }
        .card-sub.note { margin: -4px 0 16px; }
        .note.warn { color: #f87171; }
</style>
