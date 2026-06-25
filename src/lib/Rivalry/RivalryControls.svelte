<script>
    export let year, displayWeek, selected, length;

    const nav = (dir) => {
        if(dir === "left") {
            if(selected > 0) {
                selected--;
            } else {
                selected = length - 1;
            }
        } else {
            if(selected < length - 1) {
                selected++;
            } else {
                selected = 0;
            }
        }
    }
</script>

<style>
    .container {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    h4 {
        display: inline-block;
        text-align: center;
        font-size: 1.6em;
        margin: 10px 20px;
    }
    .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--sn-text-dim);
        font-size: 28px;
        padding: 8px;
        border-radius: 50%;
        transition: color .15s, background .15s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .icon-btn:hover {
        color: var(--sn-cyan);
        background: rgba(0,240,255,0.08);
    }
</style>

<div class="container">
    {#if length > 0}
        <button class="icon-btn material-icons" onclick={() => nav("left")} aria-label="chevron_left">chevron_left</button>
    {/if}
    <h4>{year} Week {displayWeek}</h4>
    {#if length > 0}
        <button class="icon-btn material-icons" onclick={() => nav("right")} aria-label="chevron_right">chevron_right</button>
    {/if}
</div>