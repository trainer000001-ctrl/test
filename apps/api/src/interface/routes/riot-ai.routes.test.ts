import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import { createSession, createUser, ensureAuthSchema } from "@moonwitness/addons/auth";
import {
  initializeRiotAiPersistence,
  registerRiotAiRoutes,
  setInferenceAuditWriterForTests,
  upsertProviderConfig,
  usageSummaryModel,
  writeInferenceAudit,
  type InferenceAuditRecord,
} from "@moonwitness/addons/ai";
import { initDb, closeDb, createActorContext } from "@moonwitness/orm";
import { env } from "../../shared/env";

const testRiotAuth: BaseAddonAuthBridge = {
  ...defaultFailClosedAuthBridge,
  authenticate: async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieHeader = request.headers.cookie ?? "";
    if (!cookieHeader.includes("mw_session=")) {
      return reply.code(401).send({ error: "Not authenticated" });
    }
    const roleHeader = String(request.headers["x-test-role"] ?? "admin");
    const role = roleHeader === "editor" || roleHeader === "viewer" ? roleHeader : "admin";
    (request as { user?: { id: string; role: string } }).user = {
      id: request.headers["x-test-actor"] === "first" ? "1" : "2",
      role,
    };
  },
  requireRole:
    (...roles) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const cookieHeader = request.headers.cookie ?? "";
      if (!cookieHeader.includes("mw_session=")) {
        return reply.code(401).send({ error: "Not authenticated" });
      }
      const rawRole = String(request.headers["x-test-role"] ?? "admin");
      const role: "admin" | "editor" | "viewer" =
        rawRole === "editor" || rawRole === "viewer" ? rawRole : "admin";
      if (!roles.includes(role)) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      (request as { user?: { id: string; role: string } }).user = {
        id: request.headers["x-test-actor"] === "first" ? "1" : "2",
        role,
      };
    },
};

describe("RIOT Intelligence inference routes", () => {
  let app: FastifyInstance | null = null;
  const auditRecords: InferenceAuditRecord[] = [];
  const previousEnvironment = {
    databaseUrl: process.env.DATABASE_URL,
  };
  const previousRuntime = {
    baseUrl: env.RIOT_AI_BASE_URL,
    model: env.RIOT_AI_MODEL,
    limit: env.RIOT_AI_RATE_LIMIT_MAX,
  };
  const ownerHeaders = { cookie: "mw_session=test-session", "x-test-role": "admin" };
  let auditOutput: { mockRestore: () => void } | null = null;
  let inferenceAuditOutput: string[] = [];

  afterEach(async () => {
    await app?.close();
    app = null;
    await closeDb();
    vi.unstubAllGlobals();
    auditOutput?.mockRestore();
    auditOutput = null;
    inferenceAuditOutput = [];
    setInferenceAuditWriterForTests();
    if (previousRuntime.baseUrl === undefined) delete env.RIOT_AI_BASE_URL;
    else env.RIOT_AI_BASE_URL = previousRuntime.baseUrl;
    if (previousRuntime.model === undefined) delete env.RIOT_AI_MODEL;
    else env.RIOT_AI_MODEL = previousRuntime.model;
    env.RIOT_AI_RATE_LIMIT_MAX = previousRuntime.limit;
    if (previousEnvironment.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousEnvironment.databaseUrl;
  });

  async function createApp(baseUrl?: string): Promise<FastifyInstance> {
    if (baseUrl) env.RIOT_AI_BASE_URL = baseUrl;
    else delete env.RIOT_AI_BASE_URL;
    env.RIOT_AI_MODEL = "llama3.2";
    closeDb();
    const databaseUrl = `file:${crypto.randomUUID()}.db`;
    env.DATABASE_URL = databaseUrl;
    await initDb(databaseUrl);
    await ensureAuthSchema();
    await initializeRiotAiPersistence();
    auditRecords.length = 0;
    setInferenceAuditWriterForTests();
    const server = Fastify({ logger: false });
    await server.register(async (scope) => {
      await registerRiotAiRoutes(scope, { auth: testRiotAuth, runtime: env });
    });
    await server.ready();
    app = server;
    return server;
  }

  async function createRateLimitedApp(): Promise<FastifyInstance> {
    env.RIOT_AI_BASE_URL = "http://127.0.0.1:11434";
    env.RIOT_AI_MODEL = "llama3.2";
    env.RIOT_AI_RATE_LIMIT_MAX = 1;
    closeDb();
    const databaseUrl = `file:${crypto.randomUUID()}.db`;
    env.DATABASE_URL = databaseUrl;
    await initDb(databaseUrl);
    await ensureAuthSchema();
    await initializeRiotAiPersistence();
    const server = Fastify({ logger: false });
    await server.register(async (scope) => {
      await registerRiotAiRoutes(scope, { auth: testRiotAuth, runtime: env });
    });
    await server.ready();
    app = server;
    return server;
  }

  async function createConfiguredApp(baseUrl: string): Promise<FastifyInstance> {
    env.RIOT_AI_BASE_URL = baseUrl;
    env.RIOT_AI_MODEL = "llama3.2";
    closeDb();
    const databaseUrl = `file:${crypto.randomUUID()}.db`;
    env.DATABASE_URL = databaseUrl;
    await initDb(databaseUrl);
    await ensureAuthSchema();
    await initializeRiotAiPersistence();
    auditRecords.length = 0;
    setInferenceAuditWriterForTests();
    const server = Fastify({ logger: false });
    await server.register(async (scope) => {
      await registerRiotAiRoutes(scope, { auth: testRiotAuth, runtime: env });
    });
    await server.ready();
    app = server;
    return server;
  }

  async function authorizedHeaders(): Promise<Record<string, string>> {
    const user = await createUser({
      username: `riot-editor-${crypto.randomUUID()}`,
      email: `riot-editor-${crypto.randomUUID()}@example.test`,
      password: "correct-horse-battery-staple",
      role: "editor",
      displayName: "RIOT Editor",
    });
    const sessionId = await createSession(user.id);
    return { cookie: `mw_session=${sessionId}` };
  }

  async function enableInference(headers: Record<string, string>): Promise<void> {
    const actorId = headers["x-test-actor"] === "first" ? "1" : "2";
    await upsertProviderConfig(
      {
        profileKey: "default",
        label: "Local runtime",
        enabled: true,
        preferredModel: env.RIOT_AI_MODEL ?? "llama3.2",
      },
      createActorContext(actorId, "api"),
    );
  }

  async function seedUsage(actorId: string, promptTokens: number | null): Promise<void> {
    await usageSummaryModel.repository.create(
      {
        actor_id: actorId,
        provider: "ollama",
        model: "llama3.2",
        outcome: "success",
        duration_ms: 120,
        prompt_tokens: promptTokens,
        completion_tokens: null,
        total_tokens: null,
        error_code: null,
        occurred_at: new Date().toISOString(),
      },
      createActorContext(actorId, "api"),
    );
  }

  it("rejects anonymous access and denies viewer mutations", async () => {
    const server = await createApp("http://127.0.0.1:11434");
    const anonymous = await server.inject({ method: "GET", url: "/riot-ai/models" });
    expect(anonymous.statusCode).toBe(401);

    const denied = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers: { ...(await authorizedHeaders()), "x-test-role": "viewer" },
      payload: { requestId: "test", messages: [{ role: "user", content: "hello" }] },
    });
    expect(denied.statusCode).toBe(403);
  });

  it("limits editor model visibility to the enabled preferred model", async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "llama3.2" }, { id: "other-model" }] }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", upstream);
    const server = await createApp("http://127.0.0.1:11434");
    const headers = { ...ownerHeaders, "x-test-actor": "first" };
    await enableInference(headers);
    const response = await server.inject({
      method: "GET",
      url: "/riot-ai/models",
      headers: { ...ownerHeaders, "x-test-role": "editor" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().models.map((model: { id: string }) => model.id)).toEqual(["llama3.2"]);
  });

  it("returns an explicit unconfigured response and does not call an upstream", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const server = await createApp();
    const config = await server.inject({
      method: "GET",
      url: "/riot-ai/config",
      headers: await authorizedHeaders(),
    });
    expect(config.statusCode).toBe(200);
    expect(config.json()).toMatchObject({
      config: { enabled: false, preferredModel: "llama3.2" },
      endpoint: "not-configured",
    });
    const response = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers: await authorizedHeaders(),
      payload: { requestId: "test", messages: [{ role: "user", content: "hello" }] },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: "local inference runtime is not configured" });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("does not reveal internal runtime diagnostics to editors", async () => {
    const secretHost = "private-internal.example";
    const server = await createConfiguredApp(`http://${secretHost}:11434`);
    const headers = await authorizedHeaders();
    const health = await server.inject({ method: "GET", url: "/riot-ai/health", headers });
    const models = await server.inject({ method: "GET", url: "/riot-ai/models", headers });

    expect(health.statusCode).toBe(503);
    expect(health.body).not.toContain(secretHost);
    expect(models.statusCode).toBe(503);
    expect(models.body).not.toContain(secretHost);
  });

  it("reports a rejected runtime endpoint without exposing its value", async () => {
    const secretHost = "private-internal.example";
    const server = await createConfiguredApp(`http://${secretHost}:11434`);

    const response = await server.inject({
      method: "GET",
      url: "/riot-ai/health",
      headers: await authorizedHeaders(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "misconfigured",
      provider: "ollama",
    });
    expect(response.body).not.toContain(secretHost);
  });

  it("uses only the configured runtime endpoint and returns normalized chat results", async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chat-1",
          model: "llama3.2",
          created: 1_700_000_000,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "reply" },
              finish_reason: "stop",
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const server = await createApp("http://127.0.0.1:11434");
    const operatorHeaders = { ...ownerHeaders, "x-test-actor": "first" };
    await enableInference(operatorHeaders);
    const response = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers: operatorHeaders,
      payload: {
        requestId: "test",
        model: "llama3.2",
        messages: [{ role: "user", content: "hello" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      provider: "ollama",
      choices: [{ message: { content: "reply" } }],
    });
    expect(upstream).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.any(Object),
    );
    inferenceAuditOutput = [];
    auditOutput = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      inferenceAuditOutput.push(String(chunk));
      return true;
    });
    writeInferenceAudit({
      actorId: "test-actor",
      requestId: "request-1",
      provider: "ollama",
      model: "llama3.2",
      outcome: "success",
      durationMs: 1,
      usage: { promptTokens: null, completionTokens: null, totalTokens: null },
    });
    expect(inferenceAuditOutput).toHaveLength(1);
    expect(inferenceAuditOutput[0]).toContain('"event":"riot_ai.inference"');
    expect(inferenceAuditOutput.join("")).not.toContain("hello");
  });

  it("rejects malformed, oversized, and client-controlled upstream requests", async () => {
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chat-safe",
          model: "llama3.2",
          created: 1_700_000_000,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "safe" },
              finish_reason: "stop",
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const server = await createApp("http://127.0.0.1:11434");
    const headers = { ...ownerHeaders, "x-test-actor": "first" };
    await enableInference(headers);
    const malformed = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers,
      payload: { requestId: "test", messages: [] },
    });
    expect(malformed.statusCode).toBe(400);

    const oversized = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers,
      payload: {
        requestId: "test",
        messages: [{ role: "user", content: "x".repeat(70_000) }],
      },
    });
    expect(oversized.statusCode).toBe(413);

    const arbitraryTarget = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers,
      payload: {
        requestId: "test",
        baseUrl: "http://169.254.169.254",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(arbitraryTarget.statusCode).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("limits available models and chat to the configured model policy", async () => {
    process.env.RIOT_AI_MODEL = "llama3.2";
    const upstream = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: "llama3.2" }, { id: "unapproved-model" }],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const server = await createApp("http://127.0.0.1:11434");
    const headers = { ...ownerHeaders, "x-test-actor": "first" };
    await enableInference(headers);
    const models = await server.inject({ method: "GET", url: "/riot-ai/models", headers });

    expect(models.statusCode).toBe(200);
    expect(models.json().models.map((model: { id: string }) => model.id)).toEqual(["llama3.2"]);

    const modelOverride = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers,
      payload: {
        requestId: "test",
        model: "unapproved-model",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(modelOverride.statusCode).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("persists operator model preferences and enforces administrator authorization", async () => {
    const upstream = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "llama3.2" }] }), {
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "chat-preferred",
            model: "llama3.2",
            created: 1_700_000_000,
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "preferred reply" },
                finish_reason: "stop",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", upstream);
    const server = await createApp("http://127.0.0.1:11434");
    const editorHeaders = { ...ownerHeaders, "x-test-role": "editor" };
    const operatorHeaders = { ...ownerHeaders, "x-test-actor": "first" };
    const denied = await server.inject({
      method: "PUT",
      url: "/riot-ai/config",
      headers: editorHeaders,
      payload: {
        label: "Private runtime",
        enabled: false,
        preferredModel: "llama3.2",
      },
    });
    expect(denied.statusCode).toBe(403);

    const saved = await server.inject({
      method: "PUT",
      url: "/riot-ai/config",
      headers: operatorHeaders,
      payload: {
        label: "Private runtime",
        enabled: false,
        preferredModel: "llama3.2",
      },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({
      config: {
        profileKey: "default",
        label: "Private runtime",
        enabled: false,
        preferredModel: "llama3.2",
      },
      endpoint: "server-configured",
    });

    const enabled = await server.inject({
      method: "PUT",
      url: "/riot-ai/config",
      headers: operatorHeaders,
      payload: {
        label: "Private runtime",
        enabled: true,
        preferredModel: "llama3.2",
      },
    });
    expect(enabled.statusCode).toBe(200);
    const chat = await server.inject({
      method: "POST",
      url: "/riot-ai/chat",
      headers: operatorHeaders,
      payload: {
        requestId: "preferred",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(chat.statusCode).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(upstream.mock.calls[1]?.[1]?.body).toContain('"model":"llama3.2"');
  });

  it("reports unavailable token metrics when any usage measurement is missing", async () => {
    const server = await createApp("http://127.0.0.1:11434");
    await seedUsage("1", 10);

    const response = await server.inject({
      method: "GET",
      url: "/riot-ai/usage",
      headers: ownerHeaders,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().summary).toMatchObject({
      measurement: "measured",
      truncated: false,
      requests: 1,
      successful: 1,
      promptTokens: { value: 10, measurement: "measured" },
      completionTokens: { value: null, measurement: "unavailable" },
      totalTokens: { value: null, measurement: "unavailable" },
    });
  });

  it("marks capped usage totals as estimates rather than partial measured totals", async () => {
    const server = await createApp("http://127.0.0.1:11434");
    for (let index = 0; index < 3; index += 1) {
      await seedUsage(String(index), 10);
    }

    const response = await server.inject({
      method: "GET",
      url: "/riot-ai/usage?limit=2",
      headers: ownerHeaders,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().entries).toHaveLength(2);
    expect(response.json().summary).toMatchObject({
      measurement: "estimated",
      truncated: true,
      requests: null,
      successful: null,
      promptTokens: { value: null, measurement: "estimated", estimatedValue: 30 },
    });
  });

  it("isolates persisted usage summaries to administrators", async () => {
    const server = await createApp("http://127.0.0.1:11434");
    await seedUsage("1", 10);

    const forbidden = await server.inject({
      method: "GET",
      url: "/riot-ai/usage",
      headers: { ...(await authorizedHeaders()), "x-test-role": "editor" },
    });
    expect(forbidden.statusCode).toBe(403);

    const summary = await server.inject({
      method: "GET",
      url: "/riot-ai/usage",
      headers: { ...ownerHeaders, "x-test-actor": "first" },
    });
    expect(summary.statusCode).toBe(200);
    expect(summary.json().entries[0]).toMatchObject({
      actorId: "1",
      model: "llama3.2",
      promptTokens: 10,
      completionTokens: null,
      totalTokens: null,
    });
  });

  it("applies the dedicated inference rate limit after authentication", async () => {
    const previousLimit = env.RIOT_AI_RATE_LIMIT_MAX;
    try {
      const server = await createRateLimitedApp();
      const headers = await authorizedHeaders();
      const first = await server.inject({
        method: "POST",
        url: "/riot-ai/chat",
        headers,
        payload: { requestId: "first", messages: [{ role: "user", content: "hello" }] },
      });
      const second = await server.inject({
        method: "POST",
        url: "/riot-ai/chat",
        headers,
        payload: { requestId: "second", messages: [{ role: "user", content: "hello" }] },
      });

      expect(first.statusCode).toBe(503);
      expect(second.statusCode).toBe(429);
      expect(second.headers["retry-after"]).toBeDefined();
    } finally {
      env.RIOT_AI_RATE_LIMIT_MAX = previousLimit;
    }
  });

  it("validates the inference endpoint policy at production startup", async () => {
    const { validateProductionEnv, env } = await import("../../shared/env");
    expect(
      validateProductionEnv({
        ...env,
        NODE_ENV: "production",
        DATABASE_URL: "file:prod.db",
        CORS_ORIGINS: "https://moonwitness.example",
        STORAGE_ACCESS_KEY: "configured",
        STORAGE_SECRET_KEY: "configured",
        RIOT_AI_BASE_URL: "http://10.1.2.3:11434",
      }),
    ).toContain("RIOT_AI_BASE_URL must use HTTPS except for a loopback local runtime.");
  });

  it("keys the inference rate limit by the socket peer so forwarded headers cannot mint buckets", async () => {
    const previousLimit = env.RIOT_AI_RATE_LIMIT_MAX;
    try {
      const server = await createRateLimitedApp();
      const headers = await authorizedHeaders();
      const attempts = [];
      for (let index = 0; index < 2; index += 1) {
        attempts.push(
          await server.inject({
            method: "POST",
            url: "/riot-ai/chat",
            headers: {
              ...headers,
              "x-forwarded-for": `198.51.100.${index + 1}`,
            },
            payload: {
              requestId: `forwarded-${index}`,
              messages: [{ role: "user", content: "hello" }],
            },
          }),
        );
      }
      expect(attempts[0]!.statusCode).toBe(503);
      expect(attempts[1]!.statusCode).toBe(429);
    } finally {
      env.RIOT_AI_RATE_LIMIT_MAX = previousLimit;
    }
  });

  it("refuses an inference runtime endpoint that resolves to the metadata service", async () => {
    const { validateProductionEnv } = await import("../../shared/env");
    const problems = validateProductionEnv({
      ...env,
      NODE_ENV: "production",
      DATABASE_URL: "file:prod.db",
      CORS_ORIGINS: "https://moonwitness.example",
      STORAGE_ACCESS_KEY: "configured",
      STORAGE_SECRET_KEY: "configured",
      RIOT_AI_BASE_URL: "http://169.254.169.254:80",
    });
    expect(problems).toContain(
      "RIOT_AI_BASE_URL must not target private, link-local, or metadata network ranges.",
    );
  });
});
