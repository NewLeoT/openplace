<template>
	<div
		v-if="isOpen"
		v-focustrap
		class="search-box"
	>
		<Card class="search-input-container">
			<template #content>
				<InputGroup class="search-input-group">
					<Button
						v-tooltip.bottom="'Close'"
						severity="secondary"
						text
						rounded
						@click="close"
					>
						<Icon name="back" />
					</Button>

					<InputText
						id="q"
						ref="inputRef"
						v-model="query"
						class="search-input-box"
						type="search"
						placeholder="Search for a location"
						@keydown="handleKeyDown"
						@input="handleInput"
					/>

					<Button
						v-tooltip.bottom="'Random location'"
						severity="secondary"
						text
						rounded
						@click="goToRandom"
					>
						<Icon name="random" />
					</Button>
				</InputGroup>
			</template>
		</Card>

		<Card
			v-if="results.length === 0"
			class="search-no-results"
		>
			<template #content>
				No results
			</template>
		</Card>

		<Menu
			v-else
			:model="results"
		>
			<template #item="{ item }">
				<button
					class="search-result"
					@click="selectResult(item as SearchResult)"
				>
					<div class="search-result-name">{{ item.name }}</div>
					<div class="search-result-country">{{ item.country }}</div>
			</button>
			</template>
		</Menu>
	</div>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import InputGroup from "primevue/inputgroup";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Menu from "primevue/menu";
import { useErrorToast } from "~/composables/useErrorToast";
import Icon from "~/components/Icon.vue";
import { DEFAULT_LOCATIONS } from "~/utils/default-locations";

interface AutocompleteResult {
	type: "Feature";
	geometry: {
		type: "Point";
		coordinates: [number, number];
	};
	properties: {
		id: number;
		name: string;
		label: string;
	};
	bbox: [number, number, number, number];
}

interface AutocompleteResults {
	type: "FeatureCollection";
	features: AutocompleteResult[];
}

interface SearchResult {
	name: string;
	country: string;
	bbox: [number, number, number, number];
}

const INPUT_DEBOUNCE_MS = 500;

defineProps<{
	isOpen: boolean;
}>();

const emit = defineEmits<{
	close: [];
	select: [bbox: [number, number, number, number]];
	goToRandom: [];
}>();

const DEFAULT_RESULTS = DEFAULT_LOCATIONS.map((item): SearchResult => ({
	name: item.name,
	country: item.country,
	bbox: [
		item.coords[1] - 0.05,
		item.coords[0] - 0.05,
		item.coords[1] + 0.05,
		item.coords[0] + 0.05
	]
}));

const inputRef = ref<InstanceType<typeof InputText>>();
const query = ref("");
const results = ref<SearchResult[]>(DEFAULT_RESULTS);

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

const { handleError } = useErrorToast();

const search = async () => {
	const text = query.value.trim();
	if (text === "") {
		results.value = DEFAULT_RESULTS;
		return;
	}

	try {
		const response = await $fetch<AutocompleteResults>("/v1/autocomplete", {
			query: { text }
		});
		results.value = response.features?.map(item => ({
			name: item.properties.name,
			country: item.properties.label.split(", ")
				.pop() ?? "",
			bbox: item.bbox
		})) ?? [];
	} catch (error) {
		handleError(error);
		results.value = [];
	}
};

const handleInput = () => {
	if (debounceTimeout) {
		clearTimeout(debounceTimeout);
	}

	if (query.value.trim() === "") {
		results.value = DEFAULT_RESULTS;
		return;
	}

	debounceTimeout = setTimeout(search, INPUT_DEBOUNCE_MS);
};

const selectResult = (result: SearchResult) => {
	emit("select", result.bbox);
	close();
};

const handleKeyDown = (e: KeyboardEvent) => {
	switch (e.key) {
	case "Escape":
		close();
		break;

	case "Enter":
		if (results.value.length > 0) {
			selectResult(results.value[0]!);
		}
		break;
	}
};

const close = () => {
	emit("close");
	query.value = "";
	results.value = DEFAULT_RESULTS;
};

const goToRandom = () => {
	emit("goToRandom");
	close();
};

const focusInput = async () => {
	await nextTick();

	const el = inputRef.value as unknown as { $el: HTMLInputElement } | undefined;
	el?.$el?.focus?.();
};

defineExpose({
	focusInput
});
</script>

<style scoped>
.search-box {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	padding-top: 1rem;
	margin-bottom: 1rem;
	overflow-y: auto;
}

@media (min-width: 768px) {
	.search-box {
		width: 350px;
	}
}

.search-input-container {
	border-radius: var(--p-inputgroup-addon-border-radius);
}

.search-input-container :deep(.p-card-body) {
	padding: 0;
}

.search-input-group {
	display: flex;
	width: 100%;
}

.search-input-box {
	flex: 1;
}

.search-no-results {
	text-align: center;
	padding: 2rem 0;
}

.search-result {
	display: block;
	width: 100%;
	padding: 0.5rem 1rem;
	border: 0;
	background: none;
	text-align: start;
}

.search-result-country {
	font-size: 0.9em;
}
</style>
