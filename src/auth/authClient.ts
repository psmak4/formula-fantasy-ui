import { useEffect, useState } from "react";
import { clearAuthToken, getAuthToken, setAuthToken, subscribeToAuthToken } from "./tokenStore";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is not set");
}

type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | null;
};

type AuthSession = {
  session: {
    id?: string;
    expiresAt?: string;
    impersonatedBy?: string | null;
  } | null;
  user: AuthUser;
};

type AuthActionError = {
  message: string;
  status?: number;
  code?: string;
};

type AuthActionResult<T> = {
  data: T | null;
  error: AuthActionError | null;
};

type SessionHookResult = {
  data: AuthSession | null;
  isPending: boolean;
  error: AuthActionError | null;
};

type AuthResponseBody = {
  token?: string;
  bearerToken?: string;
  user?: AuthUser;
  session?: AuthSession["session"];
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

type AuthRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

class AuthClientError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
    this.code = code;
  }
}

let sessionSnapshot: AuthSession | null = null;
let sessionPending = getAuthToken().length > 0;
let sessionError: AuthActionError | null = null;
let pendingSessionPromise: Promise<AuthSession | null> | null = null;
const sessionListeners = new Set<() => void>();

function notifySessionListeners(): void {
  for (const listener of sessionListeners) {
    listener();
  }
}

function subscribeToSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function getSessionSnapshot(): SessionHookResult {
  return {
    data: sessionSnapshot,
    isPending: sessionPending,
    error: sessionError,
  };
}

function normalizeAuthError(error: unknown, fallback: string): AuthActionError {
  if (error instanceof AuthClientError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return { message };
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return { message: error.message };
  }

  return { message: fallback };
}

function setSessionState(nextSession: AuthSession | null, nextPending: boolean, nextError: AuthActionError | null): void {
  sessionSnapshot = nextSession;
  sessionPending = nextPending;
  sessionError = nextError;
  notifySessionListeners();
}

async function authRequest<T>(path: string, init: AuthRequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token.length > 0 && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}/api/auth${path}`, {
    ...init,
    headers,
    body: typeof init.body === "string" || init.body === undefined ? init.body : JSON.stringify(init.body),
  });

  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJson ? (await response.json()) as AuthResponseBody : null;

  if (!response.ok) {
    throw new AuthClientError(
      payload?.error?.message ?? payload?.message ?? `Authentication request failed: ${response.status} ${response.statusText}`,
      response.status,
      payload?.error?.code,
    );
  }

  return payload as T;
}

function toSession(value: AuthResponseBody | null): AuthSession | null {
  if (!value?.user) {
    return null;
  }

  return {
    session: value.session ?? null,
    user: value.user,
  };
}

async function refreshSession(options: { force?: boolean } = {}): Promise<AuthSession | null> {
  if (!options.force && pendingSessionPromise) {
    return pendingSessionPromise;
  }

  const token = getAuthToken();
  if (token.length === 0) {
    setSessionState(null, false, null);
    return null;
  }

  setSessionState(sessionSnapshot, true, null);

  pendingSessionPromise = authRequest<AuthResponseBody>("/get-session")
    .then((payload) => {
      const nextSession = toSession(payload);

      if (!nextSession) {
        clearAuthToken();
        setSessionState(null, false, null);
        return null;
      }

      setSessionState(nextSession, false, null);
      return nextSession;
    })
    .catch((error: unknown) => {
      const authError = normalizeAuthError(error, "Unable to load session.");
      const shouldClearAuth = authError.status === 401 || authError.status === 403;

      if (shouldClearAuth) {
        clearAuthToken();
        setSessionState(null, false, authError);
        return null;
      }

      setSessionState(sessionSnapshot, false, authError);
      return sessionSnapshot;
    })
    .finally(() => {
      pendingSessionPromise = null;
    });

  return pendingSessionPromise;
}

subscribeToAuthToken(() => {
  if (getAuthToken().length === 0) {
    setSessionState(null, false, null);
    return;
  }

  void refreshSession({ force: true });
});

async function runAuthAction(path: string, body: Record<string, unknown>): Promise<AuthActionResult<AuthResponseBody>> {
  try {
    const payload = await authRequest<AuthResponseBody>(path, {
      method: "POST",
      body,
    });

    const bearerToken = typeof payload.bearerToken === "string" && payload.bearerToken.length > 0
      ? payload.bearerToken
      : typeof payload.token === "string" && payload.token.length > 0
        ? payload.token
        : "";

    if (bearerToken.length > 0) {
      setAuthToken(bearerToken);
    } else {
      clearAuthToken();
    }

    const nextSession = toSession(payload);
    if (nextSession) {
      setSessionState(nextSession, false, null);
    } else if (getAuthToken().length > 0) {
      await refreshSession({ force: true });
    } else {
      setSessionState(null, false, null);
    }

    return {
      data: payload,
      error: null,
    };
  } catch (error: unknown) {
    return {
      data: null,
      error: normalizeAuthError(error, "Authentication request failed."),
    };
  }
}

export const authClient = {
  useSession(): SessionHookResult {
    const [snapshot, setSnapshot] = useState<SessionHookResult>(() => getSessionSnapshot());

    useEffect(() => subscribeToSession(() => setSnapshot(getSessionSnapshot())), []);
    useEffect(() => {
      if (getAuthToken().length > 0 && (sessionPending || !sessionSnapshot)) {
        void refreshSession();
      }
    }, []);

    return snapshot;
  },

  signUp: {
    email(input: { email: string; password: string; name: string }) {
      return runAuthAction("/sign-up/email", input);
    },
  },

  signIn: {
    email(input: { email: string; password: string }) {
      return runAuthAction("/sign-in/email", input);
    },
  },

  async signOut(): Promise<void> {
    try {
      await authRequest("/sign-out", { method: "POST" });
    } catch {
      // Clear local auth state even if the remote session is already gone.
    } finally {
      clearAuthToken();
      setSessionState(null, false, null);
    }
  },

  async getSession(): Promise<AuthSession | null> {
    return refreshSession({ force: true });
  },

  async $fetch(path: string, init: AuthRequestOptions = {}): Promise<unknown> {
    return authRequest(path, init);
  },
};
