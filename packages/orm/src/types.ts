import type { z } from "zod";

export const DEFAULT_TENANT_ID = "default" as const;

export type OrmDialect = "sqlite" | "d1" | "postgres";
export type RecordStatus = "active" | "archived" | "deleted";
export type OrmAction = "CREATE" | "UPDATE" | "DELETE" | "ARCHIVE" | "RESTORE";
export type ActorSource = "api" | "sync" | "migration" | "system" | "rpc" | string;

export interface ActorContext {
  readonly actorId: string | null;
  readonly source: ActorSource;
  readonly requestId: string;
  readonly tenantId: string;
  readonly role?: string;
  readonly groups?: readonly string[];
}

export class ConflictError extends Error {
  readonly code = "CONFLICT";
  readonly statusCode = 409;
  readonly expectedVersion?: number;
  readonly actualVersion?: number;

  constructor(message: string, expectedVersion?: number, actualVersion?: number) {
    super(message);
    this.name = "ConflictError";
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class PolicyError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = "POLICY_FORBIDDEN", statusCode = 403) {
    super(message);
    this.name = "PolicyError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
  readonly issues?: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export interface RunResult {
  readonly changes: number;
  readonly lastInsertRowid?: number | bigint | string;
}

export interface OrmDriverHandle {
  readonly dialect: OrmDialect;
  readonly kind?: string;
  getConnectionString?: () => string;
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly unknown[]): Promise<RunResult>;
  get<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: OrmDriverHandle) => Promise<T>): Promise<T>;
  close(): void;
  closeAsync?(): Promise<void>;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta: { changes: number; last_row_id?: number } }>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  exec(sql: string): Promise<{ count: number }>;
  batch?<T = unknown>(statements: D1PreparedStatementLike[]): Promise<T[]>;
}

export interface SystemColumns {
  id: string;
  create_uid: string | null;
  create_date: string;
  write_uid: string | null;
  write_date: string;
  status: RecordStatus;
  deleted_uid: string | null;
  deleted_date: string | null;
  version: number;
  source: string;
  source_ref: string | null;
  tenant_id: string;
  _attrs: string;
}

export type OrmRecord<T extends Record<string, unknown> = Record<string, unknown>> = SystemColumns & T;

export interface AuditLogEntry {
  readonly id: string;
  readonly model: string;
  readonly entity_id: string;
  readonly action: OrmAction;
  readonly changed_by: string | null;
  readonly changed_at: string;
  readonly diff: string;
  readonly entity_version: number;
  readonly source: string;
  readonly request_id: string | null;
}

export interface OutboxEventEntry {
  readonly id: string;
  readonly model: string;
  readonly entity_id: string;
  readonly action: OrmAction;
  readonly tenant_id: string;
  readonly actor_id: string | null;
  readonly request_id: string | null;
  readonly event_version: number;
  readonly payload_json: string;
  readonly status: "pending" | "delivered" | "dead_letter";
  readonly attempts: number;
  readonly next_attempt_at: string;
  readonly last_error: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface FieldPolicy {
  readonly readRoles?: readonly string[];
  readonly writeRoles?: readonly string[];
  readonly readGroups?: readonly string[];
  readonly writeGroups?: readonly string[];
  readonly sensitive?: boolean;
}

export interface RelationConfig {
  readonly model: string;
  readonly type?: "many2one" | "many2many";
  readonly targetField?: string;
  readonly onDelete?: "restrict" | "cascade" | "set_null";
  readonly through?: string;
  readonly sourceKey?: string;
  readonly targetKey?: string;
}

export interface ComputedFieldConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly depends: readonly string[];
  readonly compute: (record: T & Record<string, unknown>) => unknown;
  readonly stored?: boolean;
  readonly type?: "text" | "integer" | "real" | "boolean";
}

export interface ModelIndexConfig {
  readonly fields: readonly string[];
  readonly unique?: boolean;
  readonly name?: string;
}

export type ConstrainFn<T extends Record<string, unknown> = Record<string, unknown>> = (ctx: {
  before: (OrmRecord<T> & Record<string, unknown>) | null;
  after: Record<string, unknown>;
  actor: ActorContext;
}) => void | Promise<void>;

export interface ModelHooks<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly beforeSave?: (ctx: {
    action: "CREATE" | "UPDATE";
    before: OrmRecord<T> | null;
    after: Record<string, unknown>;
    actor: ActorContext;
  }) => void | Promise<void>;
  readonly afterSave?: (ctx: {
    action: "CREATE" | "UPDATE";
    record: OrmRecord<T>;
    actor: ActorContext;
  }) => void | Promise<void>;
  readonly beforeDelete?: (ctx: {
    record: OrmRecord<T>;
    actor: ActorContext;
  }) => void | Promise<void>;
  readonly afterDelete?: (ctx: {
    record: OrmRecord<T>;
    actor: ActorContext;
  }) => void | Promise<void>;
}

export interface ModelActionConfig {
  readonly scope: "model" | "record";
  readonly operation?: "read" | "create" | "update" | "delete";
  readonly roles?: readonly string[];
  readonly input?: z.ZodTypeAny;
  readonly handler: (ctx: {
    record?: Record<string, unknown>;
    input?: unknown;
    repository: ModelRepository<Record<string, unknown>>;
    actor: ActorContext;
  }) => Promise<unknown>;
}

export type IntrospectedFieldType =
  | "text"
  | "integer"
  | "real"
  | "boolean"
  | "date"
  | "json"
  | "selection";

export interface FieldMetadata {
  readonly name: string;
  readonly fieldType: IntrospectedFieldType;
  readonly label: string;
  readonly help?: string;
  readonly required: boolean;
  readonly nullable: boolean;
  readonly readonly: boolean;
  readonly widget: string;
  readonly selection: string[] | null;
  readonly defaultValue: unknown;
  readonly isCustom: boolean;
  readonly originAddon: string;
  readonly computed?: boolean;
  readonly stored?: boolean;
  readonly relation?: RelationConfig;
  readonly sensitive?: boolean;
}

export interface ModelMetadataSnapshot {
  readonly name: string;
  readonly table: string;
  readonly recName: string;
  readonly extensible: boolean;
  readonly restEnabled: boolean;
  readonly originAddon: string;
  readonly fields: FieldMetadata[];
  readonly relations: Record<string, RelationConfig>;
  readonly actions: string[];
}

export type OnchangeHandler = (
  draft: Record<string, unknown>,
  actor: ActorContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface DefineModelOptions<T extends z.ZodRawShape> {
  readonly name: string;
  readonly table: string;
  readonly schema: z.ZodObject<T>;
  readonly restEnabled?: boolean;
  readonly extensible?: boolean;
  readonly recName?: string;
  readonly originAddon?: string;
  readonly fieldMeta?: Record<string, Partial<Omit<FieldMetadata, "name">>>;
  readonly defaults?: Partial<Record<keyof T & string, (actor: ActorContext) => unknown>>;
  readonly indexes?: readonly ModelIndexConfig[];
  readonly relations?: Record<string, RelationConfig>;
  readonly computed?: Record<string, ComputedFieldConfig<z.infer<z.ZodObject<T>>>>;
  readonly fieldPolicies?: Record<string, FieldPolicy>;
  readonly constrains?: readonly ConstrainFn<z.infer<z.ZodObject<T>>>[];
  readonly hooks?: ModelHooks<z.infer<z.ZodObject<T>>>;
  readonly onchange?: Record<string, OnchangeHandler>;
  readonly actions?: Record<string, ModelActionConfig>;
  readonly outbox?: boolean;
}

export interface FindOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly q?: string;
  readonly with?: readonly string[];
  readonly fields?: readonly string[];
  readonly includeDeleted?: boolean;
  readonly includeArchived?: boolean;
  readonly tenantId?: string;
  readonly actor?: ActorContext;
}

export interface ModelWriteEvent {
  readonly model: string;
  readonly entityId: string;
  readonly action: OrmAction;
  readonly version: number;
  readonly actor: ActorContext;
  readonly record: Record<string, unknown>;
  readonly diff?: Record<string, { from: unknown; to: unknown }>;
}

export interface HookErrorRecord {
  readonly model: string;
  readonly hook: string;
  readonly error: string;
  readonly timestamp: string;
}

export interface SyncModelsReport {
  readonly createdTables: string[];
  readonly addedColumns: Array<{ table: string; column: string }>;
}

export interface ModelSchemaInspection {
  readonly model: string;
  readonly table: string;
  readonly exists: boolean;
  readonly existingColumns: string[];
  readonly expectedColumns: string[];
  readonly missingColumns: string[];
  readonly extraColumns: string[];
}

export type DomainOrFilter = Record<string, unknown> | unknown[];

export interface ModelRepository<T extends Record<string, unknown>> {
  forActor(actor: ActorContext): ScopedModelRepository<T>;
  create(input: Record<string, unknown>, actor?: ActorContext): Promise<OrmRecord<T>>;
  find(filters?: Record<string, unknown>, options?: FindOptions): Promise<Array<OrmRecord<T>>>;
  findOne(id: string, options?: FindOptions): Promise<OrmRecord<T> | null>;
  count(filters?: Record<string, unknown>, options?: FindOptions): Promise<number>;
  update(
    id: string,
    patch: Record<string, unknown>,
    actor?: ActorContext,
  ): Promise<OrmRecord<T> | null>;
  upsert(
    uniqueWhere: Record<string, unknown>,
    values: Record<string, unknown>,
    actor?: ActorContext,
  ): Promise<OrmRecord<T>>;
  delete(id: string, actor?: ActorContext): Promise<OrmRecord<T> | null>;
  archive(id: string, actor?: ActorContext): Promise<OrmRecord<T> | null>;
  restore(id: string, actor?: ActorContext): Promise<OrmRecord<T> | null>;
  history(id: string, actor?: ActorContext): Promise<AuditLogEntry[]>;
  readGroup(
    groupBy: string,
    filters?: Record<string, unknown>,
    options?: FindOptions,
  ): Promise<Array<Record<string, unknown>>>;
  search(domain?: DomainOrFilter, options?: FindOptions): Promise<Array<OrmRecord<T>>>;
  searchCount(domain?: DomainOrFilter, options?: FindOptions): Promise<number>;
  read(
    ids: readonly string[],
    fields?: readonly string[],
    options?: FindOptions,
  ): Promise<Array<OrmRecord<T>>>;
  browse(ids: readonly string[], options?: FindOptions): Promise<Array<OrmRecord<T>>>;
  write(
    ids: readonly string[],
    patch: Record<string, unknown>,
    actor?: ActorContext,
  ): Promise<Array<OrmRecord<T>>>;
  unlink(ids: readonly string[], actor?: ActorContext): Promise<number>;
  copy(
    id: string,
    overrides?: Record<string, unknown>,
    actor?: ActorContext,
  ): Promise<OrmRecord<T> | null>;
  defaultGet(fields?: readonly string[], actor?: ActorContext): Record<string, unknown>;
  nameGet(ids: readonly string[], options?: FindOptions): Promise<Array<[string, string]>>;
  nameSearch(query: string, options?: FindOptions): Promise<Array<[string, string]>>;
  onchange(
    field: string,
    draft: Record<string, unknown>,
    actor?: ActorContext,
  ): Promise<Record<string, unknown>>;
  attachRelation(
    id: string,
    relationName: string,
    targetIds: string | readonly string[],
    actor?: ActorContext,
  ): Promise<{ attached: number }>;
  detachRelation(
    id: string,
    relationName: string,
    targetIds: string | readonly string[],
    actor?: ActorContext,
  ): Promise<{ detached: number }>;
  replaceRelation(
    id: string,
    relationName: string,
    targetIds: readonly string[],
    actor?: ActorContext,
  ): Promise<{ attached: number; detached: number }>;
}

export interface ScopedModelRepository<T extends Record<string, unknown>> {
  create(input: Record<string, unknown>): Promise<OrmRecord<T>>;
  find(filters?: Record<string, unknown>, options?: FindOptions): Promise<Array<OrmRecord<T>>>;
  findOne(id: string, options?: FindOptions): Promise<OrmRecord<T> | null>;
  count(filters?: Record<string, unknown>, options?: FindOptions): Promise<number>;
  update(id: string, patch: Record<string, unknown>): Promise<OrmRecord<T> | null>;
  upsert(
    uniqueWhere: Record<string, unknown>,
    values: Record<string, unknown>,
  ): Promise<OrmRecord<T>>;
  delete(id: string): Promise<OrmRecord<T> | null>;
  archive(id: string): Promise<OrmRecord<T> | null>;
  restore(id: string): Promise<OrmRecord<T> | null>;
  history(id: string): Promise<AuditLogEntry[]>;
  readGroup(
    groupBy: string,
    filters?: Record<string, unknown>,
    options?: FindOptions,
  ): Promise<Array<Record<string, unknown>>>;
  search(domain?: DomainOrFilter, options?: FindOptions): Promise<Array<OrmRecord<T>>>;
  searchCount(domain?: DomainOrFilter, options?: FindOptions): Promise<number>;
  read(
    ids: readonly string[],
    fields?: readonly string[],
    options?: FindOptions,
  ): Promise<Array<OrmRecord<T>>>;
  browse(ids: readonly string[], options?: FindOptions): Promise<Array<OrmRecord<T>>>;
  write(ids: readonly string[], patch: Record<string, unknown>): Promise<Array<OrmRecord<T>>>;
  unlink(ids: readonly string[]): Promise<number>;
  copy(id: string, overrides?: Record<string, unknown>): Promise<OrmRecord<T> | null>;
  defaultGet(fields?: readonly string[]): Record<string, unknown>;
  nameGet(ids: readonly string[], options?: FindOptions): Promise<Array<[string, string]>>;
  nameSearch(query: string, options?: FindOptions): Promise<Array<[string, string]>>;
  onchange(field: string, draft: Record<string, unknown>): Promise<Record<string, unknown>>;
  attachRelation(
    id: string,
    relationName: string,
    targetIds: string | readonly string[],
  ): Promise<{ attached: number }>;
  detachRelation(
    id: string,
    relationName: string,
    targetIds: string | readonly string[],
  ): Promise<{ detached: number }>;
  replaceRelation(
    id: string,
    relationName: string,
    targetIds: readonly string[],
  ): Promise<{ attached: number; detached: number }>;
}

export interface DefinedModel<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly name: string;
  readonly table: string;
  readonly schema: z.ZodObject<z.ZodRawShape>;
  readonly restEnabled: boolean;
  readonly extensible: boolean;
  readonly recName: string;
  readonly originAddon: string;
  readonly fieldMeta: Record<string, Partial<Omit<FieldMetadata, "name">>>;
  readonly defaults: Record<string, (actor: ActorContext) => unknown>;
  readonly indexes: readonly ModelIndexConfig[];
  readonly relations: Record<string, RelationConfig>;
  readonly computed: Record<string, ComputedFieldConfig<Record<string, unknown>>>;
  readonly fieldPolicies: Record<string, FieldPolicy>;
  readonly constrains: readonly ConstrainFn<Record<string, unknown>>[];
  readonly hooks: ModelHooks<Record<string, unknown>>;
  readonly onchange: Record<string, OnchangeHandler>;
  readonly actions: Record<string, ModelActionConfig>;
  readonly outbox: boolean;
  readonly repository: ModelRepository<T>;
}
