const AUTH_TOKEN_STORAGE_KEY = "ff_auth_token";

type Listener = () => void;

let authToken = readStoredToken();
const listeners = new Set<Listener>();

function readStoredToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "";
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getAuthToken(): string {
  return authToken;
}

export function setAuthToken(token: string): void {
  authToken = token.trim();

  if (typeof window !== "undefined") {
    if (authToken.length > 0) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }

  notifyListeners();
}

export function clearAuthToken(): void {
  setAuthToken("");
}

export function subscribeToAuthToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

