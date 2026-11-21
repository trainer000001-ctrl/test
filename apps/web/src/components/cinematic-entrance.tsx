"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@moonwitness/ui";
import { DiamondStarOrnament } from "./sacred-icons";
import { AstrolabeSealMedallion } from "./sacred-illustrations";

const ENTRANCE_SESSION_KEY = "allah-entrance-witnessed";

export function CinematicEntrance({
  quietMode,
  replayCounter,
  onVisibilityChange,
}: {
  readonly quietMode: boolean;
  readonly replayCounter: number;
  readonly onVisibilityChange?: (active: boolean) => void;
}) {
  const [visible, setVisible] = useState<boolean>(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const visibilityCallbackRef = useRef(onVisibilityChange);

  useEffect(() => {
    visibilityCallbackRef.current = onVisibilityChange;
  }, [onVisibilityChange]);

  const dismissEntrance = useCallback(() => {
    try {
      window.sessionStorage.setItem(ENTRANCE_SESSION_KEY, "1");
    } catch {
      // Ignore storage access errors in restricted browsing contexts
    }
    setVisible(false);
    visibilityCallbackRef.current?.(false);
  }, []);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (quietMode || reducedMotionQuery.matches) {
      const rafSkip = window.requestAnimationFrame(() => {
        setVisible(false);
        visibilityCallbackRef.current?.(false);
      });
      return () => {
        window.cancelAnimationFrame(rafSkip);
      };
    }

    const hasWitnessedInSession = (): boolean => {
      if (replayCounter !== 0) {
        return false;
      }
      try {
        return window.sessionStorage.getItem(ENTRANCE_SESSION_KEY) === "1";
      } catch {
        return false;
      }
    };

    if (hasWitnessedInSession()) {
      const rafSkip = window.requestAnimationFrame(() => {
        setVisible(false);
        visibilityCallbackRef.current?.(false);
      });
      return () => {
        window.cancelAnimationFrame(rafSkip);
      };
    }

    let timerStage2 = 0;
    let timerStage3 = 0;
    let timerComplete = 0;

    const rafStart = window.requestAnimationFrame(() => {
      setStage(1);
      setVisible(true);
      visibilityCallbackRef.current?.(true);

      timerStage2 = window.setTimeout(() => {
        setStage(2);
      }, 650);

      timerStage3 = window.setTimeout(() => {
        setStage(3);
      }, 1550);

      timerComplete = window.setTimeout(() => {
        dismissEntrance();
      }, 2250);
    });

    return () => {
      window.cancelAnimationFrame(rafStart);
      window.clearTimeout(timerStage2);
      window.clearTimeout(timerStage3);
      window.clearTimeout(timerComplete);
    };
  }, [quietMode, replayCounter, dismissEntrance]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dismissEntrance();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, dismissEntrance]);

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) dismissEntrance();
      }}
    >
      <DialogContent
        hideClose
        aria-describedby={undefined}
        aria-label="Empire of the Light Entrance Sequence"
        className={`inset-0 left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 sm:rounded-none border-0 flex flex-col items-center justify-center overflow-hidden bg-[var(--dna-canvas)] px-6 text-center transition-all duration-700 ease-out ${
          stage === 3 ? "opacity-0 scale-[1.03] pointer-events-none" : "opacity-100 scale-100"
        }`}
      >
        <DialogTitle className="sr-only">Empire of the Light Entrance Sequence</DialogTitle>
        {/* Vertical Meridian Emergence Beam */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-transparent via-[var(--dna-text)] to-transparent transition-all duration-1000 ${
            stage >= 1 ? "opacity-80 scale-y-100" : "opacity-0 scale-y-0"
          }`}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(223,192,123,0.18)_0%,rgba(8,10,18,0.65)_42%,rgba(4,5,9,0.98)_78%)]"
        />

        {/* Stage 1: Sacred Astrolabe Emergence */}
        <div
          className={`relative z-10 flex flex-col items-center transition-all duration-700 ${
            stage >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute h-36 w-36 rounded-full bg-[var(--dna-accent)]/15 blur-2xl"
            />
            <AstrolabeSealMedallion
              className="relative h-24 w-24 sm:h-28 sm:w-28 drop-shadow-[0_0_24px_rgba(255,244,210,0.45)]"
              spin={!quietMode}
            />
          </div>
        </div>

        {/* Stage 2: Sacred Invocation & Monument Typography */}
        <div
          className={`relative z-10 mt-8 flex flex-col items-center transition-all duration-700 ${
            stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div
            dir="rtl"
            lang="ar"
            className="mb-2 text-lg sm:text-2xl text-[var(--dna-accent)]/95 tracking-wide drop-shadow-[0_0_16px_rgba(223,192,123,0.45)]"
          >
            بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-[var(--dna-accent)]/80" />
            <p className="font-monument text-[11px] sm:text-xs tracking-[0.32em] text-[var(--dna-text)] uppercase">
              IN THE NAME OF ALLAH
            </p>
            <span className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-[var(--dna-accent)]/80" />
          </div>

          <h2 className="font-monument mt-4 text-3xl sm:text-5xl md:text-6xl tracking-[0.16em] text-gold-monument">
            A-L-L-A-H.COM
          </h2>

          <div className="mt-3 flex items-center gap-3">
            <DiamondStarOrnament className="h-3.5 w-3.5 text-[var(--dna-accent)]" />
            <p className="font-monument text-xs sm:text-sm tracking-[0.42em] text-[var(--dna-muted)] uppercase pl-[0.42em]">
              EMPIRE OF THE LIGHT
            </p>
            <DiamondStarOrnament className="h-3.5 w-3.5 text-[var(--dna-accent)]" />
          </div>
        </div>

        {/* Accessible Skip Control (Always clickable & keyboard focusable) */}
        <Button
          type="button"
          variant="outline"
          onClick={dismissEntrance}
          aria-label="Skip cinematic entrance sequence"
          className="relative z-20 mt-12 inline-flex min-h-[44px] min-w-[44px] items-center gap-2.5 border border-[var(--dna-accent)]/45 bg-[var(--dna-canvas)]/85 px-6 py-2.5 font-serif text-xs tracking-[0.22em] text-[var(--dna-text)] uppercase transition-colors hover:border-[var(--dna-text)] hover:bg-[var(--dna-accent)]/15 cursor-pointer rounded-none"
        >
          <span>SKIP ENTRANCE</span>
          <span className="border-l border-[var(--dna-accent)]/35 pl-2.5 font-mono text-[10px] text-[var(--dna-accent)]">
            ESC
          </span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
