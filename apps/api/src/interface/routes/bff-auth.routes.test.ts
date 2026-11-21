import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeDb, getDb, initDb } from "@moonwitness/orm";
import { encodeBase64Url, type PublicEs256Jwk } from "@moonwitness/core";
import { createUser, ensureAuthSchema, resetMidJwksCacheForTests } from "@moonwitness/addons/auth";

const API_PREFIX = "/api/v1";
const ENCODER = new TextEncoder();

async function createEs256Signer(kid = "mid-bff-k1") {
  const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const rawPublic = (await webcrypto.subtle.exportKey("jwk", pair.publicKey)) as PublicEs256Jwk;
  const publicJwk: PublicEs256Jwk = {
    kty: "EC",
    crv: "P-256",
    x: rawPublic.x,
    y: rawPublic.y,
    kid,
    use: "sig",
    alg: "ES256",
  };

  async function signJwt(claims: Record<string, unknown>): Promise<string> {
    const headerSeg = encodeBase64Url(
      ENCODER.encode(JSON.stringify({ alg: "ES256", typ: "JWT", kid })),
    );
    const payloadSeg = encodeBase64Url(ENCODER.encode(JSON.stringify(claims)));
    const input = `${headerSeg}.${payloadSeg}`;
    const signature = await webcrypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      pair.privateKey,
      ENCODER.encode(input),
    );
    return `${input}.${encodeBase64Url(new Uint8Array(signature))}`;
  }

  return { kid, publicJwk, signJwt };
}

function extractCookies(response: { headers: Record<string, unknown> }): {
  sessionCookie: string;
  csrfCookie: string;
  rawSetCookie: string;
} {
  const setCookie = response.headers["set-cookie"];
  const rawSetCookie = Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie ?? "");
  const sessionMatch = rawSetCookie.match(/mw_session=([^;]+)/);
  const csrfMatch = rawSetCookie.match(/mw_csrf=([^;]+)/);
  if (!sessionMatch) {
    throw new Error(`Expected mw_session cookie in set-cookie: ${rawSetCookie}`);
  }
  return {
    sessionCookie: `mw_session=${sessionMatch[1]}`,
    csrfCookie: csrfMatch ? `mw_csrf=${csrfMatch[1]}` : "",
    rawSetCookie,
  };
}

async function computeS256Challenge(verifier: string): Promise<string> {
  const digest = await webcrypto.subtle.digest("SHA-256", ENCODER.encode(verifier));
  return encodeBase64Url(new Uint8Array(digest));
}

describe("BFF OAuth exchange and logout routes", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    process.env = { ...envBackup };
    process.env.NODE_ENV = "test";
    process.env.MID_ISSUER_URL = "https://id.moonwitness.biz.id";
    delete process.env.MID_INTERNAL_URL;
    delete process.env.MID_JWKS_URL;
    delete process.env.MID_KEY_ENCRYPTION_SECRET;
    delete process.env.CORS_ORIGINS;
    resetMidJwksCacheForTests();
    await initDb("file::memory:?cache=shared");
    await ensureAuthSchema();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetMidJwksCacheForTests();
    if (app) {
      await app.close();
      app = null;
    }
    await closeDb();
    process.env = { ...envBackup };
  });

  async function loadApp(): Promise<FastifyInstance> {
    const { buildCoreApp } = await import("../../bootstrap");
    const built = await buildCoreApp({ prefix: API_PREFIX });
    await built.ready();
    return built;
  }

  it("exchanges code via MID_INTERNAL_URL, stores tokens server-side, sets HttpOnly cookie, omits tokens from JSON, and revokes on logout", async () => {
    process.env.MID_INTERNAL_URL = "http://mid.internal:8787";
    process.env.CORS_ORIGINS = "https://moonwitness.biz.id,https://a-l-l-a-h.com";
    app = await loadApp();

    const user = await createUser({
      username: "bff-operator",
      email: "bff-op@moonwitness.biz.id",
      password: "BffOperator!2026",
      role: "admin",
      displayName: "BFF Operator",
    });

    const signer = await createEs256Signer("bff-k1");
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await signer.signJwt({
      iss: "https://id.moonwitness.biz.id",
      sub: String(user.id),
      aud: "moonwitness-web",
      iat: nowSec,
      exp: nowSec + 900,
      token_use: "access",
      preferred_username: user.username,
      role: user.role,
    });
    const idToken = await signer.signJwt({
      iss: "https://id.moonwitness.biz.id",
      sub: String(user.id),
      aud: "moonwitness-web",
      iat: nowSec,
      exp: nowSec + 3600,
      token_use: "id",
      preferred_username: user.username,
      role: user.role,
    });

    const revokedTokens: Array<{ token: string; clientId: string; hint: string | null }> = [];
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input.toString();
      if (target === "http://mid.internal:8787/oauth/token") {
        const params = new URLSearchParams(String(init?.body ?? ""));
        expect(params.get("grant_type")).toBe("authorization_code");
        expect(params.get("code")).toBe("mwc_valid_code");
        expect(params.get("code_verifier")).toBe("verifier_12345");
        expect(params.get("redirect_uri")).toBe("https://moonwitness.biz.id/auth/callback");
        expect(params.get("client_id")).toBe("moonwitness-web");
        return new Response(
          JSON.stringify({
            access_token: accessToken,
            id_token: idToken,
            refresh_token: "mwr_secret_refresh_token",
            expires_in: 900,
            token_type: "Bearer",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (target === "http://mid.internal:8787/.well-known/jwks.json") {
        return new Response(JSON.stringify({ keys: [signer.publicJwk] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (target === "http://mid.internal:8787/oauth/revoke") {
        const params = new URLSearchParams(String(init?.body ?? ""));
        revokedTokens.push({
          token: params.get("token") ?? "",
          clientId: params.get("client_id") ?? "",
          hint: params.get("token_type_hint"),
        });
        return new Response(JSON.stringify({ revoked: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const exchangeRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/exchange`,
      headers: { origin: "https://moonwitness.biz.id" },
      payload: {
        code: "mwc_valid_code",
        code_verifier: "verifier_12345",
        redirect_uri: "https://moonwitness.biz.id/auth/callback",
        client_id: "moonwitness-web",
      },
    });

    expect(exchangeRes.statusCode).toBe(200);
    expect(exchangeRes.headers["cache-control"]).toBe("no-store");

    const body = exchangeRes.json() as Record<string, unknown>;
    expect(body).toEqual({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
    });
    expect(body).not.toHaveProperty("access_token");
    expect(body).not.toHaveProperty("refresh_token");
    expect(body).not.toHaveProperty("id_token");
    expect(exchangeRes.body).not.toContain(accessToken);
    expect(exchangeRes.body).not.toContain("mwr_secret_refresh_token");

    const { sessionCookie, csrfCookie, rawSetCookie } = extractCookies(exchangeRes);
    expect(rawSetCookie).toMatch(/mw_session=.*;.*HttpOnly/i);
    expect(rawSetCookie).toMatch(/SameSite=Lax/i);
    expect(csrfCookie).toMatch(/^mw_csrf=/);

    const sessionId = sessionCookie.slice("mw_session=".length);
    const tokenRow = await getDb().get<{ access_token: string; refresh_token: string }>(
      "SELECT access_token, refresh_token FROM auth_oauth_tokens WHERE session_token = ?",
      [sessionId],
    );
    expect(tokenRow?.access_token).toBe(accessToken);
    expect(tokenRow?.refresh_token).toBe("mwr_secret_refresh_token");

    const meRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie: sessionCookie },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({
      user: { id: user.id, username: "bff-operator", role: "admin" },
    });

    const csrfValue = csrfCookie.slice("mw_csrf=".length);
    const logoutRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/logout`,
      headers: {
        origin: "https://moonwitness.biz.id",
        cookie: `${sessionCookie}; ${csrfCookie}`,
        "x-csrf-token": csrfValue,
      },
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.json()).toEqual({ ok: true });
    expect(revokedTokens).toEqual([
      {
        token: "mwr_secret_refresh_token",
        clientId: "moonwitness-web",
        hint: "refresh_token",
      },
    ]);

    const remainingTokenRow = await getDb().get<{ session_token: string }>(
      "SELECT session_token FROM auth_oauth_tokens WHERE session_token = ?",
      [sessionId],
    );
    expect(remainingTokenRow).toBeUndefined();

    const meAfterLogout = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie: sessionCookie },
    });
    expect(meAfterLogout.statusCode).toBe(401);
  });

  it("provisions a local user when verified MID claims represent a new user", async () => {
    process.env.MID_INTERNAL_URL = "http://mid.internal:8787";
    process.env.CORS_ORIGINS = "https://a-l-l-a-h.com";
    app = await loadApp();

    const signer = await createEs256Signer("bff-provision-k1");
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await signer.signJwt({
      iss: "https://id.moonwitness.biz.id",
      sub: "9001",
      aud: "allah-sanctuary",
      iat: nowSec,
      exp: nowSec + 900,
      token_use: "access",
      preferred_username: "SanctuaryWitness",
      email: "witness@a-l-l-a-h.com",
      name: "Sanctuary Witness",
      role: "editor",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const target = typeof input === "string" ? input : input.toString();
        if (target === "http://mid.internal:8787/oauth/token") {
          return new Response(
            JSON.stringify({ access_token: accessToken, expires_in: 900, token_type: "Bearer" }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (target === "http://mid.internal:8787/.well-known/jwks.json") {
          return new Response(JSON.stringify({ keys: [signer.publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    const res = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/exchange`,
      headers: { origin: "https://a-l-l-a-h.com" },
      payload: {
        code: "mwc_new_user",
        code_verifier: "verifier_new_user",
        redirect_uri: "https://a-l-l-a-h.com/auth/callback",
        client_id: "allah-sanctuary",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      authenticated: true,
      user: {
        username: "sanctuarywitness",
        email: "witness@a-l-l-a-h.com",
        role: "editor",
        displayName: "Sanctuary Witness",
      },
    });
  });

  it("rejects cross-site untrusted Origins, invalid payloads, forged JWTs, and CSRF mismatches", async () => {
    process.env.MID_INTERNAL_URL = "http://mid.internal:8787";
    process.env.CORS_ORIGINS = "https://moonwitness.biz.id";
    app = await loadApp();

    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    for (const badOrigin of [
      "https://evil.example",
      "https://a-l-l-a-h.com",
      "null",
      "not-a-url",
    ]) {
      const csrfRejected = await app.inject({
        method: "POST",
        url: `${API_PREFIX}/auth/bff/exchange`,
        remoteAddress: "198.51.100.1",
        headers: { origin: badOrigin },
        payload: {
          code: "mwc_1",
          code_verifier: "ver_1",
          redirect_uri: "https://moonwitness.biz.id/auth/callback",
          client_id: "moonwitness-web",
        },
      });
      expect(csrfRejected.statusCode).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();

    // Same-site host match (api.moonwitness.biz.id serving origin moonwitness.biz.id) is allowed.
    const badBody = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/exchange`,
      remoteAddress: "198.51.100.2",
      headers: {
        origin: "https://moonwitness.biz.id",
        host: "api.moonwitness.biz.id",
      },
      payload: {
        code: "",
        code_verifier: 123,
        redirect_uri: "ftp://invalid",
        client_id: "moonwitness-web",
      },
    });
    expect(badBody.statusCode).toBe(400);

    // Forged JWT returned from MID must fail closed with 401.
    const signer = await createEs256Signer("real-k1");
    const rogue = await createEs256Signer("real-k1");
    const forgedAccess = await rogue.signJwt({
      iss: "https://id.moonwitness.biz.id",
      sub: "1",
      aud: "moonwitness-web",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      token_use: "access",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const target = typeof input === "string" ? input : input.toString();
        if (target.endsWith("/oauth/token")) {
          return new Response(JSON.stringify({ access_token: forgedAccess, expires_in: 300 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (target.endsWith("/.well-known/jwks.json")) {
          return new Response(JSON.stringify({ keys: [signer.publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    const forgedRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/exchange`,
      remoteAddress: "198.51.100.3",
      headers: { origin: "https://moonwitness.biz.id" },
      payload: {
        code: "mwc_forged",
        code_verifier: "ver_forged",
        redirect_uri: "https://moonwitness.biz.id/auth/callback",
        client_id: "moonwitness-web",
      },
    });
    expect(forgedRes.statusCode).toBe(401);

    // Logout rejects untrusted Origin and mismatched x-csrf-token.
    const badLogoutOrigin = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/logout`,
      remoteAddress: "198.51.100.4",
      headers: { origin: "https://evil.example" },
    });
    expect(badLogoutOrigin.statusCode).toBe(403);

    const badLogoutCsrf = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/logout`,
      remoteAddress: "198.51.100.5",
      headers: {
        origin: "https://moonwitness.biz.id",
        cookie: "mw_csrf=expected-token",
        "x-csrf-token": "wrong-token",
      },
    });
    expect(badLogoutCsrf.statusCode).toBe(403);
  });

  it("completes end-to-end PKCE authorization, BFF exchange, cookie auth, and refresh revocation against mounted midFastifyPlugin", async () => {
    process.env.MID_KEY_ENCRYPTION_SECRET = "test-mid-encryption-secret-32-bytes";
    process.env.CORS_ORIGINS = "https://moonwitness.biz.id";
    app = await loadApp();

    const admin = await createUser({
      username: "e2e-admin",
      email: "e2e-admin@moonwitness.biz.id",
      password: "E2eAdminPassword!2026",
      role: "admin",
      displayName: "E2E Admin",
    });

    const verifier = "pkce-verifier-for-e2e-bff-integration-test-0123456789";
    const challenge = await computeS256Challenge(verifier);

    const authRes = await app.inject({
      method: "POST",
      url: "/authorize",
      headers: {
        host: "id.moonwitness.biz.id",
        origin: "https://id.moonwitness.biz.id",
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: new URLSearchParams({
        client_id: "moonwitness-web",
        redirect_uri: "https://moonwitness.biz.id/auth/callback",
        response_type: "code",
        scope: "openid profile email offline_access",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state: "state-e2e-1",
        identifier: admin.username,
        password: "E2eAdminPassword!2026",
      }).toString(),
    });
    expect(authRes.statusCode).toBe(302);
    const redirectUrl = new URL(String(authRes.headers.location));
    const authCode = redirectUrl.searchParams.get("code") ?? "";
    expect(authCode).toBeTruthy();

    // Stub global fetch so test proves local MID dispatch requires zero external HTTP calls.
    const externalFetch = vi.fn(async () => {
      throw new Error("Unexpected external fetch during local MID BFF flow");
    });
    vi.stubGlobal("fetch", externalFetch);

    const bffRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/exchange`,
      headers: { origin: "https://moonwitness.biz.id" },
      payload: {
        code: authCode,
        code_verifier: verifier,
        redirect_uri: "https://moonwitness.biz.id/auth/callback",
        client_id: "moonwitness-web",
      },
    });
    expect(bffRes.statusCode).toBe(200);
    expect(externalFetch).not.toHaveBeenCalled();

    const bffJson = bffRes.json() as Record<string, unknown>;
    expect(bffJson).toMatchObject({
      authenticated: true,
      user: { id: admin.id, username: admin.username, role: "admin" },
    });
    expect(bffJson).not.toHaveProperty("access_token");
    expect(bffJson).not.toHaveProperty("refresh_token");

    const { sessionCookie } = extractCookies(bffRes);
    const sessionId = sessionCookie.slice("mw_session=".length);
    const stored = await getDb().get<{ refresh_token: string | null }>(
      "SELECT refresh_token FROM auth_oauth_tokens WHERE session_token = ?",
      [sessionId],
    );
    expect(stored?.refresh_token).toBeTruthy();

    const meRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/auth/me`,
      headers: { cookie: sessionCookie },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({ user: { id: admin.id, username: admin.username } });

    const logoutRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/logout`,
      headers: { origin: "https://moonwitness.biz.id", cookie: sessionCookie },
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(externalFetch).not.toHaveBeenCalled();

    // Verify upstream MID refresh token was actually revoked on MID during BFF logout.
    const refreshAfterLogout = await app.inject({
      method: "POST",
      url: "/oauth/token",
      headers: {
        host: "id.moonwitness.biz.id",
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: "moonwitness-web",
        refresh_token: stored!.refresh_token!,
      }).toString(),
    });
    expect(refreshAfterLogout.statusCode).toBe(400);
    expect(refreshAfterLogout.json()).toMatchObject({ error: "invalid_grant" });
  });

  it("marks BFF cookies Secure in production and also revokes BFF tokens via /auth/logout", async () => {
    process.env.NODE_ENV = "production";
    process.env.MID_INTERNAL_URL = "http://mid.internal:8787";
    process.env.CORS_ORIGINS = "https://moonwitness.biz.id";
    app = await loadApp();

    const user = await createUser({
      username: "prod-operator",
      email: "prod-op@moonwitness.biz.id",
      password: "ProdOperator!2026",
      role: "editor",
      displayName: "Prod Operator",
    });

    const signer = await createEs256Signer("prod-k1");
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = await signer.signJwt({
      iss: "https://id.moonwitness.biz.id",
      sub: String(user.id),
      aud: "moonwitness-web",
      iat: nowSec,
      exp: nowSec + 900,
      token_use: "access",
    });

    let revokedRefresh = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const target = typeof input === "string" ? input : input.toString();
        if (target === "http://mid.internal:8787/oauth/token") {
          return new Response(
            JSON.stringify({
              access_token: accessToken,
              refresh_token: "mwr_prod_refresh",
              expires_in: 900,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (target === "http://mid.internal:8787/.well-known/jwks.json") {
          return new Response(JSON.stringify({ keys: [signer.publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (target === "http://mid.internal:8787/oauth/revoke") {
          revokedRefresh = new URLSearchParams(String(init?.body ?? "")).get("token") ?? "";
          return new Response(JSON.stringify({ revoked: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    const exchangeRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/bff/exchange`,
      headers: { origin: "https://moonwitness.biz.id" },
      payload: {
        code: "mwc_prod",
        code_verifier: "ver_prod",
        redirect_uri: "https://moonwitness.biz.id/auth/callback",
        client_id: "moonwitness-web",
      },
    });
    expect(exchangeRes.statusCode).toBe(200);
    const { sessionCookie, rawSetCookie } = extractCookies(exchangeRes);
    expect(rawSetCookie).toMatch(/mw_session=[^;]+;.*HttpOnly;.*Secure;.*SameSite=Lax/i);
    expect(rawSetCookie).toMatch(/mw_csrf=[^;]+;.*Secure;.*SameSite=Lax/i);

    const logoutRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/auth/logout`,
      headers: { origin: "https://moonwitness.biz.id", cookie: sessionCookie },
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(revokedRefresh).toBe("mwr_prod_refresh");
  });
});
