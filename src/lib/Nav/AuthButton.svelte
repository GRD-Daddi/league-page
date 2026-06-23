<script>
	import Button from '@smui/button';
	import { Icon } from '@smui/common';

	let { session = { authenticated: false } } = $props();

	async function handleLogout() {
		window.location.href = '/auth/logout';
	}
</script>

<style>
	.auth-container {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.user-info {
		font-size: 0.875rem;
		color: var(--g555);
		display: flex;
		align-items: center;
		gap: 0.25em;
	}

	.select-league-link {
		font-size: 0.8rem;
		color: var(--g555);
		text-decoration: underline;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
	}

	@media (max-width: 600px) {
		.user-info span {
			display: none;
		}
		.select-league-link {
			display: none;
		}
	}
</style>

{#if session?.authenticated}
	<div class="auth-container">
		<span class="user-info">
			<Icon class="material-icons">person</Icon>
			<span>{session.managerInfo?.teamName || 'Manager'}</span>
		</span>
		<a class="select-league-link" href="/auth/select-league">Change League</a>
		<Button variant="outlined" onclick={handleLogout}>Logout</Button>
	</div>
{:else}
	<Button href="/auth/login">Login</Button>
{/if}
