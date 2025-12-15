<template>
	<Dialog
		modal
		dismissable-mask
		:draggable="false"
		:visible="isOpen"
		:style="{
			width: '50rem',
			maxWidth: '100svw',
			height: 'calc(100svh - 4rem)',
		}"
		:breakpoints="{
			'500px': 'calc(100svw - 4rem)',
			'640px': '90svw',
		}"
		@update:visible="handleClose"
	>
		<template #header>
			<div class="store-header">
				<h2 class="dialog-title">Store</h2>

				<div
					class="droplet-count"
					:aria-label="`${userProfile?.droplets?.toLocaleString()} droplets`"
				>
					<span class="droplet-icon">
						<Icon name="droplet" />
					</span>
					<span class="droplet-amount">{{ userProfile?.droplets?.toLocaleString() }}</span>
				</div>
			</div>
		</template>

		<div class="store-items-grid">
			<StoreItem
				v-model="maxChargesQuantity"
				title="Max Charges"
				subtitle="Increase your limit of paint charges by 5"
				icon="charge"
				:cost="500"
				:user-droplets="userProfile?.droplets ?? 0"
				:loading="purchasing"
				@purchase="purchaseMaxCharges"
			/>

			<StoreItem
				v-model="paintChargesQuantity"
				title="Paint Charges"
				subtitle="Instantly get 30 paint charges"
				icon="paint"
				:cost="500"
				:user-droplets="userProfile?.droplets ?? 0"
				:loading="purchasing"
				@purchase="purchasePaintCharges"
			/>
		</div>

		<!--
		TODO
		<Card class="store-item store-item--disabled">
			<template #title>
				<Icon name="manage_accounts" />
				Profile Picture
			</template>
			<template #subtitle>
				Upload a custom profile picture
			</template>
			<template #content>
			</template>
		</Card>
		-->

		<Card class="store-item">
			<template #title>
				<div class="store-item-title">
					<Icon name="map_vector" />
					Flags
				</div>
			</template>

			<template #subtitle>
				Equip a flag to your profile to represent your country. When painting in a country where you have purchased a flag, you will receive a 10% refund on charges spent.
			</template>

			<template #content>
				<div v-if="!loading" class="flags-grid">
					<div
						v-for="country in sortedCountries"
						:key="country.id"
						class="flag-item"
					>
						<div class="flag-item-emoji">
							<FlagIcon :code="country.code" />
						</div>
						<div class="flag-item-name">{{ country.name }}</div>

						<div class="flag-item-actions">
							<Button
								v-if="isFlagOwned(country.id)"
								:label="isFlagEquipped(country.id) ? 'Unequip' : 'Equip'"
								:severity="isFlagEquipped(country.id) ? 'secondary' : 'primary'"
								:outlined="isFlagEquipped(country.id)"
								size="small"
								rounded
								class="flag-item-equip"
								:disabled="purchasing"
								@click="toggleFlagEquipped(country.id)"
							/>

							<BuyButton
								v-else
								:cost="FLAG_COST"
								size="small"
								:disabled="(userProfile?.droplets ?? 0) < FLAG_COST || purchasing"
								@click="purchaseFlag(country.id)"
							/>
						</div>
					</div>
				</div>
			</template>
		</Card>
	</Dialog>
</template>

<script setup lang="ts">
import Dialog from "primevue/dialog";
import Card from "primevue/card";
import Button from "primevue/button";
import { WplaceBitMap } from "../../../src/utils/bitmap";
import { COUNTRIES } from "../../../src/utils/country";
import BuyButton from "./store/BuyButton.vue";

const props = defineProps<{
	isOpen: boolean;
	userProfile: {
		droplets: number;
		flagsBitmap: string;
		equippedFlag: number;
	} | null;
}>();

const emit = defineEmits<{
	close: [];
	refresh: [];
}>();

const config = useRuntimeConfig();
const { showToast, handleError } = useErrorToast();

const MAX_CHARGES_PRODUCT = 70;
const PAINT_CHARGES_PRODUCT = 80;
const FLAG_PRODUCT = 110;
const FLAG_COST = 20_000;

const sortedCountries = COUNTRIES
	.sort((a, b) => a.name.localeCompare(b.name));

const maxChargesQuantity = ref(1);
const paintChargesQuantity = ref(1);
const purchasing = ref(false);
const loading = ref(false);

const flagsBitmap = ref<WplaceBitMap | null>(null);

watch(() => props.userProfile, profile => {
	flagsBitmap.value = null;

	if (profile?.flagsBitmap) {
		try {
			flagsBitmap.value = WplaceBitMap.fromBase64(profile.flagsBitmap);
		} catch {
			// Ignore
		}
	}
});

const isFlagOwned = (flagId: number): boolean => flagsBitmap.value?.get(flagId) ?? false;
const isFlagEquipped = (flagId: number): boolean => props.userProfile?.equippedFlag === flagId;

const purchase = async (product: { id: number; amount: number; variant?: number; }) => {
	await $fetch(`${config.public.backendUrl}/purchase`, {
		method: "POST",
		credentials: "include",
		body: {
			product
		}
	});
};

const purchaseMaxCharges = async () => {
	purchasing.value = true;
	try {
		const amount = maxChargesQuantity.value;
		await purchase({
			id: MAX_CHARGES_PRODUCT,
			amount
		});
		maxChargesQuantity.value = 1;
		emit("refresh");

		showToast({
			severity: "success",
			summary: `Purchased ${amount * 5} max charges`
		});
	} catch (error) {
		handleError(error);
	}
	purchasing.value = false;
};

const purchasePaintCharges = async () => {
	purchasing.value = true;
	try {
		const amount = paintChargesQuantity.value;
		await purchase({
			id: PAINT_CHARGES_PRODUCT,
			amount
		});
		paintChargesQuantity.value = 1;
		emit("refresh");

		showToast({
			severity: "success",
			summary: `Purchased ${amount * 30} charges`
		});
	} catch (error) {
		handleError(error);
	}
	purchasing.value = false;
};

const purchaseFlag = async (flagId: number) => {
	purchasing.value = true;
	try {
		await purchase({
			id: FLAG_PRODUCT,
			amount: 1,
			variant: flagId
		});
		emit("refresh");

		showToast({
			severity: "success",
			summary: "Purchased flag"
		});
	} catch (error) {
		handleError(error);
	}
	purchasing.value = false;
};

const toggleFlagEquipped = async (flagId: number) => {
	purchasing.value = true;
	try {
		const state = !isFlagEquipped(flagId);
		await $fetch(`${config.public.backendUrl}/flag/equip/${state ? flagId : 0}`, {
			method: "POST",
			credentials: "include"
		});

		showToast({
			severity: "success",
			summary: state ? "Flag equipped" : "Flag unequipped"
		});

		emit("refresh");
	} catch (error) {
		handleError(error);
	}
	purchasing.value = false;
};

const handleClose = () => emit("close");
</script>

<style scoped>
.store-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.dialog-title {
	margin: 0;
	font-size: inherit;
}

.store-item-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.store-item-title :deep(.icon-wrapper) {
	font-size: 1.5rem;
}

.droplet-count {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-right: 0.75rem;
}

.droplet-icon {
	font-size: 1.5rem;
	line-height: 0;
}

.store-items-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 1rem;
	margin-top: 2px;
	margin-bottom: 1rem;
}

.flags-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	grid-auto-rows: 1fr;
	gap: 2.5rem 2rem;
	margin: 1.5rem 0;
}

.flag-item {
	display: grid;
	grid-template-rows: auto 1fr auto;
	gap: 0.25rem;
	width: 100%;
	flex: 1;
	text-align: center;
}

.flag-item-emoji {
	font-size: 5rem;
	line-height: 1em;
}

.flag-item-name {
	min-height: 2.5em;
	display: flex;
	align-items: center;
	justify-content: center;
}

.flag-item-actions {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.flag-item-equip {
	min-width: 6rem;
}
</style>
