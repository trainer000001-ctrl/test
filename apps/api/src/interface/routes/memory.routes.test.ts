import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { closeDb, initDb, syncModels } from "@moonwitness/orm";
import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import { memoryRecordModel, registerMemoryRoutes } from "@moonwitness/addons/ai";

const tempDirs: string[] = [];
let activeCloseDb: (() => void) | null = null;

async function createMemoryTestDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mw-memory-routes-"));
  tempDirs.push(dir);
  return join(dir, "memory.db");
}

interface AuthMockState {
  authenticated: boolean;
  role: "admin" | "editor" | "viewer";
}

async function loadMemoryApp(
  memoryApiUrl?: string,
  authenticated = true,
  options?: { dbPath?: string; role?: "admin" | "editor" | "viewer"; syncToken?: string },
): Promise<{ app: FastifyInstance; auth: AuthMockState }> {
  vi.unstubAllEnvs();
  if (memoryApiUrl === undefined) {
    vi.stubEnv("MEMORY_API_URL", "");
  } else {
    vi.stubEnv("MEMORY_API_URL", memoryApiUrl);
  }
  if (options?.syncToken !== undefined) {
    vi.stubEnv("MOONWITNESS_SYNC_TOKEN", options.syncToken);
  }

  const auth: AuthMockState = {
    authenticated,
    role: options?.role ?? "admin",
  };

  const bridge: BaseAddonAuthBridge = {
    ...defaultFailClosedAuthBridge,
    authenticate: async (request: FastifyRequest, reply: FastifyReply) => {
      if (!auth.authenticated) {
        return reply.code(401).send({ error: "Not authenticated" });
      }
      (request as { user?: unknown }).user = {
        id: 1,
        username: "operator",
        email: "operator@moonwitness.local",
        role: auth.role,
        displayName: "Operator",
      };
    },
    requireRole:
      (...allowed: Array<"admin" | "editor" | "viewer">) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!auth.authenticated) {
          return reply.code(401).send({ error: "Not authenticated" });
        }
        if (!allowed.includes(auth.role)) {
          return reply.code(403).send({ error: "Forbidden: insufficient permissions" });
        }
        (request as { user?: unknown }).user = {
          id: 1,
          username: "operator",
          email: "operator@moonwitness.local",
          role: auth.role,
          displayName: "Operator",
        };
      },
  };

  if (options?.dbPath) {
    await initDb(options.dbPath);
    await syncModels([memoryRecordModel]);
    activeCloseDb = () => closeDb();
  }
  const app = Fastify({ logger: false });
  await app.register(
    async (scope) => {
      await registerMemoryRoutes(scope, { auth: bridge });
    },
    { prefix: "/api/v1" },
  );
  await app.ready();
  return { app, auth };
}

describe("memory bridge routes", () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
    activeCloseDb?.();
    activeCloseDb = null;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }).catch(
        () => {},
      );
    }
  });

  it("rejects unauthenticated callers on all memory endpoints", async () => {
    ({ app } = await loadMemoryApp("http://127.0.0.1:8000", false));

    const status = await app.inject({ method: "GET", url: "/api/v1/memory/status" });
    const knowledge = await app.inject({ method: "GET", url: "/api/v1/memory/knowledge" });
    const exportRes = await app.inject({ method: "GET", url: "/api/v1/memory/export.ndjson" });

    expect(status.statusCode).toBe(401);
    expect(knowledge.statusCode).toBe(401);
    expect(exportRes.statusCode).toBe(401);
  });

  it("reports unconfigured status cleanly and returns 503 for knowledge and export", async () => {
    ({ app } = await loadMemoryApp(undefined));

    const status = await app.inject({ method: "GET", url: "/api/v1/memory/status" });
    expect(status.statusCode).toBe(200);
    expect(status.headers["cache-control"]).toBe("no-store");
    expect(status.json()).toEqual({
      configured: false,
      reachable: false,
      system: null,
      counts: null,
    });

    const knowledge = await app.inject({ method: "GET", url: "/api/v1/memory/knowledge" });
    expect(knowledge.statusCode).toBe(503);

    const exportRes = await app.inject({ method: "GET", url: "/api/v1/memory/export.ndjson" });
    expect(exportRes.statusCode).toBe(503);
  });

  it("blocks invalid non-loopback metadata URLs without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    ({ app } = await loadMemoryApp("http://169.254.169.254"));

    const status = await app.inject({ method: "GET", url: "/api/v1/memory/status" });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      configured: true,
      reachable: false,
      system: null,
      counts: null,
    });
    expect((status.json() as { error?: string }).error).toContain("MEMORY_API_URL");

    const knowledge = await app.inject({ method: "GET", url: "/api/v1/memory/knowledge" });
    expect(knowledge.statusCode).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches status, queries search/list with clamped limits, and exports NDJSON", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/system")) {
        return new Response(
          JSON.stringify({
            mode: "local-first",
            gemini_configured: true,
            gemini_model: "gemini-2.5-flash",
            embeddings_enabled: true,
            embedding_model: "text-embedding-004",
            drive_configured: false,
            moonwitness_sync_configured: true,
            max_upload_gb: 15,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/api/dashboard")) {
        return new Response(
          JSON.stringify({
            archives: 2,
            messages: 1840,
            knowledge: 37,
            active_jobs: 0,
            failed_jobs: 0,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/api/knowledge")) {
        return new Response(
          JSON.stringify([
            {
              id: "k-1",
              kind: "architecture",
              title: "Unified Monorepo Consolidation",
              summary: "Canonical 5-app port map",
              content: "apps/memory runs on web 3005 and backend 8000.",
              tags: ["architecture", "ports"],
              entities: ["moonwitness-memory"],
              source_message_ids: ["m-1"],
              confidence: 0.96,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/api/search")) {
        return new Response(
          JSON.stringify([
            {
              id: "k-2",
              kind: "decision",
              title: "ROCKSOUL Desktop Separation",
              summary: "Standalone Tauri v2 workspace",
              content: "SQLite local vault stays sovereign on desktop.",
              tags: ["rocksoul"],
              entities: ["rocksoul-dx"],
              source_message_ids: [],
              confidence: 0.92,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/api/export.ndjson")) {
        return new Response('{"id":"k-1","title":"Unified Monorepo Consolidation"}\n', {
          status: 200,
          headers: { "content-type": "application/x-ndjson" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    ({ app } = await loadMemoryApp("http://127.0.0.1:8000"));

    const status = await app.inject({ method: "GET", url: "/api/v1/memory/status" });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      configured: true,
      reachable: true,
      system: { mode: "local-first", gemini_model: "gemini-2.5-flash" },
      counts: { archives: 2, knowledge: 37 },
    });

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/memory/knowledge?limit=999",
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toMatchObject({
      configured: true,
      query: "",
      records: [{ id: "k-1", title: "Unified Monorepo Consolidation" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: "http://127.0.0.1:8000/api/knowledge?limit=100" }),
      expect.anything(),
    );

    const searchRes = await app.inject({
      method: "GET",
      url: "/api/v1/memory/knowledge?q=ROCKSOUL&limit=5",
    });
    expect(searchRes.statusCode).toBe(200);
    expect(searchRes.json()).toMatchObject({
      configured: true,
      query: "ROCKSOUL",
      records: [{ id: "k-2", title: "ROCKSOUL Desktop Separation" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: "http://127.0.0.1:8000/api/search?q=ROCKSOUL&limit=5" }),
      expect.anything(),
    );

    const exportRes = await app.inject({
      method: "GET",
      url: "/api/v1/memory/export.ndjson",
    });
    expect(exportRes.statusCode).toBe(200);
    expect(exportRes.headers["cache-control"]).toBe("no-store");
    expect(exportRes.headers["content-type"]).toContain("application/x-ndjson");
    expect(exportRes.body).toContain("Unified Monorepo Consolidation");
  });

  it("degrades status and returns 502 on knowledge/export when upstream fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Upstream error", { status: 500 })),
    );
    ({ app } = await loadMemoryApp("http://127.0.0.1:8000"));

    const status = await app.inject({ method: "GET", url: "/api/v1/memory/status" });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      configured: true,
      reachable: false,
      system: null,
      counts: null,
    });

    const knowledge = await app.inject({ method: "GET", url: "/api/v1/memory/knowledge" });
    expect(knowledge.statusCode).toBe(502);

    const exportRes = await app.inject({ method: "GET", url: "/api/v1/memory/export.ndjson" });
    expect(exportRes.statusCode).toBe(502);
  });

  it("creates, queries, and upserts /memory/entries and /memory/sync with sync token auth", async () => {
    const dbPath = await createMemoryTestDbPath();
    const loaded = await loadMemoryApp(undefined, true, {
      dbPath,
      role: "admin",
      syncToken: "shared-sync-secret-123456",
    });
    app = loaded.app;

    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/memory/entries",
      payload: {
        record_key: "entry-manual-01",
        scope: "global",
        kind: "decision",
        title: "Consolidate Memory UI into Web Console",
        summary: "Merged companion Vite UI into /memory.",
        tags: ["architecture", "memory"],
      },
    });
    expect(createRes.statusCode).toBe(201);
    expect(createRes.json()).toMatchObject({
      data: {
        record_key: "entry-manual-01",
        kind: "decision",
        title: "Consolidate Memory UI into Web Console",
      },
    });

    const dupRes = await app.inject({
      method: "POST",
      url: "/api/v1/memory/entries",
      payload: {
        record_key: "entry-manual-01",
        kind: "decision",
        title: "Duplicate entry key",
      },
    });
    expect(dupRes.statusCode).toBe(409);

    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/memory/entries?q=Consolidate",
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toMatchObject({
      total: 1,
      data: [{ record_key: "entry-manual-01" }],
    });

    loaded.auth.authenticated = false;
    loaded.auth.role = "viewer";

    const badSync = await app.inject({
      method: "POST",
      url: "/api/v1/memory/sync",
      headers: { authorization: "Bearer wrong-token" },
      payload: {
        source: "moonwitness-memory",
        schema_version: 1,
        records: [{ id: "sync-1", kind: "fact", title: "Should reject" }],
      },
    });
    expect(badSync.statusCode).toBe(401);

    const goodSync = await app.inject({
      method: "POST",
      url: "/api/v1/memory/sync",
      headers: { authorization: "Bearer shared-sync-secret-123456" },
      payload: {
        source: "moonwitness-memory",
        schema_version: 1,
        records: [
          {
            id: "witness-claim:c-1",
            kind: "witness.fact",
            title: "Repeater operates on 144.390 MHz",
            summary: "[fact · active] 1 source(s)",
            content: "Verified from primary archive log.",
            tags: ["fact", "witness-ledger"],
            confidence: 1,
          },
          {
            id: "entry-manual-01",
            kind: "decision",
            title: "Consolidate Memory UI into Web Console (Synced)",
            summary: "Updated idempotently by sync worker.",
          },
        ],
      },
    });
    expect(goodSync.statusCode).toBe(200);
    expect(goodSync.json()).toMatchObject({
      ok: true,
      source: "moonwitness-memory",
      schema_version: 1,
      synced: 2,
      record_keys: ["witness-claim:c-1", "entry-manual-01"],
    });

    loaded.auth.authenticated = true;
    loaded.auth.role = "viewer";
    const afterSync = await app.inject({
      method: "GET",
      url: "/api/v1/memory/entries?limit=10",
    });
    expect(afterSync.statusCode).toBe(200);
    expect(afterSync.json()).toMatchObject({ total: 2 });

    const desktopSync = await app.inject({
      method: "POST",
      url: "/api/v1/memory/sync",
      headers: { authorization: "Bearer shared-sync-secret-123456" },
      payload: {
        source: "rocksoul-desktop",
        schema_version: 1,
        records: [
          {
            id: "rocksoul:memory:rs-1",
            record_key: "rocksoul:memory:rs-1",
            scope: "project",
            kind: "continuity.procedural",
            title: "Stay on dev branch",
            summary: "procedural · active (owner)",
            content: "Keep only local dev and main branches.",
            tags: ["rocksoul", "continuity"],
          },
        ],
      },
    });
    expect(desktopSync.statusCode).toBe(200);
    expect(desktopSync.json()).toMatchObject({
      ok: true,
      source: "rocksoul-desktop",
      synced: 1,
      record_keys: ["rocksoul:memory:rs-1"],
    });
  });
});
