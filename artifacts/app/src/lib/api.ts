import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// Set API base URL - use environment variable for production, fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
setBaseUrl(API_BASE_URL);

let authToken: string | null = null;

if (typeof window !== "undefined") {
  authToken = localStorage.getItem("tnw_token");
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("tnw_token", token);
    } else {
      localStorage.removeItem("tnw_token");
    }
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

setAuthTokenGetter(() => authToken ?? null);
