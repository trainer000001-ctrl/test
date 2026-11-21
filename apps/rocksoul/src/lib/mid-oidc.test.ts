import { DEFAULT_MID_ISSUER_URL, encodeBase64Url } from "@moonwitness/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
import {
  ROCKSOUL_MID_AUTH_EVENT,
  ROCKSOUL_MID_CLIENT_ID,
  ROCKSOUL_MID_PKCE_KEY,
  ROCKSOUL_MID_SESSION_KEY,
  clearStoredRocksoulOidcSession,
  completeBrowserOidcCallback,
  getStoredRocksoulOidcSession,
  persistRocksoulOidcSession,
  refreshRocksoulOidcSession,
  resolveValidRocksoulOidcSession,
  signInWithMoonWitnessId,
  signOutRocksoulOidc,
  type RocksoulOidcSession,
} from "./mid-oidc";

const TEXT_ENCODER = new TextEncoder();

function createTestIdToken(nonce: string, overrides?: Record<string, unknown>): string {
  const header = encodeBase64Url(TEXT_ENCODER.encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = encodeBase64Url(
    TEXT_ENCODER.encode(
      JSON.stringify({
        iss: DEFAULT_MID_ISSUER_URL,
        sub: "42",
        aud: ROCKSOUL_MID_CLIENT_ID,
        preferred_username: "rocksoul_op",
        name: "ROCKSOUL Operator",
        email: "op@moonwitness.biz.id",
        role: "admin",
        nonce,
        ...overrides,
      }),
    ),
  );
  return `${header}.${payload}.sig`;
}

function createStorageMock() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("rocksoul mid-oidc", () => {
  const localMap = createStorageMock();
  const sessionMap = createStorageMock();
  const originalLocation = window.location;

  beforeEach(() => {
    localMap.map.clear();
    sessionMap.map.clear();
    vi.stubGlobal("localStorage", localMap);
    vi.stubGlobal("sessionStorage", sessionMap);
    delete (window as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__;
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  it("completes desktop Tauri loopback sign-in, validates state/nonce, fetches userinfo, and persists to localStorage", async () => {
    (window as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ = {};
    const authEvents: string[] = [];
    window.addEventListener(ROCKSOUL_MID_AUTH_EVENT, () => authEvents.push("changed"));

    let capturedAuthorizeUrl = "";
    vi.mocked(invoke).mockImplementation(async (command, args: unknown) => {
      expect(command).toBe("await_mid_loopback_callback");
      capturedAuthorizeUrl = (args as { authorizeUrl: string }).authorizeUrl;
      const parsed = new URL(capturedAuthorizeUrl);
      expect(parsed.origin).toBe(DEFAULT_MID_ISSUER_URL);
      expect(parsed.searchParams.get("client_id")).toBe("rocksoul-dx");
      expect(parsed.searchParams.get("redirect_uri")).toBe("http://127.0.0.1/callback");
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
      return {
        code: "mwc_desktop_code",
        state: parsed.searchParams.get("state") ?? "",
        redirect_uri: "http://127.0.0.1:54321/callback",
      };
    });

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const target = typeof input === "string" ? input : input.toString();
      const nonce = new URL(capturedAuthorizeUrl).searchParams.get("nonce") ?? "";
      if (target === `${DEFAULT_MID_ISSUER_URL}/oauth/token`) {
        const body = new URLSearchParams(String(init?.body ?? ""));
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("client_id")).toBe("rocksoul-dx");
        expect(body.get("code")).toBe("mwc_desktop_code");
        expect(body.get("redirect_uri")).toBe("http://127.0.0.1:54321/callback");
        expect(body.get("code_verifier")).toBeTruthy();
        return new Response(
          JSON.stringify({
            access_token: "acc_desktop",
            id_token: createTestIdToken(nonce),
            token_type: "Bearer",
            expires_in: 900,
            refresh_token: "rt_desktop",
            scope: "openid profile email offline_access",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (target === `${DEFAULT_MID_ISSUER_URL}/oauth/userinfo`) {
        expect((init?.headers as Record<string, string>)["authorization"]).toBe("Bearer acc_desktop");
        return new Response(
          JSON.stringify({
            sub: "42",
            preferred_username: "rocksoul_op",
            name: "ROCKSOUL Operator",
            email: "op@moonwitness.biz.id",
            role: "admin",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(null, { status: 404 });
    });

    const session = await signInWithMoonWitnessId({
      fetchFn: fetchMock,
      nowEpochSec: () => 1_000_000,
    });

    expect(session).toMatchObject({
      issuerUrl: DEFAULT_MID_ISSUER_URL,
      clientId: "rocksoul-dx",
      accessToken: "acc_desktop",
      refreshToken: "rt_desktop",
      expiresAtEpochSec: 1_000_900,
      user: {
        sub: "42",
        preferred_username: "rocksoul_op",
        role: "admin",
      },
    });
    expect(localMap.map.get(ROCKSOUL_MID_SESSION_KEY)).toBeTruthy();
    expect(getStoredRocksoulOidcSession(() => 1_000_100)).toEqual(session);
    expect(authEvents).toHaveLength(1);
  });

  it("rejects state mismatch on desktop loopback callback without persisting session", async () => {
    (window as { __TAURI_INTERNALS__?: Record<string, unknown> }).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockResolvedValueOnce({
      code: "mwc_bad",
      state: "tampered_state",
      redirect_uri: "http://127.0.0.1:54321/callback",
    });

    await expect(signInWithMoonWitnessId()).rejects.toThrow("OAuth state mismatch");
    expect(localMap.map.has(ROCKSOUL_MID_SESSION_KEY)).toBe(false);
  });

  it("starts browser redirect PKCE flow and completes /auth/callback including StrictMode dedupe", async () => {
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:1420",
        hash: "#/git",
        pathname: "/",
        search: "",
        assign: vi.fn(),
      },
      configurable: true,
    });

    let redirectedUrl = "";
    const result = await signInWithMoonWitnessId({
      navigateFn: (url) => {
        redirectedUrl = url;
      },
    });
    expect(result).toBeNull();
    const authUrl = new URL(redirectedUrl);
    expect(authUrl.searchParams.get("client_id")).toBe("rocksoul-dx");
    expect(authUrl.searchParams.get("redirect_uri")).toBe("http://localhost:1420/auth/callback");
    expect(sessionMap.map.get(ROCKSOUL_MID_PKCE_KEY)).toBeTruthy();

    const state = authUrl.searchParams.get("state") ?? "";
    const nonce = authUrl.searchParams.get("nonce") ?? "";

    let tokenCalls = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const target = typeof input === "string" ? input : input.toString();
      if (target.endsWith("/oauth/token")) {
        tokenCalls += 1;
        return new Response(
          JSON.stringify({
            access_token: "acc_web",
            id_token: createTestIdToken(nonce),
            token_type: "Bearer",
            expires_in: 600,
            refresh_token: "rt_web",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (target.endsWith("/oauth/userinfo")) {
        return new Response(
          JSON.stringify({
            sub: "7",
            preferred_username: "web_dev",
            name: "Web Developer",
            email: "web@moonwitness.biz.id",
            role: "editor",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(null, { status: 404 });
    });

    const params = new URLSearchParams({ code: "mwc_web_1", state });
    // Simulate concurrent StrictMode double effect invocation with identical code/state.
    const [first, second] = await Promise.all([
      completeBrowserOidcCallback(params, { fetchFn: fetchMock, nowEpochSec: () => 2_000_000 }),
      completeBrowserOidcCallback(params, { fetchFn: fetchMock, nowEpochSec: () => 2_000_000 }),
    ]);

    expect(tokenCalls).toBe(1);
    expect(first.returnHash).toBe("#/git");
    expect(second.returnHash).toBe("#/git");
    expect(first.session.user.preferred_username).toBe("web_dev");
    expect(sessionMap.map.has(ROCKSOUL_MID_PKCE_KEY)).toBe(false);
    expect(getStoredRocksoulOidcSession(() => 2_000_100)?.accessToken).toBe("acc_web");
  });

  it("rejects invalid nonce, OAuth error callback, and missing PKCE session cleanly", async () => {
    sessionMap.map.set(
      ROCKSOUL_MID_PKCE_KEY,
      JSON.stringify({
        issuerUrl: DEFAULT_MID_ISSUER_URL,
        clientId: "rocksoul-dx",
        verifier: "verifier_123",
        state: "st_expected",
        nonce: "nonce_expected",
        redirectUri: "http://localhost:1420/auth/callback",
        returnHash: "#/deck",
      }),
    );

    await expect(
      completeBrowserOidcCallback(
        new URLSearchParams({ error: "access_denied", error_description: "Denied by user" }),
      ),
    ).rejects.toThrow("Denied by user");
    expect(sessionMap.map.has(ROCKSOUL_MID_PKCE_KEY)).toBe(false);

    await expect(
      completeBrowserOidcCallback(new URLSearchParams({ code: "mwc_x", state: "st_expected" })),
    ).rejects.toThrow("PKCE sign-in state expired");

    sessionMap.map.set(
      ROCKSOUL_MID_PKCE_KEY,
      JSON.stringify({
        issuerUrl: DEFAULT_MID_ISSUER_URL,
        clientId: "rocksoul-dx",
        verifier: "verifier_123",
        state: "st_expected",
        nonce: "nonce_expected",
        redirectUri: "http://localhost:1420/auth/callback",
        returnHash: "#/deck",
      }),
    );

    await expect(
      completeBrowserOidcCallback(new URLSearchParams({ code: "mwc_x", state: "st_expected" }), {
        fetchFn: async () =>
          new Response(
            JSON.stringify({
              access_token: "acc",
              id_token: createTestIdToken("wrong_nonce"),
              token_type: "Bearer",
              expires_in: 300,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      }),
    ).rejects.toThrow("nonce mismatch");
  });

  it("refreshes expiring sessions, purges unrefreshable expired sessions, and revokes on sign out", async () => {
    const initial: RocksoulOidcSession = {
      issuerUrl: DEFAULT_MID_ISSUER_URL,
      clientId: "rocksoul-dx",
      accessToken: "acc_old",
      idToken: createTestIdToken("nc"),
      refreshToken: "rt_old",
      expiresAtEpochSec: 1_020,
      user: {
        sub: "42",
        preferred_username: "rocksoul_op",
        name: "ROCKSOUL Operator",
        email: "op@moonwitness.biz.id",
        role: "admin",
      },
    };
    persistRocksoulOidcSession(initial);

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const target = typeof input === "string" ? input : input.toString();
      if (target.endsWith("/oauth/token")) {
        const body = new URLSearchParams(String(init?.body ?? ""));
        expect(body.get("grant_type")).toBe("refresh_token");
        expect(body.get("refresh_token")).toBe("rt_old");
        return new Response(
          JSON.stringify({
            access_token: "acc_rotated",
            id_token: createTestIdToken("nc"),
            token_type: "Bearer",
            expires_in: 900,
            refresh_token: "rt_rotated",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (target.endsWith("/oauth/userinfo")) {
        return new Response(
          JSON.stringify({
            sub: "42",
            preferred_username: "rocksoul_op",
            name: "ROCKSOUL Operator",
            email: "op@moonwitness.biz.id",
            role: "admin",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (target.endsWith("/oauth/revoke")) {
        const body = new URLSearchParams(String(init?.body ?? ""));
        expect(body.get("token")).toBe("rt_rotated");
        expect(body.get("token_type_hint")).toBe("refresh_token");
        return new Response(JSON.stringify({ revoked: true }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    // Within 30s of expiry -> triggers transparent refresh.
    const valid = await resolveValidRocksoulOidcSession({
      fetchFn: fetchMock,
      nowEpochSec: () => 1_000,
    });
    expect(valid?.accessToken).toBe("acc_rotated");
    expect(valid?.refreshToken).toBe("rt_rotated");

    // Sign out revokes rotated refresh token and clears storage.
    await signOutRocksoulOidc({ fetchFn: fetchMock });
    expect(getStoredRocksoulOidcSession()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_MID_ISSUER_URL}/oauth/revoke`,
      expect.objectContaining({ method: "POST" }),
    );

    // Expired session without refresh token is purged automatically.
    persistRocksoulOidcSession({
      issuerUrl: DEFAULT_MID_ISSUER_URL,
      clientId: "rocksoul-dx",
      accessToken: "acc_no_refresh",
      idToken: createTestIdToken("nc"),
      expiresAtEpochSec: 500,
      user: initial.user,
    });
    expect(getStoredRocksoulOidcSession(() => 600)).toBeNull();
    expect(localMap.map.has(ROCKSOUL_MID_SESSION_KEY)).toBe(false);

    // Direct refresh without stored refreshToken throws cleanly.
    await expect(refreshRocksoulOidcSession()).rejects.toThrow("No refreshable");
    clearStoredRocksoulOidcSession();
  });
});
