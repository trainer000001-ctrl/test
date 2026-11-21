import { HUD_NAV_ICON_PATHS } from "@moonwitness/ui/icons";
import type { Dictionary } from "@/utils/getDictionary";
import { stripLocalePrefix } from "@/utils/i18n";

export type NavTarget =
  /** Pindah route biasa. */
  | { kind: "route"; href: string }
  /** Scroll ke anchor. href = halaman pemilik anchor; Next menangani hash lintas halaman. */
  | { kind: "section"; href: string; anchor: string }
  /** Buka drawer modul. href = halaman pemilik drawer + query ?module=<id>. */
  | { kind: "module"; href: string; moduleId: string };

export interface NavItem {
  id: string;
  label: string;
  icon: string; // path stroke SVG
  target: NavTarget;
}

export function navHref(item: NavItem): string {
  switch (item.target.kind) {
    case "route":
      return item.target.href;
    case "section":
      return `${item.target.href}#${item.target.anchor}`;
    case "module":
      return `${item.target.href}?module=${item.target.moduleId}`;
  }
}

const ACTIVE_BY_PATH: Record<string, string> = {
  "/addons": "base.addons",
  "/apps/addons": "base.addons",
  "/dock": "archive",
  "/apps/calendar": "archive",
  "/memory": "memory",
  "/apps/memory": "memory",
  "/mission-control": "dashboard",
  "/dashboards/analytics": "analytics",
  "/dashboards/crm": "crm",
  "/dashboards/logistics": "logistics",
  "/apps/invoice": "invoice",
  "/apps/kanban": "kanban",
  "/apps/academy": "academy",
  "/apps/automation": "automation",
  "/apps/observatory": "observatory",
  "/apps/user/list": "users",
  "/apps/roles": "roles",
  "/apps/permissions": "permissions",
  "/intelligence": "intelligence",
  "/apps/chat": "intelligence",
  "/control": "control",
  "/apps/control": "control",
  "/syslog": "syslog",
  "/snmp": "snmp",
  "/radius": "radius",
  "/storage": "storage",
  "/vpn": "vpn",
  "/shadow": "settings",
  "/login": "settings",
  "/id-lab": "id-lab",
  "/skin-lab": "skin-lab",
};

const CONTROL_TAB_IDS = new Set(["vpn", "syslog", "snmp", "storage", "radius"]);

export function activeByPath(pathname: string, tab?: string | null): string {
  const normalized = stripLocalePrefix(pathname);
  if (
    (normalized === "/control" || normalized === "/apps/control") &&
    tab &&
    CONTROL_TAB_IDS.has(tab)
  ) {
    return tab;
  }
  return ACTIVE_BY_PATH[normalized] ?? "";
}

export const operationsNavItems: NavItem[] = [
  {
    id: "control",
    label: "Control Plane",
    icon: HUD_NAV_ICON_PATHS.control,
    target: { kind: "route", href: "/control" },
  },
  {
    id: "vpn",
    label: "VPN",
    icon: HUD_NAV_ICON_PATHS.vpn,
    target: { kind: "route", href: "/control?tab=vpn" },
  },
  {
    id: "syslog",
    label: "Syslog",
    icon: HUD_NAV_ICON_PATHS.syslog,
    target: { kind: "route", href: "/control?tab=syslog" },
  },
  {
    id: "snmp",
    label: "SNMP",
    icon: HUD_NAV_ICON_PATHS.snmp,
    target: { kind: "route", href: "/control?tab=snmp" },
  },
  {
    id: "storage",
    label: "Storage",
    icon: HUD_NAV_ICON_PATHS.storage,
    target: { kind: "route", href: "/control?tab=storage" },
  },
  {
    id: "radius",
    label: "RADIUS",
    icon: HUD_NAV_ICON_PATHS.radius,
    target: { kind: "route", href: "/control?tab=radius" },
  },
  {
    id: "dashboard",
    label: "Empire Studio",
    icon: HUD_NAV_ICON_PATHS.dashboard,
    target: { kind: "route", href: "/mission-control" },
  },
];

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HUD_NAV_ICON_PATHS.dashboard,
    target: { kind: "section", href: "/mission-control", anchor: "cc-top" },
  },
  {
    id: "story-studio",
    label: "Story Studio",
    icon: HUD_NAV_ICON_PATHS.storyStudio,
    target: { kind: "module", href: "/mission-control", moduleId: "story-forge" },
  },
  {
    id: "episodes",
    label: "Episodes",
    icon: HUD_NAV_ICON_PATHS.episodes,
    target: { kind: "section", href: "/mission-control", anchor: "cc-workspace" },
  },
  {
    id: "poster-forge",
    label: "Poster Forge",
    icon: HUD_NAV_ICON_PATHS.posterForge,
    target: { kind: "module", href: "/mission-control", moduleId: "poster-lab" },
  },
  {
    id: "collections",
    label: "Collections",
    icon: HUD_NAV_ICON_PATHS.collections,
    target: { kind: "section", href: "/mission-control", anchor: "cc-collections" },
  },
  {
    id: "research",
    label: "Research",
    icon: HUD_NAV_ICON_PATHS.research,
    target: { kind: "section", href: "/mission-control", anchor: "cc-studios" },
  },
  {
    id: "crew",
    label: "Crew",
    icon: HUD_NAV_ICON_PATHS.crew,
    target: { kind: "section", href: "/mission-control", anchor: "cc-crew" },
  },
  {
    id: "mission-log",
    label: "Mission Log",
    icon: HUD_NAV_ICON_PATHS.missionLog,
    target: { kind: "section", href: "/mission-control", anchor: "cc-log" },
  },
  {
    id: "intelligence",
    label: "RIOT Intelligence",
    icon: HUD_NAV_ICON_PATHS.intelligence,
    target: { kind: "route", href: "/intelligence" },
  },
  {
    id: "id-lab",
    label: "ID Lab",
    icon: HUD_NAV_ICON_PATHS.idLab,
    target: { kind: "route", href: "/id-lab" },
  },
  {
    id: "skin-lab",
    label: "Skin Lab",
    icon: HUD_NAV_ICON_PATHS.skinLab,
    target: { kind: "route", href: "/skin-lab" },
  },
  {
    id: "archive",
    label: "Archive",
    icon: HUD_NAV_ICON_PATHS.archive,
    target: { kind: "route", href: "/dock" },
  },
  {
    id: "memory",
    label: "Memory Vault",
    icon: HUD_NAV_ICON_PATHS.missionLog,
    target: { kind: "route", href: "/memory" },
  },
  {
    id: "settings",
    label: "Shadow Sign-In",
    icon: HUD_NAV_ICON_PATHS.settings,
    target: { kind: "route", href: "/shadow" },
  },
];

const NAV_LABEL_KEY_BY_ID: Record<string, keyof Dictionary["navigation"]> = {
  control: "controlPlane",
  vpn: "vpn",
  syslog: "syslog",
  snmp: "snmp",
  storage: "storage",
  radius: "radius",
  dashboard: "missionControl",
  "story-studio": "storyStudio",
  episodes: "episodes",
  "poster-forge": "posterForge",
  collections: "collections",
  research: "research",
  crew: "crew",
  "mission-log": "missionLog",
  intelligence: "intelligence",
  "id-lab": "idLab",
  "skin-lab": "skinLab",
  archive: "archive",
  memory: "memory",
  settings: "shadowSignIn",
};

export function localizeNavItemLabels(
  items: readonly NavItem[],
  dictionary: Dictionary,
): NavItem[] {
  return items.map((item) => {
    const key = NAV_LABEL_KEY_BY_ID[item.id];
    const localizedLabel = key ? dictionary.navigation[key] : undefined;
    return localizedLabel ? { ...item, label: localizedLabel } : item;
  });
}
