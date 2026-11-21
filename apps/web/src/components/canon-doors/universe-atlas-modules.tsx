"use client";

import { useMemo, useState } from "react";
import { Button, Input, Slider } from "@moonwitness/ui";
import {
  AETHERION_100_LEVELS,
  AETHERION_READINESS_FORMULA,
  AETHERION_REALMS,
  MONWITNESS_XII_FACELESS_GUIDES,
  NINE_CANON_CHARACTERS,
  PARADISE_V3_AURAS,
  PARADISE_V3_CHAMPIONS_META,
  PARADISE_V3_GUILDS,
  THIRTEEN_PLATFORM_FUNCTIONS,
  WORLD_PATCHES_REGISTRY,
  type WorldPatchStatus,
} from "@/data/empire-canon-codex";

type PatchFilter = "all" | WorldPatchStatus;

const PATCH_FILTER_OPTIONS: readonly { readonly id: PatchFilter; readonly label: string }[] = [
  { id: "all", label: "ALL (37)" },
  { id: "registered_in_chat", label: "REGISTERED (#001–#008)" },
  { id: "recovered_draft", label: "RECOVERED (#009–#013)" },
  { id: "number_conflict", label: "#014 CONFLICT (2)" },
  { id: "editorial_proposal", label: "EDITORIAL (#015–#032)" },
  { id: "user_submitted_in_chat", label: "CHAT (#033)" },
  { id: "unnumbered_extra", label: "UNNUMBERED (3)" },
];

export function AetherionParadiseAtlas({ quietMode }: { readonly quietMode: boolean }) {
  const [selectedRealmIdx, setSelectedRealmIdx] = useState<number>(1);
  const [scoreR, setScoreR] = useState<number>(0.9);
  const [scoreV, setScoreV] = useState<number>(0.85);
  const [scoreF, setScoreF] = useState<number>(0.8);
  const [scoreE, setScoreE] = useState<number>(0.85);

  const transitionClass = quietMode ? "transition-none" : "transition-colors duration-150";

  const activeRealm =
    AETHERION_REALMS.find((r) => r.realmIndex === selectedRealmIdx) ?? AETHERION_REALMS[0]!;
  const realmLevels = useMemo(
    () => AETHERION_100_LEVELS.filter((lvl) => lvl.realmCode === activeRealm.realmCode),
    [activeRealm.realmCode],
  );

  const readinessScore = Math.round(30 * scoreR + 25 * scoreV + 25 * scoreF + 20 * scoreE);
  const passesThreshold = readinessScore >= 80;

  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          AETHERION (10 REALMS · 100 LEVELS) &amp; PARADISE V3 ARCHITECTURE
        </span>
        <span className="font-mono text-[11px] text-[var(--dna-accent)]">
          OPEN: {AETHERION_READINESS_FORMULA.openRange} · SEALED:{" "}
          {AETHERION_READINESS_FORMULA.sealedRange}
        </span>
      </div>

      {/* Realm Selector (1..10) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {AETHERION_REALMS.map((realm) => {
          const isSelected = realm.realmIndex === activeRealm.realmIndex;
          return (
            <Button
              key={realm.realmCode}
              type="button"
              variant="plain"
              onClick={() => setSelectedRealmIdx(realm.realmIndex)}
              className={`min-h-[44px] h-auto flex-col items-stretch justify-start gap-0 border p-2.5 text-left cursor-pointer ${transitionClass} ${
                isSelected
                  ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20"
                  : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/50"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                <span>{realm.levelRange}</span>
                <span>{realm.realmIndex <= 4 ? "001–033" : "SEALED"}</span>
              </div>
              <div className="font-monument mt-0.5 text-xs text-[var(--dna-text)]">
                {realm.name}
              </div>
            </Button>
          );
        })}
      </div>

      {/* Selected Realm 10 Levels */}
      <div className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-monument text-sm text-[var(--dna-text)]">
              {activeRealm.realmCode} · {activeRealm.name}
            </span>
            <span className="ml-2 font-mono text-[11px] text-[var(--dna-accent)]">
              ({activeRealm.openingLandmark} → {activeRealm.closingLandmark})
            </span>
          </div>
          <span className="border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]">
            {activeRealm.accessSummary}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {realmLevels.map((lvl) => (
            <div
              key={lvl.code}
              className={`border p-2.5 ${
                lvl.accessState === "OPEN"
                  ? "border-[var(--dna-accent)]/40 bg-[var(--dna-surface)]"
                  : "border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] opacity-80"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[var(--dna-accent)]">{lvl.code}</span>
                <span
                  className={
                    lvl.accessState === "OPEN"
                      ? "text-[var(--dna-accent)]"
                      : "text-[var(--dna-muted)]"
                  }
                >
                  {lvl.accessState}
                </span>
              </div>
              <div className="mt-1 text-xs text-[var(--dna-text)]">{lvl.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Readiness Calculator + PARADISE V3 Auras & 10 Guilds */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[var(--dna-accent)] uppercase">
              READINESS FORMULA CALCULATOR
            </span>
            <span
              className={`border px-2 py-0.5 font-mono text-[10px] ${
                passesThreshold
                  ? "border-[var(--dna-accent)]/60 bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                  : "border-[var(--dna-muted)]/40 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
              }`}
            >
              S = {readinessScore} ({passesThreshold ? "PASS ≥ 80" : "BELOW 80"})
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-[var(--dna-accent)]">
            {AETHERION_READINESS_FORMULA.expression}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {(
              [
                { id: "r", label: "R (Rootedness ·30)", val: scoreR, set: setScoreR },
                { id: "v", label: "V (Verified ·25)", val: scoreV, set: setScoreV },
                { id: "f", label: "F (Fairness ·25)", val: scoreF, set: setScoreF },
                { id: "e", label: "E (Endurance ·20)", val: scoreE, set: setScoreE },
              ] as const
            ).map((item) => (
              <label
                key={item.id}
                className="block border border-[var(--dna-accent)]/15 bg-[var(--dna-canvas)] p-2"
              >
                <div className="flex justify-between font-mono text-[10px] text-[var(--dna-muted)]">
                  <span>{item.label}</span>
                  <span className="text-[var(--dna-accent)]">{item.val.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[item.val]}
                  onValueChange={([v]) => item.set(v ?? 0)}
                  aria-label={item.label}
                  className="mt-2"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-[var(--dna-accent)] uppercase">
              PARADISE V3 · 3 AURAS · 10 GUILDS · {PARADISE_V3_CHAMPIONS_META.totalChampions}{" "}
              CHAMPIONS
            </span>
            <span className="font-mono text-[10px] text-[var(--dna-muted)]">
              {PARADISE_V3_CHAMPIONS_META.formula}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PARADISE_V3_AURAS.map((aura) => (
              <div
                key={aura.id}
                className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5"
              >
                <div className="font-mono text-[10px] text-[var(--dna-accent)]">
                  {aura.levelRange}
                </div>
                <div className="font-monument text-xs text-[var(--dna-text)]">{aura.name}</div>
                <p className="mt-1 text-[11px] text-[var(--dna-muted)]">{aura.focus}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PARADISE_V3_GUILDS.map((guild) => (
              <span
                key={guild.code}
                title={`${guild.domainFocus} (${guild.provenance})`}
                className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] px-2 py-1 font-mono text-[10px] text-[var(--dna-muted)]"
              >
                {guild.code} · {guild.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorldPatchesRegistryPanel({ quietMode }: { readonly quietMode: boolean }) {
  const [statusFilter, setStatusFilter] = useState<PatchFilter>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const transitionClass = quietMode ? "transition-none" : "transition-colors duration-150";

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPatches = useMemo(
    () =>
      WORLD_PATCHES_REGISTRY.filter((entry) => {
        if (statusFilter !== "all" && entry.status !== statusFilter) return false;
        if (!normalizedSearch) return true;
        return (
          entry.patchNumber.toLowerCase().includes(normalizedSearch) ||
          entry.title.toLowerCase().includes(normalizedSearch) ||
          entry.notes.toLowerCase().includes(normalizedSearch)
        );
      }),
    [statusFilter, normalizedSearch],
  );

  const conflictPair = WORLD_PATCHES_REGISTRY.filter((p) => p.status === "number_conflict");

  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          COMPLETE 33 WORLD PATCHES REGISTRY (+ #014 CONFLICT &amp; 3 UNNUMBERED)
        </span>
        <span className="font-mono text-[11px] text-[var(--dna-accent)]">
          SOURCE: MASTER_BUG_PATCH_33_V2.md · 0 DIVINE APPROVALS
        </span>
      </div>

      {/* Explicit Side-by-Side #014 Conflict Disclosure */}
      <div className="border border-[var(--dna-accent)]/40 bg-[var(--dna-surface)] p-4">
        <div className="font-mono text-[11px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          DISCLOSED #014 NUMBER CONFLICT — PRESERVED SIDE BY SIDE (NEVER MERGED)
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conflictPair.map((candidate) => (
            <div
              key={candidate.id}
              className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-3"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
                <span>{candidate.patchNumber}</span>
                <span>{candidate.category}</span>
              </div>
              <div className="font-monument mt-1 text-xs text-[var(--dna-text)]">
                {candidate.title}
              </div>
              <p className="mt-1 text-[11px] text-[var(--dna-muted)]">{candidate.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {PATCH_FILTER_OPTIONS.map((opt) => {
            const active = statusFilter === opt.id;
            return (
              <Button
                key={opt.id}
                type="button"
                variant="plain"
                aria-pressed={active}
                onClick={() => setStatusFilter(opt.id)}
                className={`min-h-[44px] border px-2.5 py-1 font-mono text-[10px] cursor-pointer ${transitionClass} ${
                  active
                    ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/50"
                }`}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
        <Input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter patches (#001, MAROON, RIBA...)"
          aria-label="Filter world patches"
          className="min-h-[44px] w-full sm:w-64 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-3 py-1.5 font-mono text-xs text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:border-[var(--dna-accent)] focus:outline-none"
        />
      </div>

      {/* Patch Rows */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[360px] overflow-y-auto pr-1">
        {filteredPatches.map((patch) => (
          <div
            key={patch.id}
            className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3"
          >
            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
              <span>{patch.patchNumber}</span>
              <span>{patch.category}</span>
            </div>
            <div className="mt-1 font-serif text-xs text-[var(--dna-text)]">{patch.title}</div>
            <p className="mt-0.5 text-[11px] text-[var(--dna-muted)]">{patch.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlatformFunctionsCharactersPanel() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5">
        <div className="font-monument text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase border-b border-[var(--dna-accent)]/20 pb-2">
          13 CORE PLATFORM FUNCTIONS (MVN §21A.2)
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {THIRTEEN_PLATFORM_FUNCTIONS.map((fn) => (
            <div
              key={fn}
              className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] px-2.5 py-2 font-mono text-[11px] text-[var(--dna-accent)]"
            >
              {fn}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-7 border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-2">
          <span className="font-monument text-sm tracking-[0.16em] text-[var(--dna-accent)] uppercase">
            9 CHARACTERS (moonwitness-II) × 4 FACELESS GUIDES (monwitness-xii)
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {NINE_CANON_CHARACTERS.map((char) => (
            <div
              key={char.id}
              className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2.5"
            >
              <div className="font-monument text-xs text-[var(--dna-text)]">{char.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {char.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="border border-[var(--dna-accent)]/20 bg-[var(--dna-surface)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--dna-accent)]"
                  >
                    {alias}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10.5px] text-[var(--dna-muted)]">{char.note}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--dna-accent)]/20 pt-3">
          <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)] uppercase">
            MONWITNESS-XII · 4 FACELESS GUIDES (THE BATTERIES)
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
            {MONWITNESS_XII_FACELESS_GUIDES.map((guide) => (
              <div
                key={guide.code}
                className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2"
              >
                <div className="font-mono text-[11px] text-[var(--dna-text)]">{guide.code}</div>
                <div className="font-mono text-[9.5px] text-[var(--dna-accent)]">{guide.role}</div>
                <div className="text-[10px] text-[var(--dna-muted)]">{guide.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
