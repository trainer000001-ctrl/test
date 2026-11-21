import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import {
  TimelineErasResponseSchema,
  TimelineEventResponseSchema,
  TimelineListQuerySchema,
  TimelineListResponseSchema,
  TimelineStatsResponseSchema,
} from "@moonwitness/contracts";
import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import { registerTimelineRoutes, type ITimelineRepository } from "@moonwitness/addons/timeline";

const testAuth: BaseAddonAuthBridge = {
  ...defaultFailClosedAuthBridge,
  optionalAuthenticate: async (request) => {
    (request as { user?: { id: string; role: string } }).user = {
      id: "1",
      role: "editor",
    };
  },
  authenticate: async () => {},
  requireRole: () => async () => {},
};

describe("@moonwitness/contracts timeline parity", () => {
  let app: FastifyInstance | null = null;

  beforeEach(async () => {
    const sampleEvent = {
      id: "evt-1",
      kind: "PROJECT" as const,
      date: "2026-11-18",
      era: "origins" as const,
      title: "Contract Parity Check",
      excerpt: "Verifies API payloads against @moonwitness/contracts.",
      body: "Full body text",
      location: "Zone A",
      tags: ["contracts"],
      sources: 1,
      notes: 1,
      image: "hero-witness" as const,
      related: [],
    };

    const repository: ITimelineRepository = {
      listEvents: async () => ({ data: [sampleEvent], total: 1 }),
      getEvent: async (id) => (id === "evt-1" ? sampleEvent : null),
      getStats: async () => ({ total: 1, byEra: { origins: 1 }, byKind: { PROJECT: 1 } }),
      getEras: async () => [
        {
          id: "origins",
          name: "Origins",
          years: "2024–2026",
          tagline: "Foundation",
          color: "#d4af37",
        },
      ],
      createEvent: async (input) => ({ ...sampleEvent, ...input, id: input.id ?? "evt-created" }),
      updateEvent: async (_id, patch) => ({ ...sampleEvent, ...patch }),
      archiveEvent: async () => sampleEvent,
      restoreEvent: async () => sampleEvent,
      deleteEvent: async () => sampleEvent,
      getEventHistory: async () => [],
      upsertEra: async (era) => era,
    };

    app = Fastify({ logger: false });
    await app.register(
      async (scope) => {
        await registerTimelineRoutes(scope, { auth: testAuth, repository });
      },
      { prefix: "/api/v1/timeline" },
    );
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("validates timeline list, single event, stats, and eras responses against shared contract schemas", async () => {
    expect(TimelineListQuerySchema.safeParse({ era: "origins", limit: 10 }).success).toBe(true);

    const listRes = await app!.inject({ method: "GET", url: "/api/v1/timeline/events?limit=10" });
    expect(listRes.statusCode).toBe(200);
    expect(TimelineListResponseSchema.safeParse(listRes.json()).success).toBe(true);

    const itemRes = await app!.inject({ method: "GET", url: "/api/v1/timeline/events/evt-1" });
    expect(itemRes.statusCode).toBe(200);
    expect(TimelineEventResponseSchema.safeParse(itemRes.json()).success).toBe(true);

    const statsRes = await app!.inject({ method: "GET", url: "/api/v1/timeline/stats" });
    expect(statsRes.statusCode).toBe(200);
    expect(TimelineStatsResponseSchema.safeParse(statsRes.json()).success).toBe(true);

    const erasRes = await app!.inject({ method: "GET", url: "/api/v1/timeline/eras" });
    expect(erasRes.statusCode).toBe(200);
    expect(TimelineErasResponseSchema.safeParse(erasRes.json()).success).toBe(true);
  });
});
