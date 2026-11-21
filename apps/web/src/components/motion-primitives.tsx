"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MotionReveal } from "@moonwitness/ui/imperium";

export { MotionReveal };

interface DocumentWithViewTransition {
  startViewTransition?: (updateCallback: () => void) => {
    finished: Promise<void>;
  };
}

/**
 * Progressively enhances discrete UI/world transitions with the browser's View Transitions API
 * when supported and when motion is enabled.
 */
export function triggerSacredViewTransition(updateState: () => void, quietMode = false): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    updateState();
    return;
  }
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & DocumentWithViewTransition;

  if (quietMode || prefersReducedMotion || typeof doc.startViewTransition !== "function") {
    updateState();
    return;
  }

  doc.startViewTransition(() => {
    updateState();
  });
}

/**
 * Spring-interpolated magnetic pointer attraction for key interactive portals and controls.
 * Writes transform directly on rAF to sustain 60-120fps without React re-renders.
 */
export function MagneticPortal({
  children,
  className = "",
  strength = 0.22,
  maxOffsetPx = 8,
  disabled = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly strength?: number;
  readonly maxOffsetPx?: number;
  readonly disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

    if (disabled || reducedMotionQuery.matches || coarsePointerQuery.matches) {
      element.style.transform = "";
      return;
    }

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let frameId = 0;
    let animating = false;

    const tick = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;

      element.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

      const settled = Math.abs(targetX - currentX) < 0.05 && Math.abs(targetY - currentY) < 0.05;
      if (!settled) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        animating = false;
        if (targetX === 0 && targetY === 0) {
          element.style.transform = "";
        }
      }
    };

    const ensureLoop = () => {
      if (!animating) {
        animating = true;
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const relX = event.clientX - (rect.left + rect.width / 2);
      const relY = event.clientY - (rect.top + rect.height / 2);
      targetX = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, relX * strength));
      targetY = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, relY * strength));
      ensureLoop();
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
      ensureLoop();
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(frameId);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      element.style.transform = "";
    };
  }, [disabled, maxOffsetPx, strength]);

  return (
    <div ref={containerRef} className={`inline-block ${className}`}>
      {children}
    </div>
  );
}

/**
 * Interactive 3D spatial card wrapper providing subtle perspective tilt and a directional
 * obsidian-gold light sheen aligned to pointer coordinates.
 */
export function SpatialTiltCard({
  children,
  className = "",
  maxTiltDeg = 4.2,
  disabled = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly maxTiltDeg?: number;
  readonly disabled?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

    if (disabled || reducedMotionQuery.matches || coarsePointerQuery.matches) {
      element.style.transform = "";
      element.style.setProperty("--sheen-opacity", "0");
      return;
    }

    let currentRx = 0;
    let currentRy = 0;
    let targetRx = 0;
    let targetRy = 0;
    let frameId = 0;
    let animating = false;

    const tick = () => {
      currentRx += (targetRx - currentRx) * 0.14;
      currentRy += (targetRy - currentRy) * 0.14;

      element.style.transform = `perspective(1000px) rotateX(${currentRx.toFixed(2)}deg) rotateY(${currentRy.toFixed(2)}deg)`;

      const settled =
        Math.abs(targetRx - currentRx) < 0.03 && Math.abs(targetRy - currentRy) < 0.03;
      if (!settled) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        animating = false;
        if (targetRx === 0 && targetRy === 0) {
          element.style.transform = "";
        }
      }
    };

    const ensureLoop = () => {
      if (!animating) {
        animating = true;
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const normX = (event.clientX - rect.left) / rect.width;
      const normY = (event.clientY - rect.top) / rect.height;

      targetRy = (normX - 0.5) * maxTiltDeg * 2;
      targetRx = -(normY - 0.5) * maxTiltDeg * 2;

      element.style.setProperty("--sheen-x", `${(normX * 100).toFixed(1)}%`);
      element.style.setProperty("--sheen-y", `${(normY * 100).toFixed(1)}%`);
      element.style.setProperty("--sheen-opacity", "1");
      ensureLoop();
    };

    const handlePointerLeave = () => {
      targetRx = 0;
      targetRy = 0;
      element.style.setProperty("--sheen-opacity", "0");
      ensureLoop();
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(frameId);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      element.style.transform = "";
      element.style.setProperty("--sheen-opacity", "0");
    };
  }, [disabled, maxTiltDeg]);

  return (
    <div ref={cardRef} className={`spatial-tilt-card ${className}`}>
      <span aria-hidden="true" className="spatial-sheen" />
      {children}
    </div>
  );
}

/**
 * Static / reduced-motion aware chapter wrapper backed by centralized MotionReveal.
 */
export function ScrollChapterReveal({
  children,
  className = "",
  quietMode = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly quietMode?: boolean;
}) {
  return (
    <MotionReveal disabled={quietMode} className={className}>
      {children}
    </MotionReveal>
  );
}
