import {
  closeDb,
  getDb,
  initD1Db,
  initPostgresDb,
  isPostgresUrl,
  type D1DatabaseLike,
  type OrmDriverHandle,
} from "@moonwitness/orm";
import { AddonRuntimeController, baseManifest } from "@moonwitness/addon-runtime";
import { createProjectAddon } from "@moonwitness/addons/project";

export interface HyperdriveBindingLike {
  readonly connectionString: string;
}

export interface EdgeAssetsBindingLike {
  fetch(request: Request | string): Promise<Response>;
}

export interface EdgeEnv {
  readonly ASSETS?: EdgeAssetsBindingLike;
  readonly HYPERDRIVE?: HyperdriveBindingLike;
  readonly DATABASE_URL?: string;
  readonly DB?: D1DatabaseLike;
  readonly GITHUB_TOKEN?: string;
  readonly DEFAULT_GITHUB_REPO?: string;
}

export interface EdgeRuntimeHandle {
  driver: OrmDriverHandle;
  runtime: AddonRuntimeController;
  order: string[];
}

let cachedRuntime: AddonRuntimeController | null = null;
let cachedOrder: string[] = [];
let syncedConnectionKey: string | null = null;
let lastD1Ref: D1DatabaseLike | null = null;

/** Reset cached isolate boot state (primarily for isolated test runs). */
export function resetEdgeRuntimeState(): void {
  cachedRuntime = null;
  cachedOrder = [];
  syncedConnectionKey = null;
  lastD1Ref = null;
}

async function bootCentralizedAddons(): Promise<{
  runtime: AddonRuntimeController;
  order: string[];
}> {
  const runtime = new AddonRuntimeController();
  const { order } = await runtime.syncAll(
    [
      { manifest: { ...baseManifest, autoInstall: true, defaultEnabled: true } },
      createProjectAddon(),
    ],
    undefined,
    { mode: "edge" },
  );
  cachedRuntime = runtime;
  cachedOrder = order;
  return { runtime, order };
}

/**
 * Initialize `@moonwitness/orm` and boot the centralized `@moonwitness/addons/project`
 * addon via `@moonwitness/addon-runtime` for the current Cloudflare Worker isolate.
 * Prefers PostgreSQL (`HYPERDRIVE` / `DATABASE_URL`) and falls back to Cloudflare D1 (`env.DB`).
 */
export async function ensureEdgeRuntime(env: EdgeEnv): Promise<EdgeRuntimeHandle> {
  const pgUrl =
    env.HYPERDRIVE?.connectionString?.trim() ||
    (env.DATABASE_URL && isPostgresUrl(env.DATABASE_URL) ? env.DATABASE_URL.trim() : "");

  if (pgUrl) {
    let active: OrmDriverHandle | null = null;
    try {
      active = getDb();
    } catch {
      // No active ORM driver initialized yet.
    }

    if (!active || active.dialect !== "postgres" || active.getConnectionString?.() !== pgUrl) {
      if (active) closeDb();
      active = await initPostgresDb(pgUrl);
      syncedConnectionKey = null;
      cachedRuntime = null;
    }

    if (!cachedRuntime || syncedConnectionKey !== `pg:${pgUrl}`) {
      const booted = await bootCentralizedAddons();
      syncedConnectionKey = `pg:${pgUrl}`;
      return { driver: active, runtime: booted.runtime, order: booted.order };
    }

    return { driver: active, runtime: cachedRuntime, order: cachedOrder };
  }

  if (env.DB) {
    const d1Driver = initD1Db(env.DB);
    if (!cachedRuntime || lastD1Ref !== env.DB || syncedConnectionKey !== "d1") {
      const booted = await bootCentralizedAddons();
      lastD1Ref = env.DB;
      syncedConnectionKey = "d1";
      return { driver: d1Driver, runtime: booted.runtime, order: booted.order };
    }
    return { driver: d1Driver, runtime: cachedRuntime, order: cachedOrder };
  }

  throw new Error(
    "No database binding configured for @moonwitness/edge. Bind HYPERDRIVE/DATABASE_URL (PostgreSQL) or DB (Cloudflare D1).",
  );
}
