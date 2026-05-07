import { setAuthTokenGetter } from "@workspace/api-client-react";

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
