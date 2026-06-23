<script>
    import { dues } from '$lib/utils/helper';
    let one, oneOne, oneOneOne, oneTwo, oneTwoOne, oneTwoTwo, oneTwoThree, oneTwoFour, oneTwoFive, oneThree;
    let two, twoOne, twoTwo, twoThree;
    let three, threeOne;
    let four, fourOne, fourTwo;
    let five, fiveOne;
    let six, sixOne, sixTwo, sixThree;
    let seven, sevenOne, sevenTwo, sevenThree;

    const goToSection = (section) => {
        const top = section.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({left: 0, top, behavior: 'smooth'});
    }
</script>

<div class="sn-page">
    <div class="sn-pagehead">
        <div class="sn-pagehead-inner">
            <span class="sn-eyebrow">Legends League</span>
            <h1 class="sn-pagetitle">LEAGUE <span class="accent">CONSTITUTION</span></h1>
            <p class="sn-pagesub">The official rules and bylaws governing the Legends League. Read carefully — ignorance of the constitution is no excuse.</p>
        </div>
    </div>

    <div class="sn-container narrow">

        <!-- TABLE OF CONTENTS -->
        <div class="sn-card sn-card-pad toc">
            <h2 class="sn-section-title toc-title">TABLE OF CONTENTS</h2>

            <button class="toc-section clickable" onclick={() => goToSection(one)}>Section 1: Roster</button>
                <button class="toc-sub clickable" onclick={() => goToSection(oneOne)}>1.1 Positional Breakdown</button>
                    <button class="toc-subsub clickable" onclick={() => goToSection(oneOneOne)}>1.1.1 Position Maximums</button>
                <button class="toc-sub clickable" onclick={() => goToSection(oneTwo)}>1.2 Trading</button>
                    <button class="toc-subsub clickable" onclick={() => goToSection(oneTwoOne)}>1.2.1 Trade Collusion</button>
                    <button class="toc-subsub clickable" onclick={() => goToSection(oneTwoTwo)}>1.2.2 Lending Players Prohibition</button>
                    <button class="toc-subsub clickable" onclick={() => goToSection(oneTwoThree)}>1.2.3 Trade Deadline</button>
                    <button class="toc-subsub clickable" onclick={() => goToSection(oneTwoFour)}>1.2.4 Trade Restrictions</button>
                    <button class="toc-subsub clickable" onclick={() => goToSection(oneTwoFive)}>1.2.5 Veto/Trade Process</button>
                <button class="toc-sub clickable" onclick={() => goToSection(oneThree)}>1.3 Waiver Wire</button>

            <button class="toc-section clickable" onclick={() => goToSection(two)}>Section 2: Drafting</button>
                <button class="toc-sub clickable" onclick={() => goToSection(twoOne)}>2.1 Draft Order</button>
                <button class="toc-sub clickable" onclick={() => goToSection(twoTwo)}>2.2 Rookie Drafts</button>
                <button class="toc-sub clickable" onclick={() => goToSection(twoThree)}>2.3 Draft Day Trades</button>

            <button class="toc-section clickable" onclick={() => goToSection(three)}>Section 3: Scoring System</button>
                <button class="toc-sub clickable" onclick={() => goToSection(threeOne)}>3.1 Voting on Scoring System</button>

            <button class="toc-section clickable" onclick={() => goToSection(four)}>Section 4: Postseason</button>
                <button class="toc-sub clickable" onclick={() => goToSection(fourOne)}>4.1 Playoffs</button>
                <button class="toc-sub clickable" onclick={() => goToSection(fourTwo)}>4.2 Playoff Tiebreakers</button>

            <button class="toc-section clickable" onclick={() => goToSection(five)}>Section 5: Tanking Policy</button>
                <button class="toc-sub clickable" onclick={() => goToSection(fiveOne)}>5.1 League Tanking Policy</button>

            <button class="toc-section clickable" onclick={() => goToSection(six)}>Section 6: Replacing Managers</button>
                <button class="toc-sub clickable" onclick={() => goToSection(sixOne)}>6.1 Removing Managers</button>
                <button class="toc-sub clickable" onclick={() => goToSection(sixTwo)}>6.2 Replacing Managers</button>
                <button class="toc-sub clickable" onclick={() => goToSection(sixThree)}>6.3 Replacement Incentive</button>

            <button class="toc-section clickable" onclick={() => goToSection(seven)}>Section 7: League Finances</button>
                <button class="toc-sub clickable" onclick={() => goToSection(sevenOne)}>7.1 League Dues</button>
                <button class="toc-sub clickable" onclick={() => goToSection(sevenTwo)}>7.2 Payout</button>
                <button class="toc-sub clickable" onclick={() => goToSection(sevenThree)}>7.3 Raising Dues</button>
        </div>

        <!-- SECTION 1 -->
        <div class="sn-card sn-card-pad section" bind:this={one}>
            <h2 class="sn-section-title">Section 1 — Roster Breakdown</h2>

            <h3 class="art-title" bind:this={oneOne}>1.1 Positional Breakdown</h3>

            <p>28 Total Players</p>

            <p class="lead">Starters</p>
            <ul>
                <li>QB</li>
                <li>RB</li>
                <li>RB</li>
                <li>WR</li>
                <li>WR</li>
                <li>TE</li>
                <li>FLEX (RB/WR/TE)</li>
                <li>FLEX (RB/WR)</li>
                <li>D/ST</li>
                <li>K</li>
            </ul>

            <p>18 Bench (Expanded by 5 between the keague draft and start of regular season)</p>

            <p>1 IR Spots (Player must be labeled as IR, Out, or Covid in the Sleeper App)</p>

            <h4 class="sub-title" bind:this={oneOneOne}>1.1.1 Position Maximums</h4>

            <div class="subBlock">
                <table class="sn-table positionMaximums">
                    <tbody>
                    <tr><td>QB</td><td class="right">3 active, 5 total</td></tr>
                    <tr><td>RB</td><td class="right">20</td></tr>
                    <tr><td>WR</td><td class="right">20</td></tr>
                    <tr><td>TE</td><td class="right">10</td></tr>
                    <tr><td>D/ST</td><td class="right">3</td></tr>
                    <tr><td>K</td><td class="right">3</td></tr>
                    </tbody>
                </table>
            </div>

            <h3 class="art-title" bind:this={oneTwo}>1.2 Trading</h3>

            <p>Trading of players and draft picks (up to 3 drafts away) are allowed. Trades will process immediately and will be reversed if vetoed or under investigation for collusion. Tradable assets include players, draft picks, and FAAB $.</p>

            <h4 class="sub-title" bind:this={oneTwoOne}>1.2.1 Trade Collusion</h4>
            <div class="subBlock">
                <p>If any owners are suspected of accepting bribes/offering bribes to enhance their/another owners team via trade, trading any assets other than fantasy players, draft picks, FAAB $, or otherwise found guilty of engaging in any form of collusion*, all parties involved in the trade will be susceptible to punishment. The punishments will go as followed:</p>

                <ul>
                    <li>First Offense – Immediate reduction of FAAB budget by 80%</li>
                    <li>Second Offense – Immediate freeze on all transaction types for the next 18 weeks of regular season and playoff fantasy football games, including trades and waiver wire bids</li>
                    <li>Third Offense – A league meeting of all members not involved in any of the improper trades/activity in question will take place to discuss next steps.</li>
                </ul>

                <p>All trades that are found guilty of collusion, will be reversed/denied. If the trade had affected the outcome of previous games, the results of those games will be revised.  </p>

                <p>*Collusion includes the organizing of veto votes against an acceptable trade.</p>

                <p>The commissioner will err on the side of letting owners manage their teams the way they see fit. Any collusion will need to be clear. The commissioner reserves the right to step in and at the very least assess the thinking of any team involved in a heavily lop-sided trade. </p>
            </div>

            <h4 class="sub-title" bind:this={oneTwoTwo}>1.2.2 Lending Players Prohibition</h4>
            <div class="subBlock">
                <p>Any player traded from a team may not be re-acquired via trade within 6 weeks of the original trade. Any teams involved in this behavior will be subject to the aforementioned collusion punishments.</p>
            </div>

            <h4 class="sub-title" bind:this={oneTwoThree}>1.2.3 Trade Deadline</h4>
            <div class="subBlock">
                <p>The trade deadline will be set for the Saturday of the week 11 games of the NFL season.</p>
            </div>

            <h4 class="sub-title" bind:this={oneTwoFour}>1.2.4 Trade Restrictions</h4>
            <div class="subBlock">
                <p>You will not be able to trade draft picks that are more than 3 drafts away. For example, during the 2021 season you cannot trade any picks in or after the 2025 draft. You may only trade FAAB $ from the current season.</p>
            </div>

            <h4 class="sub-title" bind:this={oneTwoFive}>1.2.5 Veto/Trade Process</h4>
            <div class="subBlock">
                <p>A total of 7 veto votes are required to veto a trade. Vetoes are only appropriate in instances of collusion or an egregious mismatch of value (i.e. CMC for a backup kicker). Not liking a trade does not warrant a veto.</p>
            </div>

            <h3 class="art-title" bind:this={oneThree}>1.3 Waiver Wire</h3>

            <p>FAAB Waiver wire system. Each team will begin the season with $100. $0 bids are allowed. Bids will process Thursdays and Sundays at 9AM EST.</p>

            <p>FAAB budgets will reset each season in January.</p>
        </div>

        <!-- SECTION 2 -->
        <div class="sn-card sn-card-pad section" bind:this={two}>
            <h2 class="sn-section-title">Section 2 — Drafting</h2>

            <h3 class="art-title" bind:this={twoOne}>2.1 Draft Order</h3>
            <p>The draft order each year will be a linear draft in reverse order of the previous year’s regular season standings.</p>

            <h3 class="art-title" bind:this={twoTwo}>2.2 Rookie Drafts</h3>
            <p>Rokkie drafts will consist of 3 round of drafting, with 5 minutes alotted for each pick. To make room for the incoming players, benches will be expanded by (5) spots. These spots will be removed in mid-August, at which point you will need to have cut the necessary players.</p>
            <p>Any spots not filled during the draft, can be filled immediately afterwards from the waiver wire.</p>

            <h3 class="art-title" bind:this={twoThree}>2.3 Draft Day Trades</h3>
            <p>If a trade is being made during the draft, one or both parties can alert the commissioner to pause the draft to allow for extra time to negotiate the trade.</p>
        </div>

        <!-- SECTION 3 -->
        <div class="sn-card sn-card-pad section" bind:this={three}>
            <h2 class="sn-section-title">Section 3 — Scoring System</h2>

            <h3 class="art-title" bind:this={threeOne}>3.1 Scoring System</h3>
            <p>The league scoring system breakdown is listed on the Sleeper fantasy app (for the most part, it follows typical .5PPR Scoring). The scoring system will never change without a majority league vote.</p>
        </div>

        <!-- SECTION 4 -->
        <div class="sn-card sn-card-pad section" bind:this={four}>
            <h2 class="sn-section-title">Section 4 — Postseason</h2>

            <h3 class="art-title" bind:this={fourOne}>4.1 Playoffs</h3>
            <p>At the end of the season 6 teams will make the playoffs. The first round of playoffs will commence in week 15. Each team that wins their division and the 4 wild card teams that finish with the best records, will receive a playoff berth. The 2 teams that win their division will receive a bye week in the first round of the playoffs. Each playoff matchup will only last one week and the winner will advance. Week 18 will not be used.</p>

            <h3 class="art-title" bind:this={fourTwo}>4.2 Seeding Tiebreakers</h3>
            <p>If two teams finish with the same record the tiebreakers will go as followed:</p>

            <ol>
                <li>Points For</li>
                <li>Head 2 Head Record</li>
                <li>Division Record</li>
                <li>Total Points Against</li>
                <li>Coin Flip</li>
                <li>Duel to the death</li>
            </ol>
        </div>

        <!-- SECTION 5 -->
        <div class="sn-card sn-card-pad section" bind:this={five}>
            <h2 class="sn-section-title">Section 5 — Tanking Policy</h2>

            <h3 class="art-title" bind:this={fiveOne}>5.1 League Tanking Policy</h3>
            <p>No team may intentionally leave starting roster spots empty. Any evidence of intentionally leaving roster spots empty in order to improve your draft position may be subject to punishment, including but not limited to the forfeiture of draft selections.</p>
        </div>

        <!-- SECTION 6 -->
        <div class="sn-card sn-card-pad section" bind:this={six}>
            <h2 class="sn-section-title">Section 6 — Replacing Managers</h2>

            <h3 class="art-title" bind:this={sixOne}>6.1 Removing Managers</h3>
            <p>Short of continuously failing to set a valid lineup, or confirmed collusion, no manager can be removed against their will. Participation, through the league chat, trade offers, and the waiver wire, is strongly encouraged but generally grounds for removal.</p>

            <h3 class="art-title" bind:this={sixTwo}>6.2 Replacing Managers</h3>
            <p>When a manager needs to be replaced, the commisiooners will try to find a suitable candidate with some connection to at least a portion of the existing managers. Priority will be placed on managers who are eager to take on a dynasty commitment and will be very active within the league.</p>

            <h3 class="art-title" bind:this={sixThree}>6.3 Replacement Incentive</h3>
            <p>In the event that a manager chooses to quit the league or is removed by a comissioner, an incoming manager is offered a 50% reductioon on their first year buy-in.</p>
        </div>

        <!-- SECTION 7 -->
        <div class="sn-card sn-card-pad section" bind:this={seven}>
            <h2 class="sn-section-title">Section 7 — League Finances</h2>

            <h3 class="art-title" bind:this={sevenOne}>7.1 League Dues</h3>
            <p>League dues are set at {dues}$. Dues are collected through <a href="https://www.leaguesafe.com/league/3949641">LeagueSafe</a> and collection will be sent out no later than the first of August. All managers must be fully paid up before the start of regular season. In the event that a manager fails to pay before the deadline, a 10% penalty will be addd to their payment and will go towards the payouts at the end of the year.</p>

            <h3 class="art-title" bind:this={sevenTwo}>7.2 Payout</h3>
            <p>League payout is structured as follows:</p>
            <ul>
                <li>1st place: {dues * 8}$</li>
                <li>2nd place: {dues * 3}$</li>
                <li>3rd place: {dues}$</li>
            </ul>
            <p>In the event that a manager was fined due to late payment, their extra fee will be added to the winner's payout. Similarly, if new managers come into the league and the payout is smaller, the difference will come out of the winner's prize.</p>

            <h3 class="art-title" bind:this={sevenThree}>7.3 Raising Dues</h3>
            <p>A ⅔ majority vote is required in order to raise league dues. In the event that a manager is no longer financially comfortable with the buyin, finding a co-manager to split the cost is reccomended.</p>
        </div>

    </div>
</div>

<style>
    .section { margin-bottom: 24px; }

    .toc { margin-bottom: 32px; }

    .toc-title { margin-bottom: 20px; }

    .toc-section,
    .toc-sub,
    .toc-subsub {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        font-family: inherit;
        cursor: pointer;
        padding: 6px 0;
        transition: color 0.15s;
    }

    .toc-section {
        color: #fff;
        font-weight: 800;
        font-size: 1.05rem;
        margin-top: 14px;
    }
    .toc-section:first-of-type { margin-top: 0; }

    .toc-sub {
        color: var(--sn-text-dim);
        font-weight: 600;
        font-size: 0.95rem;
        padding-left: 20px;
    }

    .toc-subsub {
        color: var(--sn-text-mute);
        font-weight: 500;
        font-size: 0.85rem;
        padding-left: 40px;
    }

    .clickable:hover { color: var(--sn-cyan); }

    .art-title {
        color: var(--sn-cyan);
        font-weight: 800;
        font-size: 1.2rem;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        margin: 32px 0 12px;
    }
    .art-title:first-of-type { margin-top: 24px; }

    .sub-title {
        color: var(--sn-lime);
        font-weight: 700;
        font-size: 1rem;
        margin: 24px 0 10px;
        margin-left: 1.5em;
    }

    .section :global(p) {
        color: var(--sn-text-dim);
        line-height: 1.7;
        margin: 12px 0;
    }

    .section :global(p.lead) {
        color: #fff;
        font-weight: 700;
        text-decoration: underline;
        margin-bottom: 6px;
    }

    .section :global(ul),
    .section :global(ol) {
        color: var(--sn-text-dim);
        line-height: 1.7;
        padding-left: 1.6em;
        margin: 12px 0;
    }

    .section :global(li) { margin: 6px 0; }

    .section :global(a) {
        color: var(--sn-lime);
        font-weight: 600;
        text-decoration: underline;
    }
    .section :global(a:hover) { color: var(--sn-cyan); }

    .subBlock { margin-left: 1.5em; }

    .positionMaximums {
        max-width: 360px;
        background: var(--sn-surface-3);
        border: 1px solid var(--sn-border);
        border-radius: 10px;
        overflow: hidden;
    }
    .positionMaximums :global(td) {
        padding: 10px 16px;
        color: var(--sn-text-dim);
        font-weight: 600;
        min-width: 3em;
    }
    .positionMaximums :global(td.right) {
        text-align: right;
        font-family: monospace;
        color: #fff;
    }
    .positionMaximums :global(tr) { border-top: 1px solid var(--sn-border); }
    .positionMaximums :global(tr:first-child) { border-top: none; }

    @media (max-width: 600px) {
        .sub-title, .subBlock { margin-left: 0.75em; }
    }
</style>
