"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  DnaBrandLogo,
  listDnaWorlds,
  listPresets,
  skinPresets,
  useSkin,
  type BrandLogoId,
} from "@moonwitness/ui";
import { buildEnterpriseNavItems } from "@/data/navigation/verticalMenuData";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { useMetaModelsCatalog } from "@/lib/api/meta-views";
import { useCurrentIdentity } from "@/lib/session";
import { getLocaleFromPath, getLocalizedUrl } from "@/utils/i18n";
import { navHref } from "./shell/nav-items";

export interface ConsoleCommandPaletteProps {
  plane?: "creator" | "operations" | "all";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CREATOR_QUICK_MODELS = [
  "timeline.event",
  "witness.claim",
  "crm.lead",
  "stock.move",
  "account.move",
  "cab.request",
] as const;

export function ConsoleCommandPalette({
  plane = "all",
  open: controlledOpen,
  onOpenChange,
}: ConsoleCommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const urlLocale = getLocaleFromPath(pathname);
  const { direction, dictionary } = useTranslation();
  const session = useCurrentIdentity();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const { skin, setSkin, dnaId, setDna, mode, setMode, density, setDensity } = useSkin();
  const presets = useMemo(() => listPresets(), []);
  const worlds = useMemo(() => listDnaWorlds(), []);
  const catalog = useMetaModelsCatalog();

  const routes = useMemo(() => {
    const localePrefix = urlLocale ?? "";
    if (plane === "creator") {
      return buildEnterpriseNavItems("creator", dictionary, localePrefix, session?.role);
    }
    if (plane === "operations") {
      return buildEnterpriseNavItems("operations", dictionary, localePrefix, session?.role);
    }
    const creatorRoutes = buildEnterpriseNavItems(
      "creator",
      dictionary,
      localePrefix,
      session?.role,
    );
    const operationsRoutes = buildEnterpriseNavItems(
      "operations",
      dictionary,
      localePrefix,
      session?.role,
    );
    const seen = new Set<string>();
    return [...creatorRoutes, ...operationsRoutes].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [dictionary, plane, session?.role, urlLocale]);

  const modelEntries = useMemo(() => {
    const seeded = plane === "operations" ? catalog : [...catalog, ...CREATOR_QUICK_MODELS];
    return Array.from(new Set(seeded)).map((model) => ({
      model,
      href: urlLocale
        ? getLocalizedUrl(`/apps/addons?model=${encodeURIComponent(model)}`, urlLocale)
        : `/addons?model=${encodeURIComponent(model)}`,
    }));
  }, [catalog, plane, urlLocale]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!isOpen);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      title={dictionary.operations.commandPalette.title}
      skin={skin}
    >
      <CommandInput
        autoFocus
        dir={direction}
        placeholder={dictionary.operations.commandPalette.placeholder}
      />
      <CommandList dir={direction}>
        <CommandEmpty>{dictionary.operations.commandPalette.empty}</CommandEmpty>

        <CommandGroup heading={dictionary.operations.commandPalette.modulesGroup}>
          {routes.map((item) => {
            const href = navHref(item);
            return (
              <CommandItem
                key={`nav-${item.id}`}
                value={`${item.label} ${item.id} ${href}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(href);
                }}
              >
                <span>{item.label}</span>
                <CommandShortcut dir="ltr" className="font-mono">
                  {href}
                </CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={dictionary.operations.commandPalette.modelsGroup}>
          {modelEntries.map(({ model, href }) => (
            <CommandItem
              key={`model-${model}`}
              value={`model ${model} ${href}`}
              onSelect={() => {
                setOpen(false);
                router.push(href);
              }}
            >
              <span dir="ltr" className="font-mono">
                {model}
              </span>
              <CommandShortcut dir="ltr" className="font-mono">
                {href}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={dictionary.operations.commandPalette.skinsGroup}>
          {presets.map((key) => {
            const preset = skinPresets[key];
            return (
              <CommandItem
                key={`skin-${key}`}
                value={`skin ${preset.label} ${key} ${preset.description}`}
                onSelect={() => {
                  setSkin(key);
                  setOpen(false);
                }}
              >
                <span>{preset.label}</span>
                <CommandShortcut dir="ltr" className="font-mono">
                  {skin === key ? dictionary.addons.active : key.toUpperCase()}
                </CommandShortcut>
              </CommandItem>
            );
          })}
          {(["dark", "light", "system"] as const).map((nextMode) => (
            <CommandItem
              key={`mode-${nextMode}`}
              value={`theme mode ${nextMode}`}
              onSelect={() => {
                setMode(nextMode);
                setOpen(false);
              }}
            >
              <span dir="ltr" className="font-mono">
                theme.{nextMode}
              </span>
              <CommandShortcut>
                {mode === nextMode ? dictionary.addons.active : dictionary.common.status}
              </CommandShortcut>
            </CommandItem>
          ))}
          {(["compact", "comfortable", "spacious"] as const).map((nextDensity) => (
            <CommandItem
              key={`density-${nextDensity}`}
              value={`density ${nextDensity}`}
              onSelect={() => {
                setDensity(nextDensity);
                setOpen(false);
              }}
            >
              <span dir="ltr" className="font-mono">
                density.{nextDensity}
              </span>
              <CommandShortcut>
                {density === nextDensity ? dictionary.addons.active : dictionary.common.status}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={dictionary.operations.commandPalette.worldsGroup}>
          {worlds.map((world) => (
            <CommandItem
              key={`dna-${world.id}`}
              value={`dna ${world.name} ${world.id} ${world.metaphor}`}
              onSelect={() => {
                setDna(world.id);
                setOpen(false);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <DnaBrandLogo id={world.id as BrandLogoId} variant="mark" size={16} decorative />
                <span>{world.name}</span>
              </span>
              <CommandShortcut dir="ltr" className="font-mono">
                {dnaId === world.id ? dictionary.addons.active : world.numeral}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div
        dir={direction}
        className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]"
      >
        <span>{dictionary.operations.commandPalette.shortcutHint}</span>
        <span className="text-[10px] uppercase">
          {plane === "operations"
            ? dictionary.operations.workspace.planeLabel
            : dictionary.shell.theEmpire}
        </span>
      </div>
    </CommandDialog>
  );
}
