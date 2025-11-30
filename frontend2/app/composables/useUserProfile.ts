export interface UserProfile {
	id: number;
	name: string;
	discord: string | null;
	discordUserId: string | null;
	country: number;
	banned: boolean;
	verified: boolean;
	suspensionReason: string | null;
	timeoutUntil: string;
	charges: {
		cooldownMs: number;
		count: number;
		max: number;
		boost: string | null;
	};
	droplets: number;
	equippedFlag: number | null;
	extraColorsBitmap: number | null;
	favoriteLocations: {
		id: number;
		name: string;
		latitude: number;
		longitude: number;
	}[];
	flagsBitmap: string;
	role: string;
	isCustomer: boolean;
	level: number;
	needsPhoneVerification: boolean;
	picture: string;
	pixelsPainted: number;
	showLastPixel: boolean;
	allianceId: number | null;
	allianceRole: string | null;
}

export const useUserProfile = () => {
	const config = useRuntimeConfig();
	const baseURL = config.public.backendUrl;

	const fetchUserProfile = async (): Promise<UserProfile | null> => {
		try {
			return await $fetch(`${baseURL}/me`, {
				credentials: "include",
				headers: {
					"Content-Type": "application/json"
				}
			});
		} catch (error: unknown) {
			const httpError = error as { statusCode?: number };
			if (httpError.statusCode === 401) {
				// Logged out
				return null;
			}

			throw error;
		}
	};

	const logOut = async (): Promise<void> => {
		return await $fetch(`${baseURL}/logout`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			}
		});
	};

	const logIn = () => {
		const params = new URLSearchParams();
		if (location.href !== "/") {
			params.set("r", location.href);
		}
		location.href = `/login?${params.toString()}`;
	};

	return {
		fetchUserProfile,
		logOut,
		logIn
	};
};
