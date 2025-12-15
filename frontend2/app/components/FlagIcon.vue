<template>
	<IconWrapper class="flag-icon-wrapper">
		<svg :class="['flag-icon', useSvg ? 'flag-icon--svg' : null]" viewBox="0 0 36 36">
			<use
				v-if="useSvg"
				:href="`/flags/${code}.svg`"
			/>

			<text
				v-else
				x="50%"
				y="50%"
				dominant-baseline="central"
				text-anchor="middle"
				font-size="40"
			>
				{{ emoji }}
			</text>
		</svg>
	</IconWrapper>
</template>

<script setup lang="ts">
const props = defineProps<{
	code: string;
}>();

const useSvg = ref(false);

const emoji = computed(() => String.fromCodePoint(...[...props.code].map(c => 0x1_F1_E6 - 65 + (c.codePointAt(0) ?? 0))));

onMounted(() => {
	// Windows still doesn’t have flag emoji
	useSvg.value = navigator.userAgent.includes(" Windows NT ");
});
</script>

<style scoped>
.flag-icon-wrapper {
	overflow: hidden;
	aspect-ratio: 36 / 27;
}

.flag-icon-wrapper :deep(svg) {
	width: 1em;
	height: 1em;
}

.flag-icon--svg {
	filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.2)) drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.2));
}
</style>
