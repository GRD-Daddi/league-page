<script>
        import { tabs } from '$lib/utils/tabs';
        import Tab, { Icon, Label } from '@smui/tab';
        import List, { Item, Graphic, Text, Separator } from '@smui/list';
        import TabBar from '@smui/tab-bar';
    import { page } from '$app/state';
        import { goto, preloadData } from '$app/navigation';
        import { enableBlog, managers } from '$lib/utils/leagueInfo';

        let active = $state(tabs.find(tab => tab.dest == page.url.pathname || (tab.nest && tab.children.find(subTab => subTab.dest == page.url.pathname))));

        let display = $state(false);
        let el = $state();
        let parentEl = $state();
        let width = $state();
        let top = $state();
        let left = $state();

        $effect(() => {
                // re-run when the menu opens or the viewport changes
                display;
                innerWidth;
                if (!el || !parentEl) return;
                const r = el.getBoundingClientRect();
                const pr = parentEl.getBoundingClientRect();
                // position relative to the .parent (offset parent), not the viewport
                left = r.left - pr.left;
                top = r.bottom - pr.top + 1;
                width = r.width;
        });

        let innerWidth = $state();

        const open = () => {
                display = !display;
        }

        const subGoto = (dest) => {
                open(false);
                goto(dest);
        }

        let tabChildren = $state([]);

        for(const tab of tabs) {
                if(tab.nest) {
                        tabChildren = tab.children;
                }
        }

</script>

<svelte:window bind:innerWidth={innerWidth} />

<style>
    :global(.navBar) {
                display: inline-flex;
                position: relative;
        justify-content: center;
    }

        :global(.navBar .material-icons) {
                font-size: 1.8em;
                height: 25px;
                width: 22px;
        }

        .parent {
                position: relative;
        }

        .subMenu {
                overflow-y: hidden;
                display: block;
                position: absolute;
                z-index: 5;
                background-color: var(--fff);
                transition: all 0.4s;
        }

        .overlay {
                display: block;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                height: 100vh;
                z-index: 4;
        }

        :global(.mdc-deprecated-list) {
                padding: 0;
        }

        :global(.subText) {
                font-size: 0.8em;
        }

        :global(.dontDisplay) {
                display: none;
        }
</style>

<div tabindex="0" role="button" class="overlay" style="display: {display ? "block" : "none"};" onclick={() => open(true)}></div>

<div class="parent" bind:this={parentEl}>
        <TabBar class="navBar" {tabs} key={(tab) => tab.key} bind:active>
                {#snippet tab(tab)}
                        {#if tab.nest}
                                <div bind:this={el}>
                                        <Tab
                                                {tab}
                                                minWidth
                                                onclick={() => open()}
                                        >
                                                <Icon class="material-icons">{tab.icon}</Icon>
                                                <Label>{tab.label}</Label>
                                        </Tab>
                                </div>
                        {:else}
                                <Tab
                                        class="{tab.label == 'Blog' && !enableBlog ? 'dontDisplay' : ''}"
                                        {tab}
                                        onTouchstart={() => preloadData(tab.dest)}
                                        onMouseover={() => preloadData(tab.dest)}
                                        href={tab.dest}
                                        minWidth
                                >
                                        <Icon class="material-icons">{tab.icon}</Icon>
                                        <Label>{tab.label}</Label>
                                </Tab>
                        {/if}
                {/snippet}
        </TabBar>
        <div class="subMenu" style="max-height: {display ? 49 * tabChildren.length - 1 - (managers.length ? 0 : 48) : 0}px; min-width: 230px; top: {top}px; left: {left}px; box-shadow: {display ? "0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,240,255,0.15)" : "none"}; border: {display ? "1px" : "0"} solid #1f2937; border-top: none;">
                <List>
                        {#each tabChildren as subTab, ix}
                                {#if subTab.label == 'Managers'}
                                        <Item class="{managers.length ? '' : 'dontDisplay'}" onSMUIAction={() => subGoto(subTab.dest)} ontouchstart={() => preloadData(subTab.dest)} onmouseover={() => preloadData(subTab.dest)}>
                                                <Graphic class="material-icons">{subTab.icon}</Graphic>
                                                <Text class="subText">{subTab.label}</Text>
                                        </Item>
                                        {#if ix != tabChildren.length - 1}
                                                <Separator />
                                        {/if}
                                {:else}
                                        <Item onSMUIAction={() => subGoto(subTab.dest)} ontouchstart={() => {if(subTab.label != 'Go to Sleeper') preloadData(subTab.dest)}} onmouseover={() => {if(subTab.label != 'Go to Sleeper') preloadData(subTab.dest)}}>
                                                <Graphic class="material-icons">{subTab.icon}</Graphic>
                                                <Text class="subText">{subTab.label}</Text>
                                        </Item>
                                        {#if ix != tabChildren.length - 1}
                                                <Separator />
                                        {/if}
                                {/if}
                        {/each}
                </List>
        </div>
</div>
