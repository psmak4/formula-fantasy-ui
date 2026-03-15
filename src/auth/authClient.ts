import { createAuthClient } from "better-auth/react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is not set");
}

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`
});
