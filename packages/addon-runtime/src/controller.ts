import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  assertSafeIdentifier,
  compileTupleDomainToFilter,
  createActorContext,
  ensureCoreOrmTables,
  extendModel,
  getDb,
  getModelMetadata,
  modelRegistry,
  PolicyError,
  syncModels,
  ValidationError,
  type ActorContext,
  type DefinedModel,
} from "@moonwitness/orm";
import { AddonRegistry, AddonRegistryError } from "./registry";
import { normalizePlatformRole, roleMeetsMinimum, SecurityRegistry } from "./security";
import type {
  ActionDefinition,
  AddonDefinition,
  AddonLifecycleState,
  MenuDefinition,
  RuntimeAddonStatus,
  RuntimeMetaFieldDescriptor,
  RuntimeViewDescriptor,
  ViewSpec,
  ViewType,
} from "./types";
import { ViewRegistry } from "./views";

export interface CustomFieldRegistrationInput {
  readonly field_name: string;
  readonly field_type: "text" | "integer" | "real" | "boolean" | "date" | "json" | "selection";
  readonly label?: string;
  readonly required?: boolean;
  readonly selection?: string[];
  readonly origin_addon?: string;
}

export interface SyncAllOptions {
  readonly runSeeds?: boolean;
  readonly mode?: "node" | "edge";
  readonly apiPrefix?: string;
  readonly signingPolicy?: { mode?: string };
}

export interface RpcRequestPayload {
  readonly model: string;
  readonly method: string;
  readonly id?: string;
  readonly ids?: string[];
  readonly domain?: unknown[];
  readonly args?: unknown[];
  readonly kwargs?: Record<string, unknown>;
}

interface PersistedAddonRow {
  readonly id: string;
  readonly name: string;
  readonly addon_version: string;
  readonly description: string;
  readonly category: string;
  readonly state: AddonLifecycleState;
  readonly auto_install: number;
  readonly enabled: number;
  readonly last_error: string | null;
}

interface PersistedCustomFieldRow {
  readonly id: string;
  readonly model_name: string;
  readonly field_name: string;
  readonly field_type: CustomFieldRegistrationInput["field_type"];
  readonly label: string;
  readonly required: number;
  readonly selection_json: string | null;
  readonly origin_addon: string;
}

const SNAKE_FIELD_RE = /^[a-z][a-z0-9_]{1,62}$/;

function buildZodSchemaForCustomField(input: CustomFieldRegistrationInput): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (input.field_type) {
    case "integer":
      base = z.coerce.number().int();
      break;
    case "real":
      base = z.coerce.number();
      break;
    case "boolean":
      base = z.boolean();
      break;
    case "json":
      base = z.record(z.string(), z.unknown()).or(z.array(z.unknown()));
      break;
    case "selection":
      if (input.selection && input.selection.length > 0) {
        base = z.enum(input.selection as [string, ...string[]]);
      } else {
        base = z.string();
      }
      break;
    case "date":
    case "text":
    default:
      base = z.string();
      break;
  }
  return input.required ? base : base.optional().nullable();
}

export class AddonRuntimeController {
  readonly registry = new AddonRegistry();
  readonly views = new ViewRegistry();
  readonly security = new SecurityRegistry();

  private readonly definitions = new Map<string, AddonDefinition>();
  private readonly states = new Map<
    string,
    {
      id: string;
      version: string;
      state: AddonLifecycleState;
      enabled: boolean;
      lastError: string | null;
    }
  >();
  private readonly menus = new Map<string, MenuDefinition & { addon: string }>();
  private readonly actions = new Map<string, ActionDefinition & { addon: string }>();
  private readonly services = new Map<string, unknown>();
  private readonly modelOwners = new Map<string, string>();
  private apiPrefix = "/api/v1";

  getApiPrefix(): string {
    return this.apiPrefix;
  }

  registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  getService<T = unknown>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  private async ensureRuntimeTables(): Promise<void> {
    const db = getDb();
    await ensureCoreOrmTables(db);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS "_mw_ir_addons" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "addon_version" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "category" TEXT NOT NULL DEFAULT 'Platform',
        "state" TEXT NOT NULL DEFAULT 'installed',
        "auto_install" INTEGER NOT NULL DEFAULT 0,
        "enabled" INTEGER NOT NULL DEFAULT 1,
        "last_error" TEXT,
        "updated_at" TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "_mw_ir_custom_fields" (
        "id" TEXT PRIMARY KEY,
        "model_name" TEXT NOT NULL,
        "field_name" TEXT NOT NULL,
        "field_type" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "required" INTEGER NOT NULL DEFAULT 0,
        "selection_json" TEXT,
        "origin_addon" TEXT NOT NULL DEFAULT 'studio',
        "created_at" TEXT NOT NULL,
        UNIQUE ("model_name", "field_name")
      );

      CREATE TABLE IF NOT EXISTS "_mw_ir_views" (
        "id" TEXT PRIMARY KEY,
        "model_name" TEXT NOT NULL,
        "view_type" TEXT NOT NULL,
        "spec_json" TEXT NOT NULL,
        "updated_by" TEXT,
        "updated_at" TEXT NOT NULL,
        UNIQUE ("model_name", "view_type")
      );
    `);
  }

  private async persistAddonState(def: AddonDefinition): Promise<void> {
    const st = this.states.get(def.manifest.name);
    if (!st) return;
    const db = getDb();
    await db.run(
      `INSERT INTO "_mw_ir_addons"
        ("id", "name", "addon_version", "description", "category", "state", "auto_install", "enabled", "last_error", "updated_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT("name") DO UPDATE SET
        "addon_version" = excluded."addon_version",
        "description" = excluded."description",
        "category" = excluded."category",
        "state" = excluded."state",
        "auto_install" = excluded."auto_install",
        "enabled" = excluded."enabled",
        "last_error" = excluded."last_error",
        "updated_at" = excluded."updated_at"`,
      [
        st.id,
        def.manifest.name,
        st.version,
        def.manifest.description ?? "",
        def.manifest.category ?? "Platform",
        st.state,
        def.manifest.autoInstall ? 1 : 0,
        st.enabled ? 1 : 0,
        st.lastError,
        new Date().toISOString(),
      ],
    );
  }

  private registerAddonArtifacts(def: AddonDefinition): void {
    const addonName = def.manifest.name;

    for (const model of def.models ?? []) {
      modelRegistry.register(model);
      this.modelOwners.set(model.name, addonName);
    }

    for (const ext of def.extensions ?? []) {
      extendModel(ext.model, {
        addon: addonName,
        fields: ext.fields,
        fieldMeta: ext.fieldMeta,
      });
    }

    for (const view of def.views ?? []) {
      this.views.register({ ...view, addon: view.addon ?? addonName });
    }

    for (const menu of def.menus ?? []) {
      this.menus.set(menu.menu_key, { ...menu, addon: menu.addon ?? addonName });
    }

    for (const action of def.actions ?? []) {
      this.actions.set(`${action.model}:${action.id}`, { ...action, addon: action.addon ?? addonName });
    }

    for (const acl of def.acl ?? []) {
      this.security.registerAcl({ ...acl, addon: acl.addon ?? addonName });
    }

    for (const rule of def.rules ?? []) {
      this.security.registerRule({ ...rule, addon: rule.addon ?? addonName });
    }

    for (const [svcName, svc] of Object.entries(def.services ?? {})) {
      this.services.set(svcName, svc);
    }
  }

  private unregisterAddonArtifacts(addonName: string, removeModels = false): void {
    this.views.unregisterByAddon(addonName);
    this.security.unregisterByAddon(addonName);
    modelRegistry.removeExtensionsByAddon(addonName);

    for (const [k, m] of this.menus.entries()) {
      if (m.addon === addonName) this.menus.delete(k);
    }
    for (const [k, a] of this.actions.entries()) {
      if (a.addon === addonName) this.actions.delete(k);
    }

    if (removeModels) {
      for (const [modelName, owner] of this.modelOwners.entries()) {
        if (owner === addonName) {
          modelRegistry.unregister(modelName);
          this.modelOwners.delete(modelName);
        }
      }
    }
  }

  private async hydratePersistedCustomFields(): Promise<void> {
    const db = getDb();
    const rows = await db.all<PersistedCustomFieldRow>(
      `SELECT id, model_name, field_name, field_type, label, required, selection_json, origin_addon
       FROM "_mw_ir_custom_fields"
       ORDER BY created_at ASC`,
    );

    const touchedModels = new Set<string>();
    for (const row of rows) {
      if (!modelRegistry.has(row.model_name)) continue;
      const selection = row.selection_json
        ? (JSON.parse(row.selection_json) as string[])
        : undefined;
      const zodSchema = buildZodSchemaForCustomField({
        field_name: row.field_name,
        field_type: row.field_type,
        label: row.label,
        required: Boolean(row.required),
        selection,
        origin_addon: row.origin_addon,
      });
      extendModel(row.model_name, {
        addon: row.origin_addon,
        fields: z.object({ [row.field_name]: zodSchema }),
        isCustom: true,
        fieldMeta: {
          [row.field_name]: {
            label: row.label,
            fieldType: row.field_type,
            required: Boolean(row.required),
            selection: selection ?? null,
            isCustom: true,
          },
        },
      });
      touchedModels.add(row.model_name);
    }

    if (touchedModels.size > 0) {
      const modelsToSync = [...touchedModels]
        .map((m) => modelRegistry.get(m))
        .filter((m): m is DefinedModel<Record<string, unknown>> => Boolean(m));
      await syncModels(modelsToSync);
    }
  }

  private async hydratePersistedViews(): Promise<void> {
    const db = getDb();
    const rows = await db.all<{
      id: string;
      model_name: string;
      view_type: ViewType;
      spec_json: string;
    }>(`SELECT id, model_name, view_type, spec_json FROM "_mw_ir_views" ORDER BY updated_at ASC`);

    for (const row of rows) {
      if (!modelRegistry.has(row.model_name)) continue;
      try {
        const spec = JSON.parse(row.spec_json) as ViewSpec;
        this.views.register({
          id: `studio.${row.model_name}.${row.view_type}`,
          model: row.model_name,
          view_type: row.view_type,
          addon: "__base",
          inherit_id: "*",
          priority: 99,
          spec,
        });
      } catch {
        // Skip malformed persisted spec
      }
    }
  }

  async syncAll(
    addons: readonly AddonDefinition[],
    target?: unknown,
    options: SyncAllOptions = {},
  ): Promise<{ order: string[] }> {
    if (options.apiPrefix) {
      this.apiPrefix = options.apiPrefix.replace(/\/+$/, "");
    }
    await this.ensureRuntimeTables();

    const db = getDb();
    const persistedRows = await db.all<PersistedAddonRow>(`SELECT * FROM "_mw_ir_addons"`);
    const persistedByName = new Map(persistedRows.map((r) => [r.name, r]));

    for (const def of addons) {
      if (!this.registry.has(def.manifest.name)) {
        this.registry.add(def);
      }
      this.definitions.set(def.manifest.name, def);
    }

    this.registry.validate();
    const order = this.registry.resolveOrder();

    // 1. Register models, extensions, views, menus, actions, ACL, and rules in dependency order
    const modelsToSync: DefinedModel<Record<string, unknown>>[] = [];
    for (const name of order) {
      const def = this.definitions.get(name)!;
      const persisted = persistedByName.get(name);
      const defaultEnabled = def.manifest.defaultEnabled ?? true;
      const isEnabled =
        name === "__base"
          ? true
          : persisted
            ? Boolean(persisted.enabled)
            : defaultEnabled;

      this.states.set(name, {
        id: persisted?.id ?? randomUUID(),
        version: def.manifest.version,
        state: isEnabled ? "installed" : "disabled",
        enabled: isEnabled,
        lastError: null,
      });

      if (isEnabled) {
        this.registerAddonArtifacts(def);
      }
      for (const m of def.models ?? []) {
        modelsToSync.push(m);
      }
    }

    // 2. Idempotent schema sync for all models and extensions
    if (modelsToSync.length > 0) {
      await syncModels(modelsToSync);
    }

    // 3. Re-apply any persisted Studio custom fields and Studio view overrides
    await this.hydratePersistedCustomFields();
    await this.hydratePersistedViews();

    // 4. Execute addon lifecycle hooks (upgrade if version changed, register, optional seed)
    const loadedSoFar: string[] = [];
    for (const name of order) {
      const def = this.definitions.get(name)!;
      const st = this.states.get(name)!;
      const persisted = persistedByName.get(name);

      try {
        if (persisted && persisted.addon_version !== def.manifest.version && def.upgrade) {
          await def.upgrade({
            fromVersion: persisted.addon_version,
            toVersion: def.manifest.version,
          });
        }

        if (def.register) {
          await def.register({ loaded: [...loadedSoFar], target });
        }

        if (options.runSeeds && st.enabled && def.seed) {
          await def.seed();
        }
        st.lastError = null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        st.state = "error";
        st.lastError = msg;
        await this.persistAddonState(def);
        throw err;
      }

      await this.persistAddonState(def);
      loadedSoFar.push(name);
    }

    return { order };
  }

  /**
   * Dynamically install a new addon at runtime (manifest validation, dependency checks,
   * ORM registration, schema sync, views/menus/actions/ACL registration, and seed).
   */
  async install(definition: AddonDefinition, options: { runSeed?: boolean } = {}): Promise<RuntimeAddonStatus> {
    await this.ensureRuntimeTables();
    const name = definition.manifest.name;

    if (this.definitions.has(name)) {
      throw new AddonRegistryError(`Addon '${name}' is already installed.`, "DUPLICATE_ADDON", name);
    }

    // Validate dependencies are installed & enabled
    for (const dep of definition.manifest.depends) {
      const depState = this.states.get(dep);
      if (!depState || !depState.enabled) {
        throw new AddonRegistryError(
          `Cannot install '${name}': dependency '${dep}' is missing or disabled.`,
          "MISSING_DEPENDENCY",
          name,
        );
      }
    }

    this.registry.add(definition);
    try {
      this.registry.validate();
    } catch (err) {
      throw err;
    }

    this.definitions.set(name, definition);
    const st = {
      id: randomUUID(),
      version: definition.manifest.version,
      state: "installed" as AddonLifecycleState,
      enabled: true,
      lastError: null as string | null,
    };
    this.states.set(name, st);

    try {
      this.registerAddonArtifacts(definition);
      const syncTargets = [
        ...(definition.models ?? []),
        ...(definition.extensions ?? [])
          .map((e) => modelRegistry.get(e.model))
          .filter((m): m is DefinedModel<Record<string, unknown>> => Boolean(m)),
      ];
      if (syncTargets.length > 0) {
        await syncModels(syncTargets);
      }
      if (definition.register) {
        await definition.register({ loaded: this.getActiveAddonNames() });
      }
      if (options.runSeed !== false && definition.seed) {
        await definition.seed();
      }
      await this.persistAddonState(definition);
      return this.getAddonStatus(name)!;
    } catch (err) {
      st.state = "error";
      st.enabled = false;
      st.lastError = err instanceof Error ? err.message : String(err);
      this.unregisterAddonArtifacts(name, true);
      await this.persistAddonState(definition);
      throw err;
    }
  }

  /**
   * Upgrade an installed addon to a new definition/version while preserving existing data.
   */
  async upgrade(definition: AddonDefinition): Promise<RuntimeAddonStatus> {
    await this.ensureRuntimeTables();
    const name = definition.manifest.name;
    const prevState = this.states.get(name);
    if (!prevState) {
      throw new PolicyError(`Addon '${name}' is not installed.`, "ADDON_NOT_FOUND", 404);
    }

    const fromVersion = prevState.version;
    const toVersion = definition.manifest.version;

    // Replace non-destructive metadata artifacts, keep existing database tables intact
    this.unregisterAddonArtifacts(name, false);
    this.definitions.set(name, definition);
    this.registerAddonArtifacts(definition);

    const syncTargets = [
      ...(definition.models ?? []),
      ...(definition.extensions ?? [])
        .map((e) => modelRegistry.get(e.model))
        .filter((m): m is DefinedModel<Record<string, unknown>> => Boolean(m)),
    ];
    if (syncTargets.length > 0) {
      await syncModels(syncTargets);
    }

    if (definition.upgrade) {
      await definition.upgrade({ fromVersion, toVersion });
    }

    prevState.version = toVersion;
    prevState.state = prevState.enabled ? "installed" : "disabled";
    prevState.lastError = null;
    await this.persistAddonState(definition);
    return this.getAddonStatus(name)!;
  }

  async enable(addonName: string): Promise<RuntimeAddonStatus> {
    const def = this.definitions.get(addonName);
    const st = this.states.get(addonName);
    if (!def || !st) {
      throw new PolicyError(`Unknown addon '${addonName}'.`, "ADDON_NOT_FOUND", 404);
    }

    // Verify all dependencies are enabled
    for (const dep of def.manifest.depends) {
      if (!this.isEnabled(dep)) {
        throw new PolicyError(
          `Cannot enable '${addonName}' while dependency '${dep}' is disabled.`,
          "DEPENDENCY_DISABLED",
          409,
        );
      }
    }

    st.enabled = true;
    st.state = "installed";
    st.lastError = null;
    this.registerAddonArtifacts(def);

    const syncTargets = [
      ...(def.models ?? []),
      ...(def.extensions ?? [])
        .map((e) => modelRegistry.get(e.model))
        .filter((m): m is DefinedModel<Record<string, unknown>> => Boolean(m)),
    ];
    if (syncTargets.length > 0) {
      await syncModels(syncTargets);
    }

    await this.persistAddonState(def);
    return this.getAddonStatus(addonName)!;
  }

  async disable(addonName: string): Promise<RuntimeAddonStatus> {
    if (addonName === "__base") {
      throw new PolicyError("Core kernel addon '__base' cannot be disabled.", "KERNEL_LOCKED", 409);
    }
    const def = this.definitions.get(addonName);
    const st = this.states.get(addonName);
    if (!def || !st) {
      throw new PolicyError(`Unknown addon '${addonName}'.`, "ADDON_NOT_FOUND", 404);
    }

    // Enforce dependency guard: refuse disabling if any active addon depends on it
    const activeDependents = this.registry
      .getDependents(addonName)
      .filter((depName) => this.isEnabled(depName));
    if (activeDependents.length > 0) {
      throw new PolicyError(
        `Cannot disable '${addonName}': active dependents require it (${activeDependents.join(", ")}). Disable dependents first.`,
        "DEPENDENCY_GUARD",
        409,
      );
    }

    st.enabled = false;
    st.state = "disabled";
    this.unregisterAddonArtifacts(addonName, false);
    await this.persistAddonState(def);
    return this.getAddonStatus(addonName)!;
  }

  async uninstall(addonName: string): Promise<{ uninstalled: string; preservedTables: string[] }> {
    if (addonName === "__base") {
      throw new PolicyError("Core kernel addon '__base' cannot be uninstalled.", "KERNEL_LOCKED", 409);
    }
    const def = this.definitions.get(addonName);
    if (!def) {
      throw new PolicyError(`Unknown addon '${addonName}'.`, "ADDON_NOT_FOUND", 404);
    }

    const activeDependents = this.registry
      .getDependents(addonName)
      .filter((depName) => this.isEnabled(depName));
    if (activeDependents.length > 0) {
      throw new PolicyError(
        `Cannot uninstall '${addonName}': active dependents require it (${activeDependents.join(", ")}).`,
        "DEPENDENCY_GUARD",
        409,
      );
    }

    const preservedTables = (def.models ?? []).map((m) => m.table);
    if (def.uninstall) {
      await def.uninstall();
    }
    this.unregisterAddonArtifacts(addonName, true);
    this.states.delete(addonName);
    this.definitions.delete(addonName);

    const db = getDb();
    await db.run(`DELETE FROM "_mw_ir_addons" WHERE "name" = ?`, [addonName]);
    return { uninstalled: addonName, preservedTables };
  }

  isEnabled(addonName: string): boolean {
    return Boolean(this.states.get(addonName)?.enabled);
  }

  getActiveAddonSet(): Set<string> {
    const active = new Set<string>();
    for (const [name, st] of this.states.entries()) {
      if (st.enabled) active.add(name);
    }
    return active;
  }

  getActiveAddonNames(): string[] {
    return [...this.getActiveAddonSet()];
  }

  getAddonStatus(addonName: string): RuntimeAddonStatus | null {
    const def = this.definitions.get(addonName);
    const st = this.states.get(addonName);
    if (!def || !st) return null;
    return {
      id: st.id,
      name: def.manifest.name,
      addon_version: st.version,
      description: def.manifest.description ?? "",
      category: def.manifest.category ?? "Platform",
      state: st.state,
      auto_install: Boolean(def.manifest.autoInstall),
      last_error: st.lastError,
      enabled: st.enabled,
      depends: def.manifest.depends,
      models: (def.models ?? []).map((m) => m.name),
    };
  }

  listAddons(): RuntimeAddonStatus[] {
    return [...this.definitions.keys()]
      .map((name) => this.getAddonStatus(name))
      .filter((a): a is RuntimeAddonStatus => Boolean(a));
  }

  isModelActive(modelName: string): boolean {
    if (!modelRegistry.has(modelName)) return false;
    const owner = this.modelOwners.get(modelName);
    if (!owner) return true;
    return this.isEnabled(owner);
  }

  listActiveModels(): string[] {
    return modelRegistry
      .list()
      .map((m) => m.name)
      .filter((name) => this.isModelActive(name));
  }

  getMenus(actor?: ActorContext): Array<MenuDefinition & { id: string; addon: string }> {
    const role = normalizePlatformRole(actor?.role);
    const groups = new Set(actor?.groups ?? []);
    const active = this.getActiveAddonSet();

    return [...this.menus.values()]
      .filter((m) => active.has(m.addon))
      .filter((m) => roleMeetsMinimum(role, m.min_role))
      .filter((m) => !m.groups?.length || role === "admin" || m.groups.some((g) => groups.has(g)))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({
        ...m,
        id: m.menu_key,
        parent_key: m.parent_key ?? null,
      }));
  }

  getActionsForModel(modelName: string, actor?: ActorContext): Array<ActionDefinition & { addon: string }> {
    const role = normalizePlatformRole(actor?.role);
    const groups = new Set(actor?.groups ?? []);
    const active = this.getActiveAddonSet();

    return [...this.actions.values()]
      .filter((a) => a.model === modelName && active.has(a.addon))
      .filter((a) => !a.roles?.length || role === "admin" || (role !== "public" && a.roles.includes(role)))
      .filter((a) => !a.groups?.length || role === "admin" || a.groups.some((g) => groups.has(g)));
  }

  async registerCustomField(
    modelName: string,
    input: CustomFieldRegistrationInput,
    actor: ActorContext,
  ): Promise<RuntimeMetaFieldDescriptor> {
    if (normalizePlatformRole(actor.role) !== "admin") {
      throw new PolicyError("Admin role required to register custom fields.", "ADMIN_REQUIRED", 403);
    }
    const model = modelRegistry.get(modelName);
    if (!model || !this.isModelActive(modelName)) {
      throw new PolicyError(`Model '${modelName}' not found or inactive.`, "MODEL_NOT_FOUND", 404);
    }
    if (!model.extensible) {
      throw new PolicyError(`Model '${modelName}' is not extensible.`, "MODEL_NOT_EXTENSIBLE", 400);
    }

    const fieldName = input.field_name.trim().toLowerCase();
    if (!SNAKE_FIELD_RE.test(fieldName)) {
      throw new ValidationError(
        `Invalid custom field name '${fieldName}'. Use lowercase snake_case starting with a letter.`,
      );
    }
    assertSafeIdentifier(fieldName, "custom field");

    const label =
      input.label?.trim() ||
      fieldName
        .replace(/^cust_/, "")
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    const originAddon = input.origin_addon ?? "studio";
    const selection = input.field_type === "selection" ? (input.selection ?? []) : null;
    const id = randomUUID();

    const db = getDb();
    await db.run(
      `INSERT INTO "_mw_ir_custom_fields"
        ("id", "model_name", "field_name", "field_type", "label", "required", "selection_json", "origin_addon", "created_at")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT("model_name", "field_name") DO UPDATE SET
        "field_type" = excluded."field_type",
        "label" = excluded."label",
        "required" = excluded."required",
        "selection_json" = excluded."selection_json"`,
      [
        id,
        modelName,
        fieldName,
        input.field_type,
        label,
        input.required ? 1 : 0,
        selection ? JSON.stringify(selection) : null,
        originAddon,
        new Date().toISOString(),
      ],
    );

    const zodSchema = buildZodSchemaForCustomField({ ...input, field_name: fieldName, label });
    extendModel(modelName, {
      addon: originAddon,
      fields: z.object({ [fieldName]: zodSchema }),
      isCustom: true,
      fieldMeta: {
        [fieldName]: {
          label,
          fieldType: input.field_type,
          required: Boolean(input.required),
          selection,
          isCustom: true,
        },
      },
    });
    await syncModels([model]);

    return {
      id,
      model_name: modelName,
      field_name: fieldName,
      field_type: input.field_type,
      nullable: !input.required,
      required: Boolean(input.required),
      deprecated: false,
      is_custom: true,
      origin_addon: originAddon,
      ui_widget:
        input.field_type === "selection"
          ? "select"
          : input.field_type === "boolean"
            ? "checkbox"
            : input.field_type === "integer" || input.field_type === "real"
              ? "number"
              : input.field_type === "date"
                ? "date"
                : "text",
      label,
      selection,
      default_value: null,
    };
  }

  async saveStudioViewOverride(
    modelName: string,
    viewType: ViewType,
    specInput: ViewSpec,
    actor: ActorContext,
  ): Promise<{ id: string; model_name: string; view_type: ViewType; spec: ViewSpec }> {
    if (normalizePlatformRole(actor.role) !== "admin") {
      throw new PolicyError("Admin role required to edit Studio views.", "ADMIN_REQUIRED", 403);
    }
    if (!this.isModelActive(modelName)) {
      throw new PolicyError(`Model '${modelName}' not found or inactive.`, "MODEL_NOT_FOUND", 404);
    }
    const allowedTypes: readonly ViewType[] = ["list", "form", "detail", "kanban", "search"];
    if (!allowedTypes.includes(viewType)) {
      throw new ValidationError(`Invalid view_type '${String(viewType)}'.`);
    }

    const meta = getModelMetadata(modelName, actor);
    if (!meta) {
      throw new PolicyError(`Model '${modelName}' metadata unavailable.`, "MODEL_NOT_FOUND", 404);
    }
    const validFieldNames = new Set(meta.fields.map((f) => f.name));
    const sanitizedSpec: Record<string, unknown> = {};

    if (typeof specInput.title === "string" && specInput.title.trim()) {
      sanitizedSpec.title = specInput.title.trim().slice(0, 120);
    }
    if (typeof specInput.description === "string") {
      sanitizedSpec.description = specInput.description.trim().slice(0, 300);
    }
    if (Array.isArray(specInput.columns)) {
      const cols = specInput.columns.filter((c): c is string => typeof c === "string" && validFieldNames.has(c));
      if (cols.length === 0) {
        throw new ValidationError("At least one valid column field is required.");
      }
      sanitizedSpec.columns = [...new Set(cols)];
    }
    if (Array.isArray(specInput.formFields)) {
      const formFields = specInput.formFields.filter(
        (c): c is string => typeof c === "string" && validFieldNames.has(c),
      );
      if (formFields.length > 0) sanitizedSpec.formFields = [...new Set(formFields)];
    }
    if (typeof specInput.stageField === "string" && validFieldNames.has(specInput.stageField)) {
      sanitizedSpec.stageField = specInput.stageField;
    }

    const overrideId = `studio.${modelName}.${viewType}`;
    const db = getDb();
    await db.run(
      `INSERT INTO "_mw_ir_views" ("id", "model_name", "view_type", "spec_json", "updated_by", "updated_at")
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT("model_name", "view_type") DO UPDATE SET
        "spec_json" = excluded."spec_json",
        "updated_by" = excluded."updated_by",
        "updated_at" = excluded."updated_at"`,
      [
        overrideId,
        modelName,
        viewType,
        JSON.stringify(sanitizedSpec),
        actor.actorId ?? "admin",
        new Date().toISOString(),
      ],
    );

    this.views.register({
      id: overrideId,
      model: modelName,
      view_type: viewType,
      addon: "__base",
      inherit_id: "*",
      priority: 99,
      spec: sanitizedSpec as ViewSpec,
    });

    return {
      id: overrideId,
      model_name: modelName,
      view_type: viewType,
      spec: sanitizedSpec as ViewSpec,
    };
  }

  async resetStudioViewOverride(
    modelName: string,
    viewType: ViewType,
    actor: ActorContext,
  ): Promise<{ reset: boolean }> {
    if (normalizePlatformRole(actor.role) !== "admin") {
      throw new PolicyError("Admin role required to reset Studio views.", "ADMIN_REQUIRED", 403);
    }
    const overrideId = `studio.${modelName}.${viewType}`;
    const db = getDb();
    await db.run(
      `DELETE FROM "_mw_ir_views" WHERE "model_name" = ? AND "view_type" = ?`,
      [modelName, viewType],
    );
    const removed = this.views.unregisterById(overrideId);
    return { reset: removed };
  }

  getViewDescriptor(modelName: string, actor?: ActorContext): RuntimeViewDescriptor | null {
    if (!this.isModelActive(modelName)) return null;
    const meta = getModelMetadata(modelName, actor);
    if (!meta) return null;

    const activeAddons = this.getActiveAddonSet();
    const acl = this.security.resolveModelAcl(modelName, actor, activeAddons);
    const resolvedViews = this.views.resolveForModel(meta, activeAddons);
    const baseUrl = `${this.apiPrefix}/m/${encodeURIComponent(modelName)}`;

    const customActions = this.getActionsForModel(modelName, actor)
      .filter((a) => a.type === "record" || a.type === "model")
      .map((a) => ({
        id: a.id,
        label: a.label,
        method: a.method ?? ("POST" as const),
        urlTemplate:
          a.urlTemplate ??
          (a.type === "record"
            ? `${baseUrl}/{id}/call/${encodeURIComponent(a.id)}`
            : `${baseUrl}/call/${encodeURIComponent(a.id)}`),
        roles: [...(a.roles ?? ["admin", "editor"])] as Array<"admin" | "editor" | "viewer">,
      }));

    return {
      model: meta.name,
      table: meta.table,
      extensible: meta.extensible,
      restEnabled: meta.restEnabled,
      acl,
      fields: meta.fields.map((f) => ({
        id: `${meta.name}.${f.name}`,
        model_name: meta.name,
        field_name: f.name,
        field_type: f.fieldType,
        nullable: f.nullable,
        required: f.required,
        deprecated: false,
        is_custom: f.isCustom,
        origin_addon: f.originAddon,
        ui_widget: f.widget,
        label: f.label,
        help: f.help,
        readonly: f.readonly,
        selection: f.selection,
        default_value: f.defaultValue ?? null,
        relation: f.relation
          ? { model: f.relation.model, type: f.relation.type }
          : undefined,
      })),
      views: resolvedViews,
      actionBindings: {
        listUrl: meta.restEnabled && acl.canRead ? baseUrl : undefined,
        createUrl: meta.restEnabled && acl.canCreate ? baseUrl : undefined,
        updateUrl: meta.restEnabled && acl.canUpdate ? `${baseUrl}/{id}` : undefined,
        archiveUrl: meta.restEnabled && acl.canUpdate ? `${baseUrl}/{id}/archive` : undefined,
        restoreUrl: meta.restEnabled && acl.canUpdate ? `${baseUrl}/{id}/restore` : undefined,
        deleteUrl: meta.restEnabled && acl.canDelete ? `${baseUrl}/{id}` : undefined,
        historyUrl: meta.restEnabled && acl.canRead ? `${baseUrl}/{id}/history` : undefined,
        customActions,
      },
    };
  }

  mergeRuleFilter(
    modelName: string,
    operation: "read" | "create" | "update" | "delete",
    baseFilter: Record<string, unknown>,
    actor: ActorContext,
  ): Record<string, unknown> {
    const ruleFilter = this.security.buildRecordRuleFilter(
      modelName,
      operation,
      actor,
      this.getActiveAddonSet(),
    );
    if (!ruleFilter) return baseFilter;
    if (Object.keys(baseFilter).length === 0) return ruleFilter;
    return { $and: [baseFilter, ruleFilter] };
  }

  async executeAction(
    modelName: string,
    actionId: string,
    actor: ActorContext,
    options: { id?: string; input?: Record<string, unknown> } = {},
  ): Promise<unknown> {
    if (!this.isModelActive(modelName)) {
      throw new PolicyError(`Model '${modelName}' is unavailable (addon disabled).`, "ADDON_DISABLED", 503);
    }
    const model = modelRegistry.get(modelName);
    if (!model) {
      throw new PolicyError(`Model '${modelName}' not found.`, "MODEL_NOT_FOUND", 404);
    }

    const activeAddons = this.getActiveAddonSet();
    const regAction = this.actions.get(`${modelName}:${actionId}`);
    if (regAction && activeAddons.has(regAction.addon) && regAction.handler) {
      const role = normalizePlatformRole(actor.role);
      if (
        regAction.roles?.length &&
        role !== "admin" &&
        (role === "public" || !regAction.roles.includes(role))
      ) {
        throw new PolicyError(
          `Role '${role}' is not permitted to invoke action '${actionId}'.`,
          "ACTION_FORBIDDEN",
          403,
        );
      }
      const record = options.id
        ? await model.repository.forActor(actor).findOne(options.id)
        : null;
      return regAction.handler({ id: options.id, record, input: options.input, actor });
    }

    const modelAction = model.actions[actionId];
    if (!modelAction) {
      throw new PolicyError(`Action '${actionId}' not found on model '${modelName}'.`, "ACTION_NOT_FOUND", 404);
    }
    const role = normalizePlatformRole(actor.role);
    if (modelAction.roles?.length && role !== "admin" && !modelAction.roles.includes(role)) {
      throw new PolicyError(
        `Role '${role}' cannot execute action '${actionId}' on '${modelName}'.`,
        "ACTION_FORBIDDEN",
        403,
      );
    }
    this.security.assertModelAccess(modelName, modelAction.operation ?? "update", actor, activeAddons);
    const record = options.id
      ? ((await model.repository.forActor(actor).findOne(options.id)) ?? undefined)
      : undefined;
    if (modelAction.scope === "record" && !record) {
      throw new PolicyError(`Record '${options.id ?? ""}' not found on '${modelName}'.`, "NOT_FOUND", 404);
    }
    const validatedInput = modelAction.input ? modelAction.input.parse(options.input ?? {}) : options.input;
    return modelAction.handler({
      record: record as Record<string, unknown> | undefined,
      input: validatedInput,
      repository: model.repository,
      actor,
    });
  }

  /**
   * Canonical Odoo-inspired RPC dispatcher (`/api/v1/rpc`) enforcing addon state,
   * Model ACL, Record Rules, and Field Policies uniformly across every operation.
   */
  async executeRpc(payload: RpcRequestPayload, actorInput?: ActorContext): Promise<unknown> {
    const actor = actorInput ?? createActorContext();
    const { model: modelName, method, id, ids, domain, kwargs = {} } = payload;

    if (!this.isModelActive(modelName)) {
      throw new PolicyError(`Model '${modelName}' is unavailable (addon disabled).`, "ADDON_DISABLED", 503);
    }
    const model = modelRegistry.get(modelName);
    if (!model) {
      throw new PolicyError(`Model '${modelName}' not found.`, "MODEL_NOT_FOUND", 404);
    }
    const activeAddons = this.getActiveAddonSet();
    const scoped = model.repository.forActor(actor);

    const parsedFilter = domain
      ? compileTupleDomainToFilter(domain)
      : ((kwargs.filter as Record<string, unknown>) ?? {});

    switch (method) {
      case "search":
      case "search_read": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        const effFilter = this.mergeRuleFilter(modelName, "read", parsedFilter, actor);
        return scoped.find(effFilter, {
          limit: typeof kwargs.limit === "number" ? kwargs.limit : undefined,
          offset: typeof kwargs.offset === "number" ? kwargs.offset : undefined,
          orderBy: typeof kwargs.orderBy === "string" ? kwargs.orderBy : undefined,
          q: typeof kwargs.q === "string" ? kwargs.q : undefined,
          fields: Array.isArray(kwargs.fields) ? (kwargs.fields as string[]) : undefined,
          with: Array.isArray(kwargs.with) ? (kwargs.with as string[]) : undefined,
          includeArchived: Boolean(kwargs.includeArchived),
        });
      }

      case "search_count": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        const effFilter = this.mergeRuleFilter(modelName, "read", parsedFilter, actor);
        return {
          count: await scoped.count(effFilter, {
            q: typeof kwargs.q === "string" ? kwargs.q : undefined,
            includeArchived: Boolean(kwargs.includeArchived),
          }),
        };
      }

      case "read": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        const targetIds = ids ?? (id ? [id] : []);
        const effFilter = this.mergeRuleFilter(modelName, "read", { id: { $in: targetIds } }, actor);
        return scoped.find(effFilter, {
          fields: Array.isArray(kwargs.fields) ? (kwargs.fields as string[]) : undefined,
          with: Array.isArray(kwargs.with) ? (kwargs.with as string[]) : undefined,
          includeArchived: true,
        });
      }

      case "create": {
        this.security.assertModelAccess(modelName, "create", actor, activeAddons);
        const values = (kwargs.values as Record<string, unknown>) ?? kwargs;
        return scoped.create(values);
      }

      case "write":
      case "update": {
        this.security.assertModelAccess(modelName, "update", actor, activeAddons);
        const targetIds = ids ?? (id ? [id] : []);
        const values = (kwargs.values as Record<string, unknown>) ?? kwargs;
        // Verify record rule permits update on each target id
        const allowed = await scoped.find(
          this.mergeRuleFilter(modelName, "update", { id: { $in: targetIds } }, actor),
          { includeArchived: true },
        );
        const allowedIds = new Set(allowed.map((r) => String(r.id)));
        for (const tid of targetIds) {
          if (!allowedIds.has(tid)) {
            throw new PolicyError(
              `Record rule denied update on '${modelName}(${tid})'.`,
              "RECORD_RULE_FORBIDDEN",
              403,
            );
          }
        }
        return scoped.write(targetIds, values);
      }

      case "unlink":
      case "delete": {
        this.security.assertModelAccess(modelName, "delete", actor, activeAddons);
        const targetIds = ids ?? (id ? [id] : []);
        const allowed = await scoped.find(
          this.mergeRuleFilter(modelName, "delete", { id: { $in: targetIds } }, actor),
          { includeArchived: true },
        );
        const allowedIds = new Set(allowed.map((r) => String(r.id)));
        for (const tid of targetIds) {
          if (!allowedIds.has(tid)) {
            throw new PolicyError(
              `Record rule denied delete on '${modelName}(${tid})'.`,
              "RECORD_RULE_FORBIDDEN",
              403,
            );
          }
        }
        return { unlinked: await scoped.unlink(targetIds) };
      }

      case "archive": {
        this.security.assertModelAccess(modelName, "update", actor, activeAddons);
        if (!id) throw new ValidationError("RPC 'archive' requires 'id'.");
        return scoped.archive(id);
      }

      case "restore": {
        this.security.assertModelAccess(modelName, "update", actor, activeAddons);
        if (!id) throw new ValidationError("RPC 'restore' requires 'id'.");
        return scoped.restore(id);
      }

      case "copy": {
        this.security.assertModelAccess(modelName, "create", actor, activeAddons);
        if (!id) throw new ValidationError("RPC 'copy' requires 'id'.");
        return scoped.copy(id, (kwargs.overrides as Record<string, unknown>) ?? {});
      }

      case "default_get": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        return scoped.defaultGet(Array.isArray(kwargs.fields) ? (kwargs.fields as string[]) : undefined);
      }

      case "name_get": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        const targetIds = ids ?? (id ? [id] : []);
        return scoped.nameGet(targetIds);
      }

      case "name_search": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        return scoped.nameSearch(String(kwargs.q ?? kwargs.name ?? ""));
      }

      case "read_group": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        const groupBy = String(kwargs.groupBy ?? "");
        if (!groupBy) throw new ValidationError("RPC 'read_group' requires 'kwargs.groupBy'.");
        const effFilter = this.mergeRuleFilter(modelName, "read", parsedFilter, actor);
        return scoped.readGroup(groupBy, effFilter);
      }

      case "onchange": {
        this.security.assertModelAccess(modelName, "read", actor, activeAddons);
        const field = String(kwargs.field ?? "");
        const draft = (kwargs.draft as Record<string, unknown>) ?? {};
        return scoped.onchange(field, draft);
      }

      default:
        return this.executeAction(modelName, method, actor, { id, input: kwargs });
    }
  }
}
