import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeDb, getDb, initDb } from "@moonwitness/orm";
import { createUser, ensureAuthSchema, resetMidJwksCacheForTests } from "@moonwitness/addons/auth";

const ENCODER = new TextEncoder();

function encodeB64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function signEs256Jwt(
  claims: Record<string, unknown>,
  kid: string,
  privateKey: webcrypto.CryptoKey,
): Promise<string> {
  const headerSeg = encodeB64Url(ENCODER.encode(JSON.stringify({ alg: "ES256", typ: "JWT", kid })));
  const claimSeg = encodeB64Url(ENCODER.encode(JSON.stringify(claims)));
  const input = `${headerSeg}.${claimSeg}`;
  const sig = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    ENCODER.encode(input),
  );
  return `${input}.${encodeB64Url(new Uint8Array(sig))}`;
}

describe("moonwitness-id ES256 Bearer JWT auth", () => {
  const envBackup = { ...process.env };
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    process.env = { ...envBackup };
    process.env.NODE_ENV = "test";
    process.env.MID_ISSUER_URL = "https://id.moonwitness.biz.id";
    resetMidJwksCacheForTests();
    await initDb("file::memory:?cache=shared");
    await ensureAuthSchema();
    const tablesAfterMigrate = await getDb().all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    expect(tablesAfterMigrate.map((row) => row.name)).toContain("auth_users");
    await getDb().run(
      `CREATE TABLE IF NOT EXISTS mid_signing_keys (
        kid TEXT PRIMARY KEY,
        public_jwk_json TEXT NOT NULL,
        encrypted_private_jwk TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
    );
    const { buildCoreApp } = await import("../bootstrap");
    app = await buildCoreApp({ prefix: "/api/v1" });
    await app.ready();
    const tablesAfterReady = await getDb().all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    expect(tablesAfterReady.map((row) => row.name)).toContain("auth_users");
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

  it("authenticates /api/v1/auth/me with signed ES256 access_token and rejects invalid tokens", async () => {
    const user = await createUser({
      username: "sso-operator",
      email: "sso@moonwitness.biz.id",
      password: "SsoPassword!2026",
      role: "admin",
      displayName: "SSO Operator",
    });

    const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const publicJwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
    const kid = "mid-test-key-1";

    await getDb().run(
      `INSERT INTO mid_signing_keys (kid, public_jwk_json, encrypted_private_jwk, active, created_at)
       VALUES (?, ?, 'sealed', 1, ?)`,
      [
        kid,
        JSON.stringify({ ...publicJwk, kid, use: "sig", alg: "ES256" }),
        new Date().toISOString(),
      ],
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const validAccessToken = await signEs256Jwt(
      {
        iss: "https://id.moonwitness.biz.id",
        sub: String(user.id),
        aud: "moonwitness-web",
        iat: nowSec,
        exp: nowSec + 300,
        token_use: "access",
      },
      kid,
      pair.privateKey,
    );

    const okRes = await app!.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${validAccessToken}` },
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.json()).toMatchObject({
      user: { username: "sso-operator", role: "admin" },
    });

    const wrongUseToken = await signEs256Jwt(
      {
        iss: "https://id.moonwitness.biz.id",
        sub: String(user.id),
        aud: "moonwitness-web",
        iat: nowSec,
        exp: nowSec + 300,
        token_use: "id",
      },
      kid,
      pair.privateKey,
    );
    const rejectedUse = await app!.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${wrongUseToken}` },
    });
    expect(rejectedUse.statusCode).toBe(401);

    const parts = validAccessToken.split(".");
    const forgedToken = `${parts[0]}.${parts[1]}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const rejectedSig = await app!.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${forgedToken}` },
    });
    expect(rejectedSig.statusCode).toBe(401);
  });

  it("enforces MID_ALLOWED_AUDIENCES policy for string and array aud claims", async () => {
    const user = await createUser({
      username: "aud-operator",
      email: "aud@moonwitness.biz.id",
      password: "AudPassword!2026",
      role: "admin",
      displayName: "Audience Operator",
    });

    const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const publicJwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
    const kid = "mid-aud-key-1";

    await getDb().run(
      `INSERT INTO mid_signing_keys (kid, public_jwk_json, encrypted_private_jwk, active, created_at)
       VALUES (?, ?, 'sealed', 1, ?)`,
      [
        kid,
        JSON.stringify({ ...publicJwk, kid, use: "sig", alg: "ES256" }),
        new Date().toISOString(),
      ],
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const makeToken = (aud?: unknown, tokenUse = "access") =>
      signEs256Jwt(
        {
          iss: "https://id.moonwitness.biz.id",
          sub: String(user.id),
          ...(aud !== undefined ? { aud } : {}),
          iat: nowSec,
          exp: nowSec + 300,
          token_use: tokenUse,
        },
        kid,
        pair.privateKey,
      );

    // Default allowlist accepts interactive first-party API clients & multi-audience arrays.
    const allowedCases = [
      "moonwitness-web",
      "moonwitness-cli",
      "rocksoul-dx",
      "allah-sanctuary",
      "moonwitness-api",
      ["moonwitness-web", "moonwitness-api"],
      ["rocksoul-dx", "moonwitness-api"],
    ];
    for (const [idx, allowedAud] of allowedCases.entries()) {
      const token = await makeToken(allowedAud);
      const res = await app!.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        remoteAddress: `192.0.2.${10 + idx}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    }

    // Default allowlist rejects igate-console-only, moonwitness-memory, unknown, missing, and empty aud.
    const rejectedCases = [
      "igate-console",
      ["igate-console", "rocksoul-igate-worker"],
      "moonwitness-memory",
      "unknown-third-party",
      "",
      [],
      undefined,
    ];
    for (const [idx, rejectedAud] of rejectedCases.entries()) {
      const token = await makeToken(rejectedAud);
      const res = await app!.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        remoteAddress: `192.0.2.${50 + idx}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
    }

    // Custom MID_ALLOWED_AUDIENCES restricts strictly to the configured set and fails closed if empty.
    process.env.MID_ALLOWED_AUDIENCES = "moonwitness-api";
    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          remoteAddress: "192.0.2.100",
          headers: { authorization: `Bearer ${await makeToken("moonwitness-web")}` },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          remoteAddress: "192.0.2.101",
          headers: {
            authorization: `Bearer ${await makeToken(["moonwitness-web", "moonwitness-api"])}`,
          },
        })
      ).statusCode,
    ).toBe(200);

    process.env.MID_ALLOWED_AUDIENCES = "";
    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          remoteAddress: "192.0.2.102",
          headers: { authorization: `Bearer ${await makeToken("moonwitness-api")}` },
        })
      ).statusCode,
    ).toBe(401);
  });

  it("refreshes remote JWKS cache on unseen kid rotation while still rejecting wrong aud", async () => {
    const user = await createUser({
      username: "rot-operator",
      email: "rot@moonwitness.biz.id",
      password: "RotPassword!2026",
      role: "admin",
      displayName: "Rotation Operator",
    });

    const pair1 = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const pair2 = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const jwk1 = {
      ...(await webcrypto.subtle.exportKey("jwk", pair1.publicKey)),
      kid: "remote-k1",
      use: "sig",
      alg: "ES256",
    };
    const jwk2 = {
      ...(await webcrypto.subtle.exportKey("jwk", pair2.publicKey)),
      kid: "remote-k2",
      use: "sig",
      alg: "ES256",
    };

    let activeKeys = [jwk1];
    let fetchCount = 0;
    process.env.MID_JWKS_URL = "https://id.moonwitness.biz.id/.well-known/jwks.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        fetchCount += 1;
        return new Response(JSON.stringify({ keys: activeKeys }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const token1 = await signEs256Jwt(
      {
        iss: "https://id.moonwitness.biz.id",
        sub: String(user.id),
        aud: "moonwitness-cli",
        iat: nowSec,
        exp: nowSec + 300,
        token_use: "access",
      },
      "remote-k1",
      pair1.privateKey,
    );
    const token2 = await signEs256Jwt(
      {
        iss: "https://id.moonwitness.biz.id",
        sub: String(user.id),
        aud: ["rocksoul-dx", "moonwitness-api"],
        iat: nowSec,
        exp: nowSec + 300,
        token_use: "access",
      },
      "remote-k2",
      pair2.privateKey,
    );
    const wrongAudRotated = await signEs256Jwt(
      {
        iss: "https://id.moonwitness.biz.id",
        sub: String(user.id),
        aud: "igate-console",
        iat: nowSec,
        exp: nowSec + 300,
        token_use: "access",
      },
      "remote-k2",
      pair2.privateKey,
    );

    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          headers: { authorization: `Bearer ${token1}` },
        })
      ).statusCode,
    ).toBe(200);
    expect(fetchCount).toBe(1);

    // Cached hit for k1.
    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          headers: { authorization: `Bearer ${token1}` },
        })
      ).statusCode,
    ).toBe(200);
    expect(fetchCount).toBe(1);

    // Key rotation to k2 within TTL refreshes JWKS and authenticates valid audience.
    activeKeys = [jwk1, jwk2];
    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          headers: { authorization: `Bearer ${token2}` },
        })
      ).statusCode,
    ).toBe(200);
    expect(fetchCount).toBe(2);

    // Wrong audience signed by k2 must still be rejected with 401.
    expect(
      (
        await app!.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          headers: { authorization: `Bearer ${wrongAudRotated}` },
        })
      ).statusCode,
    ).toBe(401);
  });
});
