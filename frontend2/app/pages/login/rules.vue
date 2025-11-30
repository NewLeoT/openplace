<template>
	<form class="form" @submit="submit">
		<h2 class="head">First, let's go over some rules..</h2>
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
			<Button asChild v-slot="slotProps" severity="primary" type="submit" :disabled="loading">
				<RouterLink to="/login/register" :class="slotProps.class" :style="{ 'text-decoration': 'none' }">Continue</RouterLink>
			</Button>
		</div>
	</form>
</template>

<script setup lang="ts">
import { register } from "module";
import Button from "primevue/button";
import Message from "primevue/message";
import { useErrorToast } from "~/composables/useErrorToast";

const { getErrorMessage } = useErrorToast();

definePageMeta({
	layout: "auth"
});

const route = useRoute();

const loading = ref(false);
const username = ref("");
const success = ref(false);
const errorMessage = ref<string | null>(null);
const loginURL = ref("/login");

onMounted(() => {
	const returnTo = route.query.r as string;
	if (returnTo) {
		const params = new URLSearchParams([["r", returnTo]]);
		loginURL.value = `/login?${params.toString()}`;
	}
});

const submit = async (e: Event) => {
	e.preventDefault();
	loading.value = true;
	success.value = false;
	errorMessage.value = null;

	try {
		const config = useRuntimeConfig();
		await $fetch(`${config.public.backendUrl}/auth/request-password-reset`, {
			method: "POST",
			credentials: "include",
			body: {
				username: username.value
			}
		});

		success.value = true;
	} catch (error: unknown) {
		errorMessage.value = getErrorMessage(error);
	}

	loading.value = false;
};
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
