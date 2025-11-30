<template>
	<div>
		<canvas ref="bgCanvas" class="bg-canvas" />

		<div class="root">
			<Card class="root-card">
				<template #header>
					<a
						:href="returnTo ?? '/'"
						class="about-logo">
						<img
							src="/img/logo-512x512.png"
							alt=""
							width="64"
							height="64"
						>
						<span>openplace</span>
					</a>
				</template>

				<template #content>
					<slot />
				</template>
			</Card>
		</div>
	</div>
</template>

<script setup lang="ts">
import "~/assets/common.scss";
import Card from "primevue/card";
import { palette } from "~/utils/palette";

const route = useRoute();

const bgCanvas = ref<HTMLCanvasElement | null>(null);
const returnTo = ref<string | null>(null);

let lastReset = 0;
let resetTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
	console.log(route);
	returnTo.value = route.query.r as string;

	resetCanvas();
	window.addEventListener("resize", resetCanvas);
});

onUnmounted(() => {
	window.removeEventListener("resize", resetCanvas);
});

const resetCanvas = () => {
	if (!bgCanvas.value) {
		return;
	}

	if (resetTimer) {
		clearTimeout(resetTimer);
	}

	if (lastReset + 100 > Date.now()) {
		resetTimer = setTimeout(resetCanvas, 100);
		return;
	}

	lastReset = Date.now();

	const ctx = bgCanvas.value.getContext("2d");
	if (!ctx) {
		return;
	}

	const width = bgCanvas.value.clientWidth / 10;
	const height = Math.floor((bgCanvas.value.clientHeight * width) / bgCanvas.value.clientWidth);
	bgCanvas.value.width = width;
	bgCanvas.value.height = height;

	for (let i = 0; i < width; i++) {
		for (let j = 0; j < height; j++) {
			const color = palette[Math.floor(Math.random() * palette.length)]!;
			ctx.fillStyle = `rgba(${color.rgba.join(",")})`;
			ctx.fillRect(i, j, 1, 1);
		}
	}

	if (tickTimer) {
		clearTimeout(tickTimer);
	}

	tickTimer = setTimeout(canvasTick, 200);
};

const canvasTick = () => {
	if (!bgCanvas.value) {
		return;
	}

	const ctx = bgCanvas.value.getContext("2d");
	if (!ctx) {
		return;
	}

	const width = bgCanvas.value.width;
	const height = bgCanvas.value.height;

	for (let i = 0; i < 20; i++) {
		const x = Math.floor(Math.random() * width);
		const y = Math.floor(Math.random() * height);
		const color = palette[Math.floor(Math.random() * palette.length)]!;
		ctx.fillStyle = `rgba(${color.rgba.join(",")})`;
		ctx.fillRect(x, y, 1, 1);
	}

	tickTimer = setTimeout(canvasTick, 100);
};
</script>

<style scoped>
.bg-canvas {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	z-index: 1;
	opacity: 0.25;
	image-rendering: pixelated;
	user-select: none;
	pointer-events: none;
}

.root {
	display: flex;
	position: relative;
	z-index: 2;
	min-height: 100svh;
	padding: 50px 1rem;
}

.root-card {
	width: 100%;
	max-width: 400px;
	margin: auto;
	box-shadow: 0 20px 50px rgba(0,0,0,0.1);
}

.about-logo {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	margin: 2rem 0 1.25rem 0;
	font: 400 2.25rem/1 "Pixelify Sans Variable", var(--bs-body-font-family);
	color: inherit;
	text-decoration: none;
}

@media (min-width: 375px) {
	.about-logo {
		font-size: 2.5rem;
	}
}

@media (min-width: 390px) {
	.about-logo {
		font-size: 3rem;
	}
}

@media (min-width: 500px) {
	.about-logo {
		font-size: 2.75rem;
	}
}

.about-logo img {
	width: auto;
	height: 1.15em;
}

:deep(.form) {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

:deep(.head) {
	margin-bottom: 1.5rem;
	text-align: center;
	font-size: 1.75rem;
	font-weight: 600;
}

:deep(.agreement),
:deep(.reset-link) {
	font-size: 0.9rem;
}

:deep(.buttons-container) {
	display: flex;
	flex-direction: row;
	justify-content: stretch;
	gap: 1rem;
	width: 100%;
}

:deep(.buttons-container > *) {
	width: 100%;
}
</style>
