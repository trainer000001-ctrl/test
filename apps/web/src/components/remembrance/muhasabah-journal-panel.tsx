"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@moonwitness/ui";
import { DnaButton } from "@moonwitness/ui/imperium";
import {
  deleteIdbJournalEntry,
  MUHASABAH_JOURNAL_LS_KEY,
  MUHASABAH_PLEDGES,
  MUHASABAH_STORAGE_KEY,
  readIdbJournalEntries,
  writeIdbJournalEntry,
  type PrivateJournalEntry,
} from "./remembrance-storage";

interface MuhasabahJournalPanelProps {
  locale: "en" | "id";
  activePhraseId: string;
  beadCount: number;
  cyclesCompleted: number;
  totalWitnessed: number;
}

export function useMuhasabahJournal({
  locale,
  activePhraseId,
  beadCount,
  cyclesCompleted,
  totalWitnessed,
}: MuhasabahJournalPanelProps) {
  const [pledgeIds, setPledgeIds] = useState<readonly string[]>([]);
  const [journalDraft, setJournalDraft] = useState<string>("");
  const [journalEntries, setJournalEntries] = useState<readonly PrivateJournalEntry[]>([]);
  const [journalEngine, setJournalEngine] = useState<
    "INDEXEDDB_ON_DEVICE" | "LOCAL_STORAGE_ON_DEVICE"
  >("LOCAL_STORAGE_ON_DEVICE");

  useEffect(() => {
    try {
      const savedPledges = window.localStorage.getItem(MUHASABAH_STORAGE_KEY);
      if (savedPledges) {
        const parsedPledges = JSON.parse(savedPledges) as unknown;
        if (Array.isArray(parsedPledges)) {
          setPledgeIds(parsedPledges.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch {
      // Ignore storage access failures in private browsing contexts
    }

    let cancelled = false;
    void (async () => {
      const idbRows = await readIdbJournalEntries();
      if (cancelled) return;
      if (idbRows.length > 0) {
        setJournalEntries(idbRows);
        setJournalEngine("INDEXEDDB_ON_DEVICE");
        return;
      }
      if (typeof window !== "undefined" && "indexedDB" in window) {
        setJournalEngine("INDEXEDDB_ON_DEVICE");
      }
      try {
        const rawJournal = window.localStorage.getItem(MUHASABAH_JOURNAL_LS_KEY);
        if (rawJournal) {
          const parsed = JSON.parse(rawJournal) as unknown;
          if (Array.isArray(parsed)) {
            setJournalEntries(
              parsed.filter((row): row is PrivateJournalEntry =>
                Boolean(row && typeof row === "object" && "id" in row && "text" in row),
              ),
            );
          }
        }
      } catch {
        // Ignore restricted storage contexts
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUHASABAH_STORAGE_KEY, JSON.stringify(pledgeIds));
    } catch {
      // Ignore storage quota or restricted context
    }
  }, [pledgeIds]);

  const toggleMuhasabahPledge = (id: string) => {
    setPledgeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const saveJournalNote = async () => {
    const clean = journalDraft.trim();
    if (!clean) return;
    const entry: PrivateJournalEntry = {
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
      text: clean.slice(0, 600),
    };
    const next = [entry, ...journalEntries].slice(0, 24);
    setJournalEntries(next);
    setJournalDraft("");
    const idbOk = await writeIdbJournalEntry(entry);
    setJournalEngine(idbOk ? "INDEXEDDB_ON_DEVICE" : "LOCAL_STORAGE_ON_DEVICE");
    try {
      window.localStorage.setItem(MUHASABAH_JOURNAL_LS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  };

  const removeJournalNote = async (id: string) => {
    const next = journalEntries.filter((e) => e.id !== id);
    setJournalEntries(next);
    await deleteIdbJournalEntry(id);
    try {
      window.localStorage.setItem(MUHASABAH_JOURNAL_LS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage issues
    }
  };

  const exportPrivateMuhasabahJson = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      privacyNote: "Exported strictly on-device. Zero server telemetry or public leaderboard.",
      tasbih: { activePhraseId, beadCount, cyclesCompleted, totalWitnessed },
      muhasabahPledges: MUHASABAH_PLEDGES.filter((p) => pledgeIds.includes(p.id)).map((p) => p.id),
      muhasabahJournal: journalEntries,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `allah-muhasabah-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return {
    exportPrivateMuhasabahJson,
    checklistAndJournal: (
      <div className="mt-5 border-t border-[var(--dna-accent)]/20 pt-4">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dna-accent)]">
          <span>
            {locale === "id"
              ? "MUḤĀSABAH PRIVAT · KHUSUS PERANGKAT INI"
              : "PRIVATE MUḤĀSABAH · ON-DEVICE ONLY"}
          </span>
          <span>
            {pledgeIds.length}/{MUHASABAH_PLEDGES.length}
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {MUHASABAH_PLEDGES.map((item) => {
            const checked = pledgeIds.includes(item.id);
            return (
              <DnaButton
                key={item.id}
                type="button"
                tone="secondary"
                aria-pressed={checked}
                onClick={() => toggleMuhasabahPledge(item.id)}
                className={`flex min-h-0 items-center justify-start gap-2 px-3 py-1.5 text-left text-[11px] leading-snug ${
                  checked
                    ? "text-[var(--dna-text)]"
                    : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-2 w-2 shrink-0 rotate-45 border ${
                    checked
                      ? "border-[var(--dna-text)] bg-[var(--dna-text)]"
                      : "border-[var(--dna-accent)]/60 bg-transparent"
                  }`}
                />
                <span>{locale === "id" ? item.labelId : item.labelEn}</span>
              </DnaButton>
            );
          })}
        </div>
        <p className="mt-2.5 font-mono text-[9.5px] leading-relaxed text-[var(--dna-muted)]">
          {locale === "id"
            ? "AMAL NYATA (0% POTONGAN): Salurkan zakat/sedekah langsung kepada tetangga, anak yatim, atau pihak yang berhak di sekitar Anda."
            : "DIRECT SERVICE (0% PLATFORM FEE): Channel kindness, fair wages & zakat directly to neighbors, orphans, and those around you."}
        </p>

        <div className="mt-3.5 space-y-2 border-t border-[var(--dna-accent)]/15 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9.5px] text-[var(--dna-accent)]">
            <label htmlFor="muhasabah-journal-input" className="cursor-pointer">
              {locale === "id"
                ? "JURNAL MUḤĀSABAH PRIVAT (LOKAL SAJA)"
                : "ON-DEVICE REFLECTION JOURNAL (LOCAL ONLY)"}
            </label>
            <span className="text-[var(--dna-muted)]">{journalEngine}</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="muhasabah-journal-input"
              type="text"
              value={journalDraft}
              onChange={(e) => setJournalDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveJournalNote();
                }
              }}
              placeholder={
                locale === "id"
                  ? "Tulis refleksi jujur untuk diri sendiri..."
                  : "Write a private self-reflection note..."
              }
              className="min-h-[44px] flex-1 border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)] px-3 py-2 font-serif text-sm text-[var(--dna-text)] placeholder-[var(--dna-muted)]"
            />
            <DnaButton
              type="button"
              tone="secondary"
              onClick={() => void saveJournalNote()}
              className="min-h-[44px] px-4 py-2 font-mono text-[10px] uppercase text-[var(--dna-accent)]"
            >
              {locale === "id" ? "SIMPAN LOKAL" : "SEAL LOCALLY"}
            </DnaButton>
          </div>
          {journalEntries.length > 0 && (
            <ul className="space-y-1.5">
              {journalEntries.slice(0, 3).map((note) => (
                <li
                  key={note.id}
                  className="flex items-start justify-between gap-2 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] px-3 py-1.5 font-serif text-xs text-[var(--dna-muted)]"
                >
                  <span>{note.text}</span>
                  <Button
                    type="button"
                    variant="plain"
                    onClick={() => void removeJournalNote(note.id)}
                    className="shrink-0 cursor-pointer font-mono text-[9px] text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
                  >
                    DELETE
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    ),
  };
}
