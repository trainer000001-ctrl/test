/**
 * Authentication middleware
 * Validates session cookie and attaches user to request
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { DEFAULT_TENANT_ID, normalizeTenantId } from "@moonwitness/orm";
import { resolveAuthIdentityFromRequest, SESSION_COOKIE_NAME } from "@moonwitness/addons/auth";

export interface AuthenticatedRequest extends FastifyRequest {
  tenantId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: "admin" | "editor" | "viewer";
    displayName: string;
    tenantId?: string;
    companyId?: string;
    companyIds?: string[];
    groups?: string[];
  };
}

type AuthenticatedUser = NonNullable<AuthenticatedRequest["user"]>;

/**
 * Resolves effective tenant/company id (`res.company.slug`):
 * - Admins can switch to any normalized `x-tenant-id`.
 * - Non-admin users can switch `x-tenant-id` only to companies in their `companyIds` (`res.users.company_ids`).
 */
export function resolveRequestTenant(request: FastifyRequest): string {
  const typedReq = request as AuthenticatedRequest;
  const user = typedReq.user;
  if (!user) return DEFAULT_TENANT_ID;
  const defaultTenant = user.tenantId
    ? normalizeTenantId(user.tenantId)
    : user.companyId
      ? normalizeTenantId(user.companyId)
      : DEFAULT_TENANT_ID;
  const rawHeader = request.headers["x-tenant-id"];
  const candidateHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (typeof candidateHeader === "string" && candidateHeader.trim()) {
    try {
      const normalized = normalizeTenantId(candidateHeader);
      if (user.role === "admin" || user.companyIds?.includes(normalized)) {
        return normalized;
      }
    } catch {
      return defaultTenant;
    }
  }
  return defaultTenant;
}

/** Resolve caller identity from session cookie or MoonWitness ID Bearer JWT. */
export async function resolveRequestIdentity(request: FastifyRequest): Promise<{
  user: AuthenticatedUser | null;
  expiredSessionCookie: boolean;
}> {
  return resolveAuthIdentityFromRequest(request);
}

async function resolveAuthenticatedUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedUser | null> {
  if (request.method === "OPTIONS") return null;

  const typedReq = request as AuthenticatedRequest;
  if (typedReq.user) return typedReq.user;

  const { user, expiredSessionCookie } = await resolveRequestIdentity(request);
  if (!user) {
    if (expiredSessionCookie) {
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      reply.code(401).send({ error: "Session expired or invalid" });
    } else {
      reply.code(401).send({ error: "Not authenticated" });
    }
    return null;
  }

  typedReq.user = user;
  typedReq.tenantId = resolveRequestTenant(typedReq);
  return typedReq.user;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  await resolveAuthenticatedUser(request, reply);
}

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await resolveAuthenticatedUser(request, reply);
  };
}

export function requireRole(...allowedRoles: ("admin" | "editor" | "viewer")[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveAuthenticatedUser(request, reply);
    if (!user) return;

    if (!allowedRoles.includes(user.role)) {
      return reply.code(403).send({ error: "Forbidden: insufficient permissions" });
    }
  };
}

export function optionalAuth() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (request.method === "OPTIONS") return;
    const typedReq = request as AuthenticatedRequest;
    if (typedReq.user) {
      typedReq.tenantId = resolveRequestTenant(typedReq);
      return;
    }
    const { user } = await resolveRequestIdentity(request);
    if (user) {
      typedReq.user = user;
      typedReq.tenantId = resolveRequestTenant(typedReq);
    }
  };
}
