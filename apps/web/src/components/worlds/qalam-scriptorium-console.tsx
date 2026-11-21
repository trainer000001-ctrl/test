"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Input, NativeSelect, Textarea } from "@moonwitness/ui";
import { DnaBadge } from "@moonwitness/ui/imperium";
import { triggerSacredViewTransition } from "../motion-primitives";

const QALAM_STORAGE_KEY = "allah-qalam-folios-v1";

interface InscriptionEntry {
  readonly id: string;
  readonly authorTitle: string;
  readonly sealName: string;
  readonly bodyText: string;
  readonly cycleStamp: string;
}

const INITIAL_INSCRIPTIONS: readonly InscriptionEntry[] = [
  {
    id: "INSC-01",
    authorTitle: "Custodian of the Western Spire",
    sealName: "Al-Nūr · Light",
    bodyText:
      "Every line of code and every carved arch is a testimony of gratitude when crafted with precision and truth.",
    cycleStamp: "Cycle 1448 · Zenith",
  },
  {
    id: "INSC-02",
    authorTitle: "Chronicler of Sidra",
    sealName: "Al-Mīzān · Balance",
    bodyText:
      "Between silence and transmission lies geometry: the bridge connecting unseen wisdom to visible form.",
    cycleStamp: "Cycle 1448 · Dawn",
  },
];

const SACRED_SEALS = [
  "Al-Nūr · Light",
  "Al-Ḥikmah · Wisdom",
  "Al-Qalam · The Pen",
  "Al-Mīzān · Balance",
] as const;

export function QalamScriptoriumConsole({ quietMode }: { quietMode: boolean }) {
  const [inscriptions, setInscriptions] =
    useState<readonly InscriptionEntry[]>(INITIAL_INSCRIPTIONS);
  const [draftAuthor, setDraftAuthor] = useState<string>("");
  const [draftSeal, setDraftSeal] = useState<string>(SACRED_SEALS[0]);
  const [draftReflection, setDraftReflection] = useState<string>("");
  const [qalamHint, setQalamHint] = useState<string>("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(QALAM_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as InscriptionEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setInscriptions(parsed.slice(0, 24));
      }
    } catch {
      // Ignore storage errors in private contexts
    }
  }, []);

  const handleInscribeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedText = draftReflection.trim();
    if (!trimmedText) {
      setQalamHint("Please write a reflection or word of gratitude before sealing.");
      return;
    }
    setQalamHint("");
    const nextNumber = inscriptions.length + 1;
    const newRecord: InscriptionEntry = {
      id: `INSC-${String(nextNumber).padStart(2, "0")}`,
      authorTitle: draftAuthor.trim() || "Sworn Witness of the Gate",
      sealName: draftSeal,
      bodyText: trimmedText,
      cycleStamp: "Cycle 1448 · Sealed Now",
    };
    const nextList = [newRecord, ...inscriptions];
    try {
      window.localStorage.setItem(QALAM_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore storage failures
    }
    triggerSacredViewTransition(() => {
      setInscriptions(nextList);
      setDraftReflection("");
      setDraftAuthor("");
    }, quietMode);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.14em] text-[var(--dna-text)]">
          HUMAN-PEN · QALAM SCRIPTORIUM
        </span>
        <DnaBadge>{inscriptions.length} FOLIOS SEALED</DnaBadge>
      </div>

      <form onSubmit={handleInscribeSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="qalam-author-input"
              className="block font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dna-accent)]"
            >
              Scribe Designation
            </label>
            <Input
              id="qalam-author-input"
              type="text"
              value={draftAuthor}
              onChange={(e) => setDraftAuthor(e.target.value)}
              placeholder="e.g. Traveler of the Gate"
              className="mt-1 min-h-[44px] w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-surface)] px-3 py-2 font-sans text-sm text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:border-[var(--dna-accent)] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="qalam-seal-select"
              className="block font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dna-accent)]"
            >
              Sacred Seal
            </label>
            <NativeSelect
              id="qalam-seal-select"
              value={draftSeal}
              onChange={(e) => setDraftSeal(e.target.value)}
              className="mt-1 min-h-[44px] w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-surface)] px-3 py-2 font-sans text-sm text-[var(--dna-text)] focus:border-[var(--dna-accent)] focus:outline-none"
            >
              {SACRED_SEALS.map((sealOption) => (
                <option key={sealOption} value={sealOption}>
                  {sealOption}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div>
          <label
            htmlFor="qalam-reflection-input"
            className="block font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--dna-accent)]"
          >
            Luminous Inscription
          </label>
          <Textarea
            id="qalam-reflection-input"
            rows={2}
            value={draftReflection}
            onChange={(e) => {
              setDraftReflection(e.target.value);
              if (qalamHint) setQalamHint("");
            }}
            placeholder="Inscribe a word of wisdom, gratitude, or architectural vision..."
            className="mt-1 min-h-0 w-full border border-[var(--dna-accent)]/35 bg-[var(--dna-surface)] px-3 py-2 font-serif text-sm text-[var(--dna-text)] placeholder-[var(--dna-muted)] focus:border-[var(--dna-accent)] focus:outline-none"
          />
        </div>
        {qalamHint && (
          <p role="alert" className="font-mono text-xs text-[var(--dna-warning)]">
            {qalamHint}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="submit"
            variant="plain"
            className="font-monument min-h-[44px] cursor-pointer border border-[var(--dna-accent)] bg-[var(--dna-accent)]/20 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[var(--dna-text)] transition-colors hover:bg-[var(--dna-accent)]/35"
          >
            SEAL INSCRIPTION IN FOLIO
          </Button>
          {inscriptions.length > INITIAL_INSCRIPTIONS.length && (
            <Button
              type="button"
              variant="plain"
              onClick={() => {
                setInscriptions(INITIAL_INSCRIPTIONS);
                try {
                  window.localStorage.removeItem(QALAM_STORAGE_KEY);
                } catch {
                  // Ignore storage error
                }
              }}
              className="min-h-[44px] cursor-pointer border border-[var(--dna-accent)]/25 px-3 py-1 font-mono text-[10px] uppercase text-[var(--dna-muted)] hover:border-[var(--dna-accent)] hover:text-[var(--dna-text)]"
            >
              RESTORE DEFAULTS
            </Button>
          )}
        </div>
      </form>

      <div className="mt-4 space-y-2.5 pr-1">
        {inscriptions.map((entry) => (
          <div
            key={entry.id}
            className="border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-3.5 text-xs"
          >
            <div className="flex items-center justify-between font-mono text-[11px] text-[var(--dna-accent)]">
              <span>
                {entry.id} · {entry.authorTitle}
              </span>
              <span>{entry.sealName}</span>
            </div>
            <p className="mt-1.5 font-serif text-sm leading-relaxed text-[var(--dna-text)] sm:text-base">
              “{entry.bodyText}”
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
