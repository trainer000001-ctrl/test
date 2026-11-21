"use client";

import { useEffect, useRef } from "react";
import type { RenderingCapabilityTier } from "@/data/design-tokens";

const VERTEX_SHADER_SOURCE = `
  precision mediump float;
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_scroll;
  uniform float u_radiance;
  uniform float u_reducedMotion;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float softNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    float t = u_reducedMotion > 0.5 ? 1.4 : u_time;
    float radianceBoost = mix(1.0, 1.38, u_radiance);
    float scrollAttenuation = 1.0 - smoothstep(0.0, 0.85, u_scroll) * 0.65;

    // Horizon archway center aligned over the monumental portal (y = 0 is bottom in WebGL)
    vec2 portalCenter = vec2(
      0.5 + (u_pointer.x - 0.5) * 0.035,
      0.40 - u_scroll * 0.04
    );

    vec2 delta = v_uv - portalCenter;
    vec2 aspectDelta = vec2(delta.x * aspect, delta.y);
    float dist = length(aspectDelta);
    float angle = atan(aspectDelta.y, aspectDelta.x);

    // 1. Vertical Sacred Meridian Light Shaft
    float meridianX = (v_uv.x - portalCenter.x) * aspect;
    float meridianCore = exp(-meridianX * meridianX * 680.0);
    float meridianHalo = exp(-meridianX * meridianX * 28.0);
    float meridianPulse = 0.82 + 0.18 * sin(v_uv.y * 9.0 - t * 0.55);
    float aboveWaterMask = smoothstep(0.24, 0.42, v_uv.y);
    float meridianBeam =
      (meridianCore * 0.42 + meridianHalo * 0.16) * meridianPulse * aboveWaterMask;

    // 2. Volumetric Celestial God-Rays radiating above the dome
    float rayWaveA = cos(angle * 7.0 + t * 0.14);
    float rayWaveB = sin(angle * 13.0 - t * 0.21);
    float organicRays = smoothstep(-0.2, 0.95, rayWaveA * 0.55 + rayWaveB * 0.45);
    float radialAttenuation = exp(-dist * 1.95) * smoothstep(0.30, 0.72, v_uv.y);
    float atmosphereNoise = softNoise(v_uv * vec2(5.0, 3.0) + vec2(t * 0.02, -t * 0.015));
    float godRays = organicRays * radialAttenuation * (0.65 + 0.35 * atmosphereNoise) * 0.34;

    // 3. Gate Archway Golden Core Aura & 8-Fold Girih Standing Interference
    float portalBloom = exp(-dist * dist * 16.0) * 0.28;
    float girihWave = sin(dist * 34.0 - t * 0.85) * 0.5 + 0.5;
    float girihSymmetry = pow(abs(cos(angle * 4.0 + t * 0.08)), 6.0);
    float girihHalo = exp(-abs(dist - 0.32) * 18.0) * (0.4 + 0.6 * girihSymmetry) * girihWave * 0.22;

    // 4. Obsidian Basin Water Caustics & Shimmer (bottom 34% of viewport)
    float waterMask = 1.0 - smoothstep(0.20, 0.37, v_uv.y);
    float mirrorDepth = max(0.37 - v_uv.y, 0.001);
    float waterWave = sin(v_uv.y * 115.0 - t * 1.35 + sin(v_uv.x * 16.0 + t * 0.4)) * 0.5 + 0.5;
    float waterCol = exp(-meridianX * meridianX * (45.0 / (0.15 + mirrorDepth * 2.5)));
    float waterCaustics = waterMask * waterCol * (0.28 + 0.72 * waterWave) * 0.34;

    // 5. Subtle Interactive Pointer Presence Halo + Astral Crosshair Pulse
    vec2 pointerDelta = vec2((v_uv.x - u_pointer.x) * aspect, v_uv.y - (1.0 - u_pointer.y));
    float pointerDist = sqrt(dot(pointerDelta, pointerDelta));
    float pointerGlow = exp(-pointerDist * pointerDist * 22.0) * 0.11;
    float pointerRing = exp(-abs(pointerDist - 0.12) * 48.0) * 0.065;

    // Sacred Luminance Palette Blending (Luminous Gold + Warm Ivory + Midnight Accent)
    vec3 sacredGold = vec3(0.875, 0.753, 0.482);
    vec3 luminousIvory = vec3(1.0, 0.957, 0.824);
    vec3 celestialSilver = vec3(0.784, 0.816, 0.871);

    float totalEnergy =
      (meridianBeam + godRays + portalBloom + girihHalo + waterCaustics + pointerGlow + pointerRing) *
      radianceBoost *
      scrollAttenuation;

    vec3 color =
      luminousIvory * (meridianBeam * 0.95 + portalBloom * 0.85 + pointerRing * 1.2) +
      sacredGold * (godRays * 1.15 + waterCaustics * 0.92 + girihHalo * 1.1 + pointerGlow) +
      celestialSilver * (godRays * 0.18 + girihHalo * 0.25);

    float alpha = clamp(totalEnergy * 0.74, 0.0, 0.56);
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LivingLightShader({
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
  const stateRef = useRef({
    radiance: sanctuaryRadianceActive,
    quiet: quietMode,
    scroll: scrollProgress,
    pointerX: 0.5,
    pointerY: 0.45,
    targetPointerX: 0.5,
    targetPointerY: 0.45,
    visible: true,
  });

  const capabilityCallbackRef = useRef(onCapabilityDetected);

  useEffect(() => {
    capabilityCallbackRef.current = onCapabilityDetected;
  }, [onCapabilityDetected]);

  useEffect(() => {
    stateRef.current.radiance = sanctuaryRadianceActive;
    stateRef.current.quiet = quietMode;
    stateRef.current.scroll = scrollProgress;
  }, [sanctuaryRadianceActive, quietMode, scrollProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (quietMode || reducedMotionQuery.matches) {
      const rafNotify = window.requestAnimationFrame(() => {
        capabilityCallbackRef.current?.("reduced-motion");
      });
      return () => {
        window.cancelAnimationFrame(rafNotify);
      };
    }

    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
    };

    const gl: WebGLRenderingContext | null =
      (canvas.getContext("webgl2", contextOptions) as WebGLRenderingContext | null) ??
      (canvas.getContext("webgl", contextOptions) as WebGLRenderingContext | null);

    if (!gl) {
      const rafFallback = window.requestAnimationFrame(() => {
        capabilityCallbackRef.current?.("canvas-2d");
      });
      return () => {
        window.cancelAnimationFrame(rafFallback);
      };
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      const rafFallback = window.requestAnimationFrame(() => {
        capabilityCallbackRef.current?.("canvas-2d");
      });
      return () => {
        window.cancelAnimationFrame(rafFallback);
      };
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      const rafFallback = window.requestAnimationFrame(() => {
        capabilityCallbackRef.current?.("canvas-2d");
      });
      return () => {
        window.cancelAnimationFrame(rafFallback);
      };
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLocation = gl.getAttribLocation(program, "a_position");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uScroll = gl.getUniformLocation(program, "u_scroll");
    const uRadiance = gl.getUniformLocation(program, "u_radiance");
    const uReducedMotion = gl.getUniformLocation(program, "u_reducedMotion");

    gl.useProgram(program);
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const nextWidth = Math.max(1, Math.floor(window.innerWidth * dpr));
      const nextHeight = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      gl.viewport(0, 0, nextWidth, nextHeight);
    };

    resizeCanvas();

    const handlePointerMove = (event: PointerEvent) => {
      const vw = Math.max(window.innerWidth, 1);
      const vh = Math.max(window.innerHeight, 1);
      stateRef.current.targetPointerX = event.clientX / vw;
      stateRef.current.targetPointerY = event.clientY / vh;
    };

    const handleVisibilityChange = () => {
      stateRef.current.visible = !document.hidden;
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stateRef.current.visible = false;
      capabilityCallbackRef.current?.("canvas-2d");
    };

    let intersectionVisible = true;
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              intersectionVisible = entries[0]?.isIntersecting ?? true;
            },
            { threshold: 0.05 },
          )
        : null;
    observer?.observe(canvas);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);

    const startTimeMs = performance.now();
    let frameId = 0;
    let announced = false;

    const render = (nowMs: number) => {
      if (!announced) {
        announced = true;
        capabilityCallbackRef.current?.("webgl2-full");
      }

      if (stateRef.current.visible && intersectionVisible) {
        const s = stateRef.current;
        s.pointerX += (s.targetPointerX - s.pointerX) * 0.06;
        s.pointerY += (s.targetPointerY - s.pointerY) * 0.06;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform2f(uPointer, s.pointerX, s.pointerY);
        gl.uniform1f(uTime, (nowMs - startTimeMs) * 0.001);
        gl.uniform1f(uScroll, s.scroll);
        gl.uniform1f(uRadiance, s.radiance ? 1.0 : 0.0);
        gl.uniform1f(uReducedMotion, s.quiet || reducedMotionQuery.matches ? 1.0 : 0.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      if (!stateRef.current.quiet && !reducedMotionQuery.matches) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [quietMode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full mix-blend-screen"
    />
  );
}
