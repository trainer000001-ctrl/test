import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ensureCoreOrmTables, getDb } from "./driver";
import {
  assertSafeIdentifier,
  compileFilterToSql,
  compileOrderBy,
  compileTupleDomainToFilter,
  createActorContext,
  normalizeTenantId,
} from "./query";
import {
  ConflictError,
  DEFAULT_TENANT_ID,
  PolicyError,
  ValidationError,
  type ActorContext,
  type AuditLogEntry,
  type ComputedFieldConfig,
  type DefineModelOptions,
  type DefinedModel,
  type DomainOrFilter,
  type FieldMetadata,
  type FieldPolicy,
  type FindOptions,
  type HookErrorRecord,
  type IntrospectedFieldType,
  type ModelMetadataSnapshot,
  type ModelRepository,
  type ModelSchemaInspection,
  type ModelWriteEvent,
  type OrmAction,
  type OrmDriverHandle,
  type OrmRecord,
  type RelationConfig,
  type ScopedModelRepository,
  type SyncModelsReport,
} from "./types";

const SYSTEM_COLUMN_NAMES = [
  "id",
  "create_uid",
  "create_date",
  "write_uid",
  "write_date",
  "status",
  "deleted_uid",
  "deleted_date",
  "version",
  "source",
  "source_ref",
  "tenant_id",
  "_attrs",
] as const;

const SYSTEM_COLUMN_SET = new Set<string>(SYSTEM_COLUMN_NAMES);

interface ModelExtensionEntry {
  readonly addon: string;
  readonly fields: z.ZodObject<z.ZodRawShape>;
  readonly fieldMeta?: Record<string, Partial<Omit<FieldMetadata, "name">>>;
  readonly isCustom?: boolean;
}

type WriteListener = (event: ModelWriteEvent) => void;

class ModelRegistry {
  private readonly models = new Map<string, DefinedModel<Record<string, unknown>>>();
  private readonly extensions = new Map<string, ModelExtensionEntry[]>();
  private readonly writeListeners = new Map<string, Set<WriteListener>>();
  private readonly hookErrors: HookErrorRecord[] = [];

  register<T extends Record<string, unknown>>(model: DefinedModel<T>): void {
    this.models.set(model.name, model as unknown as DefinedModel<Record<string, unknown>>);
  }

  unregister(name: string): boolean {
    return this.models.delete(name);
  }

  has(name: string): boolean {
    return this.models.has(name);
  }

  get(name: string): DefinedModel<Record<string, unknown>> | undefined {
    return this.models.get(name);
  }

  list(): DefinedModel<Record<string, unknown>>[] {
    return [...this.models.values()];
  }

  addExtension(modelName: string, ext: ModelExtensionEntry): void {
    const list = this.extensions.get(modelName) ?? [];
    // Replace existing extension from same addon & identical field keys to keep upgrades idempotent
    const extKeys = Object.keys(ext.fields.shape).sort().join(",");
    const idx = list.findIndex(
      (item) =>
        item.addon === ext.addon && Object.keys(item.fields.shape).sort().join(",") === extKeys,
    );
    if (idx >= 0) {
      list[idx] = ext;
    } else {
      list.push(ext);
    }
    this.extensions.set(modelName, list);
  }

  removeExtensionsByAddon(addonName: string): number {
    let removed = 0;
    for (const [modelName, list] of this.extensions.entries()) {
      const next = list.filter((ext) => ext.addon !== addonName);
      removed += list.length - next.length;
      if (next.length === 0) {
        this.extensions.delete(modelName);
      } else {
        this.extensions.set(modelName, next);
      }
    }
    return removed;
  }

  getExtensions(modelName: string): readonly ModelExtensionEntry[] {
    return this.extensions.get(modelName) ?? [];
  }

  clearCustomFieldsForTests(): void {
    this.extensions.clear();
  }

  recordHookError(model: string, hook: string, error: unknown): void {
    this.hookErrors.push({
      model,
      hook,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }

  getHookErrors(): readonly HookErrorRecord[] {
    return [...this.hookErrors];
  }

  clearHookErrors(): void {
    this.hookErrors.length = 0;
  }

  onWrite(modelName: string, listener: WriteListener): () => void {
    let set = this.writeListeners.get(modelName);
    if (!set) {
      set = new Set();
      this.writeListeners.set(modelName, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  emitWrite(event: ModelWriteEvent): void {
    for (const key of [event.model, "*"]) {
      const listeners = this.writeListeners.get(key);
      if (!listeners) continue;
      for (const fn of listeners) {
        try {
          fn(event);
        } catch (err) {
          this.recordHookError(event.model, "onModelWrite", err);
        }
      }
    }
  }
}

export const modelRegistry = new ModelRegistry();

export function onModelWrite(modelName: string, listener: WriteListener): () => void {
  return modelRegistry.onWrite(modelName, listener);
}

export function extendModel(
  modelName: string,
  extension: {
    addon: string;
    fields: z.ZodObject<z.ZodRawShape>;
    fieldMeta?: Record<string, Partial<Omit<FieldMetadata, "name">>>;
    isCustom?: boolean;
  },
): void {
  for (const fieldName of Object.keys(extension.fields.shape)) {
    assertSafeIdentifier(fieldName, "extended field");
  }
  modelRegistry.addExtension(modelName, extension);
}

function inferSqlType(schema: unknown): "TEXT" | "INTEGER" | "REAL" {
  let current: unknown = schema;
  // Unwrap ZodDefault / ZodOptional / ZodNullable cleanly across Zod v4/v3 internals
  for (let i = 0; i < 6; i += 1) {
    const def = (current as { _zod?: { def?: Record<string, unknown> }; _def?: Record<string, unknown> })
      ?._zod?.def ?? (current as { _def?: Record<string, unknown> })?._def;
    if (!def) break;
    const typeName = String(def.type ?? def.typeName ?? "").toLowerCase();
    if (
      (typeName.includes("optional") ||
        typeName.includes("nullable") ||
        typeName.includes("default")) &&
      def.innerType
    ) {
      current = def.innerType;
      continue;
    }
    if (typeName.includes("boolean")) return "INTEGER";
    if (typeName.includes("number") || typeName.includes("int")) {
      const checks = Array.isArray(def.checks) ? def.checks : [];
      const isInt =
        typeName.includes("int") ||
        checks.some((c: unknown) => {
          const obj = c as { kind?: string; _zod?: { def?: { check?: string; format?: string } } };
          return (
            obj?.kind === "int" ||
            obj?._zod?.def?.format === "safeint" ||
            obj?._zod?.def?.check === "number_format"
          );
        });
      return isInt ? "INTEGER" : "REAL";
    }
    break;
  }
  return "TEXT";
}

function inferBooleanFields(shape: z.ZodRawShape): Set<string> {
  const result = new Set<string>();
  for (const [key, fieldSchema] of Object.entries(shape)) {
    let current: unknown = fieldSchema;
    for (let i = 0; i < 6; i += 1) {
      const def = (current as { _zod?: { def?: Record<string, unknown> }; _def?: Record<string, unknown> })
        ?._zod?.def ?? (current as { _def?: Record<string, unknown> })?._def;
      if (!def) break;
      const typeName = String(def.type ?? def.typeName ?? "").toLowerCase();
      if (
        (typeName.includes("optional") ||
          typeName.includes("nullable") ||
          typeName.includes("default")) &&
        def.innerType
      ) {
        current = def.innerType;
        continue;
      }
      if (typeName.includes("boolean")) {
        result.add(key);
      }
      break;
    }
  }
  return result;
}

function inferJsonFields(shape: z.ZodRawShape): Set<string> {
  const result = new Set<string>();
  for (const [key, fieldSchema] of Object.entries(shape)) {
    let current: unknown = fieldSchema;
    for (let i = 0; i < 6; i += 1) {
      const def = (current as { _zod?: { def?: Record<string, unknown> }; _def?: Record<string, unknown> })
        ?._zod?.def ?? (current as { _def?: Record<string, unknown> })?._def;
      if (!def) break;
      const typeName = String(def.type ?? def.typeName ?? "").toLowerCase();
      if (
        (typeName.includes("optional") ||
          typeName.includes("nullable") ||
          typeName.includes("default")) &&
        def.innerType
      ) {
        current = def.innerType;
        continue;
      }
      if (typeName.includes("array") || typeName.includes("object") || typeName.includes("record")) {
        result.add(key);
      }
      break;
    }
  }
  return result;
}

function getEffectiveShape(model: DefinedModel<Record<string, unknown>>): z.ZodRawShape {
  const merged: z.ZodRawShape = { ...model.schema.shape };
  for (const ext of modelRegistry.getExtensions(model.name)) {
    Object.assign(merged, ext.fields.shape);
  }
  return merged;
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/^cust_/, "")
    .replace(/_id$/, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function introspectZodSchema(
  name: string,
  schema: unknown,
): {
  fieldType: IntrospectedFieldType;
  nullable: boolean;
  required: boolean;
  selection: string[] | null;
  defaultValue: unknown;
  widget: string;
} {
  let current: unknown = schema;
  let nullable = false;
  let optional = false;
  let defaultValue: unknown = undefined;

  for (let i = 0; i < 8; i += 1) {
    const def = (current as { _zod?: { def?: Record<string, unknown> }; _def?: Record<string, unknown> })
      ?._zod?.def ?? (current as { _def?: Record<string, unknown> })?._def;
    if (!def) break;
    const typeName = String(def.type ?? def.typeName ?? "").toLowerCase();
    if (typeName.includes("optional") && def.innerType) {
      optional = true;
      current = def.innerType;
      continue;
    }
    if (typeName.includes("nullable") && def.innerType) {
      nullable = true;
      current = def.innerType;
      continue;
    }
    if (typeName.includes("default") && def.innerType) {
      optional = true;
      defaultValue =
        typeof def.defaultValue === "function"
          ? (def.defaultValue as () => unknown)()
          : def.defaultValue;
      current = def.innerType;
      continue;
    }

    if (typeName.includes("enum")) {
      let values: string[] = [];
      if (Array.isArray(def.values)) {
        values = def.values.map(String);
      } else if (def.entries && typeof def.entries === "object") {
        values = Object.values(def.entries as Record<string, unknown>).map(String);
      } else if (Array.isArray((current as { options?: unknown[] }).options)) {
        values = ((current as { options: unknown[] }).options).map(String);
      }
      return {
        fieldType: "selection",
        nullable,
        required: !optional && !nullable,
        selection: values,
        defaultValue,
        widget: "select",
      };
    }

    if (typeName.includes("boolean")) {
      return {
        fieldType: "boolean",
        nullable,
        required: !optional && !nullable,
        selection: null,
        defaultValue,
        widget: "checkbox",
      };
    }

    if (typeName.includes("number") || typeName.includes("int")) {
      const checks = Array.isArray(def.checks) ? def.checks : [];
      const isInt =
        typeName.includes("int") ||
        checks.some((c: unknown) => {
          const obj = c as { kind?: string; _zod?: { def?: { check?: string; format?: string } } };
          return (
            obj?.kind === "int" ||
            obj?._zod?.def?.format === "safeint" ||
            obj?._zod?.def?.check === "number_format"
          );
        });
      return {
        fieldType: isInt ? "integer" : "real",
        nullable,
        required: !optional && !nullable,
        selection: null,
        defaultValue,
        widget: "number",
      };
    }

    if (typeName.includes("array")) {
      return {
        fieldType: "json",
        nullable,
        required: !optional && !nullable,
        selection: null,
        defaultValue,
        widget: "tags",
      };
    }

    if (typeName.includes("object") || typeName.includes("record")) {
      return {
        fieldType: "json",
        nullable,
        required: !optional && !nullable,
        selection: null,
        defaultValue,
        widget: "json",
      };
    }

    break;
  }

  const lower = name.toLowerCase();
  if (lower.endsWith("_at") || lower.endsWith("_date") || lower === "date" || lower === "due_date") {
    return {
      fieldType: "date",
      nullable,
      required: !optional && !nullable,
      selection: null,
      defaultValue,
      widget: "date",
    };
  }
  const widget =
    lower === "description" ||
    lower === "body" ||
    lower === "notes" ||
    lower === "summary" ||
    lower === "content" ||
    lower === "rationale"
      ? "textarea"
      : "text";

  return {
    fieldType: "text",
    nullable,
    required: !optional && !nullable,
    selection: null,
    defaultValue,
    widget,
  };
}

export function getModelMetadata(
  modelName: string,
  actor?: ActorContext,
): ModelMetadataSnapshot | null {
  const model = modelRegistry.get(modelName);
  if (!model) return null;

  const fields: FieldMetadata[] = [];
  const seen = new Set<string>();

  const appendField = (
    name: string,
    schema: unknown,
    originAddon: string,
    isCustom: boolean,
    override?: Partial<Omit<FieldMetadata, "name">>,
  ) => {
    if (SYSTEM_COLUMN_SET.has(name) || seen.has(name)) return;
    const policy = model.fieldPolicies[name];
    if (actor && !canActorReadField(policy, actor)) return;
    seen.add(name);
    const base = introspectZodSchema(name, schema);
    const relation = model.relations[name];
    const readonly =
      override?.readonly ?? (actor ? !canActorWriteField(policy, actor) : false);
    fields.push({
      name,
      fieldType: override?.fieldType ?? base.fieldType,
      label: override?.label ?? humanizeFieldName(name),
      help: override?.help,
      required: override?.required ?? base.required,
      nullable: override?.nullable ?? base.nullable,
      readonly,
      widget: override?.widget ?? (relation ? "relation" : base.widget),
      selection: override?.selection ?? base.selection,
      defaultValue: override?.defaultValue ?? base.defaultValue,
      isCustom,
      originAddon,
      relation,
      sensitive: Boolean(policy?.sensitive),
    });
  };

  for (const [name, schema] of Object.entries(model.schema.shape)) {
    appendField(name, schema, model.originAddon, false, model.fieldMeta[name]);
  }

  for (const ext of modelRegistry.getExtensions(model.name)) {
    for (const [name, schema] of Object.entries(ext.fields.shape)) {
      appendField(name, schema, ext.addon, Boolean(ext.isCustom), ext.fieldMeta?.[name]);
    }
  }

  for (const [compName, compCfg] of Object.entries(model.computed)) {
    if (seen.has(compName)) continue;
    const policy = model.fieldPolicies[compName];
    if (actor && !canActorReadField(policy, actor)) continue;
    seen.add(compName);
    const fieldType: IntrospectedFieldType =
      compCfg.type === "integer"
        ? "integer"
        : compCfg.type === "real"
          ? "real"
          : compCfg.type === "boolean"
            ? "boolean"
            : "text";
    fields.push({
      name: compName,
      fieldType,
      label: model.fieldMeta[compName]?.label ?? humanizeFieldName(compName),
      help: model.fieldMeta[compName]?.help,
      required: false,
      nullable: true,
      readonly: true,
      widget: model.fieldMeta[compName]?.widget ?? (fieldType === "boolean" ? "checkbox" : "text"),
      selection: null,
      defaultValue: undefined,
      isCustom: false,
      originAddon: model.originAddon,
      computed: true,
      stored: Boolean(compCfg.stored),
      sensitive: Boolean(policy?.sensitive),
    });
  }

  return {
    name: model.name,
    table: model.table,
    recName: model.recName,
    extensible: model.extensible,
    restEnabled: model.restEnabled,
    originAddon: model.originAddon,
    fields,
    relations: { ...model.relations },
    actions: Object.keys(model.actions),
  };
}

export async function inspectModelSchema(modelName: string): Promise<ModelSchemaInspection | null> {
  const model = modelRegistry.get(modelName);
  if (!model) return null;
  const db = getDb();
  const table = assertSafeIdentifier(model.table, "table");
  const exists = await tableExists(db, table);
  const shape = getEffectiveShape(model);
  const expectedColumns = [
    ...SYSTEM_COLUMN_NAMES,
    ...Object.keys(shape).filter((k) => !SYSTEM_COLUMN_SET.has(k)),
    ...Object.entries(model.computed)
      .filter(([, cfg]) => Boolean(cfg.stored))
      .map(([k]) => k),
  ];
  const existingColumns = exists ? [...(await listExistingColumns(db, table))] : [];
  const existingSet = new Set(existingColumns);
  const expectedSet = new Set(expectedColumns);

  return {
    model: model.name,
    table,
    exists,
    existingColumns,
    expectedColumns,
    missingColumns: expectedColumns.filter((c) => !existingSet.has(c)),
    extraColumns: existingColumns.filter((c) => !expectedSet.has(c)),
  };
}

function sortComputedFields(
  computed: Record<string, ComputedFieldConfig<Record<string, unknown>>>,
): string[] {
  const keys = Object.keys(computed);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new ValidationError(`Circular computed field dependency involving "${name}".`);
    }
    visiting.add(name);
    const cfg = computed[name];
    if (cfg) {
      for (const dep of cfg.depends) {
        if (computed[dep]) visit(dep);
      }
    }
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  }

  for (const k of keys) visit(k);
  return order;
}

function canActorReadField(policy: FieldPolicy | undefined, actor?: ActorContext): boolean {
  if (!policy) return true;
  if (!policy.readRoles?.length && !policy.readGroups?.length) return true;
  if (!actor) return false;
  if (actor.role === "admin" && (!policy.readGroups?.length || policy.readRoles?.includes("admin"))) {
    return true;
  }
  if (actor.role && policy.readRoles?.includes(actor.role)) return true;
  if (actor.groups?.some((g) => policy.readGroups?.includes(g))) return true;
  return false;
}

function canActorWriteField(policy: FieldPolicy | undefined, actor?: ActorContext): boolean {
  if (!policy) return true;
  if (!policy.writeRoles?.length && !policy.writeGroups?.length) return true;
  if (!actor) return false;
  if (actor.role === "admin" && (!policy.writeGroups?.length || policy.writeRoles?.includes("admin"))) {
    return true;
  }
  if (actor.role && policy.writeRoles?.includes(actor.role)) return true;
  if (actor.groups?.some((g) => policy.writeGroups?.includes(g))) return true;
  return false;
}

function redactSensitiveDiff(
  payload: Record<string, unknown>,
  policies: Record<string, FieldPolicy>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload)) {
    const policy = policies[key];
    if (policy?.sensitive) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    sanitized[key] = val;
  }
  return sanitized;
}

function filterReadableRecord<T extends Record<string, unknown>>(
  record: T,
  policies: Record<string, FieldPolicy>,
  actor?: ActorContext,
  selectedFields?: readonly string[],
): T {
  const out: Record<string, unknown> = {};
  const fieldAllow = selectedFields?.length ? new Set(["id", ...selectedFields]) : null;
  for (const [key, val] of Object.entries(record)) {
    if (fieldAllow && !fieldAllow.has(key) && !key.startsWith("$")) continue;
    if (!canActorReadField(policies[key], actor)) continue;
    out[key] = val;
  }
  return out as T;
}

function serializeValueForSql(val: unknown, isBoolean: boolean, isJson: boolean): unknown {
  if (val === undefined || val === null) return null;
  if (isBoolean) return val ? 1 : 0;
  if (isJson) return typeof val === "string" ? val : JSON.stringify(val);
  if (val instanceof Date) return val.toISOString();
  return val;
}

function deserializeRow(
  row: Record<string, unknown>,
  boolFields: ReadonlySet<string>,
  jsonFields: ReadonlySet<string>,
  computed: Record<string, ComputedFieldConfig<Record<string, unknown>>>,
  computedOrder: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const bKey of boolFields) {
    if (bKey in out && out[bKey] !== null && out[bKey] !== undefined) {
      out[bKey] = Boolean(Number(out[bKey]));
    }
  }
  for (const jKey of jsonFields) {
    if (typeof out[jKey] === "string") {
      try {
        out[jKey] = JSON.parse(out[jKey] as string);
      } catch {
        // Keep raw value if not valid JSON
      }
    }
  }
  if ("version" in out) out.version = Number(out.version);

  for (const compKey of computedOrder) {
    const cfg = computed[compKey]!;
    if (!cfg.stored || out[compKey] === undefined) {
      out[compKey] = cfg.compute(out);
    } else if (cfg.type === "boolean") {
      out[compKey] = Boolean(Number(out[compKey]));
    }
  }
  return out;
}

async function writeAuditAndOutbox(
  tx: OrmDriverHandle,
  actor: ActorContext,
  model: DefinedModel<Record<string, unknown>>,
  entityId: string,
  action: OrmAction,
  version: number,
  diffPayload: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  const safeDiff = redactSensitiveDiff(diffPayload, model.fieldPolicies);
  const diffJson = JSON.stringify(safeDiff);

  await tx.run(
    `INSERT INTO _orm_audit_log
      (id, model, entity_id, action, changed_by, changed_at, diff, entity_version, source, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      model.name,
      entityId,
      action,
      actor.actorId,
      now,
      diffJson,
      version,
      actor.source,
      actor.requestId,
    ],
  );

  if (model.outbox) {
    await tx.run(
      `INSERT INTO _orm_outbox_events
        (id, model, entity_id, action, tenant_id, actor_id, request_id, event_version, payload_json, status, attempts, next_attempt_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending', 0, ?, ?, ?)`,
      [
        randomUUID(),
        model.name,
        entityId,
        action,
        actor.tenantId,
        actor.actorId,
        actor.requestId,
        diffJson,
        now,
        now,
        now,
      ],
    );
  }
}

async function listExistingColumns(db: OrmDriverHandle, table: string): Promise<Set<string>> {
  if (db.dialect === "postgres") {
    const rows = await db.all<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = ?",
      [table],
    );
    return new Set(rows.map((r) => r.column_name));
  }
  const rows = await db.all<{ name: string }>(`PRAGMA table_info("${table}")`);
  return new Set(rows.map((r) => r.name));
}

async function tableExists(db: OrmDriverHandle, table: string): Promise<boolean> {
  if (db.dialect === "postgres") {
    const row = await db.get<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = ?) AS exists",
      [table],
    );
    return Boolean(row?.exists);
  }
  const row = await db.get<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [table],
  );
  return Boolean(row);
}

/**
 * Idempotent zero-migration schema synchronizer: creates missing model tables,
 * many2many join tables, indexes, and appends new columns from `extendModel()`.
 */
export async function syncModels(
  models: readonly DefinedModel<Record<string, unknown>>[],
): Promise<SyncModelsReport> {
  const db = getDb();
  await ensureCoreOrmTables(db);

  const createdTables: string[] = [];
  const addedColumns: Array<{ table: string; column: string }> = [];

  for (const model of models) {
    const table = assertSafeIdentifier(model.table, "table");
    const shape = getEffectiveShape(model);
    const desiredCols: Array<{ name: string; sqlType: string; defaultSql?: string }> = [];

    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      if (SYSTEM_COLUMN_SET.has(fieldName)) continue;
      assertSafeIdentifier(fieldName, "column");
      desiredCols.push({ name: fieldName, sqlType: inferSqlType(fieldSchema) });
    }

    for (const [compName, cfg] of Object.entries(model.computed)) {
      if (!cfg.stored) continue;
      assertSafeIdentifier(compName, "computed column");
      const sqlType =
        cfg.type === "integer" || cfg.type === "boolean"
          ? "INTEGER"
          : cfg.type === "real"
            ? "REAL"
            : "TEXT";
      desiredCols.push({ name: compName, sqlType });
    }

    const exists = await tableExists(db, table);
    if (!exists) {
      const colDefs = [
        `"id" TEXT PRIMARY KEY`,
        `"create_uid" TEXT`,
        `"create_date" TEXT NOT NULL`,
        `"write_uid" TEXT`,
        `"write_date" TEXT NOT NULL`,
        `"status" TEXT NOT NULL DEFAULT 'active'`,
        `"deleted_uid" TEXT`,
        `"deleted_date" TEXT`,
        `"version" INTEGER NOT NULL DEFAULT 1`,
        `"source" TEXT NOT NULL DEFAULT 'api'`,
        `"source_ref" TEXT`,
        `"tenant_id" TEXT NOT NULL DEFAULT '${DEFAULT_TENANT_ID}'`,
        `"_attrs" TEXT NOT NULL DEFAULT '{}'`,
        ...desiredCols.map((c) => `"${c.name}" ${c.sqlType}`),
      ];
      await db.exec(`CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs.join(",\n  ")}\n);`);
      await db.exec(
        `CREATE INDEX IF NOT EXISTS "idx_${table}_tenant_status" ON "${table}" ("tenant_id", "status");`,
      );
      createdTables.push(table);
    } else {
      const existingCols = await listExistingColumns(db, table);
      for (const col of desiredCols) {
        if (!existingCols.has(col.name)) {
          await db.exec(`ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.sqlType};`);
          addedColumns.push({ table, column: col.name });
        }
      }
    }

    for (const idxCfg of model.indexes) {
      const cols = idxCfg.fields.map((f) => assertSafeIdentifier(f, "index column"));
      const idxName = assertSafeIdentifier(
        idxCfg.name ?? `idx_${table}_${cols.join("_")}`,
        "index name",
      );
      const uniqueKeyword = idxCfg.unique ? "UNIQUE " : "";
      const scopedCols = cols.includes("tenant_id") ? cols : ["tenant_id", ...cols];
      await db.exec(
        `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS "${idxName}" ON "${table}" (${scopedCols
          .map((c) => `"${c}"`)
          .join(", ")});`,
      );
    }

    // Ensure many2many join tables exist
    for (const [relName, rel] of Object.entries(model.relations)) {
      if (rel.type !== "many2many") continue;
      const through = assertSafeIdentifier(rel.through ?? `${table}_${relName}_rel`, "join table");
      const sourceKey = assertSafeIdentifier(rel.sourceKey ?? "source_id", "sourceKey");
      const targetKey = assertSafeIdentifier(rel.targetKey ?? "target_id", "targetKey");
      await db.exec(`
        CREATE TABLE IF NOT EXISTS "${through}" (
          "tenant_id" TEXT NOT NULL DEFAULT '${DEFAULT_TENANT_ID}',
          "${sourceKey}" TEXT NOT NULL,
          "${targetKey}" TEXT NOT NULL,
          "created_at" TEXT NOT NULL,
          PRIMARY KEY ("tenant_id", "${sourceKey}", "${targetKey}")
        );
      `);
    }
  }

  return { createdTables, addedColumns };
}

export function defineModel<T extends z.ZodRawShape>(
  options: DefineModelOptions<T>,
): DefinedModel<z.infer<z.ZodObject<T>>> {
  const table = assertSafeIdentifier(options.table, "table");
  for (const key of Object.keys(options.schema.shape)) {
    assertSafeIdentifier(key, "field");
  }

  const computed = (options.computed ?? {}) as Record<
    string,
    ComputedFieldConfig<Record<string, unknown>>
  >;
  const computedOrder = sortComputedFields(computed);
  const relations = options.relations ?? {};
  const fieldPolicies = options.fieldPolicies ?? {};
  const defaults = (options.defaults ?? {}) as Record<string, (actor: ActorContext) => unknown>;
  const constrains = (options.constrains ?? []) as readonly ((ctx: {
    before: (OrmRecord<Record<string, unknown>> & Record<string, unknown>) | null;
    after: Record<string, unknown>;
    actor: ActorContext;
  }) => void | Promise<void>)[];
  const hooks = (options.hooks ?? {}) as DefineModelOptions<z.ZodRawShape>["hooks"] & {};

  type RecordType = z.infer<z.ZodObject<T>>;

  const definedRef: { current: DefinedModel<RecordType> | null } = { current: null };

  function getModel(): DefinedModel<Record<string, unknown>> {
    return definedRef.current as unknown as DefinedModel<Record<string, unknown>>;
  }

  function getColumnMeta() {
    const shape = getEffectiveShape(getModel());
    const boolFields = inferBooleanFields(shape);
    const jsonFields = inferJsonFields(shape);
    const domainFields = Object.keys(shape).filter((k) => !SYSTEM_COLUMN_SET.has(k));
    const storedComputed = computedOrder.filter((k) => computed[k]?.stored);
    const allowedColumns = new Set<string>([
      ...SYSTEM_COLUMN_NAMES,
      ...domainFields,
      ...storedComputed,
    ]);
    return { shape, boolFields, jsonFields, domainFields, storedComputed, allowedColumns };
  }

  function assertWritePolicies(
    payload: Record<string, unknown>,
    actor: ActorContext,
  ): void {
    for (const key of Object.keys(payload)) {
      if (key in computed) {
        throw new ValidationError(`Cannot directly write computed field "${key}".`);
      }
      if (!canActorWriteField(fieldPolicies[key], actor)) {
        throw new PolicyError(
          `Write access denied on field "${key}" of model "${options.name}".`,
          "FIELD_WRITE_FORBIDDEN",
          403,
        );
      }
    }
  }

  async function validateMany2OneRelations(
    tx: OrmDriverHandle,
    values: Record<string, unknown>,
    actor: ActorContext,
  ): Promise<void> {
    for (const [field, rel] of Object.entries(relations)) {
      if (rel.type === "many2many") continue;
      const fkVal = values[field];
      if (fkVal === null || fkVal === undefined || fkVal === "") continue;
      const targetModel = modelRegistry.get(rel.model);
      if (!targetModel) {
        throw new ValidationError(`Target relation model "${rel.model}" is not registered.`);
      }
      const targetTable = assertSafeIdentifier(targetModel.table, "relation table");
      const targetField = assertSafeIdentifier(rel.targetField ?? "id", "relation targetField");
      const found = await tx.get(
        `SELECT "${targetField}" FROM "${targetTable}" WHERE "${targetField}" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
        [fkVal, actor.tenantId],
      );
      if (!found) {
        throw new PolicyError(
          `Invalid relation "${field}" -> ${rel.model}(${String(fkVal)}) in tenant "${actor.tenantId}".`,
          "RELATION_NOT_FOUND",
          400,
        );
      }
    }
  }

  async function checkIncomingRestrictRelations(
    tx: OrmDriverHandle,
    record: OrmRecord<Record<string, unknown>>,
    actor: ActorContext,
  ): Promise<void> {
    for (const otherModel of modelRegistry.list()) {
      for (const [field, rel] of Object.entries(otherModel.relations)) {
        if (rel.type === "many2many") continue;
        if (rel.model !== options.name || rel.onDelete !== "restrict") continue;
        const targetField = rel.targetField ?? "id";
        const refVal = record[targetField];
        const otherTable = assertSafeIdentifier(otherModel.table, "referencing table");
        const otherCol = assertSafeIdentifier(field, "referencing column");
        const ref = await tx.get<{ id: string }>(
          `SELECT "id" FROM "${otherTable}" WHERE "${otherCol}" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
          [refVal, actor.tenantId],
        );
        if (ref) {
          throw new PolicyError(
            `Cannot delete "${options.name}" (${record.id}): referenced by "${otherModel.name}.${field}" (onDelete: restrict).`,
            "RELATION_RESTRICT",
            409,
          );
        }
      }
    }
  }

  async function hydrateRelations(
    rows: Array<Record<string, unknown>>,
    withRelations: readonly string[] | undefined,
    tenantId: string,
    actor?: ActorContext,
  ): Promise<void> {
    if (!withRelations?.length || rows.length === 0) return;
    const db = getDb();

    for (const relName of withRelations) {
      const rel: RelationConfig | undefined = relations[relName];
      if (!rel) continue;
      const targetModel = modelRegistry.get(rel.model);
      if (!targetModel) continue;

      const targetTable = assertSafeIdentifier(targetModel.table, "target table");
      const targetShape = getEffectiveShape(targetModel);
      const targetBools = inferBooleanFields(targetShape);
      const targetJsons = inferJsonFields(targetShape);
      const targetCompOrder = sortComputedFields(targetModel.computed);

      if (rel.type === "many2many") {
        const through = assertSafeIdentifier(
          rel.through ?? `${table}_${relName}_rel`,
          "join table",
        );
        const sourceKey = assertSafeIdentifier(rel.sourceKey ?? "source_id", "sourceKey");
        const targetKey = assertSafeIdentifier(rel.targetKey ?? "target_id", "targetKey");
        const sourceIds = rows.map((r) => String(r.id));
        const placeholders = sourceIds.map(() => "?").join(", ");
        const joinedRows = await db.all<Record<string, unknown>>(
          `SELECT j."${sourceKey}" AS "__orm_source_id", t.*
           FROM "${through}" j
           INNER JOIN "${targetTable}" t
             ON t."id" = j."${targetKey}" AND t."tenant_id" = j."tenant_id"
           WHERE j."tenant_id" = ? AND t."status" != 'deleted' AND j."${sourceKey}" IN (${placeholders})`,
          [tenantId, ...sourceIds],
        );
        const grouped = new Map<string, Array<Record<string, unknown>>>();
        for (const jr of joinedRows) {
          const sid = String(jr.__orm_source_id);
          const cleanRow = { ...jr };
          delete cleanRow.__orm_source_id;
          const hydrated = deserializeRow(
            cleanRow,
            targetBools,
            targetJsons,
            targetModel.computed,
            targetCompOrder,
          );
          const readable = filterReadableRecord(hydrated, targetModel.fieldPolicies, actor);
          const bucket = grouped.get(sid) ?? [];
          bucket.push(readable);
          grouped.set(sid, bucket);
        }
        for (const row of rows) {
          row[`$${relName}`] = grouped.get(String(row.id)) ?? [];
        }
      } else {
        const targetField = assertSafeIdentifier(rel.targetField ?? "id", "targetField");
        const fkValues = [
          ...new Set(
            rows
              .map((r) => r[relName])
              .filter((v) => v !== null && v !== undefined && v !== ""),
          ),
        ];
        const targetByKey = new Map<string, Record<string, unknown>>();
        if (fkValues.length > 0) {
          const placeholders = fkValues.map(() => "?").join(", ");
          const targetRows = await db.all<Record<string, unknown>>(
            `SELECT * FROM "${targetTable}" WHERE "tenant_id" = ? AND "status" != 'deleted' AND "${targetField}" IN (${placeholders})`,
            [tenantId, ...fkValues],
          );
          for (const tr of targetRows) {
            const hydrated = deserializeRow(
              tr,
              targetBools,
              targetJsons,
              targetModel.computed,
              targetCompOrder,
            );
            targetByKey.set(
              String(hydrated[targetField]),
              filterReadableRecord(hydrated, targetModel.fieldPolicies, actor),
            );
          }
        }
        for (const row of rows) {
          const fk = row[relName];
          row[`$${relName}`] =
            fk !== null && fk !== undefined ? (targetByKey.get(String(fk)) ?? null) : null;
        }
      }
    }
  }

  function normalizeDomain(domain?: DomainOrFilter): Record<string, unknown> {
    if (!domain) return {};
    if (Array.isArray(domain)) return compileTupleDomainToFilter(domain);
    return domain;
  }

  const inferredRecName =
    options.recName ??
    (["title", "name", "label", "reference", "code", "slug", "key"].find(
      (candidate) => candidate in options.schema.shape,
    ) ??
      "id");

  const onchangeHandlers = options.onchange ?? {};

  function buildRepository(): ModelRepository<RecordType> {
    const repo: ModelRepository<RecordType> = {
      forActor(actor: ActorContext): ScopedModelRepository<RecordType> {
        return {
          create: (input) => repo.create(input, actor),
          find: (filters, opts) => repo.find(filters, { ...opts, actor, tenantId: actor.tenantId }),
          findOne: (id, opts) => repo.findOne(id, { ...opts, actor, tenantId: actor.tenantId }),
          count: (filters, opts) =>
            repo.count(filters, { ...opts, actor, tenantId: actor.tenantId }),
          update: (id, patch) => repo.update(id, patch, actor),
          upsert: (uniqueWhere, values) => repo.upsert(uniqueWhere, values, actor),
          delete: (id) => repo.delete(id, actor),
          archive: (id) => repo.archive(id, actor),
          restore: (id) => repo.restore(id, actor),
          history: (id) => repo.history(id, actor),
          readGroup: (groupBy, filters, opts) =>
            repo.readGroup(groupBy, filters, { ...opts, actor, tenantId: actor.tenantId }),
          search: (domain, opts) =>
            repo.search(domain, { ...opts, actor, tenantId: actor.tenantId }),
          searchCount: (domain, opts) =>
            repo.searchCount(domain, { ...opts, actor, tenantId: actor.tenantId }),
          read: (ids, fields, opts) =>
            repo.read(ids, fields, { ...opts, actor, tenantId: actor.tenantId }),
          browse: (ids, opts) => repo.browse(ids, { ...opts, actor, tenantId: actor.tenantId }),
          write: (ids, patch) => repo.write(ids, patch, actor),
          unlink: (ids) => repo.unlink(ids, actor),
          copy: (id, overrides) => repo.copy(id, overrides, actor),
          defaultGet: (fields) => repo.defaultGet(fields, actor),
          nameGet: (ids, opts) => repo.nameGet(ids, { ...opts, actor, tenantId: actor.tenantId }),
          nameSearch: (q, opts) => repo.nameSearch(q, { ...opts, actor, tenantId: actor.tenantId }),
          onchange: (field, draft) => repo.onchange(field, draft, actor),
          attachRelation: (id, rel, targetIds) => repo.attachRelation(id, rel, targetIds, actor),
          detachRelation: (id, rel, targetIds) => repo.detachRelation(id, rel, targetIds, actor),
          replaceRelation: (id, rel, targetIds) => repo.replaceRelation(id, rel, targetIds, actor),
        };
      },

      async create(
        input: Record<string, unknown>,
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType>> {
        const actor = actorInput ?? createActorContext();
        const { shape, boolFields, jsonFields, domainFields, storedComputed } = getColumnMeta();

        assertWritePolicies(input, actor);

        // Apply model defaults before Zod schema validation
        const candidate: Record<string, unknown> = { ...input };
        for (const [defField, defFn] of Object.entries(defaults)) {
          if (candidate[defField] === undefined) {
            candidate[defField] = defFn(actor);
          }
        }

        const effectiveSchema = z.object(shape);
        const parsed = effectiveSchema.safeParse(candidate);
        if (!parsed.success) {
          throw new ValidationError(
            parsed.error.issues[0]?.message ?? `Validation failed for ${options.name}`,
            parsed.error.issues,
          );
        }

        const now = new Date().toISOString();
        const id =
          typeof input.id === "string" && input.id.trim().length > 0
            ? input.id.trim()
            : randomUUID();

        const assembled: Record<string, unknown> = {
          id,
          create_uid: actor.actorId,
          create_date: now,
          write_uid: actor.actorId,
          write_date: now,
          status: "active",
          deleted_uid: null,
          deleted_date: null,
          version: 1,
          source: actor.source,
          source_ref: typeof input.source_ref === "string" ? input.source_ref : null,
          tenant_id: actor.tenantId,
          _attrs: "{}",
          ...parsed.data,
        };

        for (const compKey of computedOrder) {
          assembled[compKey] = computed[compKey]!.compute(assembled);
        }

        for (const constrain of constrains) {
          await constrain({ before: null, after: assembled, actor });
        }

        const db = getDb();
        const created = await db.transaction(async (tx) => {
          await validateMany2OneRelations(tx, assembled, actor);
          if (hooks.beforeSave) {
            await hooks.beforeSave({ action: "CREATE", before: null, after: assembled, actor });
          }

          const insertCols = [...SYSTEM_COLUMN_NAMES, ...domainFields, ...storedComputed];
          const values = insertCols.map((col) =>
            serializeValueForSql(assembled[col], boolFields.has(col), jsonFields.has(col)),
          );
          const colList = insertCols.map((c) => `"${c}"`).join(", ");
          const placeholders = insertCols.map(() => "?").join(", ");

          await tx.run(
            `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
            values,
          );

          await writeAuditAndOutbox(tx, actor, getModel(), id, "CREATE", 1, assembled);
          return assembled as OrmRecord<RecordType>;
        });

        if (hooks.afterSave) {
          try {
            await hooks.afterSave({ action: "CREATE", record: created, actor });
          } catch (err) {
            modelRegistry.recordHookError(options.name, "afterSave", err);
          }
        }

        modelRegistry.emitWrite({
          model: options.name,
          entityId: id,
          action: "CREATE",
          version: 1,
          actor,
          record: created,
        });

        return filterReadableRecord(created, fieldPolicies, actorInput);
      },

      async find(
        filters: Record<string, unknown> = {},
        findOpts: FindOptions = {},
      ): Promise<Array<OrmRecord<RecordType>>> {
        const { boolFields, jsonFields, domainFields, allowedColumns } = getColumnMeta();
        const actor = findOpts.actor;
        const tenantId = normalizeTenantId(findOpts.tenantId ?? actor?.tenantId);

        const assertReadable = (col: string) => {
          if (actor && !canActorReadField(fieldPolicies[col], actor)) {
            throw new PolicyError(
              `Read access denied on field "${col}" of model "${options.name}".`,
              "FIELD_READ_FORBIDDEN",
              403,
            );
          }
        };

        if (findOpts.fields) {
          for (const f of findOpts.fields) {
            const safe = assertSafeIdentifier(f, "field projection");
            assertReadable(safe);
          }
        }

        const compiled = compileFilterToSql(filters, allowedColumns, assertReadable);
        const whereParts: string[] = [`"tenant_id" = ?`];
        const params: unknown[] = [tenantId];

        if (!findOpts.includeDeleted) {
          if (findOpts.includeArchived) {
            whereParts.push(`"status" != 'deleted'`);
          } else {
            whereParts.push(`"status" = 'active'`);
          }
        }

        if (compiled.sql) {
          whereParts.push(`(${compiled.sql})`);
          params.push(...compiled.params);
        }

        if (findOpts.q && findOpts.q.trim()) {
          const searchable = domainFields.filter((f) => canActorReadField(fieldPolicies[f], actor));
          if (searchable.length > 0) {
            const term = `%${findOpts.q.trim()}%`;
            whereParts.push(
              `(${searchable.map((c) => `LOWER(CAST("${c}" AS TEXT)) LIKE LOWER(?)`).join(" OR ")})`,
            );
            for (let i = 0; i < searchable.length; i += 1) params.push(term);
          } else {
            whereParts.push("1 = 0");
          }
        }

        const orderSql = compileOrderBy(findOpts.orderBy, allowedColumns, assertReadable);
        let sql = `SELECT * FROM "${table}" WHERE ${whereParts.join(" AND ")} ORDER BY ${orderSql}`;

        if (typeof findOpts.limit === "number") {
          const safeLimit = Math.max(0, Math.min(1000, Math.trunc(findOpts.limit)));
          sql += ` LIMIT ?`;
          params.push(safeLimit);
        }
        if (typeof findOpts.offset === "number" && findOpts.offset > 0) {
          const safeOffset = Math.max(0, Math.trunc(findOpts.offset));
          if (typeof findOpts.limit !== "number") {
            sql += ` LIMIT -1`;
          }
          sql += ` OFFSET ?`;
          params.push(safeOffset);
        }

        const rows = await getDb().all<Record<string, unknown>>(sql, params);
        const hydrated = rows.map((row) =>
          deserializeRow(row, boolFields, jsonFields, computed, computedOrder),
        );

        await hydrateRelations(hydrated, findOpts.with, tenantId, actor);

        return hydrated.map((r) =>
          filterReadableRecord(r, fieldPolicies, actor, findOpts.fields),
        ) as Array<OrmRecord<RecordType>>;
      },

      async findOne(
        id: string,
        findOpts: FindOptions = {},
      ): Promise<OrmRecord<RecordType> | null> {
        const rows = await repo.find(
          { id },
          {
            ...findOpts,
            limit: 1,
            includeArchived: findOpts.includeArchived ?? true,
          },
        );
        return rows[0] ?? null;
      },

      async count(
        filters: Record<string, unknown> = {},
        findOpts: FindOptions = {},
      ): Promise<number> {
        const { domainFields, allowedColumns } = getColumnMeta();
        const actor = findOpts.actor;
        const tenantId = normalizeTenantId(findOpts.tenantId ?? actor?.tenantId);

        const assertReadable = (col: string) => {
          if (actor && !canActorReadField(fieldPolicies[col], actor)) {
            throw new PolicyError(
              `Read access denied on field "${col}" of model "${options.name}".`,
              "FIELD_READ_FORBIDDEN",
              403,
            );
          }
        };

        const compiled = compileFilterToSql(filters, allowedColumns, assertReadable);
        const whereParts: string[] = [`"tenant_id" = ?`];
        const params: unknown[] = [tenantId];

        if (!findOpts.includeDeleted) {
          whereParts.push(findOpts.includeArchived ? `"status" != 'deleted'` : `"status" = 'active'`);
        }
        if (compiled.sql) {
          whereParts.push(`(${compiled.sql})`);
          params.push(...compiled.params);
        }
        if (findOpts.q && findOpts.q.trim()) {
          const searchable = domainFields.filter((f) => canActorReadField(fieldPolicies[f], actor));
          if (searchable.length > 0) {
            const term = `%${findOpts.q.trim()}%`;
            whereParts.push(
              `(${searchable.map((c) => `LOWER(CAST("${c}" AS TEXT)) LIKE LOWER(?)`).join(" OR ")})`,
            );
            for (let i = 0; i < searchable.length; i += 1) params.push(term);
          } else {
            return 0;
          }
        }

        const row = await getDb().get<{ total: number }>(
          `SELECT COUNT(*) AS total FROM "${table}" WHERE ${whereParts.join(" AND ")}`,
          params,
        );
        return Number(row?.total ?? 0);
      },

      async update(
        id: string,
        patch: Record<string, unknown>,
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType> | null> {
        const actor = actorInput ?? createActorContext();
        const { shape, boolFields, jsonFields, domainFields, storedComputed } = getColumnMeta();

        const expectedVersion =
          typeof patch.version === "number" ? Math.trunc(patch.version) : undefined;
        const domainPatch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "version" || k === "id") continue;
          domainPatch[k] = v;
        }
        assertWritePolicies(domainPatch, actor);

        const db = getDb();
        const updated = await db.transaction(async (tx) => {
          const rawExisting = await tx.get<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE "id" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
            [id, actor.tenantId],
          );
          if (!rawExisting) return null;

          const before = deserializeRow(
            rawExisting,
            boolFields,
            jsonFields,
            computed,
            computedOrder,
          ) as OrmRecord<RecordType>;

          if (expectedVersion !== undefined && Number(before.version) !== expectedVersion) {
            throw new ConflictError(
              `Optimistic lock conflict on ${options.name}(${id}): expected version ${expectedVersion}, found ${before.version}.`,
              expectedVersion,
              Number(before.version),
            );
          }

          const beforeRecord = before as Record<string, unknown>;
          const mergedDomain: Record<string, unknown> = {};
          for (const f of domainFields) {
            mergedDomain[f] = f in domainPatch ? domainPatch[f] : beforeRecord[f];
          }
          const parsed = z.object(shape).safeParse(mergedDomain);
          if (!parsed.success) {
            throw new ValidationError(
              parsed.error.issues[0]?.message ?? `Validation failed for ${options.name}`,
              parsed.error.issues,
            );
          }

          const now = new Date().toISOString();
          const nextVersion = Number(before.version) + 1;
          const after: Record<string, unknown> = {
            ...beforeRecord,
            ...parsed.data,
            write_uid: actor.actorId,
            write_date: now,
            version: nextVersion,
          };

          for (const compKey of computedOrder) {
            after[compKey] = computed[compKey]!.compute(after);
          }

          for (const constrain of constrains) {
            await constrain({ before: beforeRecord as OrmRecord<Record<string, unknown>>, after, actor });
          }

          await validateMany2OneRelations(tx, after, actor);
          if (hooks.beforeSave) {
            await hooks.beforeSave({
              action: "UPDATE",
              before: beforeRecord as OrmRecord<Record<string, unknown>>,
              after,
              actor,
            });
          }

          const updateCols = [...domainFields, ...storedComputed, "write_uid", "write_date", "version"];
          const setClause = updateCols.map((c) => `"${c}" = ?`).join(", ");
          const params = [
            ...updateCols.map((c) =>
              serializeValueForSql(after[c], boolFields.has(c), jsonFields.has(c)),
            ),
            id,
            actor.tenantId,
            Number(before.version),
          ];

          const runRes = await tx.run(
            `UPDATE "${table}" SET ${setClause} WHERE "id" = ? AND "tenant_id" = ? AND "version" = ?`,
            params,
          );
          if (runRes.changes === 0) {
            throw new ConflictError(
              `Concurrent modification detected on ${options.name}(${id}).`,
              Number(before.version),
            );
          }

          const diff: Record<string, { from: unknown; to: unknown }> = {};
          for (const k of [...domainFields, ...storedComputed]) {
            if (JSON.stringify(beforeRecord[k]) !== JSON.stringify(after[k])) {
              diff[k] = { from: beforeRecord[k], to: after[k] };
            }
          }

          await writeAuditAndOutbox(tx, actor, getModel(), id, "UPDATE", nextVersion, diff);
          return { record: after as OrmRecord<RecordType>, diff };
        });

        if (!updated) return null;

        if (hooks.afterSave) {
          try {
            await hooks.afterSave({ action: "UPDATE", record: updated.record, actor });
          } catch (err) {
            modelRegistry.recordHookError(options.name, "afterSave", err);
          }
        }

        modelRegistry.emitWrite({
          model: options.name,
          entityId: id,
          action: "UPDATE",
          version: updated.record.version,
          actor,
          record: updated.record,
          diff: updated.diff,
        });

        return filterReadableRecord(updated.record, fieldPolicies, actorInput);
      },

      async upsert(
        uniqueWhere: Record<string, unknown>,
        values: Record<string, unknown>,
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType>> {
        const actor = actorInput ?? createActorContext();
        const existing = (
          await repo.find(uniqueWhere, {
            limit: 1,
            tenantId: actor.tenantId,
            includeArchived: true,
          })
        )[0];
        if (existing) {
          const updated = await repo.update(existing.id, values, actor);
          if (updated) return updated;
        }
        return repo.create({ ...uniqueWhere, ...values }, actor);
      },

      async delete(
        id: string,
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType> | null> {
        const actor = actorInput ?? createActorContext();
        const { boolFields, jsonFields } = getColumnMeta();
        const db = getDb();

        const deleted = await db.transaction(async (tx) => {
          const rawExisting = await tx.get<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE "id" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
            [id, actor.tenantId],
          );
          if (!rawExisting) return null;

          const before = deserializeRow(
            rawExisting,
            boolFields,
            jsonFields,
            computed,
            computedOrder,
          ) as OrmRecord<RecordType>;

          await checkIncomingRestrictRelations(tx, before, actor);
          if (hooks.beforeDelete) {
            await hooks.beforeDelete({ record: before, actor });
          }

          const now = new Date().toISOString();
          const nextVersion = Number(before.version) + 1;
          const runRes = await tx.run(
            `UPDATE "${table}"
             SET "status" = 'deleted', "deleted_uid" = ?, "deleted_date" = ?, "write_uid" = ?, "write_date" = ?, "version" = ?
             WHERE "id" = ? AND "tenant_id" = ? AND "version" = ?`,
            [actor.actorId, now, actor.actorId, now, nextVersion, id, actor.tenantId, before.version],
          );
          if (runRes.changes === 0) {
            throw new ConflictError(`Concurrent modification during delete on ${options.name}(${id}).`);
          }

          const after: OrmRecord<RecordType> = {
            ...before,
            status: "deleted",
            deleted_uid: actor.actorId,
            deleted_date: now,
            write_uid: actor.actorId,
            write_date: now,
            version: nextVersion,
          };

          await writeAuditAndOutbox(tx, actor, getModel(), id, "DELETE", nextVersion, {
            status: { from: before.status, to: "deleted" },
          });
          return after;
        });

        if (!deleted) return null;

        if (hooks.afterDelete) {
          try {
            await hooks.afterDelete({ record: deleted, actor });
          } catch (err) {
            modelRegistry.recordHookError(options.name, "afterDelete", err);
          }
        }

        modelRegistry.emitWrite({
          model: options.name,
          entityId: id,
          action: "DELETE",
          version: deleted.version,
          actor,
          record: deleted,
        });

        return filterReadableRecord(deleted, fieldPolicies, actorInput);
      },

      async archive(
        id: string,
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType> | null> {
        const actor = actorInput ?? createActorContext();
        const { boolFields, jsonFields } = getColumnMeta();
        const db = getDb();

        const archived = await db.transaction(async (tx) => {
          const rawExisting = await tx.get<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE "id" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
            [id, actor.tenantId],
          );
          if (!rawExisting) return null;
          const before = deserializeRow(
            rawExisting,
            boolFields,
            jsonFields,
            computed,
            computedOrder,
          ) as OrmRecord<RecordType>;

          const now = new Date().toISOString();
          const nextVersion = Number(before.version) + 1;
          await tx.run(
            `UPDATE "${table}" SET "status" = 'archived', "write_uid" = ?, "write_date" = ?, "version" = ? WHERE "id" = ? AND "tenant_id" = ?`,
            [actor.actorId, now, nextVersion, id, actor.tenantId],
          );

          const after: OrmRecord<RecordType> = {
            ...before,
            status: "archived",
            write_uid: actor.actorId,
            write_date: now,
            version: nextVersion,
          };
          await writeAuditAndOutbox(tx, actor, getModel(), id, "ARCHIVE", nextVersion, {
            status: { from: before.status, to: "archived" },
          });
          return after;
        });

        return archived ? filterReadableRecord(archived, fieldPolicies, actorInput) : null;
      },

      async restore(
        id: string,
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType> | null> {
        const actor = actorInput ?? createActorContext();
        const { boolFields, jsonFields } = getColumnMeta();
        const db = getDb();

        const restored = await db.transaction(async (tx) => {
          const rawExisting = await tx.get<Record<string, unknown>>(
            `SELECT * FROM "${table}" WHERE "id" = ? AND "tenant_id" = ? LIMIT 1`,
            [id, actor.tenantId],
          );
          if (!rawExisting) return null;
          const before = deserializeRow(
            rawExisting,
            boolFields,
            jsonFields,
            computed,
            computedOrder,
          ) as OrmRecord<RecordType>;

          const now = new Date().toISOString();
          const nextVersion = Number(before.version) + 1;
          await tx.run(
            `UPDATE "${table}" SET "status" = 'active', "deleted_uid" = NULL, "deleted_date" = NULL, "write_uid" = ?, "write_date" = ?, "version" = ? WHERE "id" = ? AND "tenant_id" = ?`,
            [actor.actorId, now, nextVersion, id, actor.tenantId],
          );

          const after: OrmRecord<RecordType> = {
            ...before,
            status: "active",
            deleted_uid: null,
            deleted_date: null,
            write_uid: actor.actorId,
            write_date: now,
            version: nextVersion,
          };
          await writeAuditAndOutbox(tx, actor, getModel(), id, "RESTORE", nextVersion, {
            status: { from: before.status, to: "active" },
          });
          return after;
        });

        return restored ? filterReadableRecord(restored, fieldPolicies, actorInput) : null;
      },

      async history(id: string, actor?: ActorContext): Promise<AuditLogEntry[]> {
        const rows = await getDb().all<AuditLogEntry>(
          `SELECT id, model, entity_id, action, changed_by, changed_at, diff, entity_version, source, request_id
           FROM _orm_audit_log
           WHERE model = ? AND entity_id = ?
           ORDER BY changed_at ASC, id ASC`,
          [options.name, id],
        );

        if (!actor) return rows;
        return rows.map((entry) => {
          try {
            const parsed = JSON.parse(entry.diff) as Record<string, unknown>;
            const filtered = filterReadableRecord(parsed, fieldPolicies, actor);
            return { ...entry, diff: JSON.stringify(filtered) };
          } catch {
            return entry;
          }
        });
      },

      async readGroup(
        groupBy: string,
        filters: Record<string, unknown> = {},
        findOpts: FindOptions = {},
      ): Promise<Array<Record<string, unknown>>> {
        const { domainFields, allowedColumns } = getColumnMeta();
        const actor = findOpts.actor;
        const tenantId = normalizeTenantId(findOpts.tenantId ?? actor?.tenantId);
        const safeGroup = assertSafeIdentifier(groupBy, "groupBy");
        if (!allowedColumns.has(safeGroup)) {
          throw new PolicyError(`Unknown groupBy column "${safeGroup}"`, "INVALID_GROUP_BY", 400);
        }

        const assertReadable = (col: string) => {
          if (actor && !canActorReadField(fieldPolicies[col], actor)) {
            throw new PolicyError(
              `Read access denied on field "${col}" of model "${options.name}".`,
              "FIELD_READ_FORBIDDEN",
              403,
            );
          }
        };
        assertReadable(safeGroup);

        const compiled = compileFilterToSql(filters, allowedColumns, assertReadable);
        const whereParts: string[] = [`"tenant_id" = ?`, `"status" = 'active'`];
        const params: unknown[] = [tenantId];

        if (compiled.sql) {
          whereParts.push(`(${compiled.sql})`);
          params.push(...compiled.params);
        }
        if (findOpts.q && findOpts.q.trim()) {
          const searchable = domainFields.filter((f) => canActorReadField(fieldPolicies[f], actor));
          if (searchable.length > 0) {
            const term = `%${findOpts.q.trim()}%`;
            whereParts.push(
              `(${searchable.map((c) => `LOWER(CAST("${c}" AS TEXT)) LIKE LOWER(?)`).join(" OR ")})`,
            );
            for (let i = 0; i < searchable.length; i += 1) params.push(term);
          } else {
            return [];
          }
        }

        const rows = await getDb().all<Record<string, unknown>>(
          `SELECT "${safeGroup}", COUNT(*) AS count FROM "${table}" WHERE ${whereParts.join(" AND ")} GROUP BY "${safeGroup}" ORDER BY count DESC`,
          params,
        );
        return rows.map((r) => ({ [safeGroup]: r[safeGroup], count: Number(r.count) }));
      },

      async attachRelation(
        id: string,
        relationName: string,
        targetIdsInput: string | readonly string[],
        actorInput?: ActorContext,
      ): Promise<{ attached: number }> {
        const actor = actorInput ?? createActorContext();
        const rel = relations[relationName];
        if (!rel || rel.type !== "many2many") {
          throw new ValidationError(`"${relationName}" is not a many2many relation on ${options.name}.`);
        }
        const targetModel = modelRegistry.get(rel.model);
        if (!targetModel) {
          throw new ValidationError(`Target relation model "${rel.model}" is not registered.`);
        }
        const through = assertSafeIdentifier(rel.through ?? `${table}_${relationName}_rel`, "join table");
        const sourceKey = assertSafeIdentifier(rel.sourceKey ?? "source_id", "sourceKey");
        const targetKey = assertSafeIdentifier(rel.targetKey ?? "target_id", "targetKey");
        const targetTable = assertSafeIdentifier(targetModel.table, "target table");

        const targetIds = Array.isArray(targetIdsInput) ? [...targetIdsInput] : [targetIdsInput];
        const db = getDb();

        return db.transaction(async (tx) => {
          const sourceRow = await tx.get(
            `SELECT "id" FROM "${table}" WHERE "id" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
            [id, actor.tenantId],
          );
          if (!sourceRow) {
            throw new PolicyError(`Source record "${id}" not found in tenant "${actor.tenantId}".`, "NOT_FOUND", 404);
          }

          let attached = 0;
          const now = new Date().toISOString();
          for (const tid of targetIds) {
            const targetRow = await tx.get(
              `SELECT "id" FROM "${targetTable}" WHERE "id" = ? AND "tenant_id" = ? AND "status" != 'deleted' LIMIT 1`,
              [tid, actor.tenantId],
            );
            if (!targetRow) {
              throw new PolicyError(
                `Target record "${tid}" of "${rel.model}" is outside tenant "${actor.tenantId}" or missing.`,
                "RELATION_TENANT_FORBIDDEN",
                403,
              );
            }
            const res = await tx.run(
              `INSERT OR IGNORE INTO "${through}" ("tenant_id", "${sourceKey}", "${targetKey}", "created_at") VALUES (?, ?, ?, ?)`,
              [actor.tenantId, id, tid, now],
            );
            attached += res.changes;
          }
          return { attached };
        });
      },

      async detachRelation(
        id: string,
        relationName: string,
        targetIdsInput: string | readonly string[],
        actorInput?: ActorContext,
      ): Promise<{ detached: number }> {
        const actor = actorInput ?? createActorContext();
        const rel = relations[relationName];
        if (!rel || rel.type !== "many2many") {
          throw new ValidationError(`"${relationName}" is not a many2many relation on ${options.name}.`);
        }
        const through = assertSafeIdentifier(rel.through ?? `${table}_${relationName}_rel`, "join table");
        const sourceKey = assertSafeIdentifier(rel.sourceKey ?? "source_id", "sourceKey");
        const targetKey = assertSafeIdentifier(rel.targetKey ?? "target_id", "targetKey");
        const targetIds = Array.isArray(targetIdsInput) ? [...targetIdsInput] : [targetIdsInput];
        if (targetIds.length === 0) return { detached: 0 };

        const placeholders = targetIds.map(() => "?").join(", ");
        const res = await getDb().run(
          `DELETE FROM "${through}" WHERE "tenant_id" = ? AND "${sourceKey}" = ? AND "${targetKey}" IN (${placeholders})`,
          [actor.tenantId, id, ...targetIds],
        );
        return { detached: res.changes };
      },

      async replaceRelation(
        id: string,
        relationName: string,
        targetIds: readonly string[],
        actorInput?: ActorContext,
      ): Promise<{ attached: number; detached: number }> {
        const actor = actorInput ?? createActorContext();
        const rel = relations[relationName];
        if (!rel || rel.type !== "many2many") {
          throw new ValidationError(`"${relationName}" is not a many2many relation on ${options.name}.`);
        }
        const through = assertSafeIdentifier(rel.through ?? `${table}_${relationName}_rel`, "join table");
        const sourceKey = assertSafeIdentifier(rel.sourceKey ?? "source_id", "sourceKey");
        const targetKey = assertSafeIdentifier(rel.targetKey ?? "target_id", "targetKey");

        const existingRows = await getDb().all<Record<string, unknown>>(
          `SELECT "${targetKey}" FROM "${through}" WHERE "tenant_id" = ? AND "${sourceKey}" = ?`,
          [actor.tenantId, id],
        );
        const existingSet = new Set(existingRows.map((r) => String(r[targetKey])));
        const desiredSet = new Set(targetIds);

        const toDetach = [...existingSet].filter((x) => !desiredSet.has(x));
        const toAttach = [...desiredSet].filter((x) => !existingSet.has(x));

        const { detached } = await repo.detachRelation(id, relationName, toDetach, actor);
        const { attached } = await repo.attachRelation(id, relationName, toAttach, actor);
        return { attached, detached };
      },

      async search(
        domain?: DomainOrFilter,
        findOpts: FindOptions = {},
      ): Promise<Array<OrmRecord<RecordType>>> {
        return repo.find(normalizeDomain(domain), findOpts);
      },

      async searchCount(
        domain?: DomainOrFilter,
        findOpts: FindOptions = {},
      ): Promise<number> {
        return repo.count(normalizeDomain(domain), findOpts);
      },

      async read(
        ids: readonly string[],
        fields?: readonly string[],
        findOpts: FindOptions = {},
      ): Promise<Array<OrmRecord<RecordType>>> {
        if (ids.length === 0) return [];
        return repo.find(
          { id: { $in: [...ids] } },
          { ...findOpts, fields: fields ?? findOpts.fields, includeArchived: findOpts.includeArchived ?? true },
        );
      },

      async browse(
        ids: readonly string[],
        findOpts: FindOptions = {},
      ): Promise<Array<OrmRecord<RecordType>>> {
        return repo.read(ids, findOpts.fields, findOpts);
      },

      async write(
        ids: readonly string[],
        patch: Record<string, unknown>,
        actorInput?: ActorContext,
      ): Promise<Array<OrmRecord<RecordType>>> {
        const results: Array<OrmRecord<RecordType>> = [];
        for (const id of ids) {
          const updated = await repo.update(id, patch, actorInput);
          if (updated) results.push(updated);
        }
        return results;
      },

      async unlink(ids: readonly string[], actorInput?: ActorContext): Promise<number> {
        let count = 0;
        for (const id of ids) {
          const deleted = await repo.delete(id, actorInput);
          if (deleted) count += 1;
        }
        return count;
      },

      async copy(
        id: string,
        overrides: Record<string, unknown> = {},
        actorInput?: ActorContext,
      ): Promise<OrmRecord<RecordType> | null> {
        const actor = actorInput ?? createActorContext();
        const source = await repo.findOne(id, { actor, tenantId: actor.tenantId });
        if (!source) return null;
        const { domainFields } = getColumnMeta();
        const payload: Record<string, unknown> = {};
        const srcRec = source as Record<string, unknown>;
        for (const field of domainFields) {
          if (field in srcRec && canActorWriteField(fieldPolicies[field], actor)) {
            payload[field] = srcRec[field];
          }
        }
        if (
          inferredRecName !== "id" &&
          typeof payload[inferredRecName] === "string" &&
          !(inferredRecName in overrides)
        ) {
          payload[inferredRecName] = `${String(payload[inferredRecName])} (copy)`;
        }
        Object.assign(payload, overrides);
        return repo.create(payload, actor);
      },

      defaultGet(
        fields?: readonly string[],
        actorInput?: ActorContext,
      ): Record<string, unknown> {
        const actor = actorInput ?? createActorContext();
        const { shape, domainFields } = getColumnMeta();
        const requested = fields?.length ? fields : domainFields;
        const result: Record<string, unknown> = {};
        for (const field of requested) {
          if (field in defaults) {
            result[field] = defaults[field]!(actor);
            continue;
          }
          if (field in shape) {
            const meta = introspectZodSchema(field, shape[field]);
            if (meta.defaultValue !== undefined) {
              result[field] = meta.defaultValue;
            }
          }
        }
        return result;
      },

      async nameGet(
        ids: readonly string[],
        findOpts: FindOptions = {},
      ): Promise<Array<[string, string]>> {
        if (ids.length === 0) return [];
        const rows = await repo.read(ids, undefined, findOpts);
        return rows.map((row) => {
          const r = row as Record<string, unknown>;
          const label = String(r[inferredRecName] ?? r.id);
          return [String(r.id), label];
        });
      },

      async nameSearch(
        query: string,
        findOpts: FindOptions = {},
      ): Promise<Array<[string, string]>> {
        const rows = await repo.find(
          {},
          { ...findOpts, q: query, limit: findOpts.limit ?? 20 },
        );
        return rows.map((row) => {
          const r = row as Record<string, unknown>;
          const label = String(r[inferredRecName] ?? r.id);
          return [String(r.id), label];
        });
      },

      async onchange(
        field: string,
        draft: Record<string, unknown>,
        actorInput?: ActorContext,
      ): Promise<Record<string, unknown>> {
        const actor = actorInput ?? createActorContext();
        const handler = onchangeHandlers[field];
        if (!handler) return {};
        return await handler(draft, actor);
      },
    };

    return repo;
  }

  const repository = buildRepository();

  const model: DefinedModel<RecordType> = {
    name: options.name,
    table,
    schema: options.schema as unknown as z.ZodObject<z.ZodRawShape>,
    restEnabled: Boolean(options.restEnabled),
    extensible: options.extensible ?? true,
    recName: inferredRecName,
    originAddon: options.originAddon ?? "__base",
    fieldMeta: options.fieldMeta ?? {},
    defaults,
    indexes: options.indexes ?? [],
    relations,
    computed,
    fieldPolicies,
    constrains,
    hooks: hooks as DefinedModel<RecordType>["hooks"],
    onchange: onchangeHandlers,
    actions: options.actions ?? {},
    outbox: options.outbox ?? true,
    repository,
  };

  definedRef.current = model;
  modelRegistry.register(model);
  return model;
}
