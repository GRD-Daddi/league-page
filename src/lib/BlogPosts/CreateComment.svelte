<script>
        import { createEventDispatcher } from 'svelte';

    export let showWrite;

        const dispatch = createEventDispatcher();

    const submit = () => {
        dispatch('createComment', {comment, author});
    }

    let comment = '';
    let author = '';

    const toggleShow = () => {
        showWrite = !showWrite;
    }
</script>

<style>
    .commentTextBox {
        background-color: var(--fff);
        color: var(--g333);
        width: 99%;
        height: 7em;
        font-family: var(--mdc-typography-body1-font-family, var(--mdc-typography-font-family, Roboto, sans-serif));
        font-size: var(--mdc-typography-body1-font-size, 1rem);
    }

    .commentTextBox:focus {
        outline: none;
        border: 1px solid var(--blueOne);
    }

    .submitArea {
        margin: 0;
        padding: 1em 2em 0;
    }

    .textBoxHolder {
        text-align: center;
    }
</style>

{#if showWrite}
    <div class="textBoxHolder">
        <textarea autofocus bind:value={comment} label="Leave a comment..." class="commentTextBox"/>
    </div>

    <div class="submitArea">
        <input class="sn-input shaped-outlined" bind:value={author} placeholder="Your Sleeper Username" aria-label="Your Sleeper Username" />
        <button class="sn-btn primary" onclick={() => submit()}><span>Submit Comment</span></button>
        <button class="sn-btn secondary" onclick={() => toggleShow()}><span>Cancel</span></button>
    </div>
{:else}
    <div class="submitArea">
        <button class="sn-btn primary" onclick={() => toggleShow()}><span>Leave a Comment</span></button>
    </div>
{/if}