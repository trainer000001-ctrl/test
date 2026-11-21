import { z } from "zod";
import { defineModel, modelRegistry, onModelWrite } from "@moonwitness/orm";
import { baseManifest, type AddonDefinition } from "@moonwitness/addon-runtime";

export const ResCompanyModel = defineModel({
  name: "res.company",
  table: "res_company",
  originAddon: "__base",
  restEnabled: true,
  recName: "name",
  schema: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    default_locale: z.string().default("en"),
    currency: z.string().default("USD"),
    is_active: z.boolean().default(true),
  }),
  indexes: [{ fields: ["slug"], unique: true }],
});

export const ResGroupsModel = defineModel({
  name: "res.groups",
  table: "res_groups",
  originAddon: "__base",
  restEnabled: true,
  recName: "name",
  schema: z.object({
    xml_id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().default("Access Rights"),
    description: z.string().optional().default(""),
  }),
  indexes: [{ fields: ["xml_id"], unique: true }],
});

export const MailMessageModel = defineModel({
  name: "mail.message",
  table: "mail_message",
  originAddon: "__base",
  restEnabled: true,
  recName: "body",
  schema: z.object({
    res_model: z.string().min(1),
    res_id: z.string().min(1),
    message_type: z.enum(["comment", "notification", "tracking"]).default("comment"),
    body: z.string().min(1),
    author_id: z.string().nullable().optional().default(null),
  }),
  defaults: {
    author_id: (actor) => actor.actorId,
  },
  indexes: [{ fields: ["res_model", "res_id"] }],
});

export const MailTrackingValueModel = defineModel({
  name: "mail.tracking.value",
  table: "mail_tracking_values",
  originAddon: "__base",
  restEnabled: true,
  recName: "field_name",
  schema: z.object({
    message_id: z.string().min(1),
    field_name: z.string().min(1),
    old_value: z.string().nullable().optional().default(null),
    new_value: z.string().nullable().optional().default(null),
  }),
  relations: {
    message_id: { model: "mail.message", type: "many2one", onDelete: "cascade" },
  },
  indexes: [{ fields: ["message_id"] }],
});

const TRACKING_SKIP_MODELS = new Set([
  "mail.message",
  "mail.tracking.value",
  "auth.session",
  "audit.log",
  "syslog.entry",
  "ops.event",
]);

let chatterTrackingRegistered = false;

function formatTrackedValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).slice(0, 240);
    } catch {
      return "[object]";
    }
  }
  return String(value).slice(0, 240);
}

/**
 * Registers the global `onModelWrite("*")` listener once so every domain model update
 * automatically logs a `mail.message` (`tracking`) and `mail.tracking.value` field diffs
 * while strictly omitting `sensitive: true` fields (e.g. password hashes).
 */
export function ensureChatterAutoTracking(): void {
  if (chatterTrackingRegistered) return;
  chatterTrackingRegistered = true;

  onModelWrite("*", (event) => {
    if (event.action !== "UPDATE") return;
    if (TRACKING_SKIP_MODELS.has(event.model)) return;
    if (!event.diff) return;

    const modelDef = modelRegistry.get(event.model);
    const entries = Object.entries(event.diff).filter(([fieldName]) => {
      const policy = modelDef?.fieldPolicies?.[fieldName];
      if (policy?.sensitive) return false;
      if (policy?.readRoles && policy.readRoles.length === 0) return false;
      return true;
    });
    if (entries.length === 0) return;

    const summaryFields = entries.map(([k]) => k).join(", ");
    void (async () => {
      try {
        const msg = await MailMessageModel.repository.create(
          {
            res_model: event.model,
            res_id: event.entityId,
            message_type: "tracking",
            body: `Updated ${summaryFields} (v${event.version})`,
            author_id: event.actor.actorId ?? "system",
          },
          event.actor,
        );
        for (const [fieldName, change] of entries) {
          await MailTrackingValueModel.repository.create(
            {
              message_id: msg.id,
              field_name: fieldName,
              old_value: formatTrackedValue(change.from),
              new_value: formatTrackedValue(change.to),
            },
            event.actor,
          );
        }
      } catch {
        // Non-fatal: chatter tracking never breaks primary ORM writes
      }
    })();
  });
}

export function createBaseAddonDefinition(): AddonDefinition {
  return {
    manifest: {
      ...baseManifest,
      provides: {
        ...baseManifest.provides,
        models: [...(baseManifest.provides.models ?? []), "mail.tracking.value"],
      },
      autoInstall: true,
      defaultEnabled: true,
    },
    models: [ResCompanyModel, ResGroupsModel, MailMessageModel, MailTrackingValueModel],
    views: [
      {
        id: "res.company.list",
        model: "res.company",
        view_type: "list",
        spec: {
          title: "Workspaces & Companies",
          description: "Multi-tenant workspaces enforced across ORM queries and record rules.",
          columns: ["slug", "name", "default_locale", "currency", "is_active"],
        },
      },
      {
        id: "mail.message.list",
        model: "mail.message",
        view_type: "list",
        spec: {
          title: "Chatter Messages",
          description: "Cross-model audit notes, comments, and automatic field-tracking diffs.",
          columns: ["res_model", "res_id", "message_type", "body", "author_id"],
        },
      },
    ],
    menus: [
      {
        menu_key: "base.addons",
        label: "Addon Studio",
        href: "/addons",
        icon: "dot",
        plane: "operations",
        sort_order: 95,
        min_role: "admin",
      },
      {
        menu_key: "base.companies",
        label: "Companies",
        href: "/addons?model=res.company",
        icon: "crm",
        plane: "operations",
        sort_order: 96,
        min_role: "admin",
      },
    ],
    acl: [
      { model: "res.company", role: "viewer", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "res.company", role: "editor", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "mail.message", role: "viewer", canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      { model: "mail.message", role: "editor", canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      { model: "mail.tracking.value", role: "viewer", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      { model: "mail.tracking.value", role: "editor", canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    ],
    register: () => {
      ensureChatterAutoTracking();
    },
    seed: async () => {
      const existing = await ResCompanyModel.repository.count();
      if (existing === 0) {
        await ResCompanyModel.repository.upsert(
          { slug: "default" },
          { slug: "default", name: "MoonWitness Observatory HQ", default_locale: "en", currency: "USD", is_active: true },
        );
        await ResCompanyModel.repository.upsert(
          { slug: "nusantara-node" },
          { slug: "nusantara-node", name: "Simpul Nusantara Field Node", default_locale: "id", currency: "IDR", is_active: true },
        );
      }

      const groupCount = await ResGroupsModel.repository.count();
      if (groupCount === 0) {
        await ResGroupsModel.repository.upsert(
          { xml_id: "base.group_system" },
          { xml_id: "base.group_system", name: "Platform System Administrators", category: "Kernel" },
        );
        await ResGroupsModel.repository.upsert(
          { xml_id: "base.group_editor" },
          { xml_id: "base.group_editor", name: "Editorial & CAB Approvers", category: "Governance" },
        );
        await ResGroupsModel.repository.upsert(
          { xml_id: "base.group_user" },
          { xml_id: "base.group_user", name: "Authenticated Observers", category: "Access Rights" },
        );
      }
    },
  };
}
