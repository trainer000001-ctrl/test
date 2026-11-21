import type { FastifyInstance, FastifyReply } from "fastify";
import { getDb } from "@moonwitness/orm";
import { irAddonModel, probeOptionalOpsServices } from "@moonwitness/addon-runtime";
import {
  createApiMetricsCollector,
  type AddonMetricSummary,
  type ApiMetricsCollector,
} from "./metrics";

export interface HealthRoutesOptions {
  metrics?: ApiMetricsCollector;
}

async function readAddonMetricSummary(): Promise<AddonMetricSummary | undefined> {
  try {
    const rows = await irAddonModel.repository.find();
    if (rows.length === 0) return undefined;
    let installed = 0;
    let disabled = 0;
    for (const row of rows) {
      if (row.state === "disabled") disabled += 1;
      else installed += 1;
    }
    return { total: rows.length, installed, disabled };
  } catch {
    return undefined;
  }
}

/**
 * Registers Prometheus `/metrics` exposition endpoint on a Fastify instance or prefix plugin.
 */
export async function registerMetricsRoute(
  fastify: FastifyInstance,
  metrics: ApiMetricsCollector = createApiMetricsCollector(),
): Promise<void> {
  fastify.get("/metrics", async (_request, reply) => {
    const addonSummary = await readAddonMetricSummary();
    return reply
      .code(200)
      .header("content-type", "text/plain; version=0.0.4; charset=utf-8")
      .header("cache-control", "no-store")
      .send(metrics.renderPrometheus(addonSummary));
  });
}

/**
 * Liveness, readiness, and Prometheus telemetry endpoints.
 *
 * Liveness (`/healthz`, `/health`, `/health/live`) reports only that the process is running.
 * Readiness (`/readyz`, `/health/ready`) additionally verifies database connectivity and returns
 * 503 when the database is unreachable, without leaking error details.
 */
export async function registerHealthRoutes(
  fastify: FastifyInstance,
  options: HealthRoutesOptions = {},
): Promise<void> {
  const liveHandler = async () => ({ status: "ok" });
  fastify.get("/healthz", liveHandler);
  fastify.get("/health", liveHandler);
  fastify.get("/health/live", liveHandler);

  const readyHandler = async (_request: unknown, reply: FastifyReply) => {
    let database = "ok";
    try {
      await getDb().get("SELECT 1 AS ok");
    } catch {
      database = "unavailable";
    }

    if (database !== "ok") {
      return reply.code(503).send({ status: "unavailable", database });
    }
    const services = await probeOptionalOpsServices({ timeoutMs: 250 });
    return reply.code(200).send({ status: "ready", database, services });
  };
  fastify.get("/readyz", readyHandler);
  fastify.get("/health/ready", readyHandler);

  await registerMetricsRoute(fastify, options.metrics);
}
