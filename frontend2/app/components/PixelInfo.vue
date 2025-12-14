<template>
	<Dialog
		:draggable="false"
		:visible="isOpen"
		position="bottom"
	>
		<template #header>
			<div class="pixel-info-header">
				Pixel Info
			</div>
		</template>

		<template #closebutton>
			<Button
				text
				rounded
				size="small"
				severity="secondary"
				class="pixel-info-close-button"
				aria-label="Close"
				@click="$emit('close')"
			>
				<Icon name="close" />
			</Button>
		</template>

		<template #default>
			<div
				v-if="loading"
				class="pixel-info-content pixel-info-loading"
			>
				<ProgressSpinner
					:style="{
						width: '64px',
						height: '64px'
					}"
				/>
			</div>

			<div
				v-else-if="pixelData"
				class="pixel-info-content"
			>
				<div
					v-if="pixelData.paintedBy.id !== 0"
					class="pixel-info-section"
				>
					<h4>Painted By</h4>
					<div class="pixel-info-row">
						<span class="pixel-info-label">User:</span>
						<span>{{ pixelData.paintedBy.name }}#{{ pixelData.paintedBy.id }}</span>
						<span
							v-if="pixelData.paintedBy.verified"
							v-tooltip.top="'This player has been verified by an administrator of this instance.'">
							<Icon name="verified" />
						</span>
						<span style="opacity: 75%; font-weight: 300;"> • {{ moment(pixelData.paintedBy.paintedAt).fromNow() }}</span>
					</div>
					<div
						v-if="pixelData.paintedBy.discord"
						class="pixel-info-row"
					>
						<span class="pixel-info-label">Discord:</span>
						<span>{{ pixelData.paintedBy.discord }}</span>
					</div>
					<div
						v-if="pixelData.paintedBy.allianceName"
						class="pixel-info-row"
					>
						<span class="pixel-info-label">Alliance:</span>
						<span>{{ pixelData.paintedBy.allianceName }}</span>
					</div>
				</div>

				<div
					v-else
					class="pixel-info-section"
				>
					<p class="pixel-info-empty">
						This pixel has not been painted yet.
					</p>
				</div>

				<div class="pixel-info-section">
					<h4>Location</h4>
					<div class="pixel-info-row">
						<span class="pixel-info-label">Tile:</span>
						<span>{{ coords?.tile[0] }}, {{ coords?.tile[1] }}</span>
					</div>
					<div class="pixel-info-row">
						<span class="pixel-info-label">Pixel:</span>
						<span>{{ coords?.pixel[0] }}, {{ coords?.pixel[1] }}</span>
					</div>
					<div class="pixel-info-row">
						<span class="pixel-info-label">Region:</span>
						<span>{{ pixelData.region.name }}</span>
					</div>
				</div>
			</div>

			<div
				v-else-if="failed"
				class="pixel-info-error"
			>
				<p>Failed to load pixel information</p>
			</div>
		</template>

		<template #footer>
			<div
				v-if="pixelData"
				class="pixel-info-actions"
			>
				<Button
					:severity="isFavorite ? 'danger' : 'secondary'"
					:outlined="!isFavorite"
					@click="toggleFavorite"
				>
					<Icon :name="isFavorite ? 'favorite_off' : 'favorite_on'" />
					{{ isFavorite ? 'Unfavorite' : 'Favorite' }}
				</Button>

				<Button
					severity="danger"
					outlined
					@click="$emit('report')"
				>
					<Icon name="report" />
					Report
				</Button>
			</div>
		</template>
	</Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import ProgressSpinner from "primevue/progressspinner";
import moment from "moment";
import type { TileCoords } from "~/utils/coordinates";
import { tileCoordsToLngLat } from "~/utils/coordinates";
import { useFavorites } from "~/composables/useFavorites";
import { type UserProfile, useUserProfile } from "~/composables/useUserProfile";
import { useErrorToast } from "~/composables/useErrorToast";

interface PixelData {
	paintedBy: {
		id: number;
		name: string;
		allianceId: number;
		allianceName: string;
		equippedFlag: number;
		discord?: string;
		paintedAt: string;
		verified?: boolean;
	};
	region: {
		id: number;
		cityId: number;
		name: string;
		number: number;
		countryId: number;
	};
}

const props = defineProps<{
	isOpen: boolean;
	coords: TileCoords | null;
}>();

const emit = defineEmits<{
	close: [];
	report: [];
	favoriteAdded: [];
	favoriteRemoved: [];
}>();

const pixelData = ref<PixelData | null>(null);
const loading = ref(false);
const failed = ref(false);
const favoriteId = ref<number | null>(null);
const userProfile = ref<UserProfile | null>(null);

const { addFavorite, removeFavorite } = useFavorites();
const { fetchUserProfile } = useUserProfile();
const { handleError } = useErrorToast();

const isFavorite = computed(() => favoriteId.value !== null);

const checkIfFavorite = async () => {
	if (!props.coords) {
		return;
	}

	try {
		if (!userProfile.value) {
			favoriteId.value = null;
			return;
		}

		const [lng, lat] = tileCoordsToLngLat(props.coords);

		// Is this a favorite?
		const tolerance = 0.0001;
		const favorite = userProfile.value.favoriteLocations.find(
			item => Math.abs(item.latitude - lat) < tolerance && Math.abs(item.longitude - lng) < tolerance
		);

		favoriteId.value = favorite ? favorite.id : null;
	} catch (error: unknown) {
		console.error("Failed to check favorite status:", error);
		handleError(error);
		favoriteId.value = null;
	}
};

const fetchPixelData = async () => {
	if (!props.coords) {
		return;
	}

	const [tileX, tileY] = props.coords.tile;
	const [x, y] = props.coords.pixel;

	loading.value = true;
	failed.value = false;

	try {
		const config = useRuntimeConfig();
		pixelData.value = await $fetch(`${config.public.backendUrl}/s0/pixel/${tileX}/${tileY}`, {
			query: { x, y },
			credentials: "include"
		});

		// Check if this pixel is favorited
		await checkIfFavorite();
	} catch (error) {
		failed.value = true;
		console.error("Failed to fetch pixel data:", error);
		handleError(error);
	} finally {
		loading.value = false;
	}
};

const toggleFavorite = async () => {
	if (!props.coords) {
		return;
	}

	try {
		const [lng, lat] = tileCoordsToLngLat(props.coords);

		if (isFavorite.value && favoriteId.value !== null) {
			await removeFavorite(favoriteId.value);
			favoriteId.value = null;
			emit("favoriteRemoved");
		} else {
			const result = await addFavorite([lng, lat]);
			favoriteId.value = result.id;
			emit("favoriteAdded");
		}

		userProfile.value = await fetchUserProfile();
	} catch (error) {
		console.error("Failed to toggle favorite:", error);
		handleError(error);
	}
};

watch(() => props.isOpen, async (newValue) => {
	if (newValue) {
		userProfile.value = await fetchUserProfile();
		fetchPixelData();
	} else {
		pixelData.value = null;
		failed.value = false;
	}
});

watch(() => props.coords, () => {
	if (props.isOpen) {
		fetchPixelData();
	}
}, { deep: true });
</script>

<style scoped>
.pixel-info-header {
	font-size: 1.1rem;
	font-weight: 500;
}

.pixel-info-close-button {
	margin-inline-end: calc(var(--p-button-sm-padding-x) * -1);
	aspect-ratio: 1;
}

.pixel-info-loading {
	padding: 2rem;
}

.pixel-info-content {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	margin-top: -0.25rem;
}

@media (min-width: 768px) {
	.pixel-info-content {
		width: 500px;
	}
}

.pixel-info-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.pixel-info-section h4 {
	margin: 0;
	margin-block-end: 0.1rem;
	font-size: 0.95rem;
	font-weight: 500;
	color: var(--p-text-color);
}

.pixel-info-row {
	display: flex;
	gap: 0.5rem;
	font-size: 0.875rem;
}

.pixel-info-label {
	font-weight: 600;
	min-width: 80px;
	color: var(--p-text-muted-color);
}

.pixel-info-empty {
	color: var(--p-text-muted-color);
	font-style: italic;
	margin: 0;
}

.pixel-info-error {
	padding: 1rem;
	text-align: center;
	color: var(--p-red-500);
}

.pixel-info-actions {
	display: flex;
	gap: 0.5rem;
	width: 100%;
}

.pixel-info-actions button {
	flex: 1;
}
</style>
