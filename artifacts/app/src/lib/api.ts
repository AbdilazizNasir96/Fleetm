import { setAuthTokenGetter } from "@workspace/api-client-react";

let authToken: string | null = null;

if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('tnw_token');
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('tnw_token', token);
  } else {
    localStorage.removeItem('tnw_token');
  }
}

export function getAuthToken() {
  return authToken;
}

// Configure the generated API client to use our token
setAuthTokenGetter(() => getAuthToken());
