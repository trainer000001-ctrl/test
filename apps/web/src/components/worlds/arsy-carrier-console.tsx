"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@moonwitness/ui";

const ARSY_FREQUENCIES = [
  { hz: 432, label: "432 Hz · Celestial Foundation", ratio: "1 : 1 Unison" },
  { hz: 528, label: "528 Hz · Scriptorium Resonance", ratio: "6 : 5 Minor Third" },
  { hz: 648, label: "648 Hz · Sovereign Fifth", ratio: "3 : 2 Perfect Fifth" },
  { hz: 864, label: "864 Hz · Zenith Octave", ratio: "2 : 1 Octave" },
] as const;

export function ArsyCarrierConsole({ quietMode }: { quietMode: boolean }) {
  const [activeFrequencyHz, setActiveFrequencyHz] = useState<number>(432);
  const [carrierPlaying, setCarrierPlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const harmonicOscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fifthGainRef = useRef<GainNode | null>(null);
  const arsyWaveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
      if (harmonicOscRef.current) {
        harmonicOscRef.current.stop();
        harmonicOscRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (
      carrierPlaying &&
      oscillatorRef.current &&
      harmonicOscRef.current &&
      audioContextRef.current
    ) {
      const now = audioContextRef.current.currentTime;
      oscillatorRef.current.frequency.setTargetAtTime(activeFrequencyHz, now, 0.08);
      harmonicOscRef.current.frequency.setTargetAtTime(activeFrequencyHz * 1.5, now, 0.08);
    }
  }, [activeFrequencyHz, carrierPlaying]);

  useEffect(() => {
    const canvas = arsyWaveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animId = 0;
    let t = 0;

    const drawWave = () => {
      const staticOnly = quietMode || reducedMotionQuery.matches;
      if (!staticOnly) {
        t += carrierPlaying ? 0.055 : 0.018;
      }

      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;
      const freqFactor = activeFrequencyHz / 216;
      const amp = carrierPlaying ? h * 0.28 : h * 0.16;

      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(223, 192, 123, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      ctx.strokeStyle = carrierPlaying ? "rgba(255, 244, 210, 0.92)" : "rgba(223, 192, 123, 0.62)";
      ctx.lineWidth = carrierPlaying ? 1.8 : 1.25;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const nx = (x / w) * Math.PI * 2 * freqFactor;
        const y =
          midY -
          (Math.sin(nx + t) * 0.68 + Math.sin(nx * 1.5 - t * 1.2) * 0.32) *
            amp *
            Math.sin((x / w) * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(223, 192, 123, 0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const nx = (x / w) * Math.PI * 2 * (freqFactor * 1.5);
        const y = midY + Math.cos(nx - t * 0.9) * (amp * 0.65) * Math.sin((x / w) * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!staticOnly) {
        animId = window.requestAnimationFrame(drawWave);
      }
    };

    drawWave();
    return () => {
      window.cancelAnimationFrame(animId);
    };
  }, [activeFrequencyHz, carrierPlaying, quietMode]);

  const toggleArsyCarrier = () => {
    if (carrierPlaying) {
      const ctx = audioContextRef.current;
      if (ctx && gainNodeRef.current && fifthGainRef.current) {
        const stopAt = ctx.currentTime + 0.14;
        gainNodeRef.current.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
        fifthGainRef.current.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
        oscillatorRef.current?.stop(stopAt);
        harmonicOscRef.current?.stop(stopAt);
      } else {
        oscillatorRef.current?.stop();
        harmonicOscRef.current?.stop();
      }
      oscillatorRef.current = null;
      harmonicOscRef.current = null;
      setCarrierPlaying(false);
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.35);
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    const primaryOsc = ctx.createOscillator();
    primaryOsc.type = "sine";
    primaryOsc.frequency.setValueAtTime(activeFrequencyHz, ctx.currentTime);
    primaryOsc.connect(masterGain);
    primaryOsc.start();
    oscillatorRef.current = primaryOsc;

    const fifthOsc = ctx.createOscillator();
    fifthOsc.type = "triangle";
    fifthOsc.frequency.setValueAtTime(activeFrequencyHz * 1.5, ctx.currentTime);
    const fifthGain = ctx.createGain();
    fifthGain.gain.setValueAtTime(0.001, ctx.currentTime);
    fifthGain.gain.exponentialRampToValueAtTime(0.016, ctx.currentTime + 0.35);
    fifthOsc.connect(fifthGain);
    fifthGain.connect(ctx.destination);
    fifthOsc.start();
    harmonicOscRef.current = fifthOsc;
    fifthGainRef.current = fifthGain;

    setCarrierPlaying(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dna-accent)]/20 pb-3">
        <span className="font-monument text-sm uppercase tracking-[0.18em] text-[var(--dna-accent)]">
          ARSY HARMONIC CARRIER SYNTHESIZER
        </span>
        <Button
          type="button"
          variant="plain"
          onClick={toggleArsyCarrier}
          className={`min-h-[44px] cursor-pointer border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em] transition-all ${
            carrierPlaying
              ? "border-[var(--dna-accent)] bg-[var(--dna-accent)] font-semibold text-[var(--dna-canvas)]"
              : "border-[var(--dna-accent)] bg-[var(--dna-accent)]/15 text-[var(--dna-accent)] hover:bg-[var(--dna-accent)]/30"
          }`}
        >
          {carrierPlaying ? "■ MUTE HARMONIC STREAM" : "▶ ENGAGE CARRIER TONE"}
        </Button>
      </div>

      <div className="mt-4 border border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] p-2">
        <canvas
          ref={arsyWaveCanvasRef}
          width={560}
          height={92}
          className="h-20 w-full"
          aria-label="Real-time harmonic standing wave visualizer"
        />
      </div>

      <p className="mt-3 font-sans text-xs text-[var(--dna-muted)]">
        Select an acoustic carrier frequency to tune the Sovereign Relay Array:
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ARSY_FREQUENCIES.map((freqOption) => {
          const isSelectedFreq = freqOption.hz === activeFrequencyHz;
          return (
            <Button
              key={freqOption.hz}
              type="button"
              variant="plain"
              onClick={() => setActiveFrequencyHz(freqOption.hz)}
              className={`h-auto min-h-[44px] cursor-pointer flex-col items-start justify-start gap-0 border p-3.5 text-left transition-colors ${
                isSelectedFreq
                  ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/20"
                  : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)] hover:border-[var(--dna-accent)]/45"
              }`}
            >
              <div className="font-mono text-sm font-semibold text-[var(--dna-text)]">
                {freqOption.label}
              </div>
              <div className="mt-1 font-mono text-xs text-[var(--dna-accent)]">
                Harmonic Interval: {freqOption.ratio}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
