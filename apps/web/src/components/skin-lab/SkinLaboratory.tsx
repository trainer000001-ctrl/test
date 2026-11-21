"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DnaBrandLogo,
  SkinBackdrop,
  SkinOrnament,
  auditDnaContrast,
  getDnaWorld,
  listDnaWorlds,
  listPresets,
  skinPresets,
  useSkin,
  type CanonicalDensity,
  type MasterDnaId,
  type ThemeMode,
} from "@moonwitness/ui";
import { ConsoleShellAdapter } from "@/components/shell/console-shell-adapter";
import { SkinLabFocusView } from "./skin-lab-focus-view";
import {
  SkinLabAssetsView,
  SkinLabCompareView,
  SkinLabDxView,
  SkinLabMatrixView,
} from "./skin-lab-views";

export function SkinLaboratory() {
  const worlds = useMemo(() => listDnaWorlds(), []);
  const presets = useMemo(() => listPresets(), []);
  const {
    skin: activeSkin,
    setSkin,
    dnaId: globalDnaId,
    setDna,
    mode: activeTheme,
    resolvedMode,
    setMode,
    density: activeDensity,
    setDensity,
  } = useSkin();
  const [selectedDnaId, setSelectedDnaId] = useState<MasterDnaId>("05-riot-anarchy");
  const [searchFilter, setSearchFilter] = useState("");
  const [labView, setLabView] = useState<"focus" | "compare" | "matrix" | "assets" | "dx">("focus");

  const activeWorld = getDnaWorld(selectedDnaId);
  const activeAudit = useMemo(() => auditDnaContrast(activeWorld), [activeWorld]);

  const filteredWorlds = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return worlds;
    return worlds.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.metaphor.toLowerCase().includes(q) ||
        w.primaryIdentity.toLowerCase().includes(q),
    );
  }, [worlds, searchFilter]);

  return (
    <ConsoleShellAdapter
      plane="creator"
      breadcrumb="Skin Laboratory"
      search={{
        value: searchFilter,
        onChange: setSearchFilter,
        placeholder: "Filter 7 Master DNA Worlds…",
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
        <header className="relative overflow-hidden border-2 border-[var(--border)] bg-[var(--card)] p-5">
          <SkinBackdrop skin={activeSkin} dnaId={selectedDnaId} />
          <SkinOrnament slot="corner" className="right-3 top-3" />
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] tracking-[0.28em] text-[var(--primary)]">
                MOONFRAME 8-AXIS SKIN ENGINE · 7 MASTER DNA WORLDS
              </p>
              <h1 className="mt-2 font-brush text-4xl text-[var(--foreground)] sm:text-5xl">
                SKIN LABORATORY
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
                Interactive matrix verifying 8-axis skin presets, 18 brand logos, 24 vector cutouts,
                12 domain icons, and measured WCAG 2.1 AA contrast across all 140 DNA combinations.
              </p>
            </div>
            <div
              className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap"
              role="tablist"
              aria-label="Skin laboratory mode"
            >
              {(
                [
                  { id: "focus", label: "SINGLE WORLD" },
                  { id: "compare", label: "7-WORLD AUDIT GRID" },
                  { id: "matrix", label: "10-SKIN MATRIX" },
                  { id: "assets", label: "LOGOS & CUTOUTS" },
                  { id: "dx", label: "TOKEN & PLAYGROUND" },
                ] as const
              ).map((mode) => (
                <Button
                  key={mode.id}
                  type="button"
                  variant="plain"
                  role="tab"
                  aria-selected={labView === mode.id}
                  onClick={() => setLabView(mode.id)}
                  className={`min-h-11 whitespace-nowrap border-2 px-3 py-2 font-mono text-[11px] tracking-wider transition-colors ${
                    labView === mode.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--foreground)]"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Global Surface Skin ({activeSkin})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((key) => {
                  const preset = skinPresets[key];
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant="plain"
                      onClick={() => setSkin(key)}
                      className={`border px-2.5 py-1 font-mono text-[10px] uppercase transition-colors ${
                        activeSkin === key
                          ? "border-[var(--primary)] bg-[var(--primary)] font-bold text-[var(--primary-foreground)]"
                          : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Theme Mode ({activeTheme}) &amp; Density ({activeDensity})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["dark", "light", "system"] as const satisfies readonly ThemeMode[]).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant="plain"
                    onClick={() => setMode(m)}
                    className={`border px-2.5 py-1 font-mono text-[10px] uppercase transition-colors ${
                      activeTheme === m
                        ? "border-[var(--primary)] bg-[var(--primary)]/20 font-bold text-[var(--foreground)]"
                        : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {m}
                  </Button>
                ))}
                {(
                  [
                    "compact",
                    "comfortable",
                    "spacious",
                  ] as const satisfies readonly CanonicalDensity[]
                ).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="plain"
                    onClick={() => setDensity(d)}
                    className={`border px-2.5 py-1 font-mono text-[10px] uppercase transition-colors ${
                      activeDensity === d
                        ? "border-[var(--secondary)] bg-[var(--secondary)]/20 font-bold text-[var(--foreground)]"
                        : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Sync Global DNA ({globalDnaId})
              </div>
              <div className="flex items-center gap-2">
                <DnaBrandLogo id={selectedDnaId} variant="mark" size={28} />
                <Button
                  type="button"
                  variant="plain"
                  onClick={() => setDna(selectedDnaId)}
                  className="border border-[var(--primary)] bg-[var(--primary)]/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-[var(--foreground)] hover:bg-[var(--primary)]/25"
                >
                  Apply {selectedDnaId} Globally
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {filteredWorlds.map((world) => {
            const active = world.id === selectedDnaId;
            return (
              <Button
                key={world.id}
                type="button"
                variant="plain"
                onClick={() => setSelectedDnaId(world.id)}
                className={`h-auto min-h-16 flex-col items-stretch justify-start gap-0 border-2 p-3 text-left transition-all ${
                  active
                    ? "border-[var(--foreground)] shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                    : "border-[var(--line)] opacity-85 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: world.palette.surface,
                  color: world.palette.text,
                  borderColor: active ? world.palette.accent : world.palette.border,
                }}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span style={{ color: world.palette.mutedText }}>{world.numeral}</span>
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: world.palette.accent }}
                  />
                </div>
                <div className="mt-1 font-mono text-xs font-bold tracking-wide">{world.name}</div>
              </Button>
            );
          })}
        </div>

        {labView === "focus" && (
          <SkinLabFocusView
            activeSkin={activeSkin}
            activeWorld={activeWorld}
            activeAudit={activeAudit}
          />
        )}
        {labView === "compare" && <SkinLabCompareView worlds={filteredWorlds} />}
        {labView === "matrix" && (
          <SkinLabMatrixView
            selectedDnaId={selectedDnaId}
            resolvedMode={resolvedMode}
            activeDensity={activeDensity}
          />
        )}
        {labView === "assets" && (
          <SkinLabAssetsView activeSkin={activeSkin} globalDnaId={globalDnaId} />
        )}
        {labView === "dx" && <SkinLabDxView />}
      </div>
    </ConsoleShellAdapter>
  );
}
