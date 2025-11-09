<script>
	import { onMount } from 'svelte';
	import Button from '@smui/button';
	import { Icon } from '@smui/common';
	
	let session = $state(null);
	let loading = $state(true);
	
	onMount(async () => {
		try {
			const response = await fetch('/auth/session');
			if (response.ok) {
				session = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch session:', error);
		} finally {
			loading = false;
		}
	});
	
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
	
	.loading {
		font-size: 0.875rem;
		color: var(--g555);
	}
	
	@media (max-width: 600px) {
		.user-info span {
			display: none;
		}
	}
</style>

{#if loading}
	<span class="loading">...</span>
{:else if session?.authenticated}
	<div class="auth-container">
		<span class="user-info">
			<Icon class="material-icons">person</Icon>
			<span>{session.managerInfo?.teamName || 'Manager'}</span>
		</span>
		<Button variant="outlined" onclick={handleLogout}>Logout</Button>
	</div>
{:else}
	<Button href="/auth/login">Login</Button>
{/if}
