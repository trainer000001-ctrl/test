"use client";

import { useEffect, useRef } from "react";
import type { RenderingCapabilityTier } from "@/data/design-tokens";
import { LivingLightShader } from "./living-light-shader";

interface CelestialParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  driftX: number;
  driftY: number;
  hueGold: boolean;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function CelestialCanvas({
  sanctuaryRadianceActive,
  quietMode,
  scrollProgress,
  onCapabilityDetected,
}: {
  readonly sanctuaryRadianceActive: boolean;
  readonly quietMode: boolean;
  readonly scrollProgress: number;
  readonly onCapabilityDetected?: (tier: RenderingCapabilityTier) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dynamicPropsRef = useRef({
    radiance: sanctuaryRadianceActive,
    quiet: quietMode,
    scroll: scrollProgress,
  });

  useEffect(() => {
    dynamicPropsRef.current.radiance = sanctuaryRadianceActive;
    dynamicPropsRef.current.quiet = quietMode;
    dynamicPropsRef.current.scroll = scrollProgress;
  }, [sanctuaryRadianceActive, quietMode, scrollProgress]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      return;
    }
    const ctx = canvasElement.getContext("2d");
    if (!ctx) {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = (canvasElement.width = window.innerWidth);
    let height = (canvasElement.height = window.innerHeight);

    const particleCount = 88;
    const particles: CelestialParticle[] = Array.from({ length: particleCount }, (_, index) => {
      const inCenterColumn = index % 4 === 0;
      return {
        x: inCenterColumn
          ? width * (0.42 + ((index * 17) % 16) / 100)
          : ((index * 137.5) % 100) * (width / 100),
        y: ((index * 73.1) % 100) * (height / 100),
        radius: 0.6 + (index % 4) * 0.45,
        alpha: 0.24 + (index % 5) * 0.13,
        pulseSpeed: 0.012 + (index % 7) * 0.004,
        pulseOffset: index * 0.9,
        driftX: ((index % 3) - 1) * 0.08,
        driftY: inCenterColumn ? -0.22 - (index % 3) * 0.08 : -0.06,
        hueGold: index % 3 !== 0,
      };
    });

    const ripples: Ripple[] = [];

    let pointerX = width * 0.5;
    let pointerY = height * 0.52;
    let smoothPointerX = pointerX;
    let smoothPointerY = pointerY;

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (dynamicPropsRef.current.quiet || reducedMotionQuery.matches) {
        return;
      }
      ripples.push({
        x: event.clientX,
        y: event.clientY,
        radius: 4,
        maxRadius: Math.min(width, height) * 0.32,
        alpha: 0.65,
      });
    };

    const handleResize = () => {
      if (!canvasRef.current) {
        return;
      }
      width = canvasRef.current.width = window.innerWidth;
      height = canvasRef.current.height = window.innerHeight;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("resize", handleResize);

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let frameId = 0;
    let tick = 0;

    const renderFrame = () => {
      if (isVisible) {
        tick += 1;
        const { radiance, quiet, scroll } = dynamicPropsRef.current;
        const staticOnly = quiet || reducedMotionQuery.matches;
        const intensityMultiplier = (radiance ? 1.4 : 1.0) * (1 - Math.min(scroll, 0.85) * 0.5);

        smoothPointerX += (pointerX - smoothPointerX) * 0.08;
        smoothPointerY += (pointerY - smoothPointerY) * 0.08;

        ctx.clearRect(0, 0, width, height);

        // Delicate Orbital Meridian Rings subtly anchored behind the Central Gate arch
        const gateCenterX = width * 0.5 + (smoothPointerX - width * 0.5) * 0.015;
        const gateCenterY = height * 0.58 - scroll * 24;
        const ringRadius = Math.min(width, height) * 0.16;

        ctx.save();
        ctx.strokeStyle = `rgba(223, 192, 123, ${0.09 * intensityMultiplier})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.arc(gateCenterX, gateCenterY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 244, 210, ${0.06 * intensityMultiplier})`;
        ctx.setLineDash([1, 14]);
        ctx.beginPath();
        ctx.arc(gateCenterX, gateCenterY, ringRadius * 1.48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Central vertical light pillar core
        const centerX = width * 0.5;
        const pillarGradient = ctx.createLinearGradient(
          centerX,
          height * 0.06,
          centerX,
          height * 0.72,
        );
        pillarGradient.addColorStop(0, `rgba(255, 244, 212, ${0.1 * intensityMultiplier})`);
        pillarGradient.addColorStop(0.5, `rgba(226, 191, 118, ${0.05 * intensityMultiplier})`);
        pillarGradient.addColorStop(1, `rgba(255, 232, 175, ${0.14 * intensityMultiplier})`);

        ctx.fillStyle = pillarGradient;
        ctx.fillRect(centerX - 1.5, height * 0.06, 3, height * 0.66);

        // Interactive cursor aura (subtle illumination, never neon)
        if (!staticOnly) {
          const auraGradient = ctx.createRadialGradient(
            smoothPointerX,
            smoothPointerY,
            2,
            smoothPointerX,
            smoothPointerY,
            175,
          );
          auraGradient.addColorStop(0, `rgba(255, 240, 198, ${0.065 * intensityMultiplier})`);
          auraGradient.addColorStop(1, "rgba(255, 240, 198, 0)");
          ctx.fillStyle = auraGradient;
          ctx.beginPath();
          ctx.arc(smoothPointerX, smoothPointerY, 175, 0, Math.PI * 2);
          ctx.fill();
        }

        // Expanding celestial rings on pointer down
        for (let i = ripples.length - 1; i >= 0; i -= 1) {
          const ripple = ripples[i]!;
          ripple.radius += 3.1;
          ripple.alpha *= 0.96;

          ctx.strokeStyle = `rgba(255, 242, 204, ${ripple.alpha * 0.42})`;
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          if (ripple.y > height * 0.65) {
            ctx.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.34, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          }
          ctx.stroke();

          if (ripple.radius >= ripple.maxRadius || ripple.alpha < 0.02) {
            ripples.splice(i, 1);
          }
        }

        // Sidereal starfield & ascending golden dust motes
        for (const particle of particles) {
          if (!staticOnly) {
            particle.x += particle.driftX;
            particle.y += particle.driftY * (radiance ? 1.45 : 1);

            if (particle.y < 0) {
              particle.y = height * 0.78;
            }
            if (particle.x < 0) {
              particle.x = width;
            } else if (particle.x > width) {
              particle.x = 0;
            }
          }

          const twinkle = staticOnly
            ? 0.75
            : 0.45 + 0.55 * Math.sin(tick * particle.pulseSpeed + particle.pulseOffset);
          const currentAlpha = Math.min(1, particle.alpha * twinkle * intensityMultiplier);

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = particle.hueGold
            ? `rgba(248, 226, 172, ${currentAlpha})`
            : `rgba(255, 252, 244, ${currentAlpha})`;
          ctx.fill();
        }
      }

      if (!dynamicPropsRef.current.quiet && !reducedMotionQuery.matches) {
        frameId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [quietMode]);

  return (
    <>
      <LivingLightShader
        sanctuaryRadianceActive={sanctuaryRadianceActive}
        quietMode={quietMode}
        scrollProgress={scrollProgress}
        onCapabilityDetected={onCapabilityDetected}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />
    </>
  );
}
