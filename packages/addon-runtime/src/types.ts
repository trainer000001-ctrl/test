import type { ActorContext, DefinedModel, FieldMetadata, OrmRecord } from "@moonwitness/orm";
import type { z } from "zod";

export type PlatformRole = "admin" | "editor" | "viewer" | "public";
export type AddonLifecycleState = "installed" | "disabled" | "upgrade_pending" | "error";
export type ViewType = "list" | "form" | "detail" | "kanban" | "search";

export interface AddonProvides {
  readonly models?: readonly string[];
  readonly routes?: readonly string[];
  readonly views?: readonly string[];
  readonly menus?: readonly string[];
  readonly actions?: readonly string[];
  readonly services?: readonly string[];
}

export interface AddonManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly category?: string;
  readonly depends: readonly string[];
  readonly provides: AddonProvides;
  readonly autoInstall?: boolean;
  readonly defaultEnabled?: boolean;
  readonly signature?: string;
}

export interface AddonModelExtension {
  readonly model: string;
  readonly fields: z.ZodObject<z.ZodRawShape>;
  readonly fieldMeta?: Record<string, Partial<Omit<FieldMetadata, "name">>>;
}

export interface ViewFilterSpec {
  readonly key: string;
  readonly label: string;
  readonly domain: unknown[];
}

export interface ViewSpec {
  readonly title?: string;
  readonly description?: string;
  readonly domainIcon?: string;
  readonly columns?: string[];
  readonly formFields?: string[];
  readonly stageField?: string;
  readonly cardFields?: string[];
  readonly searchFields?: string[];
  readonly filters?: ViewFilterSpec[];
  readonly groupBy?: string[];
  readonly defaultOrder?: string;
  readonly [key: string]: unknown;
}

export interface ViewInheritanceOp {
  readonly op: "after" | "before" | "replace" | "remove" | "attributes";
  readonly target: "columns" | "formFields" | "cardFields" | "searchFields" | "filters" | "groupBy" | "spec";
  readonly anchor?: string;
  readonly value?: unknown;
}

export interface ViewDefinition {
  readonly id: string;
  readonly model: string;
  readonly view_type: ViewType;
  readonly addon?: string;
  readonly priority?: number;
  readonly inherit_id?: string;
  readonly spec?: ViewSpec;
  readonly operations?: readonly ViewInheritanceOp[];
}

export interface MenuDefinition {
  readonly menu_key: string;
  readonly addon?: string;
  readonly parent_key?: string | null;
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly plane: "creator" | "operations" | "public";
  readonly sort_order: number;
  readonly min_role: PlatformRole;
  readonly groups?: readonly string[];
}

export interface ActionDefinition {
  readonly id: string;
  readonly model: string;
  readonly addon?: string;
  readonly type: "window" | "model" | "record" | "server";
  readonly label: string;
  readonly method?: "POST" | "PATCH" | "DELETE";
  readonly urlTemplate?: string;
  readonly roles?: readonly ("admin" | "editor" | "viewer")[];
  readonly groups?: readonly string[];
  readonly handler?: (ctx: {
    id?: string;
    record?: OrmRecord<Record<string, unknown>> | null;
    input?: Record<string, unknown>;
    actor: ActorContext;
  }) => Promise<unknown>;
}

export interface ModelAclDefinition {
  readonly model: string;
  readonly addon?: string;
  readonly role?: PlatformRole;
  readonly group?: string;
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export interface RecordRuleDefinition {
  readonly id: string;
  readonly model: string;
  readonly name: string;
  readonly addon?: string;
  readonly domain: unknown[];
  readonly operations?: readonly ("read" | "create" | "update" | "delete")[];
  readonly roles?: readonly PlatformRole[];
  readonly groups?: readonly string[];
  readonly global?: boolean;
}

export interface AddonLoadContext {
  readonly loaded: readonly string[];
  readonly target?: unknown;
}

export interface AddonUpgradeContext {
  readonly fromVersion: string;
  readonly toVersion: string;
}

export interface AddonDefinition {
  readonly manifest: AddonManifest;
  readonly models?: readonly DefinedModel<Record<string, unknown>>[];
  readonly extensions?: readonly AddonModelExtension[];
  readonly views?: readonly ViewDefinition[];
  readonly menus?: readonly MenuDefinition[];
  readonly actions?: readonly ActionDefinition[];
  readonly acl?: readonly ModelAclDefinition[];
  readonly rules?: readonly RecordRuleDefinition[];
  readonly services?: Record<string, unknown>;
  readonly register?: (ctx: AddonLoadContext) => void | Promise<void>;
  readonly seed?: () => void | Promise<void>;
  readonly upgrade?: (ctx: AddonUpgradeContext) => void | Promise<void>;
  readonly uninstall?: () => void | Promise<void>;
}

export interface RuntimeAddonStatus {
  readonly id: string;
  readonly name: string;
  readonly addon_version: string;
  readonly description: string;
  readonly category: string;
  readonly state: AddonLifecycleState;
  readonly auto_install: boolean;
  readonly last_error: string | null;
  readonly enabled: boolean;
  readonly depends: readonly string[];
  readonly models: readonly string[];
}

export interface EffectiveAcl {
  readonly canRead: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}

export interface RuntimeMetaFieldDescriptor {
  readonly id: string;
  readonly model_name: string;
  readonly field_name: string;
  readonly field_type: "text" | "integer" | "real" | "boolean" | "date" | "json" | "selection";
  readonly nullable: boolean;
  readonly required: boolean;
  readonly deprecated: boolean;
  readonly is_custom: boolean;
  readonly origin_addon: string;
  readonly ui_widget: string;
  readonly label: string;
  readonly help?: string;
  readonly readonly?: boolean;
  readonly selection: string[] | null;
  readonly default_value: unknown;
  readonly relation?: {
    readonly model: string;
    readonly type?: "many2one" | "many2many";
  };
}

export interface RuntimeViewDescriptor {
  readonly model: string;
  readonly table: string;
  readonly extensible: boolean;
  readonly restEnabled: boolean;
  readonly acl: EffectiveAcl;
  readonly fields: RuntimeMetaFieldDescriptor[];
  readonly views: Array<{
    readonly id: string;
    readonly view_type: ViewType;
    readonly addon: string;
    readonly priority: number;
    readonly spec: ViewSpec;
  }>;
  readonly actionBindings: {
    readonly listUrl?: string;
    readonly createUrl?: string;
    readonly updateUrl?: string;
    readonly archiveUrl?: string;
    readonly restoreUrl?: string;
    readonly deleteUrl?: string;
    readonly historyUrl?: string;
    readonly customActions?: Array<{
      readonly id: string;
      readonly label: string;
      readonly method: "POST" | "PATCH" | "DELETE";
      readonly urlTemplate: string;
      readonly roles: Array<"admin" | "editor" | "viewer">;
    }>;
  };
}

export interface BaseAddonAuthBridge {
  readonly authenticate: (request: unknown, reply: unknown) => Promise<unknown> | unknown;
  readonly optionalAuthenticate: (request: unknown, reply: unknown) => Promise<unknown> | unknown;
  readonly requireRole: (...roles: string[]) => (request: unknown, reply: unknown) => Promise<unknown> | unknown;
  readonly getActorRole: (request: unknown) => PlatformRole;
  readonly getActorId: (request: unknown) => string | null;
  readonly getActorGroups: (request: unknown) => readonly string[];
  readonly getActorTenant: (request: unknown) => string;
  readonly resolveActorContext: (request: unknown, source?: string) => ActorContext;
}

export type HostRateLimitFactory = (opts: {
  max: number;
  windowMs: number;
  scope: string;
  message?: string;
}) => (
  request: { ip: string; headers: Record<string, string | string[] | undefined> },
  reply: {
    header: (name: string, value: string | number) => unknown;
    code: (status: number) => { send: (payload: unknown) => unknown };
  },
) => Promise<unknown>;

export interface AddonHostContext {
  readonly prefix: string;
  readonly auth: BaseAddonAuthBridge;
  readonly rateLimit: HostRateLimitFactory;
  readonly proxy: {
    readonly resolveServiceUrl: (envVar: string, defaultLocalUrl: string) => string;
    readonly buildHeaders: (request: unknown, baseHeaders?: Record<string, string>) => Record<string, string>;
    readonly checkEdgeLoopback: (
      serviceName: string,
      envVar: string,
      urlString: string,
    ) => { error: string; code: string } | null;
  };
  readonly mid: {
    readonly keyEncryptionSecret?: string;
    readonly issuerUrl?: string;
    readonly cookieDomain?: string;
    readonly corsOrigins?: string;
  };
  readonly seedDemo: boolean;
}

export const baseManifest: AddonManifest = {
  name: "__base",
  version: "1.0.0",
  description: "MoonWitness Platform Kernel: ORM, Metadata Registry, ACL, Views, Menus, Chatter & Multi-Company",
  category: "Kernel",
  depends: [],
  provides: {
    models: [
      "res.company",
      "res.groups",
      "mail.message",
      "ir.addon",
      "ir.model.field",
      "ir.rule",
    ],
    routes: ["health", "_meta", "m", "rpc", "celestial"],
    services: ["orm", "views", "security", "menus", "actions"],
  },
  autoInstall: true,
  defaultEnabled: true,
};
