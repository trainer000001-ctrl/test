import {
  compileTupleDomainToFilter,
  PolicyError,
  type ActorContext,
} from "@moonwitness/orm";
import type {
  EffectiveAcl,
  ModelAclDefinition,
  PlatformRole,
  RecordRuleDefinition,
} from "./types";

const ROLE_RANK: Record<PlatformRole, number> = {
  public: 0,
  viewer: 1,
  editor: 2,
  admin: 3,
};

export function normalizePlatformRole(role?: string | null): PlatformRole {
  if (role === "admin" || role === "editor" || role === "viewer" || role === "public") {
    return role;
  }
  return "public";
}

export function roleMeetsMinimum(actorRole: PlatformRole, minRole: PlatformRole): boolean {
  return ROLE_RANK[actorRole] >= ROLE_RANK[minRole];
}

function substituteActorPlaceholders(domain: unknown[], actor: ActorContext): unknown[] {
  return domain.map((token) => {
    if (!Array.isArray(token) || token.length !== 3) return token;
    const [field, op, rawVal] = token;
    if (rawVal === "$actor.id") return [field, op, actor.actorId];
    if (rawVal === "$actor.tenantId") return [field, op, actor.tenantId];
    if (rawVal === "$actor.role") return [field, op, actor.role ?? "public"];
    return token;
  });
}

export class SecurityRegistry {
  private readonly acls: ModelAclDefinition[] = [];
  private readonly rules = new Map<string, RecordRuleDefinition>();

  registerAcl(acl: ModelAclDefinition): void {
    const idx = this.acls.findIndex(
      (item) =>
        item.model === acl.model &&
        item.role === acl.role &&
        item.group === acl.group &&
        item.addon === acl.addon,
    );
    if (idx >= 0) this.acls[idx] = acl;
    else this.acls.push(acl);
  }

  registerRule(rule: RecordRuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  unregisterByAddon(addonName: string): void {
    for (let i = this.acls.length - 1; i >= 0; i -= 1) {
      if (this.acls[i]?.addon === addonName) this.acls.splice(i, 1);
    }
    for (const [id, rule] of this.rules.entries()) {
      if (rule.addon === addonName) this.rules.delete(id);
    }
  }

  /**
   * Resolves effective model-level CRUD ACL for an actor.
   * Admin always receives full access unless explicitly overridden by a deny rule;
   * otherwise explicit model ACL rules apply, falling back to safe platform defaults:
   * - editor: read, create, update (no delete unless granted)
   * - viewer: read only
   * - public: read only if explicitly declared
   */
  resolveModelAcl(
    modelName: string,
    actor?: ActorContext,
    activeAddons?: ReadonlySet<string>,
  ): EffectiveAcl {
    const role = normalizePlatformRole(actor?.role);
    const groups = new Set(actor?.groups ?? []);

    if (role === "admin") {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }

    const modelRules = this.acls.filter(
      (a) =>
        a.model === modelName &&
        (!activeAddons || !a.addon || activeAddons.has(a.addon)),
    );

    if (modelRules.length > 0) {
      const matching = modelRules.filter((rule) => {
        const roleMatch = !rule.role || rule.role === role;
        const groupMatch = !rule.group || groups.has(rule.group);
        return roleMatch && groupMatch;
      });
      if (matching.length === 0) {
        return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
      }
      return {
        canRead: matching.some((m) => m.canRead),
        canCreate: matching.some((m) => m.canCreate),
        canUpdate: matching.some((m) => m.canUpdate),
        canDelete: matching.some((m) => m.canDelete),
      };
    }

    // Safe canonical defaults when no model-specific ACL matrix is registered
    if (role === "editor") {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: false };
    }
    if (role === "viewer") {
      return { canRead: true, canCreate: false, canUpdate: false, canDelete: false };
    }
    return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
  }

  assertModelAccess(
    modelName: string,
    operation: "read" | "create" | "update" | "delete",
    actor?: ActorContext,
    activeAddons?: ReadonlySet<string>,
  ): EffectiveAcl {
    const acl = this.resolveModelAcl(modelName, actor, activeAddons);
    const allowed =
      operation === "read"
        ? acl.canRead
        : operation === "create"
          ? acl.canCreate
          : operation === "update"
            ? acl.canUpdate
            : acl.canDelete;

    if (!allowed) {
      const statusCode = normalizePlatformRole(actor?.role) === "public" ? 401 : 403;
      throw new PolicyError(
        `Access denied: '${operation}' on model '${modelName}' for role '${actor?.role ?? "public"}'.`,
        "MODEL_ACL_FORBIDDEN",
        statusCode,
      );
    }
    return acl;
  }

  /**
   * Builds a combined ORM filter from all matching `ir.rule` record rules for a model & operation.
   * Global rules are AND-ed; group/role-scoped rules are OR-ed together.
   */
  buildRecordRuleFilter(
    modelName: string,
    operation: "read" | "create" | "update" | "delete",
    actor: ActorContext,
    activeAddons?: ReadonlySet<string>,
  ): Record<string, unknown> | null {
    const role = normalizePlatformRole(actor.role);
    if (role === "admin") return null;

    const groups = new Set(actor.groups ?? []);
    const candidates = [...this.rules.values()].filter((rule) => {
      if (rule.model !== modelName) return false;
      if (activeAddons && rule.addon && !activeAddons.has(rule.addon)) return false;
      if (rule.operations?.length && !rule.operations.includes(operation)) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    const globalFilters: Record<string, unknown>[] = [];
    const scopedFilters: Record<string, unknown>[] = [];

    for (const rule of candidates) {
      const resolvedDomain = substituteActorPlaceholders(rule.domain, actor);
      const compiled = compileTupleDomainToFilter(resolvedDomain);
      if (Object.keys(compiled).length === 0) continue;

      if (rule.global) {
        globalFilters.push(compiled);
        continue;
      }

      const roleMatch = rule.roles?.includes(role) ?? false;
      const groupMatch = rule.groups?.some((g) => groups.has(g)) ?? false;
      if (roleMatch || groupMatch) {
        scopedFilters.push(compiled);
      }
    }

    const parts: Record<string, unknown>[] = [...globalFilters];
    if (scopedFilters.length === 1) {
      parts.push(scopedFilters[0]!);
    } else if (scopedFilters.length > 1) {
      parts.push({ $or: scopedFilters });
    }

    if (parts.length === 0) return null;
    return parts.length === 1 ? parts[0]! : { $and: parts };
  }

  listRules(modelName?: string): RecordRuleDefinition[] {
    const all = [...this.rules.values()];
    return modelName ? all.filter((r) => r.model === modelName) : all;
  }
}
