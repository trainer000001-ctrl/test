import {
  beginBrowserPkceRedirect,
  buildOidcSessionFromTokens,
  consumeStoredPkceEnvelope,
  createCallbackDeduplicator,
  createPkceAuthorizationRequest,
  dispatchBrowserAuthEvent,
  exchangeAuthorizationCode,
  extractOAuthCallbackParams,
  normalizeIssuerUrl,
  readBrowserStorage,
  refreshAccessTokens,
  removeBrowserStorage,
  resolveBrowserOriginCallbackUrl,
  revokeOAuthToken,
  writeBrowserStorage,
  DEFAULT_MID_ISSUER_URL,
  type MidUserInfo,
} from "@moonwitness/core";
import { call, isDesktop } from "./api";

export const ROCKSOUL_MID_CLIENT_ID = "rocksoul-dx";
export const ROCKSOUL_MID_SESSION_KEY = "mw_rocksoul_oidc_session";
export const ROCKSOUL_MID_PKCE_KEY = "mw_rocksoul_oidc_pkce";
export const ROCKSOUL_MID_AUTH_EVENT = "rocksoul-mid-auth-change";

const DEFAULT_SCOPE = "openid profile email offline_access";
const REFRESH_LEEWAY_SECONDS = 30;

export interface RocksoulOidcSession {
  readonly issuerUrl: string;
  readonly clientId: string;
  readonly accessToken: string;
  readonly idToken: string;
  readonly refreshToken?: string;
  readonly scope?: string;
  readonly expiresAtEpochSec: number;
  readonly user: MidUserInfo;
}

export interface RocksoulOidcOptions {
  readonly issuerUrl?: string | undefined;
  readonly clientId?: string | undefined;
  readonly scope?: string | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly nowEpochSec?: (() => number) | undefined;
  readonly navigateFn?: ((url: string) => void) | undefined;
  readonly returnHash?: string | undefined;
}

const dedupeCallback = createCallbackDeduplicator<{
  readonly session: RocksoulOidcSession;
  readonly returnHash: string;
}>();

function currentEpochSeconds(nowEpochSec?: () => number): number {
  return (nowEpochSec ?? (() => Math.floor(Date.now() / 1000)))();
}

function normalizeReturnHash(hash?: string): string {
  const candidate = (hash ?? "").trim();
  return candidate.startsWith("#/") ? candidate : "#/deck";
}

/** Resolve configured MoonWitness ID issuer URL for ROCKSOUL - DX. */
export function resolveRocksoulMidIssuer(issuerUrl?: string): string {
  const envIssuer = (import.meta as { env?: Record<string, string | undefined> }).env?.[
    "VITE_MID_ISSUER_URL"
  ];
  return normalizeIssuerUrl(issuerUrl ?? envIssuer ?? DEFAULT_MID_ISSUER_URL);
}

/** Resolve browser OAuth callback URI on the active web origin. */
export function getBrowserCallbackUrl(): string {
  return resolveBrowserOriginCallbackUrl("/auth/callback");
}

/** Save an active MoonWitness ID session to localStorage and notify listeners. */
export function persistRocksoulOidcSession(session: RocksoulOidcSession): void {
  writeBrowserStorage("localStorage", ROCKSOUL_MID_SESSION_KEY, JSON.stringify(session));
  dispatchBrowserAuthEvent(ROCKSOUL_MID_AUTH_EVENT);
}

/** Clear local MoonWitness ID session and PKCE state without revoking remotely. */
export function clearStoredRocksoulOidcSession(): void {
  removeBrowserStorage("localStorage", ROCKSOUL_MID_SESSION_KEY);
  removeBrowserStorage("sessionStorage", ROCKSOUL_MID_PKCE_KEY);
  dispatchBrowserAuthEvent(ROCKSOUL_MID_AUTH_EVENT);
}

/** Load persisted MoonWitness ID session from localStorage if valid or refreshable. */
export function getStoredRocksoulOidcSession(
  nowEpochSec?: () => number,
): RocksoulOidcSession | null {
  const raw = readBrowserStorage("localStorage", ROCKSOUL_MID_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RocksoulOidcSession>;
    if (
      !parsed.accessToken ||
      !parsed.idToken ||
      !parsed.issuerUrl ||
      !parsed.clientId ||
      typeof parsed.expiresAtEpochSec !== "number" ||
      !Number.isFinite(parsed.expiresAtEpochSec) ||
      !parsed.user?.sub ||
      !parsed.user?.preferred_username
    ) {
      return null;
    }
    if (parsed.expiresAtEpochSec <= currentEpochSeconds(nowEpochSec) && !parsed.refreshToken) {
      removeBrowserStorage("localStorage", ROCKSOUL_MID_SESSION_KEY);
      return null;
    }
    return parsed as RocksoulOidcSession;
  } catch {
    return null;
  }
}

/**
 * Start OAuth 2.1 + PKCE sign-in against MoonWitness ID.
 * Uses Tauri's native loopback listener when running in desktop mode,
 * or redirects the browser to `/auth/callback` in web mode.
 */
export async function signInWithMoonWitnessId(
  options?: RocksoulOidcOptions,
): Promise<RocksoulOidcSession | null> {
  const issuerUrl = resolveRocksoulMidIssuer(options?.issuerUrl);
  const clientId = options?.clientId?.trim() || ROCKSOUL_MID_CLIENT_ID;
  const scope = options?.scope?.trim() || DEFAULT_SCOPE;

  if (isDesktop()) {
    const pkce = await createPkceAuthorizationRequest({
      issuerUrl,
      clientId,
      redirectUri: "http://127.0.0.1/callback",
      scope,
    });
    const callback = await call("await_mid_loopback_callback", {
      authorizeUrl: pkce.authorizeUrl,
    });
    if (callback.state !== pkce.state) {
      throw new Error("OAuth state mismatch received on loopback callback.");
    }
    const tokens = await exchangeAuthorizationCode({
      issuerUrl,
      clientId,
      code: callback.code,
      redirectUri: callback.redirect_uri,
      codeVerifier: pkce.verifier,
      ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
    });
    const session = await buildOidcSessionFromTokens({
      issuerUrl,
      clientId,
      tokens,
      expectedNonce: pkce.nonce,
      ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
      nowEpochSec: currentEpochSeconds(options?.nowEpochSec),
    });
    persistRocksoulOidcSession(session);
    return session;
  }

  await beginBrowserPkceRedirect({
    issuerUrl,
    clientId,
    redirectUri: getBrowserCallbackUrl(),
    storageKey: ROCKSOUL_MID_PKCE_KEY,
    scope,
    extraState: {
      returnHash: normalizeReturnHash(
        options?.returnHash ?? (typeof window !== "undefined" ? window.location.hash : undefined),
      ),
    },
    ...(options?.navigateFn ? { navigateFn: options.navigateFn } : {}),
  });
  return null;
}

/** Complete browser `/auth/callback` OAuth 2.1 PKCE code exchange and persist session. */
export async function completeBrowserOidcCallback(
  searchParams: URLSearchParams,
  options?: RocksoulOidcOptions,
): Promise<{ readonly session: RocksoulOidcSession; readonly returnHash: string }> {
  const { code, state } = extractOAuthCallbackParams(searchParams, {
    onError: () => removeBrowserStorage("sessionStorage", ROCKSOUL_MID_PKCE_KEY),
  });

  return dedupeCallback(`${code}:${state}`, async () => {
    const pending = consumeStoredPkceEnvelope(ROCKSOUL_MID_PKCE_KEY, state, {
      expired: "PKCE sign-in state expired. Start MoonWitness ID sign-in again.",
    });
    if (!pending.redirectUri || !pending.issuerUrl || !pending.clientId) {
      throw new Error("Stored PKCE sign-in state is malformed.");
    }

    const tokens = await exchangeAuthorizationCode({
      issuerUrl: pending.issuerUrl,
      clientId: pending.clientId,
      code,
      redirectUri: pending.redirectUri,
      codeVerifier: pending.verifier,
      ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
    });
    const session = await buildOidcSessionFromTokens({
      issuerUrl: pending.issuerUrl,
      clientId: pending.clientId,
      tokens,
      expectedNonce: pending.nonce,
      ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
      nowEpochSec: currentEpochSeconds(options?.nowEpochSec),
    });
    persistRocksoulOidcSession(session);
    return {
      session,
      returnHash: normalizeReturnHash(typeof pending.returnHash === "string" ? pending.returnHash : undefined),
    };
  });
}

/** Rotate an active `offline_access` refresh token and persist updated session. */
export async function refreshRocksoulOidcSession(
  options?: RocksoulOidcOptions,
): Promise<RocksoulOidcSession> {
  const current = getStoredRocksoulOidcSession(options?.nowEpochSec);
  if (!current?.refreshToken) {
    throw new Error("No refreshable MoonWitness ID session is stored.");
  }
  const tokens = await refreshAccessTokens({
    issuerUrl: current.issuerUrl,
    clientId: current.clientId,
    refreshToken: current.refreshToken,
    ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
  });
  const next = await buildOidcSessionFromTokens({
    issuerUrl: current.issuerUrl,
    clientId: current.clientId,
    tokens,
    fallbackUser: current.user,
    ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
    nowEpochSec: currentEpochSeconds(options?.nowEpochSec),
  });
  persistRocksoulOidcSession(next);
  return next;
}

/** Return an unexpired MoonWitness ID session, rotating via refresh token if near expiry. */
export async function resolveValidRocksoulOidcSession(
  options?: RocksoulOidcOptions,
): Promise<RocksoulOidcSession | null> {
  const current = getStoredRocksoulOidcSession(options?.nowEpochSec);
  if (!current) return null;
  const now = currentEpochSeconds(options?.nowEpochSec);
  if (current.expiresAtEpochSec - REFRESH_LEEWAY_SECONDS > now) {
    return current;
  }
  if (!current.refreshToken) {
    clearStoredRocksoulOidcSession();
    return null;
  }
  try {
    return await refreshRocksoulOidcSession(options);
  } catch {
    clearStoredRocksoulOidcSession();
    return null;
  }
}

/** Clear local MoonWitness ID session and revoke active token best-effort. */
export async function signOutRocksoulOidc(options?: RocksoulOidcOptions): Promise<void> {
  const current = getStoredRocksoulOidcSession(options?.nowEpochSec);
  clearStoredRocksoulOidcSession();
  const tokenToRevoke = current?.refreshToken ?? current?.accessToken;
  if (!current || !tokenToRevoke) return;
  await revokeOAuthToken({
    issuerUrl: current.issuerUrl,
    clientId: current.clientId,
    token: tokenToRevoke,
    tokenTypeHint: current.refreshToken ? "refresh_token" : "access_token",
    ...(options?.fetchFn ? { fetchFn: options.fetchFn } : {}),
  }).catch(() => {});
}
