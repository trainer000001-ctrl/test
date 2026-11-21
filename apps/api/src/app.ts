import type { AddonDefinition } from "@moonwitness/addon-runtime";
import { initDb, closeDb } from "@moonwitness/orm";
import type { FastifyInstance } from "fastify";
import { env, resolveApiDatabaseUrl } from "./shared/env";
import { buildCoreApp } from "./bootstrap";

export interface BootstrapOptions {
  dbPath?: string;
  prefix?: string;
  /** Load the demo/story-world fixture rows. Off unless explicitly requested. */
  seed?: boolean;
  /** Extra addon definitions registered after platform addons. */
  addons?: AddonDefinition[];
}

export async function buildApp(options: BootstrapOptions = {}): Promise<FastifyInstance> {
  const dbPath = resolveApiDatabaseUrl(env.DATABASE_URL, env.NODE_ENV, options.dbPath);
  await initDb(dbPath);
  try {
    const fastify = await buildCoreApp({
      prefix: options.prefix,
      seed: options.seed,
      addons: options.addons,
    });
    fastify.addHook("onClose", async () => {
      closeDb();
    });
    return fastify;
  } catch (error) {
    closeDb();
    throw error;
  }
}
