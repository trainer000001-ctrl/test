import type { FastifyError, FastifyInstance } from "fastify";
import Fastify from "fastify";
import FastifyCookie from "@fastify/cookie";
import FastifyCors from "@fastify/cors";
import { createActorContext } from "@moonwitness/orm";
import {
  AddonRuntimeController,
  baseManifest,
  getEdgeLoopbackErrorPayload,
  getUpstreamBridgeHeaders,
  registerBaseAddon,
  resolveTraceContext,
  resolveUpstreamServiceUrl,
  type AddonDefinition,
  type AddonHostContext,
  type BaseAddonAuthBridge,
  type HostRateLimitFactory,
} from "@moonwitness/addon-runtime";
import { createPlatformAddons } from "@moonwitness/addons";
import { env, parseCorsOrigins } from "./shared/env";
import { assertDemoSeedAllowed } from "./shared/seed-safety";
import {
  createAsyncRateLimiter,
  createOrmRateLimitStore,
  createRateLimiter,
  resolveRateLimitKey,
} from "./infrastructure/rate-limit";
import { registerHealthRoutes, registerMetricsRoute } from "./interface/routes/health.routes";
import { createApiMetricsCollector } from "./interface/routes/metrics";
import {
  optionalAuth,
  requireAuth,
  requireRole,
  resolveRequestTenant,
  type AuthenticatedRequest,
} from "./middleware/auth";

export interface CoreAppOptions {
  prefix?: string;
  /** Load the demo/story-world fixture rows. Off unless explicitly requested. */
  seed?: boolean;
  /** Skip Swagger UI registration. */
  disableDocs?: boolean;
  /** Extra addon definitions registered after platform addons. */
  addons?: AddonDefinition[];
}

function corsOrigin(): string[] | false {
  const configured = parseCorsOrigins(env.CORS_ORIGINS);
  if (configured.length > 0) return configured;
  if (env.NODE_ENV === "production") return false;
  return ["http://localhost:3000"];
}

export function createHostRateLimitPreHandler(options: {
  max: number;
  windowMs: number;
  scope: string;
  message?: string;
}) {
  const useOrmStore = env.RATE_LIMIT_STORE === "orm";
  const syncLimiter = useOrmStore
    ? null
    : createRateLimiter({ max: options.max, windowMs: options.windowMs });
  const asyncLimiter = useOrmStore
    ? createAsyncRateLimiter({
        max: options.max,
        windowMs: options.windowMs,
        store: createOrmRateLimitStore(),
      })
    : null;

  return async (
    request: Parameters<ReturnType<HostRateLimitFactory>>[0],
    reply: Parameters<ReturnType<HostRateLimitFactory>>[1],
  ) => {
    const clientKey = resolveRateLimitKey(
      request.ip,
      request.headers["x-forwarded-for"],
      env.TRUSTED_PROXY_COUNT,
    );
    const result = asyncLimiter
      ? await asyncLimiter.check(`${options.scope}:${clientKey}`)
      : syncLimiter!.check(`${options.scope}:${clientKey}`);
    reply.header("x-ratelimit-limit", options.max);
    reply.header("x-ratelimit-remaining", result.remaining);
    if (!result.allowed) {
      reply.header("retry-after", Math.ceil(result.retryAfterMs / 1000));
      return reply.code(429).send({
        statusCode: 429,
        error: "Too Many Requests",
        message: options.message ?? "too many requests",
        code: "RATE_LIMITED",
      });
    }
    return undefined;
  };
}

export const authBridge: BaseAddonAuthBridge = {
  authenticate: requireAuth(),
  optionalAuthenticate: optionalAuth(),
  requireRole,
  getActorRole: (request) => {
    const role = (request as AuthenticatedRequest).user?.role;
    return role === "admin" || role === "editor" || role === "viewer" ? role : "public";
  },
  getActorId: (request) => {
    const id = (request as AuthenticatedRequest).user?.id;
    return id !== undefined && id !== null ? String(id) : null;
  },
  getActorGroups: (request) => (request as AuthenticatedRequest).user?.groups ?? [],
  getActorTenant: resolveRequestTenant,
  resolveActorContext: (request, source = "api") =>
    createActorContext(
      authBridge.getActorId(request),
      source,
      request.id,
      resolveRequestTenant(request),
    ),
};

export function createAddonHostContext(prefix: string, seedDemo: boolean): AddonHostContext {
  const normalizedPrefix = prefix.replace(/\/+$/, "");
  return {
    prefix: normalizedPrefix,
    auth: authBridge,
    rateLimit: (opts) => createHostRateLimitPreHandler(opts),
    proxy: {
      resolveServiceUrl: (envVar, defaultLocalUrl) =>
        resolveUpstreamServiceUrl(envVar, defaultLocalUrl),
      buildHeaders: (request, baseHeaders) => getUpstreamBridgeHeaders(baseHeaders ?? {}, request),
      checkEdgeLoopback: (serviceName, envVar, urlString) =>
        getEdgeLoopbackErrorPayload(serviceName, envVar, urlString),
    },
    mid: {
      keyEncryptionSecret:
        process.env.MID_KEY_ENCRYPTION_SECRET?.trim() || env.MID_KEY_ENCRYPTION_SECRET,
      issuerUrl:
        process.env.MID_ISSUER_URL?.trim() || env.MID_ISSUER_URL || "https://id.moonwitness.biz.id",
      cookieDomain: process.env.MID_COOKIE_DOMAIN?.trim() || env.MID_COOKIE_DOMAIN,
      corsOrigins: process.env.CORS_ORIGINS ?? env.CORS_ORIGINS,
    },
    seedDemo,
  };
}

async function registerAddonTree(
  target: FastifyInstance,
  host: AddonHostContext,
  extraAddons: AddonDefinition[] = [],
): Promise<void> {
  const runtime = new AddonRuntimeController();
  const prefix = host.prefix;

  const addons: AddonDefinition[] = [
    {
      manifest: { ...baseManifest, autoInstall: true, defaultEnabled: true },
      menus: [
        {
          menu_key: "base.addons",
          label: "Addon Studio",
          href: "/addons",
          icon: "dot",
          plane: "operations",
          sort_order: 95,
          min_role: "admin",
        },
      ],
      register: async () => {
        await registerBaseAddon(target, {
          runtime,
          auth: host.auth,
          apiPrefix: prefix,
        });
      },
    },
    ...createPlatformAddons(host),
    ...extraAddons,
  ];

  await runtime.syncAll(addons, target, {
    runSeeds: true,
    signingPolicy: { mode: env.ADDON_SIGNING_MODE },
  });
}

/**
 * Builds the Node.js Fastify application using whichever `@moonwitness/orm` driver is already initialized.
 */
export async function buildCoreApp(options: CoreAppOptions = {}): Promise<FastifyInstance> {
  const prefix = options.prefix ?? env.API_PREFIX ?? "/api/v1";
  const seed = options.seed ?? process.env.SEED === "1";
  if (seed) {
    assertDemoSeedAllowed({
      nodeEnv: env.NODE_ENV,
      allowDemoSeed: process.env.ALLOW_DEMO_SEED ?? "0",
    });
  }

  const fastify: FastifyInstance = Fastify({
    logger: {
      level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
    },
    disableRequestLogging: false,
    genReqId: (request) => {
      const inbound = request.headers["x-request-id"];
      if (typeof inbound === "string" && inbound.length > 0 && inbound.length <= 200) {
        return inbound;
      }
      return crypto.randomUUID();
    },
  });

  const metrics = createApiMetricsCollector();
  if (!fastify.hasDecorator("metricsCollector")) {
    fastify.decorate("metricsCollector", metrics);
  }

  fastify.addHook("onRequest", async (request, reply) => {
    const trace = resolveTraceContext(request.headers["traceparent"]);
    reply.header("x-request-id", request.id);
    reply.header("traceparent", trace.traceparent);
    request.traceparent = trace.traceparent;
  });

  fastify.addHook("onResponse", async (request, reply) => {
    metrics.observeRequest(request.method, reply.statusCode, reply.elapsedTime);
  });

  await fastify.register(FastifyCookie);
  await fastify.register(FastifyCors, {
    origin: corsOrigin(),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  });

  fastify.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    return payload;
  });

  const maxRequests = Number(env.RATE_LIMIT_MAX);
  if (Number.isFinite(maxRequests) && maxRequests > 0) {
    const windowMs = Number(env.RATE_LIMIT_WINDOW_MS);
    fastify.addHook(
      "onRequest",
      createHostRateLimitPreHandler({ max: maxRequests, windowMs, scope: "global" }),
    );
  }

  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode ?? 500;
    request.log.error({ err: error }, "request failed");
    if (env.NODE_ENV === "production" && status >= 500) {
      return reply.code(status).send({ error: "internal server error" });
    }
    return reply.code(status).send({ error: error.message });
  });

  if (env.NODE_ENV !== "production" && !options.disableDocs) {
    const [{ default: FastifySwagger }, { default: FastifySwaggerUi }] = await Promise.all([
      import("@fastify/swagger"),
      import("@fastify/swagger-ui"),
    ]);
    await fastify.register(FastifySwagger, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "Moonwitness API",
          version: "1.0.0",
          description: "Timeline and witness data API",
        },
        servers: [
          {
            url: `http://${env.HOST}:${env.PORT}`,
            description: "Development server",
          },
        ],
      },
    });
    await fastify.register(FastifySwaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
      },
    });
  }

  if (prefix) {
    await registerMetricsRoute(fastify, metrics);
    await fastify.register(
      async (instance: FastifyInstance) => {
        await registerHealthRoutes(instance, { metrics });
      },
      { prefix },
    );
  } else {
    await registerHealthRoutes(fastify, { metrics });
  }

  const host = createAddonHostContext(prefix, seed);
  await registerAddonTree(fastify, host, options.addons);
  return fastify;
}
