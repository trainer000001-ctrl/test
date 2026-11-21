"use client";

import { useMemo, useState } from "react";
import { Button, Input } from "@moonwitness/ui";
import { AMANAH_25_ATLAS, GOD_99_DEPARTMENTS, GOD_99_DIRECTORY } from "@/data/empire-canon-codex";

export function God99DirectoryExplorer() {
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [query, setQuery] = useState<string>("");

  const needle = query.trim().toLowerCase();
  const visibleSlots = useMemo(
    () =>
      GOD_99_DIRECTORY.filter((slot) => {
        if (selectedDept !== "ALL" && slot.departmentCode !== selectedDept) return false;
        if (!needle) return true;
        return (
          slot.slotId.toLowerCase().includes(needle) ||
          slot.codename.toLowerCase().includes(needle) ||
          slot.attributeReflection.toLowerCase().includes(needle) ||
          slot.departmentName.toLowerCase().includes(needle)
        );
      }),
    [selectedDept, needle],
  );

  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
          G.O.D. 99 STEWARDSHIP DIRECTORY (9 DEPTS × 11 = 99 SLOTS)
        </span>
        <span className="border border-[var(--dna-accent)]/40 bg-[var(--dna-accent)]/15 px-2.5 py-0.5 font-mono text-[10px] text-[var(--dna-accent)]">
          ALL SLOTS: UNASSIGNED · POWERS: NONE · ETHICAL_ANALOGY_NOT_IDENTITY
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="plain"
            aria-pressed={selectedDept === "ALL"}
            onClick={() => setSelectedDept("ALL")}
            className={`min-h-[44px] border px-2.5 py-1 font-mono text-[10px] cursor-pointer ${
              selectedDept === "ALL"
                ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)]"
            }`}
          >
            ALL (99)
          </Button>
          {GOD_99_DEPARTMENTS.map((dept) => {
            const active = selectedDept === dept.code;
            return (
              <Button
                key={dept.code}
                type="button"
                variant="plain"
                aria-pressed={active}
                onClick={() => setSelectedDept(dept.code)}
                className={`min-h-[44px] border px-2.5 py-1 font-mono text-[10px] cursor-pointer ${
                  active
                    ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 text-[var(--dna-text)]"
                    : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/45"
                }`}
              >
                {dept.code} {dept.name}
              </Button>
            );
          })}
        </div>
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GOD-001, codename, Al-Haqq..."
          aria-label="Search G.O.D. 99 directory"
          className="min-h-[44px] w-full sm:w-64 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-3 py-1.5 font-mono text-xs text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:border-[var(--dna-accent)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4 max-h-[380px] overflow-y-auto pr-1">
        {visibleSlots.map((slot) => (
          <div
            key={slot.slotId}
            className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3"
          >
            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
              <span>{slot.slotId}</span>
              <span>
                {slot.departmentCode} · {slot.pillar}
              </span>
            </div>
            <div className="font-monument mt-1 text-xs text-[var(--dna-text)]">{slot.codename}</div>
            <div className="mt-0.5 font-serif text-xs text-[var(--dna-accent)]">
              {slot.attributeReflection}
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] text-[var(--dna-muted)]">
              {slot.status} · {slot.powers}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Amanah25AtlasPanel() {
  const [filterText, setFilterText] = useState<string>("");
  const needle = filterText.trim().toLowerCase();
  const visible = useMemo(
    () =>
      AMANAH_25_ATLAS.filter(
        (entry) =>
          !needle ||
          entry.prophet.toLowerCase().includes(needle) ||
          entry.amanahKey.toLowerCase().includes(needle) ||
          entry.domainFocus.toLowerCase().includes(needle) ||
          entry.quranRef.toLowerCase().includes(needle),
      ),
    [needle],
  );

  return (
    <div className="border border-[var(--dna-accent)]/25 bg-[var(--dna-canvas)] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <div>
          <span className="font-monument text-sm sm:text-base tracking-[0.16em] text-[var(--dna-accent)] uppercase">
            25 BIDANG AMANAH PEDAGOGICAL ATLAS (01 ADAM → 25 MUHAMMAD ﷺ)
          </span>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--dna-muted)]">
            Origin: Narrative Stewardship Archive (conv-001[33]) · Pedagogical anchor only (Avatar =
            teaching metaphor, never infallibility claim)
          </div>
        </div>
        <Input
          type="search"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search prophet, amanah, surah..."
          aria-label="Filter 25 Bidang Amanah"
          className="min-h-[44px] w-full sm:w-64 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-3 py-1.5 font-mono text-xs text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:border-[var(--dna-accent)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((entry) => (
          <div
            key={entry.number}
            className={`border p-3 ${
              entry.rejectedFlag
                ? "border-[var(--dna-accent)]/50 bg-[var(--dna-canvas)]"
                : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)]"
            }`}
          >
            <div className="flex items-center justify-between font-mono text-[10px] text-[var(--dna-accent)]">
              <span>#{String(entry.number).padStart(2, "0")}</span>
              <span>{entry.quranRef}</span>
            </div>
            <div className="font-monument mt-1 text-xs text-[var(--dna-text)]">{entry.prophet}</div>
            <div className="mt-0.5 font-mono text-[11px] text-[var(--dna-accent)]">
              {entry.amanahKey}
            </div>
            <p className="mt-1 text-[11px] text-[var(--dna-muted)]">{entry.domainFocus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
