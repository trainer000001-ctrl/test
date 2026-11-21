"use client";

import { useState, useCallback } from "react";
import {
  Button,
  useSkin,
  listPresets,
  skinPresets,
  listDnaWorlds,
  type SkinName,
  type MasterDnaId,
  type ThemeMode,
  type CanonicalDensity,
} from "@moonwitness/ui";
import { Sun } from "@moonwitness/ui/icons";

interface SkinSwitcherProps {
  className?: string;
}

const THEME_MODES: readonly { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const DENSITY_OPTIONS: readonly { value: CanonicalDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfort" },
  { value: "spacious", label: "Spacious" },
];

export function SkinSwitcher({ className }: SkinSwitcherProps) {
  const { skin, setSkin, dnaId, setDna, mode, setMode, density, setDensity } = useSkin();
  const [isOpen, setIsOpen] = useState(false);
  const presets = listPresets();
  const worlds = listDnaWorlds();

  const handleSelectSkin = useCallback(
    (key: SkinName) => {
      setSkin(key);
      setIsOpen(false);
    },
    [setSkin],
  );

  const handleSelectDna = useCallback(
    (id: MasterDnaId) => {
      setDna(id);
    },
    [setDna],
  );

  return (
    <div
      className={`relative ${className ?? ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isOpen) setIsOpen(false);
      }}
    >
      <Button
        type="button"
        variant="plain"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-transparent p-2 text-[var(--foreground)] transition-colors hover:border-[var(--border)] hover:bg-[var(--card)] ${
          isOpen ? "z-50" : ""
        }`}
        aria-label="Change skin"
        aria-expanded={isOpen}
        title="Appearance: Skin, DNA World, Mode & Density"
      >
        <Sun className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            data-mw-skin-switcher-menu="true"
            className="absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-lg"
          >
            <div className="border-b border-[var(--border)] px-3 py-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--muted-foreground)]">
                Surface Skin
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {presets.map((key) => {
                const preset = skinPresets[key];
                const isActive = skin === key;
                return (
                  <Button
                    key={key}
                    type="button"
                    variant="plain"
                    data-mw-skin-option={key}
                    onClick={() => handleSelectSkin(key)}
                    className={`flex w-full justify-start items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--muted)] ${
                      isActive
                        ? "bg-[var(--primary)]/15 font-bold text-[var(--primary)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)] opacity-80" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{preset.label}</div>
                      <div className="truncate text-[10px] text-[var(--muted-foreground)]">
                        {preset.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="border-y border-[var(--border)] px-3 py-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--muted-foreground)]">
                Master DNA World
              </span>
            </div>
            <div className="grid grid-cols-1 gap-0.5 p-1.5 max-h-40 overflow-y-auto">
              {worlds.map((world) => {
                const isActive = dnaId === world.id;
                return (
                  <Button
                    key={world.id}
                    type="button"
                    variant="plain"
                    onClick={() => handleSelectDna(world.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-[var(--muted)] ${
                      isActive
                        ? "bg-[var(--primary)]/15 font-bold text-[var(--primary)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    <span className="truncate">{world.name}</span>
                    <span className="text-[9px] uppercase text-[var(--muted-foreground)]">
                      {world.id.slice(0, 2)}
                    </span>
                  </Button>
                );
              })}
            </div>

            <div className="border-t border-[var(--border)] px-3 py-2 space-y-2">
              <div>
                <div className="mb-1 text-[10px] font-bold tracking-widest uppercase text-[var(--muted-foreground)]">
                  Mode
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {THEME_MODES.map((m) => (
                    <Button
                      key={m.value}
                      type="button"
                      variant="plain"
                      onClick={() => setMode(m.value)}
                      className={`rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${
                        mode === m.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] font-bold tracking-widest uppercase text-[var(--muted-foreground)]">
                  Density
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {DENSITY_OPTIONS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      variant="plain"
                      onClick={() => setDensity(d.value)}
                      className={`rounded border px-2 py-1 text-[10px] font-semibold transition-colors ${
                        density === d.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
