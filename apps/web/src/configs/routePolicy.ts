import { stripLocalePrefix } from "@/utils/i18n";

export type RoleName = "viewer" | "editor" | "admin";
export type RouteAccessKind = "public" | "guest-only" | "protected" | "preview-or-auth";

export interface RoutePolicyRule {
  pattern: RegExp;
  access: RouteAccessKind;
  minRole?: RoleName;
}

export const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  creator: 1,
  editor: 2,
  admin: 3,
};

export function hasRequiredRole(
  actualRole: string | undefined | null,
  minRole?: RoleName,
): boolean {
  if (!minRole) return true;
  if (!actualRole) return false;
  const actualRank = ROLE_RANK[actualRole.toLowerCase()] ?? 1;
  const requiredRank = ROLE_RANK[minRole] ?? 1;
  return actualRank >= requiredRank;
}

const ROUTE_POLICIES: readonly RoutePolicyRule[] = [
  { pattern: /^\/$/, access: "public" },
  { pattern: /^\/(moonwitness|scriptures|codex|mtime)(\/|$)/, access: "public" },
  { pattern: /^\/(shadow|login|register|forgot-password)(\/|$)/, access: "guest-only" },
  { pattern: /^\/pages\/misc\/401-not-authorized(\/|$)/, access: "public" },
  { pattern: /^\/apps\/(permissions|roles|user)(\/|$)/, access: "protected", minRole: "admin" },
  { pattern: /^\/(dashboards|apps)(\/|$)/, access: "protected", minRole: "viewer" },
  {
    pattern:
      /^\/(mission-control|dock|memory|addons|control|intelligence|id-lab|skin-lab|models|vpn|syslog|snmp|radius|storage)(\/|$)/,
    access: "preview-or-auth",
    minRole: "viewer",
  },
];

export function resolveRoutePolicy(pathname: string): RoutePolicyRule {
  const clean = stripLocalePrefix(pathname.split("?")[0]?.split("#")[0] || "/");
  for (const rule of ROUTE_POLICIES) {
    if (rule.pattern.test(clean)) {
      return rule;
    }
  }
  return { pattern: /.*/, access: "preview-or-auth", minRole: "viewer" };
}
