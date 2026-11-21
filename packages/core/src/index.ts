import { z } from "zod";

export { z };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function parseEnv<T extends z.ZodRawShape>(
  shape: T,
  source: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): z.infer<z.ZodObject<T>> {
  const schema = z.object(shape);
  const parsed = schema.safeParse(source);
  if (parsed.success) {
    return parsed.data;
  }
  const fallback: Record<string, unknown> = {};
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const single = (fieldSchema as z.ZodTypeAny).safeParse(source[key]);
    fallback[key] = single.success ? single.data : (fieldSchema as z.ZodTypeAny).safeParse(undefined).data;
  }
  return fallback as z.infer<z.ZodObject<T>>;
}

export interface BffDisplaySession {
  readonly sub: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: string;
  readonly expiresAtEpochSec: number;
}

export const DEFAULT_MID_ISSUER_URL = "https://id.moonwitness.biz.id";

export function normalizeIssuerUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function resolveConfiguredMidIssuer(raw?: string | null): string {
  const candidate = raw?.trim();
  return candidate ? normalizeIssuerUrl(candidate) : DEFAULT_MID_ISSUER_URL;
}

export function sanitizeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  return trimmed;
}

export function resolveBrowserOriginCallbackUrl(path = "/auth/callback"): string {
  if (typeof window === "undefined") {
    return `http://localhost:3000${path}`;
  }
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export type BrowserStorageKind = "localStorage" | "sessionStorage";

export function readBrowserStorage(kind: BrowserStorageKind, key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind].getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(kind: BrowserStorageKind, key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window[kind].setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeBrowserStorage(kind: BrowserStorageKind, key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window[kind].removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function dispatchBrowserAuthEvent(eventName: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(eventName));
  } catch {
    // Ignore restricted environments
  }
}

export interface StoredPkceEnvelope {
  readonly state: string;
  readonly verifier: string;
  readonly nonce: string;
  readonly nextPath: string;
  readonly createdAt: number;
}

export type CrewRoleName = "admin" | "editor" | "viewer";

export const WRITE_ROLES: readonly CrewRoleName[] = ["admin"];

export function normalizeRole(role: unknown): CrewRoleName | null {
  if (role === "admin" || role === "superadmin") return "admin";
  if (role === "editor") return "editor";
  if (role === "viewer" || role === "readonly") return "viewer";
  return null;
}

export function isWriteRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function encodeBase64Url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytes; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  return encodeBase64Url(buf);
}

async function sha256Base64Url(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return input;
}

export async function beginBrowserPkceRedirect(options: {
  issuerUrl: string;
  clientId: string;
  redirectUri: string;
  storageKey: string;
  nextPath?: string;
  scope?: string;
}): Promise<void> {
  const state = randomBase64Url(24);
  const verifier = randomBase64Url(32);
  const nonce = randomBase64Url(24);
  const challenge = await sha256Base64Url(verifier);

  const envelope: StoredPkceEnvelope = {
    state,
    verifier,
    nonce,
    nextPath: sanitizeRedirectPath(options.nextPath, "/"),
    createdAt: Date.now(),
  };
  writeBrowserStorage("sessionStorage", options.storageKey, JSON.stringify(envelope));

  const authorizeUrl = new URL(`${normalizeIssuerUrl(options.issuerUrl)}/oauth/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", options.clientId);
  authorizeUrl.searchParams.set("redirect_uri", options.redirectUri);
  authorizeUrl.searchParams.set("scope", options.scope ?? "openid profile email");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", nonce);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  if (typeof window !== "undefined") {
    window.location.assign(authorizeUrl.toString());
  }
}

export function extractOAuthCallbackParams(searchParams: URLSearchParams): {
  code: string;
  state: string;
} {
  const err = searchParams.get("error");
  if (err) {
    throw new Error(searchParams.get("error_description") || err);
  }
  const code = searchParams.get("code")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";
  if (!code || !state) {
    throw new Error("Missing OAuth authorization code or state parameter.");
  }
  return { code, state };
}

export function consumeStoredPkceEnvelope(
  storageKey: string,
  expectedState: string,
  messages: { expired?: string; mismatch?: string; malformed?: string } = {},
): StoredPkceEnvelope {
  const raw = readBrowserStorage("sessionStorage", storageKey);
  removeBrowserStorage("sessionStorage", storageKey);
  if (!raw) {
    throw new Error(messages.expired ?? "PKCE session expired.");
  }
  let parsed: Partial<StoredPkceEnvelope>;
  try {
    parsed = JSON.parse(raw) as Partial<StoredPkceEnvelope>;
  } catch {
    throw new Error(messages.malformed ?? "Invalid PKCE session payload.");
  }
  if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string") {
    throw new Error(messages.malformed ?? "Incomplete PKCE session payload.");
  }
  if (parsed.state !== expectedState) {
    throw new Error(messages.mismatch ?? "OAuth state mismatch.");
  }
  return {
    state: parsed.state,
    verifier: parsed.verifier,
    nonce: typeof parsed.nonce === "string" ? parsed.nonce : "",
    nextPath: sanitizeRedirectPath(parsed.nextPath, "/"),
    createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
  };
}

export async function verifyDirectIdTokenAndBuildDisplaySession(options: {
  issuerUrl: string;
  clientId: string;
  code: string;
  redirectUri: string;
  verifier: string;
  nonce: string;
  fetchFn: typeof fetch;
}): Promise<BffDisplaySession> {
  const tokenRes = await options.fetchFn(`${normalizeIssuerUrl(options.issuerUrl)}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: options.clientId,
      code: options.code,
      redirect_uri: options.redirectUri,
      code_verifier: options.verifier,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Direct OIDC token exchange failed (${tokenRes.status}).`);
  }
  const tokenJson = (await tokenRes.json()) as { id_token?: string; expires_in?: number };
  const parts = (tokenJson.id_token ?? "").split(".");
  if (parts.length < 2) {
    throw new Error("Invalid ID token returned by issuer.");
  }
  const payloadStr = atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"));
  const claims = JSON.parse(payloadStr) as Record<string, unknown>;
  if (claims.nonce && claims.nonce !== options.nonce) {
    throw new Error("OIDC nonce verification failed.");
  }
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: String(claims.sub ?? "witness"),
    username: String(claims.preferred_username ?? claims.username ?? "witness"),
    displayName: String(claims.name ?? claims.preferred_username ?? "Sanctuary Witness"),
    role: String(claims.role ?? "viewer"),
    expiresAtEpochSec:
      typeof claims.exp === "number" ? claims.exp : now + (tokenJson.expires_in ?? 3600),
  };
}
