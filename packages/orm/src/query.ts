import { randomUUID } from "node:crypto";
import { DEFAULT_TENANT_ID, PolicyError, type ActorContext, type ActorSource } from "./types";

const SAFE_IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SAFE_TENANT_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function assertSafeIdentifier(identifier: string, label = "identifier"): string {
  if (!SAFE_IDENT_RE.test(identifier)) {
    throw new PolicyError(
      `Unsafe SQL ${label}: "${identifier}". Only ASCII letters, digits, and underscores are allowed.`,
      "INVALID_IDENTIFIER",
      400,
    );
  }
  return identifier;
}

export function normalizeTenantId(raw?: string | null): string {
  const candidate = (raw ?? "").trim().toLowerCase();
  if (!candidate) return DEFAULT_TENANT_ID;
  if (!SAFE_TENANT_RE.test(candidate)) {
    throw new PolicyError(
      `Invalid tenant identifier "${raw}". Must match ${SAFE_TENANT_RE.source}.`,
      "INVALID_TENANT_ID",
      400,
    );
  }
  return candidate;
}

export function createActorContext(
  actorId: string | null = null,
  source: ActorSource = "api",
  requestId?: string,
  tenantId?: string,
  extra?: { role?: string; groups?: readonly string[] },
): ActorContext {
  return {
    actorId: actorId?.trim() ? actorId.trim() : null,
    source,
    requestId: requestId?.trim() || randomUUID(),
    tenantId: normalizeTenantId(tenantId),
    role: extra?.role,
    groups: extra?.groups,
  };
}

/**
 * Compiles Odoo-style prefix tuple domains (e.g. `[["status", "=", "active"]]`,
 * `["|", ["priority", "=", "high"], ["priority", "=", "critical"]]`) into
 * canonical structured ORM filter objects.
 */
export function compileTupleDomainToFilter(domain: unknown[]): Record<string, unknown> {
  if (!Array.isArray(domain) || domain.length === 0) return {};

  let idx = 0;
  function parseExpr(): Record<string, unknown> {
    const token = domain[idx];
    if (token === "&") {
      idx += 1;
      const left = parseExpr();
      const right = parseExpr();
      return { $and: [left, right] };
    }
    if (token === "|") {
      idx += 1;
      const left = parseExpr();
      const right = parseExpr();
      return { $or: [left, right] };
    }
    if (token === "!") {
      idx += 1;
      const target = parseExpr();
      return { $not: target };
    }
    if (Array.isArray(token) && token.length === 3) {
      idx += 1;
      const [rawField, op, value] = token as [unknown, unknown, unknown];
      const field = assertSafeIdentifier(String(rawField), "domain field");
      switch (op) {
        case "=":
        case "==":
          return { [field]: value };
        case "!=":
        case "<>":
          return { [field]: { $ne: value } };
        case ">":
          return { [field]: { $gt: value } };
        case ">=":
          return { [field]: { $gte: value } };
        case "<":
          return { [field]: { $lt: value } };
        case "<=":
          return { [field]: { $lte: value } };
        case "in":
          return { [field]: { $in: Array.isArray(value) ? value : [value] } };
        case "not in":
          return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
        case "ilike":
        case "like":
        case "=ilike":
        case "=like":
          return { [field]: { $like: String(value) } };
        case "not ilike":
        case "not like":
          return { [field]: { $nlike: String(value) } };
        default:
          throw new PolicyError(`Unsupported domain operator "${String(op)}"`, "INVALID_DOMAIN", 400);
      }
    }
    throw new PolicyError("Malformed tuple domain expression", "INVALID_DOMAIN", 400);
  }

  const exprs: Record<string, unknown>[] = [];
  while (idx < domain.length) {
    exprs.push(parseExpr());
  }
  return exprs.length === 1 ? exprs[0]! : { $and: exprs };
}

export interface CompiledWhereClause {
  readonly sql: string;
  readonly params: unknown[];
}

export function compileFilterToSql(
  filter: Record<string, unknown>,
  allowedColumns: ReadonlySet<string>,
  onFieldAccess?: (field: string) => void,
): CompiledWhereClause {
  const params: unknown[] = [];

  function build(node: Record<string, unknown>): string {
    const clauses: string[] = [];

    for (const [key, rawValue] of Object.entries(node)) {
      if (rawValue === undefined) continue;

      if (key === "$and" && Array.isArray(rawValue)) {
        const sub = rawValue
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(build)
          .filter(Boolean);
        if (sub.length > 0) clauses.push(`(${sub.join(" AND ")})`);
        continue;
      }

      if (key === "$or" && Array.isArray(rawValue)) {
        const sub = rawValue
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map(build)
          .filter(Boolean);
        if (sub.length > 0) clauses.push(`(${sub.join(" OR ")})`);
        continue;
      }

      if (key === "$not" && rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
        const sub = build(rawValue as Record<string, unknown>);
        if (sub) clauses.push(`(NOT (${sub}))`);
        continue;
      }

      const col = assertSafeIdentifier(key, "column");
      if (!allowedColumns.has(col)) {
        throw new PolicyError(`Unknown filter column "${col}"`, "INVALID_FILTER_COLUMN", 400);
      }
      onFieldAccess?.(col);

      if (rawValue === null) {
        clauses.push(`"${col}" IS NULL`);
        continue;
      }

      if (typeof rawValue === "object" && !Array.isArray(rawValue) && !(rawValue instanceof Date)) {
        const ops = rawValue as Record<string, unknown>;
        for (const [op, val] of Object.entries(ops)) {
          switch (op) {
            case "$eq":
              if (val === null) clauses.push(`"${col}" IS NULL`);
              else {
                clauses.push(`"${col}" = ?`);
                params.push(val);
              }
              break;
            case "$ne":
              if (val === null) clauses.push(`"${col}" IS NOT NULL`);
              else {
                clauses.push(`"${col}" != ?`);
                params.push(val);
              }
              break;
            case "$gt":
              clauses.push(`"${col}" > ?`);
              params.push(val);
              break;
            case "$gte":
              clauses.push(`"${col}" >= ?`);
              params.push(val);
              break;
            case "$lt":
              clauses.push(`"${col}" < ?`);
              params.push(val);
              break;
            case "$lte":
              clauses.push(`"${col}" <= ?`);
              params.push(val);
              break;
            case "$like":
              clauses.push(`LOWER(CAST("${col}" AS TEXT)) LIKE LOWER(?)`);
              params.push(`%${String(val)}%`);
              break;
            case "$nlike":
              clauses.push(`LOWER(CAST("${col}" AS TEXT)) NOT LIKE LOWER(?)`);
              params.push(`%${String(val)}%`);
              break;
            case "$in": {
              const list = Array.isArray(val) ? val : [val];
              if (list.length === 0) {
                clauses.push("1 = 0");
              } else {
                clauses.push(`"${col}" IN (${list.map(() => "?").join(", ")})`);
                params.push(...list);
              }
              break;
            }
            case "$nin": {
              const list = Array.isArray(val) ? val : [val];
              if (list.length === 0) {
                clauses.push("1 = 1");
              } else {
                clauses.push(`"${col}" NOT IN (${list.map(() => "?").join(", ")})`);
                params.push(...list);
              }
              break;
            }
            default:
              throw new PolicyError(`Unsupported filter operator "${op}"`, "INVALID_FILTER_OP", 400);
          }
        }
        continue;
      }

      clauses.push(`"${col}" = ?`);
      params.push(rawValue);
    }

    return clauses.join(" AND ");
  }

  const sql = build(filter);
  return { sql, params };
}

export function compileOrderBy(
  orderBy: string | undefined,
  allowedColumns: ReadonlySet<string>,
  onFieldAccess?: (field: string) => void,
): string {
  if (!orderBy || !orderBy.trim()) return `"write_date" DESC`;
  const parts = orderBy
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const compiled: string[] = [];

  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const col = assertSafeIdentifier(tokens[0] ?? "", "orderBy column");
    if (!allowedColumns.has(col)) {
      throw new PolicyError(`Unknown orderBy column "${col}"`, "INVALID_ORDER_BY", 400);
    }
    onFieldAccess?.(col);
    const dir = (tokens[1] ?? "ASC").toUpperCase();
    if (dir !== "ASC" && dir !== "DESC") {
      throw new PolicyError(`Invalid sort direction "${dir}"`, "INVALID_ORDER_BY", 400);
    }
    compiled.push(`"${col}" ${dir}`);
  }

  return compiled.length > 0 ? compiled.join(", ") : `"write_date" DESC`;
}
