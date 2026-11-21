import { z } from "zod";
import { defineModel } from "@moonwitness/orm";
import type { AddonDefinition } from "@moonwitness/addon-runtime";

/* ---------- CAB Change Management Addon ---------- */
export const CabChangeModel = defineModel({
  name: "cab.change",
  table: "cab_changes",
  originAddon: "cab",
  restEnabled: true,
  recName: "title",
  schema: z.object({
    reference: z.string().min(1),
    title: z.string().min(1),
    stage: z
      .enum(["draft", "review", "approved", "in_progress", "done", "rejected"])
      .default("draft"),
    risk: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    owner: z.string().default("Unassigned"),
    summary: z.string().optional().default(""),
  }),
  indexes: [{ fields: ["reference"], unique: true }],
  actions: {
    approve: {
      scope: "record",
      operation: "update",
      roles: ["admin", "editor"],
      handler: async ({ record, repository, actor }) => {
        if (!record) return null;
        return repository.update(String(record.id), { stage: "approved" }, actor);
      },
    },
    advance: {
      scope: "record",
      operation: "update",
      roles: ["admin", "editor"],
      handler: async ({ record, repository, actor }) => {
        if (!record) return null;
        const order = ["draft", "review", "approved", "in_progress", "done"];
        const current = String(record.stage ?? "draft");
        const idx = order.indexOf(current);
        const nextStage = idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : "done";
        return repository.update(String(record.id), { stage: nextStage }, actor);
      },
    },
  },
});

export function createCabAddon(): AddonDefinition {
  return {
    manifest: {
      name: "cab",
      version: "1.0.0",
      description: "Change Advisory Board (CAB) RFC workflow, stage transitions, and approval gates.",
      category: "Governance",
      depends: ["__base"],
      provides: { models: ["cab.change"], routes: ["cab"] },
      defaultEnabled: true,
    },
    models: [CabChangeModel],
    views: [
      {
        id: "cab.change.list",
        model: "cab.change",
        view_type: "list",
        spec: {
          title: "CAB Change Requests",
          description: "Live RFC records backed by @moonwitness/orm with audit history and workflow actions.",
          domainIcon: "cab",
          columns: ["reference", "title", "stage", "risk", "owner"],
        },
      },
      {
        id: "cab.change.kanban",
        model: "cab.change",
        view_type: "kanban",
        spec: {
          title: "CAB Stage Board",
          stageField: "stage",
          cardFields: ["reference", "title", "risk", "owner"],
        },
      },
      {
        id: "cab.change.search",
        model: "cab.change",
        view_type: "search",
        spec: {
          searchFields: ["reference", "title", "owner", "summary"],
          groupBy: ["stage", "risk", "owner"],
          filters: [
            { key: "pending_review", label: "Pending Review", domain: [["stage", "=", "review"]] },
            { key: "high_risk", label: "High/Critical Risk", domain: [["risk", "in", ["high", "critical"]]] },
            { key: "active_work", label: "In Progress", domain: [["stage", "=", "in_progress"]] },
          ],
        },
      },
    ],
    actions: [
      {
        id: "approve",
        model: "cab.change",
        type: "record",
        label: "Approve",
        roles: ["admin", "editor"],
      },
      {
        id: "advance",
        model: "cab.change",
        type: "record",
        label: "Advance Stage",
        roles: ["admin", "editor"],
      },
    ],
    seed: async () => {
      if ((await CabChangeModel.repository.count()) > 0) return;
      await CabChangeModel.repository.create({
        reference: "RFC-2026-014",
        title: "Zero-Downtime ORM Schema Sync Rollout",
        stage: "review",
        risk: "high",
        owner: "A. Rahman",
        summary: "Enable idempotent additive column synchronization across all active addons.",
      });
      await CabChangeModel.repository.create({
        reference: "RFC-2026-015",
        title: "Activate Declarative View Inheritance Pipeline",
        stage: "approved",
        risk: "medium",
        owner: "S. Nur",
        summary: "Allow domain addons to extend base list/form views without mutating core templates.",
      });
      await CabChangeModel.repository.create({
        reference: "RFC-2026-016",
        title: "Enforce Record-Level Security Rules on Multi-Tenant RPC",
        stage: "in_progress",
        risk: "critical",
        owner: "M. Faruq",
        summary: "Apply ir.rule tenant & ownership predicates across every /api/v1/m and /api/v1/rpc query.",
      });
      await CabChangeModel.repository.create({
        reference: "RFC-2026-017",
        title: "Calibrate AEQ4 Lunar Observatory Ephemeris",
        stage: "done",
        risk: "low",
        owner: "N. Hidayat",
        summary: "Synchronize M-Time lunar illumination telemetry with @moonwitness/canon.",
      });
    },
  };
}

/* ---------- Timeline Addon ---------- */
export const TimelineEventModel = defineModel({
  name: "timeline.event",
  table: "timeline_events",
  originAddon: "timeline",
  restEnabled: true,
  recName: "title",
  schema: z.object({
    title: z.string().min(1),
    era: z.enum(["primordial", "classical", "observatory", "modern"]).default("observatory"),
    mtime_code: z.string().default("M-0000"),
    location: z.string().default("Global"),
    verified: z.boolean().default(false),
    summary: z.string().optional().default(""),
  }),
  indexes: [{ fields: ["era"] }],
});

export function createTimelineAddon(): AddonDefinition {
  return {
    manifest: {
      name: "timeline",
      version: "1.0.0",
      description: "Chronological archive and M-Time anchored historical event ledger.",
      category: "Chronicle",
      depends: ["__base"],
      provides: { models: ["timeline.event"], routes: ["timeline"] },
      defaultEnabled: true,
    },
    models: [TimelineEventModel],
    views: [
      {
        id: "timeline.event.list",
        model: "timeline.event",
        view_type: "list",
        spec: {
          title: "Chronicle Timeline Events",
          description: "M-Time anchored events extensible by downstream lore and research addons.",
          domainIcon: "mtime",
          columns: ["title", "era", "mtime_code", "location", "verified"],
        },
      },
      {
        id: "timeline.event.form",
        model: "timeline.event",
        view_type: "form",
        spec: {
          title: "Timeline Event",
          formFields: ["title", "era", "mtime_code", "location", "verified", "summary"],
        },
      },
    ],
    menus: [
      {
        menu_key: "timeline.events",
        label: "Timeline Events",
        href: "/addons?model=timeline.event",
        icon: "mtime",
        plane: "creator",
        sort_order: 20,
        min_role: "viewer",
      },
    ],
    seed: async () => {
      if ((await TimelineEventModel.repository.count()) > 0) return;
      await TimelineEventModel.repository.create({
        title: "First Crescent Sighting — Simpul Nusantara Relay",
        era: "observatory",
        mtime_code: "M-1448.09.01",
        location: "Bandung Ridge",
        verified: true,
        summary: "Optical hilal sighting verified across three independent telemetry nodes.",
      });
      await TimelineEventModel.repository.create({
        title: "AEQ4 Canonical Calendar Alignment Ratified",
        era: "modern",
        mtime_code: "M-1448.10.14",
        location: "MoonWitness HQ",
        verified: true,
        summary: "Published deterministic M-Time conversion constants in @moonwitness/canon.",
      });
    },
  };
}

/* ---------- Canon-Lore Addon (Demonstrates Cross-Addon Model Extension + View Inheritance!) ---------- */
export const CanonCodexModel = defineModel({
  name: "canon.codex",
  table: "canon_codex",
  originAddon: "canon-lore",
  restEnabled: true,
  recName: "title",
  schema: z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    tier: z.enum(["primary", "commentary", "apocrypha"]).default("primary"),
    timeline_event_id: z.string().nullable().optional().default(null),
    body: z.string().optional().default(""),
  }),
  relations: {
    timeline_event_id: { model: "timeline.event", type: "many2one", onDelete: "set_null" },
  },
  indexes: [{ fields: ["slug"], unique: true }],
});

export function createCanonLoreAddon(): AddonDefinition {
  return {
    manifest: {
      name: "canon-lore",
      version: "1.0.0",
      description: "Canon codex entries and timeline.event canon_tier model & view inheritance.",
      category: "Canon & Lore",
      depends: ["__base", "timeline"],
      provides: { models: ["canon.codex"], routes: ["canon"] },
      defaultEnabled: true,
    },
    models: [CanonCodexModel],
    extensions: [
      {
        model: "timeline.event",
        fields: z.object({
          canon_tier: z.enum(["tier-1", "tier-2", "archive"]).optional().default("tier-1"),
        }),
        fieldMeta: {
          canon_tier: {
            label: "Canon Tier",
            help: "Injected by canon-lore addon via ORM extendModel()",
          },
        },
      },
    ],
    views: [
      {
        id: "canon.codex.list",
        model: "canon.codex",
        view_type: "list",
        spec: {
          title: "Canon Codex",
          description: "Authoritative canon articles linked to timeline events.",
          columns: ["slug", "title", "tier", "timeline_event_id"],
        },
      },
      // Declarative View Inheritance extending timeline.event.list and timeline.event.form!
      {
        id: "canon-lore.timeline.event.list.inherit",
        model: "timeline.event",
        view_type: "list",
        inherit_id: "timeline.event.list",
        priority: 20,
        operations: [
          { op: "after", target: "columns", anchor: "era", value: "canon_tier" },
        ],
      },
      {
        id: "canon-lore.timeline.event.form.inherit",
        model: "timeline.event",
        view_type: "form",
        inherit_id: "timeline.event.form",
        priority: 20,
        operations: [
          { op: "after", target: "formFields", anchor: "era", value: "canon_tier" },
        ],
      },
    ],
    menus: [
      {
        menu_key: "canon.codex",
        label: "Canon Codex",
        href: "/addons?model=canon.codex",
        icon: "scripture",
        plane: "creator",
        sort_order: 25,
        min_role: "viewer",
      },
    ],
    seed: async () => {
      if ((await CanonCodexModel.repository.count()) > 0) return;
      await CanonCodexModel.repository.create({
        slug: "lunar-witness-protocol",
        title: "The Lunar Witness Verification Protocol",
        tier: "primary",
        body: "Establishes multi-station consensus criteria for verified crescent observations.",
      });
    },
  };
}

/* ---------- Witness Research Addon ---------- */
export const WitnessClaimModel = defineModel({
  name: "witness.claim",
  table: "witness_claims",
  originAddon: "witness-research",
  restEnabled: true,
  recName: "claim",
  schema: z.object({
    claim: z.string().min(1),
    stage: z.enum(["submitted", "triaged", "corroborated", "disputed"]).default("submitted"),
    confidence: z.coerce.number().int().min(0).max(100).default(70),
    source_ref_label: z.string().default("Field Observation"),
  }),
  actions: {
    corroborate: {
      scope: "record",
      operation: "update",
      roles: ["admin", "editor"],
      handler: async ({ record, repository, actor }) => {
        if (!record) return null;
        return repository.update(String(record.id), { stage: "corroborated", confidence: 95 }, actor);
      },
    },
  },
});

export function createWitnessResearchAddon(): AddonDefinition {
  return {
    manifest: {
      name: "witness-research",
      version: "1.0.0",
      description: "Epistemic claim ledger, corroboration workflows, and confidence scoring.",
      category: "Research",
      depends: ["__base"],
      provides: { models: ["witness.claim"], routes: ["witness"] },
      defaultEnabled: true,
    },
    models: [WitnessClaimModel],
    actions: [
      {
        id: "corroborate",
        model: "witness.claim",
        type: "record",
        label: "Corroborate",
        roles: ["admin", "editor"],
      },
    ],
    seed: async () => {
      if ((await WitnessClaimModel.repository.count()) > 0) return;
      await WitnessClaimModel.repository.create({
        claim: "Atmospheric clarity at Mount Bosscha exceeded 92% during lunar window",
        stage: "corroborated",
        confidence: 94,
        source_ref_label: "Station-BDO-03",
      });
    },
  };
}

/* ---------- Observatory Probes & Ops Events Addon ---------- */
export const ProbeNodeModel = defineModel({
  name: "probe.node",
  table: "probe_nodes",
  originAddon: "probes",
  restEnabled: true,
  recName: "hostname",
  schema: z.object({
    hostname: z.string().min(1),
    region: z.string().default("id-west"),
    health: z.enum(["healthy", "degraded", "offline"]).default("healthy"),
    latency_ms: z.coerce.number().int().default(18),
  }),
  indexes: [{ fields: ["hostname"], unique: true }],
});

export const OpsEventModel = defineModel({
  name: "ops.event",
  table: "ops_events",
  originAddon: "probes",
  restEnabled: true,
  recName: "message",
  schema: z.object({
    severity: z.enum(["info", "warn", "critical"]).default("info"),
    source_node: z.string().default("core-gateway"),
    message: z.string().min(1),
    acknowledged: z.boolean().default(false),
  }),
});

export function createProbesAddon(): AddonDefinition {
  return {
    manifest: {
      name: "probes",
      version: "1.0.0",
      description: "Telemetry probe inventory and real-time operational event stream.",
      category: "Observatory",
      depends: ["__base"],
      provides: { models: ["probe.node", "ops.event"], routes: ["probes"] },
      defaultEnabled: true,
    },
    models: [ProbeNodeModel, OpsEventModel],
    seed: async () => {
      if ((await ProbeNodeModel.repository.count()) === 0) {
        await ProbeNodeModel.repository.create({
          hostname: "relay-bandung-01",
          region: "id-west",
          health: "healthy",
          latency_ms: 14,
        });
        await ProbeNodeModel.repository.create({
          hostname: "relay-makassar-02",
          region: "id-central",
          health: "healthy",
          latency_ms: 27,
        });
      }
      if ((await OpsEventModel.repository.count()) === 0) {
        await OpsEventModel.repository.create({
          severity: "info",
          source_node: "relay-bandung-01",
          message: "ORM zero-migration schema verification passed on startup.",
          acknowledged: true,
        });
      }
    },
  };
}

/* ---------- Audit, I18n, and Supporting Platform Addons ---------- */
export const AuditLogModel = defineModel({
  name: "audit.log",
  table: "platform_audit_logs",
  originAddon: "audit",
  restEnabled: true,
  recName: "event_type",
  schema: z.object({
    event_type: z.string().min(1),
    actor_name: z.string().default("system"),
    target: z.string().default("platform"),
    outcome: z.enum(["allow", "deny", "error"]).default("allow"),
  }),
});

export const I18nLocaleModel = defineModel({
  name: "i18n.locale",
  table: "i18n_locales",
  originAddon: "i18n",
  restEnabled: true,
  recName: "name",
  schema: z.object({
    code: z.string().min(2),
    name: z.string().min(1),
    direction: z.enum(["ltr", "rtl"]).default("ltr"),
    enabled: z.boolean().default(true),
  }),
  indexes: [{ fields: ["code"], unique: true }],
});

/* ---------- Operations & Infrastructure Models (SNMP, Syslog, RADIUS, Storage, VPN, Workflows) ---------- */
export const SnmpTargetModel = defineModel({
  name: "snmp.target",
  table: "snmp_targets",
  originAddon: "snmp",
  restEnabled: true,
  recName: "host",
  schema: z.object({
    host: z.string().min(1),
    oid: z.string().default("1.3.6.1.2.1.1.3.0"),
    region: z.string().default("id-west"),
    uptime: z.string().default("0d 0h"),
    poll_state: z.enum(["UP", "DEGRADED", "DOWN"]).default("UP"),
    latency_ms: z.coerce.number().int().default(16),
  }),
  indexes: [{ fields: ["host"], unique: true }],
});

export const SyslogEntryModel = defineModel({
  name: "syslog.entry",
  table: "syslog_entries",
  originAddon: "syslog",
  restEnabled: true,
  recName: "message",
  schema: z.object({
    severity: z.enum(["INFO", "NOTICE", "WARN", "ERROR", "CRIT"]).default("INFO"),
    source: z.string().min(1),
    facility: z.string().default("daemon"),
    message: z.string().min(1),
  }),
});

export const RadiusSessionModel = defineModel({
  name: "radius.session",
  table: "radius_sessions",
  originAddon: "radius",
  restEnabled: true,
  recName: "client",
  schema: z.object({
    client: z.string().min(1),
    realm: z.string().default("moonwitness.net"),
    auth_status: z.enum(["ACCEPT", "CHALLENGE", "REJECT"]).default("ACCEPT"),
    latency_ms: z.coerce.number().int().default(18),
    nas_ip: z.string().default("10.24.0.1"),
  }),
});

export const StorageObjectModel = defineModel({
  name: "storage.object",
  table: "storage_objects",
  originAddon: "storage",
  restEnabled: true,
  recName: "object_key",
  schema: z.object({
    object_key: z.string().min(1),
    bucket: z.string().default("canon-vault"),
    size_label: z.string().default("1.0 MB"),
    etag: z.string().default("sha256:pending"),
    retention: z.enum(["immutable", "standard", "ephemeral"]).default("immutable"),
  }),
  indexes: [{ fields: ["object_key"], unique: true }],
});

export const VpnTunnelModel = defineModel({
  name: "vpn.tunnel",
  table: "vpn_tunnels",
  originAddon: "control",
  restEnabled: true,
  recName: "peer_name",
  schema: z.object({
    peer_name: z.string().min(1),
    endpoint: z.string().min(1),
    cidr: z.string().default("10.88.0.0/24"),
    tunnel_state: z.enum(["CONNECTED", "HANDSHAKING", "OFFLINE"]).default("CONNECTED"),
    rx_mb: z.coerce.number().default(124.5),
  }),
  indexes: [{ fields: ["peer_name"], unique: true }],
});

export const CommandWorkflowModel = defineModel({
  name: "command.workflow",
  table: "command_workflows",
  originAddon: "command-center",
  restEnabled: true,
  recName: "name",
  schema: z.object({
    name: z.string().min(1),
    trigger: z.string().default("manual"),
    stage: z.enum(["active", "paused", "draft"]).default("active"),
    owner: z.string().default("Ops Lead"),
    summary: z.string().optional().default(""),
  }),
});

export function createSupportingPlatformAddons(): AddonDefinition[] {
  return [
    {
      manifest: {
        name: "i18n",
        version: "1.0.0",
        description: "Multi-locale registry (EN, ID, AR) with LTR/RTL metadata.",
        category: "Localization",
        depends: ["__base"],
        provides: { models: ["i18n.locale"], routes: ["i18n"] },
        defaultEnabled: true,
      },
      models: [I18nLocaleModel],
      seed: async () => {
        if ((await I18nLocaleModel.repository.count()) > 0) return;
        await I18nLocaleModel.repository.upsert({ code: "en" }, { code: "en", name: "English", direction: "ltr", enabled: true });
        await I18nLocaleModel.repository.upsert({ code: "id" }, { code: "id", name: "Bahasa Indonesia", direction: "ltr", enabled: true });
        await I18nLocaleModel.repository.upsert({ code: "ar" }, { code: "ar", name: "العربية", direction: "rtl", enabled: true });
      },
    },
    {
      manifest: {
        name: "audit",
        version: "1.0.0",
        description: "Immutable governance audit feed and compliance event recorder.",
        category: "Security",
        depends: ["__base"],
        provides: { models: ["audit.log"], routes: ["audit"] },
        defaultEnabled: true,
      },
      models: [AuditLogModel],
      seed: async () => {
        if ((await AuditLogModel.repository.count()) > 0) return;
        await AuditLogModel.repository.create({
          event_type: "runtime.bootstrap",
          actor_name: "system",
          target: "__base",
          outcome: "allow",
        });
      },
    },
    {
      manifest: {
        name: "control",
        version: "1.0.0",
        description: "Control plane orchestration, WireGuard VPN mesh tunnels, and operator policies.",
        category: "Operations",
        depends: ["__base"],
        provides: { models: ["vpn.tunnel"], routes: ["control", "vpn"] },
        defaultEnabled: true,
      },
      models: [VpnTunnelModel],
      views: [
        {
          id: "vpn.tunnel.list",
          model: "vpn.tunnel",
          view_type: "list",
          spec: {
            title: "VPN Mesh Tunnels",
            description: "Encrypted WireGuard relays connecting observatory nodes to HQ.",
            domainIcon: "vpn",
            columns: ["peer_name", "endpoint", "cidr", "tunnel_state", "rx_mb"],
          },
        },
      ],
      seed: async () => {
        if ((await VpnTunnelModel.repository.count()) > 0) return;
        await VpnTunnelModel.repository.upsert(
          { peer_name: "wg-bandung-ridge" },
          { peer_name: "wg-bandung-ridge", endpoint: "103.14.22.10:51820", cidr: "10.88.1.0/24", tunnel_state: "CONNECTED", rx_mb: 482.4 },
        );
        await VpnTunnelModel.repository.upsert(
          { peer_name: "wg-makassar-relay" },
          { peer_name: "wg-makassar-relay", endpoint: "103.14.88.41:51820", cidr: "10.88.2.0/24", tunnel_state: "CONNECTED", rx_mb: 319.8 },
        );
      },
    },
    {
      manifest: {
        name: "command-center",
        version: "1.0.0",
        description: "Command Center mission workflow and editorial pipeline coordinator.",
        category: "Governance",
        depends: ["__base", "cab"],
        provides: { models: ["command.workflow"], routes: ["command-center"] },
        defaultEnabled: true,
      },
      models: [CommandWorkflowModel],
      views: [
        {
          id: "command.workflow.list",
          model: "command.workflow",
          view_type: "list",
          spec: {
            title: "Mission Control Workflows",
            description: "Automated operational & editorial pipelines coordinated from Mission Control.",
            domainIcon: "cab",
            columns: ["name", "trigger", "stage", "owner"],
          },
        },
      ],
      seed: async () => {
        if ((await CommandWorkflowModel.repository.count()) > 0) return;
        await CommandWorkflowModel.repository.create({
          name: "Hilal Sighting Verification Pipeline",
          trigger: "on:witness.claim.create",
          stage: "active",
          owner: "A. Rahman",
          summary: "Dispatches multi-station telemetry checks whenever a new crescent claim arrives.",
        });
        await CommandWorkflowModel.repository.create({
          name: "CAB Change Auto-Audit Trail",
          trigger: "on:cab.change.write",
          stage: "active",
          owner: "S. Nur",
          summary: "Records stage transitions into mail.message tracking values and audit.log.",
        });
      },
    },
    {
      manifest: {
        name: "ai",
        version: "1.0.0",
        description: "Riot AI inference gateway and audited prompt registry.",
        category: "Intelligence",
        depends: ["__base", "audit"],
        provides: { routes: ["ai"] },
        defaultEnabled: true,
      },
    },
    {
      manifest: {
        name: "storage",
        version: "1.0.0",
        description: "Object storage metadata and SigV4 artifact policy engine.",
        category: "Infrastructure",
        depends: ["__base"],
        provides: { models: ["storage.object"], routes: ["storage"] },
        defaultEnabled: true,
      },
      models: [StorageObjectModel],
      views: [
        {
          id: "storage.object.list",
          model: "storage.object",
          view_type: "list",
          spec: {
            title: "Object Storage Vault",
            description: "Immutable corpora snapshots, artwork plates, and archive bundles managed via ORM.",
            domainIcon: "storage",
            columns: ["object_key", "bucket", "size_label", "etag", "retention"],
          },
        },
      ],
      seed: async () => {
        if ((await StorageObjectModel.repository.count()) > 0) return;
        const objects = [
          { object_key: "corpora/quran-uthmani.json", bucket: "canon-vault", size_label: "1.7 MB", etag: "sha256:uthmani-6236", retention: "immutable" },
          { object_key: "corpora/taurat-wlc.json", bucket: "canon-vault", size_label: "980 KB", etag: "sha256:wlc-5852", retention: "immutable" },
          { object_key: "corpora/zabur-wlc.json", bucket: "canon-vault", size_label: "410 KB", etag: "sha256:zabur-2527", retention: "immutable" },
          { object_key: "corpora/injil-sblgnt.json", bucket: "canon-vault", size_label: "890 KB", etag: "sha256:sblgnt-3769", retention: "immutable" },
        ] as const;
        for (const obj of objects) {
          await StorageObjectModel.repository.upsert({ object_key: obj.object_key }, obj);
        }
      },
    },
    {
      manifest: {
        name: "snmp",
        version: "1.0.0",
        description: "SNMP poller schedules and device OID collectors.",
        category: "Observatory",
        depends: ["__base", "probes"],
        provides: { models: ["snmp.target"], routes: ["snmp"] },
        defaultEnabled: true,
      },
      models: [SnmpTargetModel],
      views: [
        {
          id: "snmp.target.list",
          model: "snmp.target",
          view_type: "list",
          spec: {
            title: "SNMP Poller Targets",
            description: "Live MIB polling inventory for switches and meridian edge relays.",
            domainIcon: "snmp",
            columns: ["host", "oid", "region", "uptime", "poll_state", "latency_ms"],
          },
        },
      ],
      seed: async () => {
        if ((await SnmpTargetModel.repository.count()) > 0) return;
        await SnmpTargetModel.repository.upsert(
          { host: "core-sw-01.arsy.internal" },
          { host: "core-sw-01.arsy.internal", oid: "1.3.6.1.2.1.1.3.0", region: "id-west", uptime: "48d 12h", poll_state: "UP", latency_ms: 11 },
        );
        await SnmpTargetModel.repository.upsert(
          { host: "edge-rt-02.arsy.internal" },
          { host: "edge-rt-02.arsy.internal", oid: "1.3.6.1.2.1.2.2.1.10", region: "id-central", uptime: "19d 04h", poll_state: "UP", latency_ms: 23 },
        );
      },
    },
    {
      manifest: {
        name: "syslog",
        version: "1.0.0",
        description: "Syslog ingestion pipeline and structured severity indexing.",
        category: "Observatory",
        depends: ["__base", "probes"],
        provides: { models: ["syslog.entry"], routes: ["syslog"] },
        defaultEnabled: true,
      },
      models: [SyslogEntryModel],
      views: [
        {
          id: "syslog.entry.list",
          model: "syslog.entry",
          view_type: "list",
          spec: {
            title: "Syslog Stream Explorer",
            description: "Structured operational logs ingested from host control plane and relays.",
            domainIcon: "syslog",
            columns: ["severity", "source", "facility", "message"],
          },
        },
        {
          id: "syslog.entry.search",
          model: "syslog.entry",
          view_type: "search",
          spec: {
            searchFields: ["source", "facility", "message"],
            groupBy: ["severity", "source"],
            filters: [
              { key: "warnings", label: "Warnings & Errors", domain: [["severity", "in", ["WARN", "ERROR", "CRIT"]]] },
              { key: "info", label: "Info & Notice", domain: [["severity", "in", ["INFO", "NOTICE"]]] },
            ],
          },
        },
      ],
      seed: async () => {
        if ((await SyslogEntryModel.repository.count()) > 0) return;
        await SyslogEntryModel.repository.create({
          severity: "INFO",
          source: "arsy-relay",
          facility: "daemon",
          message: "Health check verified across meridian edge nodes.",
        });
        await SyslogEntryModel.repository.create({
          severity: "INFO",
          source: "canon-engine",
          facility: "local0",
          message: "Four primary scripture corpora indexed (18,384 verses).",
        });
        await SyslogEntryModel.repository.create({
          severity: "NOTICE",
          source: "mtime-calc",
          facility: "chronicle",
          message: "MABIMS_ID_2026 elongation basis locked to GEOCENTRIC_TRUE.",
        });
      },
    },
    {
      manifest: {
        name: "radius",
        version: "1.0.0",
        description: "RADIUS AAA network authentication and accounting directory.",
        category: "Network",
        depends: ["__base", "auth"],
        provides: { models: ["radius.session"], routes: ["radius"] },
        defaultEnabled: true,
      },
      models: [RadiusSessionModel],
      views: [
        {
          id: "radius.session.list",
          model: "radius.session",
          view_type: "list",
          spec: {
            title: "RADIUS AAA Sessions",
            description: "Live NAS clients, EAP handshakes, and accounting packets backed by ORM.",
            domainIcon: "vpn",
            columns: ["client", "realm", "auth_status", "latency_ms", "nas_ip"],
          },
        },
      ],
      seed: async () => {
        if ((await RadiusSessionModel.repository.count()) > 0) return;
        await RadiusSessionModel.repository.create({
          client: "arsy-gw-jkt",
          realm: "moonwitness.net",
          auth_status: "ACCEPT",
          latency_ms: 14,
          nas_ip: "10.24.1.10",
        });
        await RadiusSessionModel.repository.create({
          client: "observatory-mkk",
          realm: "moonwitness.net",
          auth_status: "ACCEPT",
          latency_ms: 22,
          nas_ip: "10.24.2.15",
        });
        await RadiusSessionModel.repository.create({
          client: "edge-rbt-01",
          realm: "moonwitness.net",
          auth_status: "CHALLENGE",
          latency_ms: 31,
          nas_ip: "10.24.3.20",
        });
      },
    },
    {
      manifest: {
        name: "epistemic",
        version: "1.0.0",
        description: "Epistemic consensus calculators and verification pipelines.",
        category: "Research",
        depends: ["__base", "witness-research"],
        provides: { routes: ["epistemic"] },
        defaultEnabled: true,
      },
    },
  ];
}
