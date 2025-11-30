<template>
	<form
		class="form"
		@submit="submit"
	>
		<h2 class="head">Reset Password</h2>
		<p>If you have a Discord account linked, you can reset your password here.</p>

		<InputText
			v-model="username"
			placeholder="Username"
			aria-label="Username"
			required
			autofocus
			:disabled="loading"
		/>

		<Message
			v-if="success"
			severity="success"
		>
			If your account has Discord linked, you will receive a password reset link via DM. If you don’t receive a DM, check whether your Discord account is configured to allow DMs from our server.
		</Message>

		<Message
			v-if="errorMessage"
			severity="error"
		>
			{{ errorMessage }}
		</Message>

		<div class="buttons-container">
			<Button
				severity="primary"
				type="submit"
				:disabled="loading"
			>
				Reset Password
			</Button>
		</div>

		<div class="reset-link">
			<RouterLink :to="loginURL">
				Back
			</RouterLink>
		</div>
	</form>
</template>

<script setup lang="ts">
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
</script>

<style scoped>
/* */
</style>
