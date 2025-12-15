<template>
	<Menu
		ref="menu"
		:model="menuItems"
		:popup="true"
	>
		<template #start>
			<div class="user-menu-header">
				<div class="user-info">
					<div class="avatar-container">
						<UserAvatar
							:user="user"
						/>
					</div>
					<div class="user-details">
						<div class="user-name-row">
							<span class="user-name">{{ user.username }}</span>
							<span class="user-id">#{{ user.id }}</span>
							<span
								v-if="user.verified"
								v-tooltip.top="'This player has been verified by an administrator of this instance.'"
								class="user-verified"
							>
								<Icon name="verified" />
							</span>
							<span
								v-if="countryCode"
								class="country-flag"
							>
								<FlagIcon :code="countryCode" />
							</span>
						</div>
						<div class="user-stat">
							<span>Pixels painted: {{ user.pixelsPainted.toLocaleString() }}</span>
						</div>
						<div class="user-stat">
							<span>Level {{ user.level }} ({{ user.levelProgress }}%)</span>
						</div>
					</div>
				</div>

				<div class="theme-selector">
					<ButtonGroup
						role="group"
						aria-label="Theme selector"
					>
						<Button
							class="theme-selector-button"
							size="small"
							:severity="currentTheme === ThemeMode.Light ? 'primary' : 'secondary'"
							:aria-pressed="currentTheme === ThemeMode.Light"
							aria-label="Light theme"
							@click="setTheme(ThemeMode.Light)"
						>
							Light
						</Button>

						<Button
							class="theme-selector-button"
							size="small"
							:severity="currentTheme === ThemeMode.Auto ? 'primary' : 'secondary'"
							:aria-pressed="currentTheme === ThemeMode.Auto"
							aria-label="Auto theme"
							@click="setTheme(ThemeMode.Auto)"
						>
							Auto
						</Button>

						<Button
							class="theme-selector-button"
							size="small"
							:severity="currentTheme === ThemeMode.Dark ? 'primary' : 'secondary'"
							:aria-pressed="currentTheme === ThemeMode.Dark"
							aria-label="Dark theme"
							@click="setTheme(ThemeMode.Dark)"
						>
							Dark
						</Button>
					</ButtonGroup>
				</div>
			</div>
		</template>
		<template #item="{ item }">
			<a
				class="menu-item-link"
				@click="(event) => item.command?.({ originalEvent: event, item })"
			>
				<Icon
					v-if="item.icon"
					:name="item.icon"
				/>
				<span>{{ item.label }}</span>
			</a>
		</template>
	</Menu>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Menu from "primevue/menu";
import Button from "primevue/button";
import ButtonGroup from "primevue/buttongroup";
import { COUNTRIES } from "../../../src/utils/country";
import { ThemeMode, useTheme } from "../composables/useTheme";

const props = defineProps<{
	isOpen: boolean;
	user: {
		username: string;
		id: number;
		level: number;
		verified: boolean;
		levelProgress: number;
		pixelsPainted: number;
		avatar: string;
		equippedFlag: number;
	};
}>();

const countryCode = computed(() => {
	if (!props.user.equippedFlag) {
		return null;
	}
	const country = COUNTRIES.find(item => item.id === props.user.equippedFlag);
	return country?.code ?? null;
});

const emit = defineEmits<{
	close: [];
	logout: [];
	openNotifications: [];
}>();

const menu = ref();

const { currentTheme, setTheme } = useTheme();

const menuItems = computed(() => [
	{
		label: "Notifications",
		command: () => {
			emit("openNotifications");
		}
	},
	{
		label: "Log out",
		command: () => {
			emit("logout");
			emit("close");
		}
	}
]);

defineExpose({
	toggle: (event: Event) => {
		menu.value.toggle(event);
	}
});
</script>

<style scoped>
.user-menu-header {
	padding: 1rem 1rem 0.5rem 1rem;
	border-bottom: 1px solid var(--p-surface-border);
}

.user-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.user-details {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	flex: 1;
}

.user-name-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.user-name {
	font-weight: 600;
	font-size: 1.125rem;
}

.user-id {
	font-size: 0.9rem;
}

.user-stat {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.875rem;
	color: var(--p-text-muted-color);
}

.user-stat i {
	font-size: 0.75rem;
}

.menu-item-link {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	cursor: pointer;
	text-decoration: none;
	color: inherit;
}

.menu-item-link:hover {
	background-color: var(--p-menuitem-hover-background);
}

.user-verified {
	line-height: 0;
}

.country-flag {
	font-size: 1.25rem;
	margin-top: -0.1em;
	line-height: 0;
}

.theme-selector {
	margin-top: 1rem;
}

.theme-selector :deep(.p-buttongroup) {
	width: 100%;
}

.theme-selector-button {
	flex: 1;
}
</style>
