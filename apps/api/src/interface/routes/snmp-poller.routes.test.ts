import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { closeDb } from "@moonwitness/orm";

import { defaultFailClosedAuthBridge, type BaseAddonAuthBridge } from "@moonwitness/addon-runtime";
import { registerSnmpRoutes } from "@moonwitness/addons/snmp";

async function loadRoutes(allowWrite: boolean) {
  const auth: BaseAddonAuthBridge = {
    ...defaultFailClosedAuthBridge,
    authenticate: async () => {},
    requireRole: () =>
      allowWrite
        ? async () => {}
        : async (
            _request: unknown,
            reply: { code: (status: number) => { send: (body: unknown) => unknown } },
          ) => {
            reply.code(403).send({ error: "Forbidden: insufficient permissions" });
          },
  };
  return async (instance: FastifyInstance) => registerSnmpRoutes(instance, { auth });
}

describe("SNMP poller proxy", () => {
  let app: FastifyInstance | null = null;
  const tempDirs: string[] = [];

  afterEach(async () => {
    await app?.close();
    app = null;
    closeDb();
    vi.unstubAllGlobals();
    vi.doUnmock("../../middleware/auth");
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore Windows transient SQLite file locks.
      }
    }
  });

  it("redacts nested community and credential fields from upstream JSON", async () => {
    const routes = await loadRoutes(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "device-1",
            community: "private",
            targets: [{ name: "sysName", authPassword: "private", value: "router" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    app = Fastify({ logger: false });
    await app.register(routes);
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/snmp/devices" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "device-1",
      targets: [{ name: "sysName", value: "router" }],
    });
  });

  it("rejects device creation when the role gate denies the caller", async () => {
    const routes = await loadRoutes(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    app = Fastify({ logger: false });
    await app.register(routes);
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/snmp/devices",
      payload: { name: "rogue", host: "192.0.2.1" },
    });

    expect(response.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects target deletion when the role gate denies the caller", async () => {
    const routes = await loadRoutes(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    app = Fastify({ logger: false });
    await app.register(routes);
    await app.ready();

    const response = await app.inject({
      method: "DELETE",
      url: "/snmp/targets/target-1",
    });

    expect(response.statusCode).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mirrors POST /snmp/devices version='3' into snmp_devices.snmp_version='v3'", async () => {
    const routes = await loadRoutes(true);
    const orm = await import("@moonwitness/orm");
    const snmp = await import("@moonwitness/addons/snmp");
    const dir = mkdtempSync(join(tmpdir(), "mw-snmp-dev-"));
    tempDirs.push(dir);
    await orm.initDb(join(dir, "snmp.db"));
    await orm.syncModels([snmp.snmpDeviceModel, snmp.snmpTargetModel]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "dev-v3",
            name: "core-router",
            host: "10.0.0.1",
            port: 161,
            version: "3",
            enabled: true,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    app = Fastify({ logger: false });
    await app.register(routes);
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/snmp/devices",
      payload: { name: "core-router", host: "10.0.0.1", version: "3" },
    });

    expect(response.statusCode).toBe(201);
    const devices = await snmp.snmpDeviceModel.repository.find({ device_key: "dev-v3" });
    orm.closeDb();
    expect(devices).toHaveLength(1);
    expect(devices[0]?.snmp_version).toBe("v3");
  });

  it("mirrors POST /snmp/devices/:id/targets into snmp_targets label and interval_sec", async () => {
    const routes = await loadRoutes(true);
    const orm = await import("@moonwitness/orm");
    const snmp = await import("@moonwitness/addons/snmp");
    const dir = mkdtempSync(join(tmpdir(), "mw-snmp-tgt-"));
    tempDirs.push(dir);
    await orm.initDb(join(dir, "snmp.db"));
    await orm.syncModels([snmp.snmpDeviceModel, snmp.snmpTargetModel]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "tgt-1",
            oid: "1.3.6.1.2.1.1.3.0",
            name: "sysUpTime",
            interval_sec: 30,
            enabled: true,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    app = Fastify({ logger: false });
    await app.register(routes);
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/snmp/devices/dev-v3/targets",
      payload: { oid: "1.3.6.1.2.1.1.3.0", name: "sysUpTime", interval_sec: 30 },
    });

    expect(response.statusCode).toBe(201);
    const targets = await snmp.snmpTargetModel.repository.find({ target_key: "tgt-1" });
    orm.closeDb();
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      target_key: "tgt-1",
      device_key: "dev-v3",
      oid: "1.3.6.1.2.1.1.3.0",
      label: "sysUpTime",
      interval_sec: 30,
      enabled: true,
    });
  });
});
