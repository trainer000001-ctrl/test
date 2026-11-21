"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TASBIH_PHRASES } from "@/data/remembrance-sanctuary";
import { Button } from "@moonwitness/ui";
import { DiamondStarOrnament, DnaButton, TasbihBeadRingVector } from "@moonwitness/ui/imperium";
import { triggerSacredViewTransition } from "../motion-primitives";
import { AstrolabeSealMedallion } from "../sacred-illustrations";
import { useMuhasabahJournal } from "./muhasabah-journal-panel";
import { TASBIH_STORAGE_KEY, type PersistedTasbihState } from "./remembrance-storage";

const BREATH_LABELS = [
  "INHALE (4S) · RECEIVING AN-NŪR",
  "STILLNESS (4S) · AS-SAKĪNAH TRUST",
  "EXHALE (6S) · GRATEFUL RELEASE",
] as const;

export function TasbihSakinahChamber({
  locale,
  quietMode,
}: {
  locale: "en" | "id";
  quietMode: boolean;
}) {
  const [activePhraseId, setActivePhraseId] = useState<string>(TASBIH_PHRASES[0]!.id);
  const [beadCount, setBeadCount] = useState<number>(0);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);
  const [totalWitnessed, setTotalWitnessed] = useState<number>(0);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(false);
  const [breathActive, setBreathActive] = useState<boolean>(false);
  const [breathPhaseIndex, setBreathPhaseIndex] = useState<number>(0);
  const [justCompletedCycle, setJustCompletedCycle] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!breathActive) return;
    const scheduleMs = [4000, 4000, 6000];
    const timer = window.setTimeout(() => {
      setBreathPhaseIndex((prev) => (prev + 1) % 3);
    }, scheduleMs[breathPhaseIndex] ?? 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [breathActive, breathPhaseIndex]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TASBIH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedTasbihState>;
      if (
        typeof parsed.phraseId === "string" &&
        TASBIH_PHRASES.some((p) => p.id === parsed.phraseId)
      ) {
        setActivePhraseId(parsed.phraseId);
      }
      if (typeof parsed.count === "number" && Number.isFinite(parsed.count) && parsed.count >= 0) {
        setBeadCount(parsed.count % 33);
      }
      if (
        typeof parsed.cycles === "number" &&
        Number.isFinite(parsed.cycles) &&
        parsed.cycles >= 0
      ) {
        setCyclesCompleted(parsed.cycles);
      }
      if (
        typeof parsed.totalWitnessed === "number" &&
        Number.isFinite(parsed.totalWitnessed) &&
        parsed.totalWitnessed >= 0
      ) {
        setTotalWitnessed(parsed.totalWitnessed);
      }
    } catch {
      // Ignore storage access failures in private browsing contexts
    }
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedTasbihState = {
        phraseId: activePhraseId,
        count: beadCount,
        cycles: cyclesCompleted,
        totalWitnessed,
      };
      window.localStorage.setItem(TASBIH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota or restricted context
    }
  }, [activePhraseId, beadCount, cyclesCompleted, totalWitnessed]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
    };
  }, []);

  const playGentleBell = useCallback(
    (isCycleCompletion: boolean) => {
      if (!chimeEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(isCycleCompletion ? 648 : 528, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(isCycleCompletion ? 0.055 : 0.032, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + (isCycleCompletion ? 0.9 : 0.45));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isCycleCompletion ? 0.92 : 0.48));
      } catch {
        // Ignore audio playback errors if blocked by browser autoplay policy
      }
    },
    [chimeEnabled],
  );

  const activePhrase =
    TASBIH_PHRASES.find((phrase) => phrase.id === activePhraseId) ?? TASBIH_PHRASES[0]!;
  const tasbihProgressFraction = beadCount / activePhrase.targetCount;

  const handleReciteBead = () => {
    const nextRaw = beadCount + 1;
    const completedNow = nextRaw >= activePhrase.targetCount;
    setBeadCount(completedNow ? 0 : nextRaw);
    setTotalWitnessed((prev) => prev + 1);
    if (completedNow) {
      setCyclesCompleted((prev) => prev + 1);
      setJustCompletedCycle(true);
    } else {
      setJustCompletedCycle(false);
    }
    playGentleBell(completedNow);
  };

  const handleSelectPhrase = (phraseId: string) => {
    triggerSacredViewTransition(() => {
      setActivePhraseId(phraseId);
      setBeadCount(0);
      setJustCompletedCycle(false);
    }, quietMode);
  };

  const muhasabah = useMuhasabahJournal({
    locale,
    activePhraseId,
    beadCount,
    cyclesCompleted,
    totalWitnessed,
  });

  return (
    <div className="octa-bevel-shell flex flex-col justify-between p-6 sm:p-7 lg:col-span-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dna-accent)]">
            ORBITAL TASBĪḤ · SAKĪNAH
          </span>
          <div className="flex items-center gap-2">
            <DnaButton
              type="button"
              tone="secondary"
              aria-pressed={chimeEnabled}
              onClick={() => setChimeEnabled((prev) => !prev)}
              className={`min-h-0 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                chimeEnabled
                  ? "text-[var(--dna-text)]"
                  : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
              }`}
            >
              {chimeEnabled ? "CHIME: 528HZ" : "CHIME: MUTE"}
            </DnaButton>
            <DnaButton
              type="button"
              tone="secondary"
              aria-pressed={breathActive}
              onClick={() => setBreathActive((prev) => !prev)}
              className={`min-h-0 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                breathActive
                  ? "text-[var(--dna-text)]"
                  : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
              }`}
            >
              {breathActive ? "BREATH: ON" : "BREATH: GUIDE"}
            </DnaButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TASBIH_PHRASES.map((phrase) => {
            const active = phrase.id === activePhrase.id;
            return (
              <DnaButton
                key={phrase.id}
                type="button"
                tone="secondary"
                aria-pressed={active}
                onClick={() => handleSelectPhrase(phrase.id)}
                className={`min-h-0 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
                  active
                    ? "text-[var(--dna-text)]"
                    : "text-[var(--dna-muted)] hover:text-[var(--dna-text)]"
                }`}
              >
                {phrase.transliteration}
              </DnaButton>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center">
            {breathActive && !quietMode && (
              <div
                aria-hidden="true"
                className="animate-sakinah-breathe absolute h-44 w-44 rounded-full bg-[var(--dna-accent)]/15 blur-xl"
              />
            )}
            <Button
              type="button"
              variant="plain"
              onClick={handleReciteBead}
              aria-label={`Recite ${activePhrase.transliteration}. Count ${beadCount} of ${activePhrase.targetCount}`}
              className="group relative flex h-44 w-44 cursor-pointer flex-col items-center justify-center gap-0 rounded-full focus:outline-none"
            >
              <TasbihBeadRingVector
                beadCount={beadCount}
                progressFraction={tasbihProgressFraction}
                quietMode={quietMode}
              />
              <AstrolabeSealMedallion className="pointer-events-none absolute h-24 w-24 opacity-25 transition-opacity group-hover:opacity-40" />
              <div dir="rtl" lang="ar" className="relative z-10 text-xl text-[var(--dna-text)]">
                {activePhrase.arabic}
              </div>
              <div className="relative z-10 mt-1 font-mono text-2xl font-semibold text-[var(--dna-text)]">
                {beadCount}
                <span className="text-xs text-[var(--dna-muted)]"> / 33</span>
              </div>
              <div className="relative z-10 mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--dna-accent)]">
                <DiamondStarOrnament className="h-2.5 w-2.5" /> PAUSE &amp; REFLECT
              </div>
            </Button>
          </div>

          <p className="mt-3 font-serif text-sm text-[var(--dna-muted)]">
            {activePhrase.translation}
          </p>
          <p className="mt-1 text-xs text-[var(--dna-muted)]">{activePhrase.heartFocus}</p>
          {breathActive && (
            <div
              role="status"
              aria-live="polite"
              className="mt-2 border border-[var(--dna-text)]/40 bg-[var(--dna-surface)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--dna-accent)]"
            >
              {BREATH_LABELS[breathPhaseIndex]}
            </div>
          )}
          {justCompletedCycle && (
            <div
              role="status"
              aria-live="polite"
              className="mt-2 border border-[var(--dna-text)]/55 bg-[var(--dna-accent)]/20 px-3 py-1 font-mono text-[11px] text-[var(--dna-text)]"
            >
              33-Bead Contemplation Cycle Sealed ({cyclesCompleted} total)
            </div>
          )}
        </div>
      </div>

      {muhasabah.checklistAndJournal}

      <div
        aria-live="polite"
        className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dna-accent)]/15 pt-3 font-mono text-[10px] text-[var(--dna-muted)]"
      >
        <span>CYCLES: {cyclesCompleted}</span>
        <span>TOTAL: {totalWitnessed}</span>
        <div className="flex items-center gap-1.5">
          <DnaButton
            type="button"
            tone="secondary"
            onClick={muhasabah.exportPrivateMuhasabahJson}
            className="min-h-0 px-3 py-1 text-[var(--dna-accent)] hover:text-[var(--dna-text)]"
          >
            EXPORT JSON
          </DnaButton>
          <DnaButton
            type="button"
            tone="secondary"
            onClick={() => {
              setBeadCount(0);
              setJustCompletedCycle(false);
            }}
            className="min-h-0 px-3 py-1 hover:text-[var(--dna-text)]"
          >
            RESET RING
          </DnaButton>
        </div>
      </div>
    </div>
  );
}
