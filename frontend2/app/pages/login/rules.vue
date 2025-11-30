<template>
	<div class="form">
		<h2 class="head">First, let’s go over some rules..</h2>
		<p>These rules are to ensure you have a safe and enjoyable experience on openplace.</p>

		<div class="section">
			<p v-if="rules === null">
				Loading…
			</p>

			<ul v-else>
				<li v-if="rules.isMultiAccountAllowed">You may create more than one account.</li>
				<li v-else>Do not create more than one account. If multiple accounts are detected, all accounts will be
					banned.</li>

				<li v-if="rules.isOffensiveContentAllowed">You may draw content that is likely to offend others.</li>
				<li v-else>Do not draw offensive content.</li>

				<li v-if="rules.isExplicitContentAllowed">You may draw explicit or suggestive content.</li>
				<li v-else>Do not draw content that is explicit or suggestive.</li>

				<li v-if="rules.isGriefingAllowed">You may draw over existing artwork to obscure it (griefing).</li>
				<li v-else>Do not draw over existing artwork to obscure it (griefing).</li>

				<li v-if="rules.isKindGriefingAllowed">You may draw over existing artwork if you are complementing it.
				</li>
				<li v-else>Do not modify existing artwork, even to improve it.</li>

				<li v-if="rules.isBottingAllowed">You may use bots to automate drawing on this instance.</li>
				<li v-else>Use of bots or any other automation is not allowed on this instance.</li>

				<li>Do not create excessive traffic that may affect other people’s experience on this instance.</li>
			</ul>

			<p v-if="rules?.extraRules">{{ rules?.extraRules }}</p>
		</div>

		<div class="buttons-container">
			<Button
				v-slot="slotProps"
				as-child
				severity="primary"
				type="submit"
				:disabled="loading"
			>
				<RouterLink
					:to="registerURL"
					:class="slotProps.class"
					:style="{ 'text-decoration': 'none' }"
				>
					Continue
				</RouterLink>
			</Button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Button from "primevue/button";

definePageMeta({
	layout: "auth"
});

const route = useRoute();

const loading = ref(false);
const registerURL = ref("/login/register");

onMounted(() => {
	const returnTo = route.query.r as string;
	if (returnTo) {
		const params = new URLSearchParams([["r", returnTo]]);
		registerURL.value = `/login/register?${params.toString()}`;
	}
});

interface Rules {
	isMultiAccountAllowed: boolean;
	isOffensiveContentAllowed: boolean;
	isExplicitContentAllowed: boolean;
	isGriefingAllowed: boolean;
	isKindGriefingAllowed: boolean;
	isBottingAllowed: boolean;
	extraRules?: string;
}

const rules = ref<Rules | null>(null);
const config = useRuntimeConfig();
rules.value = await $fetch(`${config.public.backendUrl}/checkrobots`);
</script>

<style scoped>
/* */
</style>
