<script>
	let { session = { authenticated: false } } = $props();

	async function handleLogout() {
		window.location.href = '/auth/logout';
	}
</script>

<style>
	.auth-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 900;
		font-size: 11px;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		padding: 0 18px;
		height: 36px;
		border: none;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s, box-shadow 0.15s;
		white-space: nowrap;
		font-family: inherit;
	}

	.login-btn {
		background: #ccff00;
		color: #000;
		transform: skewX(-10deg);
		box-shadow: 0 0 16px rgba(204, 255, 0, 0.2);
	}

	.login-btn:hover {
		background: #aacc00;
		box-shadow: 0 0 24px rgba(204, 255, 0, 0.35);
	}

	.login-btn span,
	.logout-btn span {
		transform: skewX(10deg);
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.auth-container {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #9ca3af;
	}

	.user-icon {
		color: #00f0ff;
		flex-shrink: 0;
	}

	.team-name {
		color: #fff;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.change-league {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #4b5563;
		text-decoration: none;
		transition: color 0.15s;
	}

	.change-league:hover {
		color: #00f0ff;
	}

	.logout-btn {
		background: transparent;
		color: #6b7280;
		border: 1px solid #374151;
		transform: skewX(-10deg);
		transition: border-color 0.15s, color 0.15s, background 0.15s;
	}

	.logout-btn:hover {
		border-color: #6b7280;
		color: #e5e7eb;
		background: rgba(255,255,255,0.05);
	}

	@media (max-width: 600px) {
		.team-name,
		.change-league {
			display: none;
		}
	}
</style>

{#if session?.authenticated}
	<div class="auth-container">
		<div class="user-info">
			<svg class="user-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
				<circle cx="12" cy="7" r="4"/>
			</svg>
			<span class="team-name">{session.managerInfo?.teamName || 'Manager'}</span>
		</div>
		<a class="change-league" href="/auth/select-league">Change League</a>
		<button class="auth-btn logout-btn" onclick={handleLogout}>
			<span>Logout</span>
		</button>
	</div>
{:else}
	<a href="/auth/login" class="auth-btn login-btn">
		<span>Login</span>
	</a>
{/if}
