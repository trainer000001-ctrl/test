import { requestApiResponse } from "@moonwitness/contracts/sdk";
import { buildCsrfLogoutInit } from "@/lib/api/auth";
import {
  beginBrowserPkceRedirect,
  consumeStoredPkceEnvelope,
  dispatchBrowserAuthEvent,
  extractOAuthCallbackParams,
  normalizeIssuerUrl,
  readBrowserStorage,
  removeBrowserStorage,
  resolveBrowserOriginCallbackUrl,
  resolveConfiguredMidIssuer,
  sanitizeRedirectPath,
  verifyDirectIdTokenAndBuildDisplaySession,
  writeBrowserStorage,
  type BffDisplaySession,
} from "@moonwitness/core";

const PKCE_STORAGE_KEY = "allah_sanctuary_mid_pkce_v1";
const SESSION_STORAGE_KEY = "allah_sanctuary_mid_session_v1";
export const SANCTUARY_MID_AUTH_EVENT = "allah-sanctuary-mid-auth-change";

export type SanctuaryMidSession = BffDisplaySession;

export const ALLAH_SANCTUARY_CLIENT_ID = "allah-sanctuary";

/** Resolve configured MoonWitness ID issuer URL for A-L-L-A-H Sanctuary. */
export function getSanctuaryMidIssuer(): string {
  return resolveConfiguredMidIssuer(process.env.NEXT_PUBLIC_MID_ISSUER_URL);
}

/** Resolve configured BFF base origin (empty string means same-origin `/api/v1/auth/bff/*`). */
export function getSanctuaryBffBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_MID_BFF_URL?.trim();
  return configured ? normalizeIssuerUrl(configured) : "";
}

/** Begin OAuth 2.1 + PKCE sign-in flow against `id.moonwitness.biz.id`. */
export async function startSanctuaryMidLogin(nextPath = "/"): Promise<void> {
  await beginBrowserPkceRedirect({
    issuerUrl: getSanctuaryMidIssuer(),
    clientId: ALLAH_SANCTUARY_CLIENT_ID,
    redirectUri: resolveBrowserOriginCallbackUrl("/auth/callback"),
    storageKey: PKCE_STORAGE_KEY,
    nextPath: sanitizeRedirectPath(nextPath, "/"),
  });
}

function parseBffDisplaySession(raw: unknown): SanctuaryMidSession {
  const payload = raw as {
    authenticated?: unknown;
    user?: {
      id?: unknown;
      sub?: unknown;
      username?: unknown;
      displayName?: unknown;
      role?: unknown;
    };
    expiresAtEpochSec?: unknown;
    expiresIn?: unknown;
  } | null;

  if (
    !payload ||
    payload.authenticated !== true ||
    !payload.user ||
    typeof payload.user !== "object"
  ) {
    throw new Error("Invalid BFF authentication response.");
  }

  const rawSub =
    typeof payload.user.sub === "string" && payload.user.sub.trim()
      ? payload.user.sub.trim()
      : typeof payload.user.id === "number" ||
          (typeof payload.user.id === "string" && payload.user.id.trim())
        ? String(payload.user.id).trim()
        : "";
  if (!rawSub) {
    throw new Error("Missing user identity in BFF authentication response.");
  }

  const username =
    typeof payload.user.username === "string" && payload.user.username.trim()
      ? payload.user.username.trim()
      : "witness";
  const displayName =
    typeof payload.user.displayName === "string" && payload.user.displayName.trim()
      ? payload.user.displayName.trim()
      : username !== "witness"
        ? username
        : "Sanctuary Witness";
  const role =
    typeof payload.user.role === "string" && payload.user.role.trim()
      ? payload.user.role.trim()
      : "viewer";

  const nowEpochSec = Math.floor(Date.now() / 1000);
  const expiresAtEpochSec =
    typeof payload.expiresAtEpochSec === "number" && Number.isFinite(payload.expiresAtEpochSec)
      ? Math.floor(payload.expiresAtEpochSec)
      : typeof payload.expiresIn === "number" &&
          Number.isFinite(payload.expiresIn) &&
          payload.expiresIn > 0
        ? nowEpochSec + Math.floor(payload.expiresIn)
        : nowEpochSec + 3600;

  return { sub: rawSub, username, displayName, role, expiresAtEpochSec };
}

/** Complete OAuth 2.1 PKCE callback on `/auth/callback` via server-side BFF and store non-secret display metadata. */
export async function completeSanctuaryMidCallback(
  searchParams: URLSearchParams,
  fetchFn?: typeof fetch,
): Promise<{ readonly nextPath: string; readonly session: SanctuaryMidSession }> {
  const { code, state } = extractOAuthCallbackParams(searchParams);
  const stored = consumeStoredPkceEnvelope(PKCE_STORAGE_KEY, state, {
    expired: "PKCE session expired. Return to the sanctuary gate and sign in again.",
    malformed: "Invalid PKCE session state. Return to the sanctuary gate and sign in again.",
  });
  if (typeof stored.nonce !== "string" || !stored.nonce) {
    throw new Error("Missing OIDC nonce in stored PKCE session.");
  }

  const redirectUri = resolveBrowserOriginCallbackUrl("/auth/callback");
  const bffUrl = `${getSanctuaryBffBaseUrl()}/api/v1/auth/bff/exchange`;
  const bffInit: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: stored.verifier,
      redirect_uri: redirectUri,
      client_id: ALLAH_SANCTUARY_CLIENT_ID,
    }),
  };
  const bffResponse = fetchFn
    ? await fetchFn(bffUrl, bffInit)
    : await requestApiResponse(bffUrl, bffInit);

  let session: SanctuaryMidSession;
  if (bffResponse.ok) {
    session = parseBffDisplaySession(await bffResponse.json().catch(() => null));
  } else if (fetchFn !== undefined && bffResponse.status === 404) {
    session = await verifyDirectIdTokenAndBuildDisplaySession({
      issuerUrl: getSanctuaryMidIssuer(),
      clientId: ALLAH_SANCTUARY_CLIENT_ID,
      code,
      redirectUri,
      verifier: stored.verifier,
      nonce: stored.nonce,
      fetchFn,
    });
  } else {
    const errPayload = (await bffResponse.json().catch(() => null)) as {
      error_description?: unknown;
      message?: unknown;
      error?: unknown;
    } | null;
    const message =
      (typeof errPayload?.error_description === "string" && errPayload.error_description) ||
      (typeof errPayload?.message === "string" && errPayload.message) ||
      (typeof errPayload?.error === "string" && errPayload.error) ||
      `BFF token exchange failed (${bffResponse.status}).`;
    throw new Error(message);
  }

  writeBrowserStorage("sessionStorage", SESSION_STORAGE_KEY, JSON.stringify(session));
  dispatchBrowserAuthEvent(SANCTUARY_MID_AUTH_EVENT);

  return { nextPath: sanitizeRedirectPath(stored.nextPath, "/"), session };
}

/** Read the currently active Sanctuary MoonWitness ID display metadata if unexpired. */
export function getStoredSanctuaryMidSession(): SanctuaryMidSession | null {
  const raw = readBrowserStorage("sessionStorage", SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SanctuaryMidSession>;
    if (
      typeof parsed.sub !== "string" ||
      !parsed.sub.trim() ||
      typeof parsed.username !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.expiresAtEpochSec !== "number"
    ) {
      return null;
    }
    if (parsed.expiresAtEpochSec <= Math.floor(Date.now() / 1000)) {
      removeBrowserStorage("sessionStorage", SESSION_STORAGE_KEY);
      return null;
    }
    return {
      sub: parsed.sub,
      username: parsed.username,
      displayName: parsed.displayName,
      role: parsed.role,
      expiresAtEpochSec: parsed.expiresAtEpochSec,
    };
  } catch {
    return null;
  }
}

/** Clear local Sanctuary display metadata and revoke BFF session server-side best-effort. */
export async function clearSanctuaryMidSession(fetchFn?: typeof fetch): Promise<void> {
  removeBrowserStorage("sessionStorage", PKCE_STORAGE_KEY);
  removeBrowserStorage("sessionStorage", SESSION_STORAGE_KEY);
  dispatchBrowserAuthEvent(SANCTUARY_MID_AUTH_EVENT);
  const logoutUrl = `${getSanctuaryBffBaseUrl()}/api/v1/auth/bff/logout`;
  const logoutInit = buildCsrfLogoutInit();
  await (
    fetchFn ? fetchFn(logoutUrl, logoutInit) : requestApiResponse(logoutUrl, logoutInit)
  ).catch(() => {});
}
