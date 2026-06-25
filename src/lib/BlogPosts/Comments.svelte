<script>
    import { getAuthor, getAvatar, parseDate } from "$lib/utils/helper";
    import CreateComment from "./CreateComment.svelte";

    const lang = "en-US";

    export let comments, total, leagueTeamManagers, postID;

    let open = false;
    let errorMessage = '';


    const addComment = async(e) => {
        const {comment, author} = e.detail;
        if(comment.trim() == "") {
            // handle error
            errorMessage = 'Comment cannot be empty';
            open = true;
            return;
        }
        const validAuthor = validateID(author);
        if(!validAuthor) {
            // handle error
            errorMessage = 'Unauthorized user';
            open = true;
            return;
        }

        const res = await fetch(`/api/addBlogComments/${validAuthor}`, {
            method: 'POST',
            body: JSON.stringify({
                comment: comment.trim(),
                postID
            })
        })

        const newComment = await res.json();

        if(!res.ok) {
            // handle error
            errorMessage = newComment;
            open = true;
            return;
        }

        // add comment to others
        comments = [...comments, newComment];
        total++;
        showWrite = false;
    }

    const validateID = (author) => {
        for(const uID in leagueTeamManagers.users) {
            if(leagueTeamManagers.users[uID].user_name.toLowerCase() == author.toLowerCase()) {
                return uID;
            }
        }
        return false;
    }

    let showWrite = false;
</script>

<style>
    .comment {
        margin: 0;
        padding: 1em 2em 0.5em;
        background: var(--eee);
        border: 1px solid var(--ccc);
        border-left: none;
        border-right: none;
    }
    
    .commentHeader {
        margin: 0;
        padding: 1em 2em;
        background: var(--f8f8f8);
        font-size: 1.2em;
        border-bottom: 1px solid var(--ccc);
        border-left: none;
        border-right: none;
    }

    .date {
        color: var(--g999);
        padding: 0.5em 0 0;
    }

    :global(.commentIcon) {
        font-size: 1em;
        vertical-align: middle;
        padding: 0.3em;
    }
        
        .teamAvatar {
                vertical-align: middle;
                border-radius: 50%;
                height: 30px;
                margin-right: 5px;
                border: 0.25px solid #777;
        }

    .author {
        font-weight: 700;
    }

    .sn-dialog-scrim {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }

    .sn-dialog {
        background: var(--sn-surface);
        border: 1px solid var(--sn-border);
        border-radius: 12px;
        padding: 24px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }

    .sn-dialog-title {
        margin: 0 0 12px;
        font-size: 1.2rem;
        font-weight: 900;
        color: #fff;
    }

    .sn-dialog-content {
        color: var(--sn-text-dim);
        margin-bottom: 20px;
    }

    .sn-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }
</style>

{#if open}
  <div class="sn-dialog-scrim" onclick={() => open = false} role="presentation">
    <div class="sn-dialog" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <h2 class="sn-dialog-title">Error</h2>
      <div class="sn-dialog-content">{errorMessage}</div>
      <div class="sn-dialog-actions">
        <button class="sn-btn secondary" onclick={() => open = false}><span>Ok</span></button>
      </div>
    </div>
  </div>
{/if}

<div class="comments">
    <div class="commentHeader">
        <span class="material-icons commentIcon">comment</span> Comments ({total})
    </div>
    {#each comments as comment}
        <div class="comment">
            <img alt="author avatar" class="teamAvatar" src="{getAvatar(leagueTeamManagers, comment.fields.author)}" />
            <span class="author">{@html getAuthor(leagueTeamManagers, comment.fields.author)} - </span>
            <span class="commentText">{@html comment.fields.comment}</span>
            <div class="date"><i>{parseDate(comment.sys.createdAt)}</i></div>
        </div>
    {/each}
    <CreateComment bind:showWrite={showWrite} oncreateComment={addComment}/>
</div>
