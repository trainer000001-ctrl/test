import { requestApiResponse } from "@moonwitness/contracts/sdk";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Session {
  identity: string;
  role: string;
  username?: string;
  id?: string | number;
}

export interface CurrentSessionState {
  readonly session: Session | null;
  readonly loading: boolean;
  readonly refresh: () => Promise<void>;
}

function buildAuthFetchInit(): RequestInit {
  return { credentials: "include" };
}

function parseSessionPayload(data: unknown): Session | null {
  const user: unknown = (data as { user?: unknown } | null)?.user;
  if (!user || typeof user !== "object") {
    return null;
  }
  const profile = user as {
    id?: unknown;
    displayName?: unknown;
    username?: unknown;
    role?: unknown;
  };
  return {
    identity: typeof profile.displayName === "string" ? profile.displayName : "Operator",
    role: typeof profile.role === "string" ? profile.role : "viewer",
    username: typeof profile.username === "string" ? profile.username : undefined,
    id: typeof profile.id === "string" || typeof profile.id === "number" ? profile.id : undefined,
  };
}

const SESSION_CACHE_TTL_MS = 5_000;

let inFlightSessionFetch: Promise<Session | null> | null = null;
let cachedSession: { value: Session | null; fetchedAt: number } | null = null;
let lastKnownSession: Session | null = null;

function isDevSessionFallbackEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const isDev = process.env.NODE_ENV === "development";
  const explicitBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";
  if (!isDev && !explicitBypass) {
    return false;
  }
  try {
    return window.localStorage.getItem("mw_dev_user") !== "0";
  } catch {
    return true;
  }
}

const DEV_OPERATOR_SESSION: Session = {
  identity: "Dev Operator",
  role: "admin",
  username: "dev",
  id: "dev-local",
};

function resolveFallbackSession(): Session | null {
  return isDevSessionFallbackEnabled() ? DEV_OPERATOR_SESSION : null;
}

async function fetchCurrentSession(forceRefresh = false): Promise<Session | null> {
  const canUseCache = process.env.NODE_ENV !== "test";
  if (
    !forceRefresh &&
    canUseCache &&
    cachedSession &&
    Date.now() - cachedSession.fetchedAt < SESSION_CACHE_TTL_MS
  ) {
    return cachedSession.value;
  }

  if (!forceRefresh && inFlightSessionFetch) {
    return inFlightSessionFetch;
  }

  const requestPromise = (async (): Promise<Session | null> => {
    try {
      const response = await requestApiResponse("/api/v1/auth/me", buildAuthFetchInit());
      if (!response.ok) {
        if (response.status === 429 || response.status === 503) {
          const preserved = lastKnownSession ?? resolveFallbackSession();
          if (canUseCache) {
            cachedSession = { value: preserved, fetchedAt: Date.now() };
          }
          return preserved;
        }
        lastKnownSession = null;
        const fallback = resolveFallbackSession();
        if (canUseCache) {
          cachedSession = { value: fallback, fetchedAt: Date.now() };
        }
        return fallback;
      }
      const data = (await response.json()) as { authenticated?: boolean; user?: unknown };
      const parsed = parseSessionPayload(data);
      if (parsed) {
        lastKnownSession = parsed;
        if (canUseCache) {
          cachedSession = { value: parsed, fetchedAt: Date.now() };
        }
        return parsed;
      }
      lastKnownSession = null;
      const fallback = data?.authenticated === false ? null : resolveFallbackSession();
      if (canUseCache) {
        cachedSession = { value: fallback, fetchedAt: Date.now() };
      }
      return fallback;
    } catch {
      return lastKnownSession ?? resolveFallbackSession();
    }
  })().finally(() => {
    if (inFlightSessionFetch === requestPromise) {
      inFlightSessionFetch = null;
    }
  });

  inFlightSessionFetch = requestPromise;
  return requestPromise;
}

/**
 * Hook: current session state with loading flag and manual refresh,
 * synchronized via `mw:session-change` window events.
 */
export function useCurrentSessionState(): CurrentSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    if (mountedRef.current) {
      setLoading(true);
    }
    const nextSession = await fetchCurrentSession(true);
    if (!mountedRef.current || seq !== requestSeqRef.current) {
      return;
    }
    setSession(nextSession);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    const loadSession = () => {
      const seq = ++requestSeqRef.current;
      void fetchCurrentSession().then((nextSession) => {
        if (!active || !mountedRef.current || seq !== requestSeqRef.current) {
          return;
        }
        setSession(nextSession);
        setLoading(false);
      });
    };

    loadSession();

    const onSessionChange = () => {
      loadSession();
    };

    window.addEventListener("mw:session-change", onSessionChange);
    return () => {
      active = false;
      mountedRef.current = false;
      requestSeqRef.current += 1;
      window.removeEventListener("mw:session-change", onSessionChange);
    };
  }, []);

  return { session, loading, refresh };
}

/**
 * Hook: current identity from server-side session
 */
export function useCurrentIdentity(): Session | null {
  return useCurrentSessionState().session;
}

/**
 * Call after login/logout to notify same-tab listeners.
 */
export function notifySessionChange() {
  cachedSession = null;
  inFlightSessionFetch = null;
  lastKnownSession = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mw:session-change"));
  }
}

export function markExplicitLogout() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("mw_dev_user", "0");
    } catch {
      // ignore storage errors
    }
  }
  notifySessionChange();
}

export function clearExplicitLogout() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("mw_dev_user");
    } catch {
      // ignore storage errors
    }
  }
  notifySessionChange();
}
