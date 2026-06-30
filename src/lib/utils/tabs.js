import {leagueID} from '$lib/utils/leagueInfo';

export const tabs = [
    {
        icon: 'home',
        label: 'Home',
        dest: '/',
        key: 'home',
    },
    {
        icon: 'sports',
        label: 'Matchups',
        dest: '/matchups',
        key: 'matchups',
    },
    {
        icon: 'swap_horiz',
        label: 'Trades & Waivers',
        dest: '/transactions',
        key: 'transactions',
    },
    {
        icon: 'article',
        label: 'Blog',
        dest: '/blog',
        key: 'blog',
    },
    {
        icon: 'view_comfy',
        label: 'League Info',
        nest: true,
        key: 'league_info',
        children: [
            {
                icon: 'storage',
                label: 'Rosters',
                dest: '/rosters',
            },
            {
                icon: 'groups',
                label: 'Managers',
                dest: '/managers',
            },
            {
                icon: 'local_fire_department',
                label: 'Rivalry',
                dest: '/rivalry',
            },
            {
                icon: 'leaderboard',
                label: 'Standings',
                dest: '/standings',
            },
            {
                icon: 'view_comfy',
                label: 'Drafts',
                dest: '/drafts',
            },
            {
                icon: 'star',
                label: 'Keepers',
                dest: '/keepers',
            },
            {
                icon: 'emoji_events',
                label: 'Trophy Room',
                dest: '/awards',
            },
            {
                icon: 'military_tech',
                label: 'Records',
                dest: '/records',
            },
            {
                icon: 'how_to_vote',
                label: 'Votes',
                dest: '/votes',
            },
            {
                icon: 'history_edu',
                label: 'Constitution',
                dest: '/constitution',
            },
            {
                icon: 'sports_football',
                label: 'Go to Yahoo',
                dest: `https://football.fantasysports.yahoo.com/f1/${String(leagueID).split('.').pop()}`,
            },
        ]
    },
    {
        icon: 'shield',
        label: 'My Team',
        dest: '/rosters',
        key: 'my_team',
    },
];