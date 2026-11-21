import { requestApiResponse } from "@moonwitness/contracts/sdk";
import {
  beginBrowserPkceRedirect,
  consumeStoredPkceEnvelope,
  extractOAuthCallbackParams,
  removeBrowserStorage,
  resolveBrowserOriginCallbackUrl,
  resolveConfiguredMidIssuer,
  sanitizeRedirectPath,
} from "@moonwitness/core";

const STORAGE_PKCE_KEY = "mw_mid_pkce";

/** Initiate OAuth 2.1 + PKCE sign-in flow against MoonWitness ID using @moonwitness/core. */
export async function startMidLogin(nextPath = "/mission-control"): Promise<void> {
  await beginBrowserPkceRedirect({
    issuerUrl: resolveConfiguredMidIssuer(process.env.NEXT_PUBLIC_MID_ISSUER_URL),
    clientId: "moonwitness-web",
    redirectUri: resolveBrowserOriginCallbackUrl("/auth/callback"),
    storageKey: STORAGE_PKCE_KEY,
    nextPath: sanitizeRedirectPath(nextPath, "/mission-control"),
  });
}

/** Complete OAuth 2.1 authorization_code exchange via the server-side BFF on `/auth/callback`. */
export async function completeMidCallback(searchParams: URLSearchParams): Promise<string> {
  const { code, state } = extractOAuthCallbackParams(searchParams);
  const stored = consumeStoredPkceEnvelope(STORAGE_PKCE_KEY, state, {
    expired: "Login session expired. Return to Sign In and try again.",
    mismatch: "State mismatch detected during SSO callback.",
  });

  const response = await requestApiResponse("/api/v1/auth/bff/exchange", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: stored.verifier,
      redirect_uri: resolveBrowserOriginCallbackUrl("/auth/callback"),
      client_id: "moonwitness-web",
    }),
  });
  const payload = (await response.json().catch(() => null)) as {
    authenticated?: boolean;
    user?: unknown;
    error?: string;
    error_description?: string;
    message?: string;
  } | null;
  if (!response.ok || !payload?.authenticated || !payload?.user) {
    throw new Error(
      payload?.error_description ||
        payload?.message ||
        payload?.error ||
        "Authentication exchange failed.",
    );
  }

  return sanitizeRedirectPath(stored.nextPath, "/mission-control");
}

/**
 * @deprecated OAuth tokens are stored server-side behind HttpOnly session cookies.
 * Always returns null.
 */
export function getStoredMidAccessToken(): null {
  return null;
}

/** Remove stored ephemeral MoonWitness ID PKCE state on logout. */
export function clearStoredMidSession(): void {
  removeBrowserStorage("sessionStorage", STORAGE_PKCE_KEY);
}

export * from "./sanctuary-mid-oidc";
