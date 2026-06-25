<script>
    import { gotoManager } from '$lib/utils/helper';

    export let columnOrder, team, standing, leagueTeamManagers;
</script>

<style>
    .clickable {
        cursor: pointer;
    }
        
        .teamAvatar {
                vertical-align: middle;
                border-radius: 50%;
                height: 40px;
                margin-right: 15px;
                border: 0.25px solid #777;
        }

    :global(.contrastRow) {
        background-color: var(--f8f8f8);
    }

    .team {
        text-align: center;
    }
</style>

<tr class="contrastRow">
    <td class="">
        <div class="clickable team" onclick={() => gotoManager({leagueTeamManagers, rosterID: standing.rosterID})}>
            <img alt="team avatar" class="teamAvatar clickable" src="{team.avatar}" />
            <div>
                {team.name}
            </div>
        </div>
    </td>
    {#each columnOrder as column}
        <td class="center">{standing[column.field]}</td>
    {/each}
</tr>