<template>
	<div
		class="app-container"
		:style="{
			'visibility': isLoading ? 'hidden' : undefined
		}"
	>
		<Toast />

		<ClientOnly>
			<Map
				ref="mapRef"
				:initial-location="savedLocation"
				:pixels="pixels"
				:is-drawing="isPaintOpen"
				:is-satellite="isSatellite"
				:favorite-locations="userProfile?.favoriteLocations"
				:selected-pixel-coords="selectedPixelCoords"
				@map-click="handleMapClick"
				@map-right-click="handleMapRightClick"
				@draw-pixels="handleDrawPixels"
				@bearing-change="mapBearing = $event"
				@favorite-click="handleFavoriteClick"
				@save-current-location="saveCurrentLocation"
			/>
			<template #fallback>
				<div class="map-loading" />
			</template>
		</ClientOnly>

		<div class="app-overlays">
			<div class="app-overlays-zoom">
				<MapButton
					v-tooltip.right="'About openplace'"
					icon="info"
					@click="isAboutOpen = true"
				/>

				<MapButton
					v-tooltip.right="'Zoom in'"
					icon="zoom_in"
					@click="zoomIn"
				/>

				<MapButton
					v-tooltip.right="'Zoom out'"
					icon="zoom_out"
					@click="zoomOut"
				/>

				<MapButton
					v-if="mapBearing !== 0"
					v-tooltip.right="'Reset map rotation'"
					icon="compass"
					@click="resetMapRotation"
				/>
			</div>

			<div class="app-overlays-profile">
				<div v-if="isLoggedIn">
					<OverlayBadge
						v-if="notificationCount > 0"
						:value="notificationCount > 99 ? '99+' : notificationCount"
						severity="danger"
					>
						<Button
							severity="secondary"
							raised
							rounded
							class="app-overlays-avatar-button"
							aria-label="Toggle user menu"
							@click="toggleUserMenu"
						>
							<UserAvatar
								:user="user"
							/>
						</Button>
					</OverlayBadge>
					<Button
						v-else
						severity="secondary"
						raised
						rounded
						class="app-overlays-avatar-button"
						aria-label="Toggle user menu"
						@click="toggleUserMenu"
					>
						<UserAvatar
							:user="user"
						/>
					</Button>

					<UserMenu
						ref="userMenuRef"
						:is-open="isUserMenuOpen"
						:user="user"
						@close="isUserMenuOpen = false"
						@logout="handleLogOut"
						@open-notifications="handleOpenNotifications"
					/>
				</div>

				<Button
					v-else
					severity="primary"
					raised
					rounded
					@click="handleLogIn"
				>
					Log in
				</Button>

				<MapButton
					v-tooltip.left="'Store'"
					icon="store"
					@click="isStoreOpen = true"
				/>

				<MapButton
					v-tooltip.left="'Toggle satellite'"
					:icon="isSatellite ? 'map_vector' : 'map_satellite'"
					@click="toggleSatellite"
				/>

				<MapButton
					v-tooltip.left="'Go to random pixel'"
					icon="explore"
					:loading="isLoadingRandom"
					@click="goToRandom"
				/>
			</div>

			<div
				v-if="isLoggedIn"
				class="app-overlays-paint"
			>
				<PaintButton
					:charges="currentCharges ?? 0"
					:max-charges="maxCharges ?? 0"
					:is-drawing="isPaintOpen"
					:time-until-next="formattedTime"
					@click="handlePaintButtonClick"
				/>
			</div>

			<div
				v-if="isLoggedIn"
				class="app-overlays-palette"
			>
				<ColorPalette
					:is-open="isPaintOpen"
					:selected-color="selectedColor"
					:is-eraser-mode="isEraserMode"
					:charges="currentCharges ?? 0"
					:max-charges="maxCharges ?? 0"
					:pixel-count="pixels.length"
					:time-until-next="formattedTime"
					:extra-colors-bitmap="userProfile?.extraColorsBitmap ?? 0"
					@close="handleClosePaint"
					@submit="handleSubmitPixels"
					@select-color="handleSelectColor"
					@toggle-eraser="isEraserMode = !isEraserMode"
				/>
			</div>
		</div>

		<PixelInfo
			:is-open="selectedPixelCoords !== null"
			:coords="selectedPixelCoords"
			@close="selectedPixelCoords = null"
			@report="handleReportPixel"
			@favorite-added="handleFavoriteChanged"
			@favorite-removed="handleFavoriteChanged"
		/>

		<AboutDialog
			:is-open="isAboutOpen"
			@close="isAboutOpen = false"
		/>

		<StoreDialog
			:is-open="isStoreOpen"
			:user-profile="userProfile"
			@close="isStoreOpen = false"
			@refresh="handleStoreRefresh"
		/>

		<NotificationDialog
			:is-open="isNotificationsOpen"
			@close="isNotificationsOpen = false"
			@count-updated="handleNotificationCountUpdated"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Toast from "primevue/toast";
import OverlayBadge from "primevue/overlaybadge";
import Map, { type LocationWithZoom } from "~/components/Map.vue";
import PaintButton from "~/components/PaintButton.vue";
import ColorPalette from "~/components/ColorPalette.vue";
import UserAvatar from "~/components/UserAvatar.vue";
import UserMenu from "~/components/UserMenu.vue";
import PixelInfo from "~/components/PixelInfo.vue";
import NotificationDialog from "~/components/NotificationDialog.vue";
import StoreDialog from "~/components/StoreDialog.vue";
import { CLOSE_ZOOM_LEVEL, getPixelId, type LngLat, lngLatToTileCoords, type TileCoords, tileCoordsToLngLat, ZOOM_LEVEL } from "~/utils/coordinates";
import { type UserProfile, useUserProfile } from "~/composables/useUserProfile";
import { useCharges } from "~/composables/useCharges";
import { usePaint } from "~/composables/usePaint";
import { useErrorToast } from "~/composables/useErrorToast";
import { useNotifications } from "~/composables/useNotifications";
import { useTheme } from "~/composables/useTheme";

interface Pixel {
	id: string;
	tileCoords: TileCoords;
	color: string;
}

const USER_RELOAD_INTERVAL = 15_000;

/* eslint-disable array-bracket-spacing,unicorn/numeric-separators-style,unicorn/no-zero-fractions */
const DEFAULT_COORDS: LngLat[] = [
	[ 39.90750,  116.39723], // Beijing
	[ 41.01384,   28.94966], // Istanbul
	[  6.45407,    3.39467], // Lagos
	[ 10.82302,  106.62965], // Ho Chi Minh City
	[ 31.55800,   74.35071], // Lahore
	[ 19.07283,   72.88261], // Mumbai
	[-23.54750,  -46.63611], // São Paulo
	[ 19.42847,  -99.12766], // Mexico City
	[ 55.75204,   37.61781], // Moscow
	[ 37.56600,  126.97840], // Seoul
	[ 35.68950,  139.69171], // Tokyo
	[ 51.50853,   -0.12574], // London
	[ 40.71427,  -74.00597], // New York City
	[ 25.05306,  121.52639], // Taipei
	[ 22.27832,  114.17469], // Hong Kong
	[  1.28967,  103.85007], // Singapore
	[-33.86785,  151.20732], // Sydney
	[-37.81400,  144.96332], // Melbourne
	[ 34.05223, -118.24368], // Los Angeles
	[ 52.52437,   13.41053], // Berlin
	[ 48.85341,    2.34880], // Paris
	[-34.92866,  138.59863]  // Adelaide
];
/* eslint-enable unicorn/numeric-separators-style,unicorn/numeric-separators-style,unicorn/no-zero-fractions */

const isPaintOpen = ref(false);
const isSatellite = ref(false);
const isUserMenuOpen = ref(false);
const isPixelInfoOpen = ref(false);
const isNotificationsOpen = ref(false);
const isAboutOpen = ref(false);
const isStoreOpen = ref(false);
const notificationCount = ref(0);
const selectedColor = ref("rgba(0,0,0,1)");
const isEraserMode = ref(false);
const pixels = ref<Pixel[]>([]);
const selectedPixelCoords = ref<TileCoords | null>(null);
const userProfile = ref<UserProfile | null>(null);
const isLoading = ref(true);
const userMenuRef = ref();
const mapRef = ref();
const mapBearing = ref(0);
const isLoadingRandom = ref(false);
const isAnimatingToRandom = ref(false);
const randomTargetCoords = ref<{ lat: number; lng: number; zoom: number } | null>(null);

let lastUserProfileFetch = Date.now();

const {
	currentCharges,
	maxCharges,
	formattedTime,
	decrementCharge,
	incrementCharge,
	initialize,
	commitPixels
} = useCharges();

const { fetchUserProfile, logIn, logOut } = useUserProfile();
const { submitPixels } = usePaint();
const { showToast, handleError } = useErrorToast();
const { getUnreadCount } = useNotifications();
const { initTheme } = useTheme();

const isLoggedIn = computed(() => userProfile.value !== null);

const savedLocation = computed((): LocationWithZoom => {
	let location: { lng: number; lat: number; zoom: number; } | null = null;
	try {
		const locationStr = localStorage["location"];
		if (locationStr) {
			location = JSON.parse(locationStr);
		}
	} catch {
		// Ignore
	}

	if (!location || !location.lng || !location.lat) {
		const [lng, lat] = DEFAULT_COORDS[Math.floor(Math.random() * DEFAULT_COORDS.length)]!;
		location = {
			lng,
			lat,
			zoom: CLOSE_ZOOM_LEVEL
		};
	}

	return {
		center: [location.lng, location.lat],
		zoom: location?.zoom ?? CLOSE_ZOOM_LEVEL
	};
});

const saveCurrentLocation = () => {
	try {
		localStorage["location"] = JSON.stringify({
			...mapRef.value.getCenter(),
			zoom: mapRef.value.getZoom()
		});
	} catch {
		// Ignore?
	}
};

const user = computed<UserProfile | null>(() => {
	const value = userProfile.value;
	if (!value) {
		return null;
	}

	const levelProgress = Math.round((value.level - Math.floor(value.level)) * 100);

	return {
		...value,
		username: value.name,
		verified: value.verified,
		level: Math.floor(value.level),
		levelProgress,
		pixelsPainted: Math.floor(value.pixelsPainted),
		avatar: value.picture
	};
});

const updateUserProfile = async () => {
	try {
		lastUserProfileFetch = Date.now();
		const profile = await fetchUserProfile();
		userProfile.value = profile;
		if (profile) {
			initialize(
				profile.charges.count,
				profile.charges.max,
				profile.charges.cooldownMs
			);

			notificationCount.value = await getUnreadCount();
		} else {
			notificationCount.value = 0;
		}
	} catch (error) {
		console.error("Failed to fetch user profile:", error);
		handleError(error);
	}
};

const handleOpenNotifications = () => {
	isNotificationsOpen.value = true;
	isUserMenuOpen.value = false;
};

const handleNotificationCountUpdated = (count: number) => {
	notificationCount.value = count;
};

const handleWindowFocus = async () => {
	const now = Date.now();
	if (now - lastUserProfileFetch > USER_RELOAD_INTERVAL) {
		await updateUserProfile();
	}
};

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
	if (mapRef.value?.hasUncommittedPixels?.()) {
		// Show confirm navigation prompt
		e.preventDefault();
		e.returnValue = "";
		return "";
	}
};

onMounted(async () => {
	initTheme();
	await updateUserProfile();
	requestAnimationFrame(() => isLoading.value = false);

	// Show about if first visit
	const showedInfo = Boolean(localStorage["showed:info"]);
	if (!showedInfo) {
		isAboutOpen.value = true;
		localStorage["showed:info"] = "true";
	}

	// Select previous color
	const selectedColorIndex = Number(localStorage["selected-color"] ?? "");
	if (!Number.isNaN(selectedColorIndex)) {
		const color = palette.find(({ index }) => index === selectedColorIndex);
		if (color) {
			selectedColor.value = `rgba(${color.rgba.join(",")})`;
		}
	}

	// Jump to url params
	const params = new URLSearchParams(location.search);
	const latStr = params.get("lat");
	const lngStr = params.get("lng");
	const zoomStr = params.get("zoom");

	if (latStr && lngStr && mapRef.value) {
		const [lat, lng] = [Number.parseFloat(latStr), Number.parseFloat(lngStr)];
		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			const zoom = Number.parseFloat(zoomStr ?? "") || CLOSE_ZOOM_LEVEL;
			mapRef.value.jumpToLocation(lat, lng, zoom);
		}
	}

	globalThis.addEventListener("popstate", popMapLocation);
	globalThis.addEventListener("focus", handleWindowFocus);
	globalThis.addEventListener("beforeunload", handleBeforeUnload);
	document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
	globalThis.removeEventListener("popstate", popMapLocation);
	globalThis.removeEventListener("focus", handleWindowFocus);
	globalThis.removeEventListener("beforeunload", handleBeforeUnload);
	document.removeEventListener("keydown", handleKeyDown);
});

const pushMapLocation = (center?: LngLat, zoom?: number) => {
	if (!mapRef.value) {
		return;
	}

	let lng = 0;
	let lat = 0;
	if (center) {
		[lng, lat] = center;
	} else {
		const mapCenter = mapRef.value.getCenter();
		[lng, lat] = [mapCenter.lng, mapCenter.lat];
	}
	const zoomValue = zoom ?? mapRef.value.getZoom();

	const url = new URL(location.href);
	const newParams = new URLSearchParams([
		["lat", lat.toFixed(6)],
		["lng", lng.toFixed(6)],
		["zoom", zoomValue.toFixed(2)]
	]);

	const anyChanged = [...newParams.entries()]
		.some(([key, value]) => url.searchParams.get(key) !== value);
	if (anyChanged) {
		for (const [key, value] of newParams.entries()) {
			url.searchParams.set(key, value);
		}

		history.pushState({}, "", url);
	}
};

const popMapLocation = () => {
	if (!mapRef.value) {
		return;
	}

	const params = new URLSearchParams(location.search);
	const latStr = params.get("lat");
	const lngStr = params.get("lng");
	const zoomStr = params.get("zoom");

	if (latStr && lngStr) {
		const [lat, lng] = [Number.parseFloat(latStr), Number.parseFloat(lngStr)];
		const zoom = Number.parseFloat(zoomStr ?? "") || CLOSE_ZOOM_LEVEL;

		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			mapRef.value.flyToLocation(lat, lng, zoom);
		}
	}
};

const clearPendingPixels = () => {
	const pixelCount = pixels.value.length;
	pixels.value = [];
	for (let i = 0; i < pixelCount; i++) {
		incrementCharge();
	}

	mapRef.value?.cancelPaint();
};

const handleClosePaint = () => {
	clearPendingPixels();
	isPaintOpen.value = false;
	isEraserMode.value = false;
};

const handleSelectColor = (index: number, color: string) => {
	selectedColor.value = color;
	isEraserMode.value = false;
	localStorage["selected-color"] = `${index}`;
};

const handleSubmitPixels = async () => {
	if (pixels.value.length === 0) {
		return;
	}

	try {
		const paintPixels = pixels.value.map(({ tileCoords, color }) => ({ tileCoords, color }));
		await submitPixels(paintPixels);

		// Commit the painted pixels to our local state
		mapRef.value?.commitCanvases();
		commitPixels();

		// Reset state
		pixels.value = [];
		isPaintOpen.value = false;
		isEraserMode.value = false;
	} catch (error) {
		console.error("Failed to submit pixels:", error);
		handleError(error);
	}

	// Get new charges from server
	updateUserProfile();
};

const handleKeyDown = (event: KeyboardEvent) => {
	if (event.code === "KeyE") {
		// Toggle eraser
		isEraserMode.value = !isEraserMode.value;
	}
};

const erasePixelAtCoords = (tileCoords: TileCoords) => {
	const pixelId = getPixelId(tileCoords);
	const existingPixelIndex = pixels.value.findIndex(item => item.id === pixelId);

	if (existingPixelIndex !== -1) {
		pixels.value = pixels.value.filter((_, index) => index !== existingPixelIndex);
		incrementCharge();
		mapRef.value?.drawPixelOnCanvas(tileCoords, "rgba(0,0,0,0)");
	}
};

const drawPixelAtCoords = (tileCoords: TileCoords) => {
	if (!isPaintOpen.value) {
		return;
	}

	if (isEraserMode.value) {
		// Eraser mode
		erasePixelAtCoords(tileCoords);
	} else {
		// Paint mode
		if (currentCharges.value === null) {
			return;
		}

		if (currentCharges.value <= 0) {
			showToast({
				severity: "warn",
				summary: "Not enough charges"
			});
			return;
		}

		const pixelId = getPixelId(tileCoords);
		const existingPixelIndex = pixels.value.findIndex(item => item.id === pixelId);
		const newPixel: Pixel = {
			id: pixelId,
			tileCoords,
			color: selectedColor.value
		};

		if (existingPixelIndex === -1) {
			pixels.value.push(newPixel);
			decrementCharge();
		} else {
			pixels.value[existingPixelIndex] = newPixel;
		}
	}
};

const drawPixel = (coords: LngLat) => drawPixelAtCoords(lngLatToTileCoords(coords));

const handleDrawPixels = (coords: TileCoords[]) => {
	for (const coord of coords) {
		drawPixelAtCoords(coord);
	}
};

let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 300;

const handleMapClick = (event: LngLat) => {
	if (isPaintOpen.value) {
		drawPixel(event);
	} else {
		// Figure out if this is a double click
		const now = Date.now();
		lastClickTime = now;

		if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD && isPixelInfoOpen.value) {
			// Double-click to zoom - dismiss pixel info
			selectedPixelCoords.value = null;
			return;
		}

		if (mapRef.value?.getZoom() < ZOOM_LEVEL) {
			showToast({
				summary: "Zoom in to view pixels"
			});
			return;
		}

		// Show pixel info
		const tileCoords = lngLatToTileCoords(event);
		selectedPixelCoords.value = tileCoords;
		pushMapLocation(event);
	}
};

const handleMapRightClick = (event: LngLat) => {
	if (!isPaintOpen.value) {
		return;
	}

	// Right-click in paint mode to erase
	const tileCoords = lngLatToTileCoords(event);
	erasePixelAtCoords(tileCoords);
};

const toggleUserMenu = (event: Event) => {
	if (userMenuRef.value) {
		userMenuRef.value.toggle(event);
	}
};

const toggleSatellite = () => {
	isSatellite.value = !isSatellite.value;
};

const resetMapRotation = () => {
	if (mapRef.value) {
		mapRef.value.resetBearing();
	}
};

const handlePaintButtonClick = () => {
	isPaintOpen.value = true;
	pushMapLocation();
};

const handleLogIn = () => {
	logIn();
};

const handleLogOut = async () => {
	await logOut();
	location.reload();
};

const handleReportPixel = () => {
	showToast({
		summary: "Reporting is not yet available. Please use the old frontend to report."
	});
};

const handleFavoriteChanged = async () => {
	try {
		lastUserProfileFetch = Date.now();
		userProfile.value = await fetchUserProfile();
	} catch (error) {
		console.error("Failed to refresh user profile:", error);
		handleError(error);
	}
};

const handleFavoriteClick = (favorite: { id: number; name: string; latitude: number; longitude: number }) => {
	// Center on favorite
	const zoom = Math.max(mapRef.value.getZoom(), CLOSE_ZOOM_LEVEL);
	mapRef.value.flyToLocation(favorite.latitude, favorite.longitude, zoom);
	pushMapLocation([favorite.longitude, favorite.latitude], zoom);

	// Open pixel info
	const tileCoords = lngLatToTileCoords([favorite.longitude, favorite.latitude]);
	selectedPixelCoords.value = tileCoords;
};

const handleStoreRefresh = async () => {
	try {
		lastUserProfileFetch = Date.now();
		userProfile.value = await fetchUserProfile();
	} catch (error) {
		console.error("Failed to refresh user profile:", error);
		handleError(error);
	}
};

const zoomIn = () => mapRef.value?.zoomIn();
const zoomOut = () => mapRef.value?.zoomOut();

const goToRandom = async () => {
	// If already animating, jump instantly to the target
	if (isAnimatingToRandom.value && randomTargetCoords.value) {
		mapRef.value.jumpToLocation(
			randomTargetCoords.value.lat,
			randomTargetCoords.value.lng,
			randomTargetCoords.value.zoom
		);

		isAnimatingToRandom.value = false;
		randomTargetCoords.value = null;
		return;
	}

	isLoadingRandom.value = true;

	try {
		const config = useRuntimeConfig();
		const data = await $fetch<{
			pixel: { x: number; y: number };
			tile: { x: number; y: number };
		}>(`${config.public.backendUrl}/s0/tile/random`, {
			credentials: "include"
		});

		const tileCoords: TileCoords = {
			tile: [data.tile.x, data.tile.y],
			pixel: [data.pixel.x, data.pixel.y]
		};
		const [lng, lat] = tileCoordsToLngLat(tileCoords);

		randomTargetCoords.value = { lat, lng, zoom: CLOSE_ZOOM_LEVEL };
		isAnimatingToRandom.value = true;
		mapRef.value?.flyToLocation(lat, lng, CLOSE_ZOOM_LEVEL);
	} catch (error) {
		console.error("Failed to get random pixel:", error);
		handleError(error);
	}

	// To support skipping the animation by clicking the button again
	setTimeout(() => {
		isAnimatingToRandom.value = false;
		randomTargetCoords.value = null;
	}, 4000);

	isLoadingRandom.value = false;
};
</script>

<style scoped>
.app-container {
	width: 100vw;
	height: 100dvh;
	overflow: hidden;
}

.map-loading {
	width: 100vw;
	height: 100dvh;
}

.app-overlays {
	display: grid;
	grid-template-areas:
		"top-left . top-right"
		". . ."
		"paint paint paint";
	grid-template-rows: auto 1fr auto;
	grid-template-columns: auto 1fr auto;
	position: absolute;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100dvh;
	z-index: 10;
	pointer-events: none;
}

.app-overlays > * > * {
	pointer-events: auto;
}

.app-overlays-zoom {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.75rem;
	grid-area: top-left;
	padding: 1rem;
}

.app-overlays-profile {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	justify-content: flex-end;
	align-self: end;
	justify-self: end;
	gap: 0.75rem;
	grid-area: top-right;
	padding: 1rem;
}

.app-overlays-paint {
	grid-area: paint;
	align-self: end;
	justify-self: center;
	position: relative;
	z-index: 11;
	padding-bottom: 1rem;
}

.app-overlays-palette {
	grid-area: paint;
	align-self: end;
	justify-self: stretch;
	position: relative;
	z-index: 12;
}

.app-overlays-avatar-button {
	padding: 0;
	margin: 0;
	overflow: visible;
}
</style>
