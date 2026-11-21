import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { initDb } from "@moonwitness/orm";
import {
  AddonRuntimeController,
  createPlatformHttpHandler,
} from "@moonwitness/addon-runtime";
import { createPlatformAddons } from "@moonwitness/addons";
import {
  SESSION_COOKIE_NAME,
  authenticateWithPassword,
  claimInitialAdmin,
  createSessionRecord,
  createUser,
  hasClaimedAdmin,
  resolveSessionByToken,
  revokeSessionByToken,
} from "@moonwitness/addons/auth";

interface EmbeddedPlatformState {
  runtime: AddonRuntimeController;
  handler: (request: Request, subpath: string) => Promise<Response>;
}

declare global {
  var __mwEmbeddedPlatformPromise: Promise<EmbeddedPlatformState> | undefined;
}

async function bootEmbeddedPlatform(): Promise<EmbeddedPlatformState> {
  const dbPath =
    process.env.MW_PLATFORM_DB_PATH?.trim() ||
    join(tmpdir(), "moonwitness-platform", "moonwitness-platform.db");
  mkdirSync(dirname(dbPath), { recursive: true });

  await initDb(dbPath);
  const runtime = new AddonRuntimeController();
  const addons = createPlatformAddons(undefined, { includeBase: true });
  await runtime.syncAll(addons, undefined, {
    runSeeds: true,
    apiPrefix: "/api/v1",
  });

  const handler = createPlatformHttpHandler(runtime, {
    defaultRole: "admin",
    authAdapter: {
      cookieName: SESSION_COOKIE_NAME,
      hasClaimedAdmin,
      claimInitialAdmin: async (input) => {
        const created = await claimInitialAdmin(input);
        return {
          id: created.id,
          username: String(created.username),
          email: String(created.email),
          display_name: String(created.display_name || created.username),
          role: created.role as "admin" | "editor" | "viewer",
        };
      },
      authenticate: authenticateWithPassword,
      createSession: createSessionRecord,
      resolveSession: resolveSessionByToken,
      revokeSession: revokeSessionByToken,
      registerUser: async (input) => {
        const created = await createUser(input);
        return {
          id: created.id,
          username: String(created.username),
          email: String(created.email),
          display_name: String(created.display_name || created.username),
          role: created.role as "admin" | "editor" | "viewer",
        };
      },
    },
  });

  return { runtime, handler };
}

export async function getEmbeddedPlatform(): Promise<EmbeddedPlatformState> {
  if (!globalThis.__mwEmbeddedPlatformPromise) {
    globalThis.__mwEmbeddedPlatformPromise = bootEmbeddedPlatform().catch((err) => {
      globalThis.__mwEmbeddedPlatformPromise = undefined;
      throw err;
    });
  }
  return globalThis.__mwEmbeddedPlatformPromise;
}

export async function handleEmbeddedPlatformRequest(
  request: Request,
  subpath: string,
): Promise<Response> {
  const { handler } = await getEmbeddedPlatform();
  return handler(request, subpath);
}
