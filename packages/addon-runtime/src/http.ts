import { randomBytes, randomUUID } from "node:crypto";
import { computeMTimeSolarLunarEstimate, MTIME_OBSERVER_SITES } from "@moonwitness/canon";
import {
  ConflictError,
  createActorContext,
  modelRegistry,
  PolicyError,
  ValidationError,
  type ActorContext,
} from "@moonwitness/orm";
import type { AddonRuntimeController, CustomFieldRegistrationInput, RpcRequestPayload } from "./controller";
import { normalizePlatformRole } from "./security";
import type { BaseAddonAuthBridge, PlatformRole, ViewSpec, ViewType } from "./types";

/* ---------- Trace & Upstream Bridge Helpers (shared with apps/api) ---------- */
export function resolveTraceContext(traceparentHeader?: string | string[]): {
  traceId: string;
  spanId: string;
  traceparent: string;
} {
  const raw = Array.isArray(traceparentHeader) ? traceparentHeader[0] : traceparentHeader;
  const match = raw?.trim().match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i);
  const traceId = match ? match[1]!.toLowerCase() : randomBytes(16).toString("hex");
  const spanId = randomBytes(8).toString("hex");
  return {
    traceId,
    spanId,
    traceparent: `00-${traceId}-${spanId}-01`,
  };
}

export function resolveUpstreamServiceUrl(envVar: string, defaultLocalUrl: string): string {
  const configured = process.env[envVar]?.trim();
  return (configured || defaultLocalUrl).replace(/\/+$/, "");
}

export function getUpstreamBridgeHeaders(
  baseHeaders: Record<string, string> = {},
  request?: { id?: string; traceparent?: string; headers?: Record<string, unknown> },
): Record<string, string> {
  const headers: Record<string, string> = { ...baseHeaders };
  if (request?.id) headers["x-request-id"] = String(request.id);
  if (request?.traceparent) headers["traceparent"] = request.traceparent;
  const tenant = request?.headers?.["x-tenant-id"];
  if (typeof tenant === "string" && tenant.trim()) {
    headers["x-tenant-id"] = tenant.trim();
  }
  return headers;
}

export function getEdgeLoopbackErrorPayload(
  serviceName: string,
  envVar: string,
  urlString: string,
): { error: string; code: string } | null {
  if (process.env.NODE_ENV !== "production") return null;
  try {
    const parsed = new URL(urlString);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
      return {
        error: `Service '${serviceName}' points to loopback '${urlString}'. Configure ${envVar} for production.`,
        code: "EDGE_LOOPBACK_MISCONFIGURED",
      };
    }
  } catch {
    return {
      error: `Invalid upstream URL '${urlString}' for '${serviceName}' (${envVar}).`,
      code: "INVALID_UPSTREAM_URL",
    };
  }
  return null;
}

/* ---------- Framework-Agnostic Platform HTTP / RPC Gateway ---------- */
export interface PlatformAuthUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly display_name: string;
  readonly role: "admin" | "editor" | "viewer";
}

export interface PlatformAuthAdapter {
  readonly cookieName?: string;
  readonly hasClaimedAdmin: () => Promise<boolean>;
  readonly claimInitialAdmin: (input: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<PlatformAuthUser>;
  readonly authenticate: (identity: string, password: string) => Promise<PlatformAuthUser | null>;
  readonly createSession: (userId: string) => Promise<{ token: string; expiresAt: string }>;
  readonly resolveSession: (token: string) => Promise<PlatformAuthUser | null>;
  readonly revokeSession: (token: string) => Promise<boolean>;
  readonly registerUser?: (input: {
    username: string;
    email: string;
    password: string;
    role?: "admin" | "editor" | "viewer";
    displayName?: string;
  }) => Promise<PlatformAuthUser>;
}

export interface PlatformActorResolverOptions {
  /**
   * Default role for embedded local development when no explicit session cookie or role header is present.
   * Defaults to "admin" in non-production preview mode so the integrated console is immediately operable,
   * while still honoring real session cookies, logout state, and explicit `x-mw-role` / `x-mw-actor` headers.
   */
  readonly defaultRole?: PlatformRole;
  readonly resolveActor?: (request: Request) => Promise<ActorContext> | ActorContext;
  readonly authAdapter?: PlatformAuthAdapter;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function isSecureRequest(request: Request, url: URL): boolean {
  const fwdProto = request.headers.get("x-forwarded-proto")?.toLowerCase();
  return url.protocol === "https:" || fwdProto === "https";
}

function buildCookieHeader(
  name: string,
  value: string,
  secure: boolean,
  maxAgeSeconds: number,
): string {
  const base = `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}`;
  return secure
    ? `${base}; Secure; SameSite=None; Partitioned`
    : `${base}; SameSite=Lax`;
}

function assertCsrfSafeForCookieMutation(request: Request, url: URL): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  // Custom non-simple headers cannot be forged cross-origin without CORS preflight
  if (request.headers.get("x-requested-with") || request.headers.get("x-csrf-token")) {
    return;
  }

  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser / same-origin server fetch

  try {
    const originHost = new URL(origin).host.toLowerCase();
    const expectedHosts = new Set<string>([url.host.toLowerCase()]);
    const hostHdr = request.headers.get("host")?.toLowerCase();
    const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
    if (hostHdr) expectedHosts.add(hostHdr);
    if (fwdHost) expectedHosts.add(fwdHost);
    if (!expectedHosts.has(originHost)) {
      throw new PolicyError(
        "Cross-origin state-changing request rejected by CSRF protection.",
        "CSRF_FORBIDDEN",
        403,
      );
    }
  } catch (err) {
    if (err instanceof PolicyError) throw err;
    throw new PolicyError("Invalid Origin header.", "CSRF_FORBIDDEN", 403);
  }
}

function roleGroups(role: PlatformRole): string[] {
  if (role === "admin") return ["base.group_system", "base.group_user"];
  if (role === "editor") return ["base.group_editor", "base.group_user"];
  if (role === "viewer") return ["base.group_user"];
  return [];
}

function defaultResolveActor(request: Request, fallbackRole: PlatformRole): ActorContext {
  const headerRole = request.headers.get("x-mw-role")?.trim();
  const role: PlatformRole = headerRole ? normalizePlatformRole(headerRole) : fallbackRole;
  const actorId =
    request.headers.get("x-mw-actor")?.trim() ||
    (role === "public" ? null : `operator-${role}`);
  const tenantId = request.headers.get("x-tenant-id")?.trim() || "default";
  const groupsRaw = request.headers.get("x-mw-groups")?.trim();
  const groups = groupsRaw
    ? groupsRaw
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
    : roleGroups(role);
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();

  return createActorContext(actorId, "api", requestId, tenantId, { role, groups });
}

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string | string[]>): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      if (Array.isArray(v)) {
        for (const item of v) headers.append(k, item);
      } else {
        headers.set(k, v);
      }
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function mapErrorToResponse(err: unknown): Response {
  if (err instanceof PolicyError) {
    return jsonResponse({ error: err.message, code: err.code }, err.statusCode);
  }
  if (err instanceof ValidationError) {
    return jsonResponse({ error: err.message, code: err.code, issues: err.issues }, err.statusCode);
  }
  if (err instanceof ConflictError) {
    return jsonResponse(
      {
        error: err.message,
        code: err.code,
        expectedVersion: err.expectedVersion,
        actualVersion: err.actualVersion,
      },
      err.statusCode,
    );
  }
  const message = err instanceof Error ? err.message : "Internal platform error";
  return jsonResponse({ error: message, code: "INTERNAL_ERROR" }, 500);
}

async function safeParseJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new ValidationError("Request JSON body must be an object.");
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Malformed JSON request body.");
  }
}

const RESERVED_QUERY_KEYS = new Set([
  "limit",
  "offset",
  "orderBy",
  "q",
  "with",
  "fields",
  "domain",
  "includeArchived",
  "includeDeleted",
  "groupBy",
]);

function buildFiltersFromSearchParams(params: URLSearchParams): Record<string, unknown> {
  const domainRaw = params.get("domain");
  const filter: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (RESERVED_QUERY_KEYS.has(key) || value === "") continue;
    filter[key] = value;
  }
  if (domainRaw) {
    try {
      const parsed = JSON.parse(domainRaw) as unknown;
      if (Array.isArray(parsed)) {
        return { ...filter, __tupleDomain: parsed };
      }
    } catch {
      throw new ValidationError("Invalid JSON in 'domain' query parameter.");
    }
  }
  return filter;
}

export function createPlatformHttpHandler(
  runtime: AddonRuntimeController,
  options: PlatformActorResolverOptions = {},
): (request: Request, subpath: string) => Promise<Response> {
  const defaultRole: PlatformRole =
    options.defaultRole ?? (process.env.NODE_ENV === "production" ? "public" : "admin");

  return async (request: Request, rawSubpath: string): Promise<Response> => {
    const method = request.method.toUpperCase();
    const url = new URL(request.url);
    const subpath = rawSubpath.replace(/^\/+/, "").replace(/\/+$/, "");
    const segments = subpath ? subpath.split("/").map((s) => decodeURIComponent(s)) : [];

    try {
      const authAdapter = options.authAdapter;
      const cookieName = authAdapter?.cookieName ?? "mw_session";
      const cookies = parseCookies(request.headers.get("cookie"));
      const sessionToken = cookies[cookieName];
      const explicitLoggedOut = cookies["mw_logged_out"] === "1";
      const secureCookie = isSecureRequest(request, url);

      let authenticatedUser: PlatformAuthUser | null = null;
      let authenticatedViaCookie = false;
      if (authAdapter && sessionToken) {
        authenticatedUser = await authAdapter.resolveSession(sessionToken);
        authenticatedViaCookie = Boolean(authenticatedUser);
      }

      if (authenticatedViaCookie) {
        assertCsrfSafeForCookieMutation(request, url);
      }

      const tenantId = request.headers.get("x-tenant-id")?.trim() || "default";
      const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();

      const actor = authenticatedUser
        ? createActorContext(authenticatedUser.id, "api", requestId, tenantId, {
            role: authenticatedUser.role,
            groups: roleGroups(authenticatedUser.role),
          })
        : options.resolveActor
          ? await options.resolveActor(request)
          : defaultResolveActor(request, explicitLoggedOut ? "public" : defaultRole);
      const role = normalizePlatformRole(actor.role);

      // 1. Health, Celestial M-Time & Real Auth Routes
      if (subpath === "health" && method === "GET") {
        return jsonResponse({
          ok: true,
          service: "moonwitness-platform-runtime",
          activeAddons: runtime.getActiveAddonNames().length,
          activeModels: runtime.listActiveModels().length,
        });
      }

      if (subpath === "celestial/now" && method === "GET") {
        const now = new Date();
        const estimate = computeMTimeSolarLunarEstimate(now.toISOString(), MTIME_OBSERVER_SITES[0]!);
        const hijriMonths = [
          "Muharram",
          "Safar",
          "Rabi al-Awwal",
          "Rabi al-Thani",
          "Jumada al-Ula",
          "Jumada al-Akhirah",
          "Rajab",
          "Sha'ban",
          "Ramadan",
          "Shawwal",
          "Dhu al-Qi'dah",
          "Dhu al-Hijjah",
        ];
        const lunarDay = Math.max(1, Math.min(30, Math.floor(estimate.moonAgeDays) + 1));
        const hijriYear = Math.floor((now.getUTCFullYear() - 622) * 1.030684) + 1;
        const hijriMonth = ((now.getUTCMonth() + 4) % 12) + 1;
        const monthName = hijriMonths[hijriMonth - 1] ?? "Muharram";
        const phaseName =
          estimate.moonAgeDays < 1.8
            ? "New Moon"
            : estimate.moonAgeDays < 7.4
              ? "Waxing Crescent"
              : estimate.moonAgeDays < 11.1
                ? "First Quarter"
                : estimate.moonAgeDays < 14.8
                  ? "Waxing Gibbous"
                  : estimate.moonAgeDays < 16.6
                    ? "Full Moon"
                    : estimate.moonAgeDays < 22.1
                      ? "Waning Gibbous"
                      : estimate.moonAgeDays < 25.8
                        ? "Last Quarter"
                        : "Waning Crescent";
        return jsonResponse({
          hijri: {
            year: hijriYear,
            month: hijriMonth,
            day: lunarDay,
            monthName,
          },
          lunar: {
            phaseName,
            illumination: Math.round(estimate.illuminatedPercent),
          },
          aeq4: {
            mode: "AEQ4-CANON",
            formatted: `M-${hijriYear}.${String(hijriMonth).padStart(2, "0")}.${String(lunarDay).padStart(2, "0")}`,
            hijriBridge: `${lunarDay} ${monthName} ${hijriYear} AH`,
          },
        });
      }

      if (subpath === "auth/status" && method === "GET") {
        const hasAdmin = authAdapter ? await authAdapter.hasClaimedAdmin() : true;
        const envManaged = Boolean(process.env.MW_ADMIN_PASSCODE?.trim());
        return jsonResponse({
          needsBootstrap: Boolean(authAdapter && !hasAdmin && !envManaged),
          envManaged,
          authenticated: role !== "public",
          sessionBacked: Boolean(authenticatedUser),
        });
      }

      if (subpath === "auth/bootstrap" && method === "POST") {
        if (!authAdapter) {
          return jsonResponse({ error: "Auth adapter unavailable.", code: "AUTH_UNAVAILABLE" }, 503);
        }
        const body = await safeParseJsonBody(request);
        const username = String(body.username ?? "admin").trim();
        const email = String(body.email ?? "admin@moonwitness.local").trim();
        const password = String(body.password ?? "");
        const displayName = String(body.displayName ?? body.display_name ?? "Sovereign Admin").trim();
        const created = await authAdapter.claimInitialAdmin({ username, email, password, displayName });
        const session = await authAdapter.createSession(created.id);
        return jsonResponse(
          {
            ok: true,
            user: {
              id: created.id,
              username: created.username,
              email: created.email,
              displayName: created.display_name,
              role: created.role,
              groups: roleGroups(created.role),
              tenantId,
            },
          },
          201,
          {
            "set-cookie": [
              buildCookieHeader(cookieName, session.token, secureCookie, 7 * 24 * 60 * 60),
              buildCookieHeader("mw_logged_out", "", secureCookie, 0),
            ],
          },
        );
      }

      if (subpath === "auth/login" && method === "POST") {
        if (!authAdapter) {
          return jsonResponse({ error: "Auth adapter unavailable.", code: "AUTH_UNAVAILABLE" }, 503);
        }
        const body = await safeParseJsonBody(request);
        const identity = String(body.identity ?? body.username ?? body.email ?? "").trim();
        const password = String(body.password ?? "");
        if (!identity || !password) {
          throw new ValidationError("Identity and password are required.");
        }
        const user = await authAdapter.authenticate(identity, password);
        if (!user) {
          return jsonResponse({ error: "Invalid operator credentials.", code: "INVALID_CREDENTIALS" }, 401);
        }
        const session = await authAdapter.createSession(user.id);
        return jsonResponse(
          {
            ok: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.display_name,
              role: user.role,
              groups: roleGroups(user.role),
              tenantId,
            },
          },
          200,
          {
            "set-cookie": [
              buildCookieHeader(cookieName, session.token, secureCookie, 7 * 24 * 60 * 60),
              buildCookieHeader("mw_logged_out", "", secureCookie, 0),
            ],
          },
        );
      }

      if (subpath === "auth/register" && method === "POST") {
        if (!authAdapter?.registerUser) {
          return jsonResponse({ error: "Registration unavailable.", code: "AUTH_UNAVAILABLE" }, 503);
        }
        if (role !== "admin") {
          return jsonResponse({ error: "Admin role required to provision operators.", code: "FORBIDDEN" }, 403);
        }
        const body = await safeParseJsonBody(request);
        const username = String(body.username ?? "").trim();
        const email = String(body.email ?? "").trim();
        const password = String(body.password ?? "");
        const requestedRole = String(body.role ?? "viewer");
        const targetRole =
          requestedRole === "admin" || requestedRole === "editor" || requestedRole === "viewer"
            ? requestedRole
            : "viewer";
        if (!username || !email || password.length < 8) {
          throw new ValidationError("Username, valid email, and password (8+ chars) are required.");
        }
        const created = await authAdapter.registerUser({
          username,
          email,
          password,
          role: targetRole,
          displayName: String(body.displayName ?? body.display_name ?? username),
        });
        return jsonResponse(
          {
            ok: true,
            user: {
              id: created.id,
              username: created.username,
              email: created.email,
              displayName: created.display_name,
              role: created.role,
            },
          },
          201,
        );
      }

      if (subpath === "auth/logout" && method === "POST") {
        if (authAdapter && sessionToken) {
          await authAdapter.revokeSession(sessionToken);
        }
        return jsonResponse(
          { ok: true },
          200,
          {
            "set-cookie": [
              buildCookieHeader(cookieName, "", secureCookie, 0),
              buildCookieHeader("mw_logged_out", "1", secureCookie, 7 * 24 * 60 * 60),
            ],
          },
        );
      }

      if (subpath === "auth/me" && method === "GET") {
        if (authenticatedUser) {
          return jsonResponse({
            authenticated: true,
            sessionBacked: true,
            user: {
              id: authenticatedUser.id,
              username: authenticatedUser.username,
              email: authenticatedUser.email,
              displayName: authenticatedUser.display_name,
              role: authenticatedUser.role,
              groups: roleGroups(authenticatedUser.role),
              tenantId,
            },
          });
        }
        if (role === "public") {
          return jsonResponse({ authenticated: false, sessionBacked: false, user: null }, 200);
        }
        return jsonResponse({
          authenticated: true,
          sessionBacked: false,
          user: {
            id: actor.actorId ?? "operator-admin",
            username: actor.actorId ?? "operator-admin",
            displayName: role === "admin" ? "Platform Architect" : `Operator (${role})`,
            role,
            groups: actor.groups ?? [],
            tenantId: actor.tenantId,
          },
        });
      }

      // 2. Metadata & Addon Lifecycle API: /_meta/*
      if (segments[0] === "_meta") {
        // GET /_meta/models
        if (segments[1] === "models" && segments.length === 2 && method === "GET") {
          return jsonResponse({ models: runtime.listActiveModels() });
        }

        // POST /_meta/models/:model/fields
        if (segments[1] === "models" && segments[3] === "fields" && segments[2] && method === "POST") {
          const body = await safeParseJsonBody(request);
          const field = await runtime.registerCustomField(
            segments[2],
            body as unknown as CustomFieldRegistrationInput,
            actor,
          );
          return jsonResponse({ field }, 201);
        }

        // GET /_meta/navigation
        if (segments[1] === "navigation" && method === "GET") {
          return jsonResponse({ menus: runtime.getMenus(actor) });
        }

        // GET /_meta/views/:model
        if (segments[1] === "views" && segments[2] && method === "GET") {
          const descriptor = runtime.getViewDescriptor(segments[2], actor);
          if (!descriptor) {
            return jsonResponse(
              { error: `No active model or view descriptor for '${segments[2]}'.`, code: "NOT_FOUND" },
              404,
            );
          }
          return jsonResponse(descriptor);
        }

        // POST /_meta/views/:model (Studio View Editor persistence)
        if (segments[1] === "views" && segments[2] && method === "POST") {
          const body = await safeParseJsonBody(request);
          const viewType = (body.view_type ?? "list") as ViewType;
          const spec = (body.spec ?? body) as ViewSpec;
          const saved = await runtime.saveStudioViewOverride(segments[2], viewType, spec, actor);
          return jsonResponse({ view: saved }, 200);
        }

        // DELETE /_meta/views/:model (Reset Studio View Editor override)
        if (segments[1] === "views" && segments[2] && method === "DELETE") {
          const viewType = (url.searchParams.get("view_type") ?? "list") as ViewType;
          const result = await runtime.resetStudioViewOverride(segments[2], viewType, actor);
          return jsonResponse(result, 200);
        }

        // GET /_meta/addons
        if (segments[1] === "addons" && segments.length === 2 && method === "GET") {
          if (role === "public") {
            return jsonResponse({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
          }
          if (role !== "admin") {
            return jsonResponse({ error: "Admin role required", code: "FORBIDDEN" }, 403);
          }
          return jsonResponse({ addons: runtime.listAddons() });
        }

        // POST /_meta/addons/:name/enable | disable
        if (
          segments[1] === "addons" &&
          segments[2] &&
          (segments[3] === "enable" || segments[3] === "disable") &&
          method === "POST"
        ) {
          if (role === "public") {
            return jsonResponse({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
          }
          if (role !== "admin") {
            return jsonResponse({ error: "Admin role required", code: "FORBIDDEN" }, 403);
          }
          const updated =
            segments[3] === "enable"
              ? await runtime.enable(segments[2])
              : await runtime.disable(segments[2]);
          return jsonResponse({ addon: updated });
        }

        return jsonResponse({ error: `Unknown metadata endpoint '/${subpath}'` }, 404);
      }

      // 3. Domain shorthand routes guarded by addon activation
      if (subpath === "timeline/events" && method === "GET") {
        if (!runtime.isEnabled("timeline")) {
          return jsonResponse({ error: "Addon 'timeline' is disabled.", code: "ADDON_DISABLED" }, 503);
        }
        const model = modelRegistry.get("timeline.event");
        if (!model) return jsonResponse({ data: [] });
        const rows = await model.repository.forActor(actor).find({}, { limit: 100 });
        return jsonResponse({ data: rows });
      }

      if (subpath === "canon/overview" && method === "GET") {
        if (!runtime.isEnabled("canon-lore")) {
          return jsonResponse({ error: "Addon 'canon-lore' is disabled.", code: "ADDON_DISABLED" }, 503);
        }
        const codex = modelRegistry.get("canon.codex");
        const count = codex ? await codex.repository.forActor(actor).count() : 0;
        return jsonResponse({ addon: "canon-lore", status: "active", codexCount: count });
      }

      // 4. Canonical RPC endpoint: POST /rpc
      if (subpath === "rpc" && method === "POST") {
        const body = await safeParseJsonBody(request);
        const result = await runtime.executeRpc(body as unknown as RpcRequestPayload, actor);
        return jsonResponse({ result });
      }

      // 5. Generic ORM REST Gateway: /m/:model...
      if (segments[0] === "m" && segments[1]) {
        const modelName = segments[1];
        if (!runtime.isModelActive(modelName)) {
          return jsonResponse(
            { error: `Model '${modelName}' is unavailable (addon disabled or unregistered).`, code: "ADDON_DISABLED" },
            503,
          );
        }
        const model = modelRegistry.get(modelName);
        if (!model || !model.restEnabled) {
          return jsonResponse({ error: `Model '${modelName}' does not expose REST access.` }, 404);
        }
        const activeAddons = runtime.getActiveAddonSet();
        const scoped = model.repository.forActor(actor);

        // GET /m/:model/read-group?groupBy=...
        if (segments[2] === "read-group" && method === "GET") {
          runtime.security.assertModelAccess(modelName, "read", actor, activeAddons);
          const groupBy = url.searchParams.get("groupBy")?.trim();
          if (!groupBy) {
            throw new ValidationError("Query parameter 'groupBy' is required.");
          }
          const rawFilter = buildFiltersFromSearchParams(url.searchParams);
          delete rawFilter.__tupleDomain;
          const effFilter = runtime.mergeRuleFilter(modelName, "read", rawFilter, actor);
          const groups = await scoped.readGroup(groupBy, effFilter, {
            q: url.searchParams.get("q") ?? undefined,
          });
          return jsonResponse({ groups });
        }

        // POST /m/:model/call/:action
        if (segments[2] === "call" && segments[3] && method === "POST") {
          const body = await safeParseJsonBody(request);
          const result = await runtime.executeAction(modelName, segments[3], actor, { input: body });
          return jsonResponse({ data: result });
        }

        // Collection: GET /m/:model, POST /m/:model
        if (segments.length === 2) {
          if (method === "GET") {
            runtime.security.assertModelAccess(modelName, "read", actor, activeAddons);
            const rawFilter = buildFiltersFromSearchParams(url.searchParams);
            const tupleDomain = rawFilter.__tupleDomain as unknown[] | undefined;
            delete rawFilter.__tupleDomain;
            const withParam = url.searchParams.get("with");
            const fieldsParam = url.searchParams.get("fields");
            const baseFilter = tupleDomain
              ? runtime.mergeRuleFilter(modelName, "read", rawFilter, actor)
              : runtime.mergeRuleFilter(modelName, "read", rawFilter, actor);

            const rawWith = withParam ? withParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
            const wantsTrackingValues =
              modelName === "mail.message" && rawWith.includes("tracking_values");
            const ormWith = rawWith.filter((r) => r !== "tracking_values");

            const rows = tupleDomain
              ? await scoped.search(tupleDomain, {
                  limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100,
                  offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
                  orderBy: url.searchParams.get("orderBy") ?? undefined,
                  q: url.searchParams.get("q") ?? undefined,
                  with: ormWith.length ? ormWith : undefined,
                  fields: fieldsParam ? fieldsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
                  includeArchived: url.searchParams.get("includeArchived") === "true",
                })
              : await scoped.find(baseFilter, {
                  limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100,
                  offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
                  orderBy: url.searchParams.get("orderBy") ?? undefined,
                  q: url.searchParams.get("q") ?? undefined,
                  with: ormWith.length ? ormWith : undefined,
                  fields: fieldsParam ? fieldsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
                  includeArchived: url.searchParams.get("includeArchived") === "true",
                });

            if (wantsTrackingValues && rows.length > 0) {
              const trackingModel = modelRegistry.get("mail.tracking.value");
              if (trackingModel) {
                const msgIds = rows.map((r) => String(r.id));
                const trackingRows = await trackingModel.repository
                  .forActor(actor)
                  .find({ message_id: { $in: msgIds } }, { limit: 500 });
                const byMsg = new Map<string, Array<Record<string, unknown>>>();
                for (const tr of trackingRows) {
                  const mid = String(tr.message_id ?? "");
                  const list = byMsg.get(mid) ?? [];
                  list.push(tr);
                  byMsg.set(mid, list);
                }
                const enriched = rows.map((r) => ({
                  ...r,
                  $tracking_values: byMsg.get(String(r.id)) ?? [],
                }));
                return jsonResponse({ data: enriched, total: enriched.length });
              }
            }

            return jsonResponse({ data: rows, total: rows.length });
          }

          if (method === "POST") {
            runtime.security.assertModelAccess(modelName, "create", actor, activeAddons);
            const body = await safeParseJsonBody(request);
            const created = await scoped.create(body);
            return jsonResponse({ data: created }, 201);
          }
        }

        // Record operations: /m/:model/:id...
        const recordId = segments[2];
        if (recordId) {
          // GET /m/:model/:id
          if (segments.length === 3 && method === "GET") {
            runtime.security.assertModelAccess(modelName, "read", actor, activeAddons);
            const withParam = url.searchParams.get("with");
            const rows = await scoped.find(
              runtime.mergeRuleFilter(modelName, "read", { id: recordId }, actor),
              {
                limit: 1,
                includeArchived: true,
                with: withParam ? withParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
              },
            );
            if (!rows[0]) {
              return jsonResponse({ error: `Record '${recordId}' not found.`, code: "NOT_FOUND" }, 404);
            }
            return jsonResponse({ data: rows[0] });
          }

          // PATCH /m/:model/:id
          if (segments.length === 3 && method === "PATCH") {
            runtime.security.assertModelAccess(modelName, "update", actor, activeAddons);
            const allowed = await scoped.find(
              runtime.mergeRuleFilter(modelName, "update", { id: recordId }, actor),
              { limit: 1, includeArchived: true },
            );
            if (!allowed[0]) {
              return jsonResponse({ error: `Record '${recordId}' not found or forbidden.`, code: "NOT_FOUND" }, 404);
            }
            const body = await safeParseJsonBody(request);
            const updated = await scoped.update(recordId, body);
            return jsonResponse({ data: updated });
          }

          // DELETE /m/:model/:id
          if (segments.length === 3 && method === "DELETE") {
            runtime.security.assertModelAccess(modelName, "delete", actor, activeAddons);
            const allowed = await scoped.find(
              runtime.mergeRuleFilter(modelName, "delete", { id: recordId }, actor),
              { limit: 1, includeArchived: true },
            );
            if (!allowed[0]) {
              return jsonResponse({ error: `Record '${recordId}' not found or forbidden.`, code: "NOT_FOUND" }, 404);
            }
            const deleted = await scoped.delete(recordId);
            return jsonResponse({ data: deleted });
          }

          // POST /m/:model/:id/archive
          if (segments[3] === "archive" && method === "POST") {
            runtime.security.assertModelAccess(modelName, "update", actor, activeAddons);
            const archived = await scoped.archive(recordId);
            if (!archived) return jsonResponse({ error: "Not found" }, 404);
            return jsonResponse({ data: archived });
          }

          // POST /m/:model/:id/restore
          if (segments[3] === "restore" && method === "POST") {
            runtime.security.assertModelAccess(modelName, "update", actor, activeAddons);
            const restored = await scoped.restore(recordId);
            if (!restored) return jsonResponse({ error: "Not found" }, 404);
            return jsonResponse({ data: restored });
          }

          // GET /m/:model/:id/history
          if (segments[3] === "history" && method === "GET") {
            runtime.security.assertModelAccess(modelName, "read", actor, activeAddons);
            const history = await scoped.history(recordId);
            return jsonResponse({ data: history });
          }

          // POST /m/:model/:id/call/:action
          if (segments[3] === "call" && segments[4] && method === "POST") {
            const body = await safeParseJsonBody(request);
            const result = await runtime.executeAction(modelName, segments[4], actor, {
              id: recordId,
              input: body,
            });
            return jsonResponse({ data: result });
          }
        }
      }

      return jsonResponse({ error: `Platform route '/${subpath}' not found.`, code: "NOT_FOUND" }, 404);
    } catch (err) {
      return mapErrorToResponse(err);
    }
  };
}

/**
 * Fastify adapter used by `apps/api/src/bootstrap.ts` so both Fastify (`apps/api`)
 * and embedded Next.js (`apps/web`) share the exact same canonical Platform Runtime gateway.
 */
export async function registerBaseAddon(
  fastify: {
    all: (
      path: string,
      optsOrHandler: unknown,
      handler?: (req: unknown, reply: unknown) => Promise<unknown>,
    ) => void;
    get: (path: string, handler: (req: unknown, reply: unknown) => Promise<unknown>) => void;
  },
  options: {
    runtime: AddonRuntimeController;
    auth: BaseAddonAuthBridge;
    apiPrefix?: string;
  },
): Promise<void> {
  const prefix = (options.apiPrefix ?? "/api/v1").replace(/\/+$/, "");
  const handler = createPlatformHttpHandler(options.runtime, {
    defaultRole: "public",
    resolveActor: async (webReq) => {
      const role = normalizePlatformRole(webReq.headers.get("x-mw-role"));
      const actorId = webReq.headers.get("x-mw-actor");
      const tenant = webReq.headers.get("x-tenant-id") ?? "default";
      const groups = (webReq.headers.get("x-mw-groups") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return createActorContext(actorId, "api", webReq.headers.get("x-request-id") ?? undefined, tenant, {
        role,
        groups,
      });
    },
  });

  const dispatchFastify = async (
    req: {
      method: string;
      url: string;
      headers: Record<string, string | string[] | undefined>;
      body?: unknown;
      id?: string;
    },
    reply: {
      code: (status: number) => {
        headers: (h: Record<string, string>) => { send: (body: unknown) => unknown };
      };
    },
    subpath: string,
  ) => {
    await options.auth.optionalAuthenticate(req, reply);
    const role = options.auth.getActorRole(req);
    const actorId = options.auth.getActorId(req);
    const groups = options.auth.getActorGroups(req);
    const tenant = options.auth.getActorTenant(req);

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
    }
    headers.set("x-mw-role", role);
    if (actorId) headers.set("x-mw-actor", actorId);
    if (groups.length) headers.set("x-mw-groups", groups.join(","));
    headers.set("x-tenant-id", tenant);
    if (req.id) headers.set("x-request-id", req.id);

    const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined;
    const webReq = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers,
      body: hasBody ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) : undefined,
    });

    const webRes = await handler(webReq, subpath);
    const text = await webRes.text();
    const outHeaders: Record<string, string> = {};
    webRes.headers.forEach((val, key) => {
      outHeaders[key] = val;
    });
    return reply.code(webRes.status).headers(outHeaders).send(text);
  };

  fastify.get("/_meta/models", async (req, reply) =>
    dispatchFastify(req as never, reply as never, "_meta/models"),
  );

  for (const mount of ["auth/*", "_meta/*", "m/*", "rpc", "celestial/*", "timeline/*", "canon/*"]) {
    fastify.all(`${prefix}/${mount}`, async (req: unknown, reply: unknown) => {
      const r = req as { url: string };
      const cleanPath = r.url.split("?")[0] ?? "";
      const subpath = cleanPath.startsWith(`${prefix}/`)
        ? cleanPath.slice(prefix.length + 1)
        : cleanPath.replace(/^\/+/, "");
      return dispatchFastify(req as never, reply as never, subpath);
    });
  }
}
