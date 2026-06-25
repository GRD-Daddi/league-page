<script>
        let { indeterminate = false, progress = 0, closed = false } = $props();
</script>

<div class="lp" class:closed role="progressbar" aria-valuemin="0" aria-valuemax="1" aria-valuenow={indeterminate ? undefined : progress}>
        {#if indeterminate}
                <div class="lp-bar lp-indeterminate"></div>
        {:else}
                <div class="lp-bar" style="transform: scaleX({Math.max(0, Math.min(1, progress))});"></div>
        {/if}
</div>

<style>
        .lp {
                position: relative;
                width: 100%;
                height: 4px;
                overflow: hidden;
                background: rgba(0, 240, 255, 0.12);
                border-radius: 2px;
        }

        .lp.closed {
                visibility: hidden;
        }

        .lp-bar {
                position: absolute;
                inset: 0;
                background: linear-gradient(to right, #00f0ff, #7000ff);
                transform-origin: left center;
        }

        .lp-indeterminate {
                width: 40%;
                animation: lp-slide 1.3s infinite ease-in-out;
        }

        @keyframes lp-slide {
                0% { left: -40%; right: 100%; }
                60% { left: 100%; right: -40%; }
                100% { left: 100%; right: -40%; }
        }
</style>
