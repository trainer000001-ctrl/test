import { useEffect, useRef } from "react";

export interface GpuSceneProps {
  artworkSrc: string;
  /** RGB accent in 0..1 used for atmospheric rim grading. */
  accent: readonly [number, number, number];
  /** Light source position in 0..1 screen space (y measured from top). */
  glow: readonly [number, number];
  /** Pan offset in UV space and zoom factor applied to the cover-fit. */
  pan: readonly [number, number];
  zoom: number;
  /** 0 = hero cinematic stage, >0 = work-area chamber backdrop. */
  calm: number;
  reducedMotion: boolean;
  visible: boolean;
  onUnsupported: () => void;
}

const VERTEX_SOURCE = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uTexSize;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uAccent;
uniform vec2 uGlow;
uniform vec2 uPan;
uniform float uZoom;
uniform float uCalm;
uniform float uFade;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 coverUv(vec2 uv) {
  float screenAspect = uRes.x / max(uRes.y, 1.0);
  float texAspect = uTexSize.x / max(uTexSize.y, 1.0);
  vec2 fit = screenAspect > texAspect
    ? vec2(1.0, texAspect / screenAspect)
    : vec2(screenAspect / texAspect, 1.0);
  return (uv - 0.5) * (fit / max(uZoom, 1.0)) + 0.5 + uPan;
}

vec3 sampleFlip(vec2 uv) {
  return texture(uTex, clamp(vec2(uv.x, 1.0 - uv.y), 0.001, 0.999)).rgb;
}

float emberField(vec2 uv, float aspect) {
  vec2 grid = uv * vec2(18.0 * aspect, 18.0);
  grid.y -= uTime * 0.16;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float rnd = hash21(cell);
  if (rnd < 0.8) return 0.0;
  vec2 offset = vec2(fract(rnd * 13.7) - 0.5, fract(rnd * 29.3) - 0.5) * 0.55;
  offset.x += sin(uTime * 0.9 + rnd * 6.283) * 0.12;
  float d = length(local - offset);
  float pulse = 0.65 + 0.35 * sin(uTime * 2.0 + rnd * 31.0);
  return smoothstep(0.085, 0.0, d) * pulse;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
  float radius = length(centered);

  vec2 parallax = uMouse * mix(0.011, 0.004, uCalm);
  vec2 sceneUv = coverUv(uv) + parallax;

  // 5-tap Contrast-Adaptive Sharpening (CAS) for crisp 1080p presentation
  vec2 texel = 1.0 / max(uTexSize, vec2(1.0));
  vec3 c = sampleFlip(sceneUv);
  vec3 n = sampleFlip(sceneUv + vec2(0.0, -texel.y));
  vec3 s = sampleFlip(sceneUv + vec2(0.0, texel.y));
  vec3 e = sampleFlip(sceneUv + vec2(texel.x, 0.0));
  vec3 w = sampleFlip(sceneUv + vec2(-texel.x, 0.0));

  vec3 minNeighbor = min(min(n, s), min(e, w));
  vec3 maxNeighbor = max(max(n, s), max(e, w));
  vec3 contrast = clamp(1.0 - (maxNeighbor - minNeighbor), 0.18, 1.0);
  float sharpenStrength = mix(0.32, 0.2, uCalm);
  vec3 col = clamp(c + (c - (n + s + e + w) * 0.25) * contrast * sharpenStrength * 1.8, 0.0, 1.0);

  vec2 glowPos = vec2(uGlow.x, 1.0 - uGlow.y);
  float glowDist = length((uv - glowPos) * vec2(aspect, 1.0));
  col += uAccent * smoothstep(0.85, 0.0, glowDist) * mix(0.16, 0.1, uCalm);

  float sparks = emberField(uv, aspect);
  col += mix(uAccent, vec3(1.0, 0.78, 0.45), 0.45) * sparks * mix(0.8, 0.35, uCalm);

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.12);
  col = clamp((col - 0.5) * 1.06 + 0.5, 0.0, 1.0);

  float vignette = smoothstep(1.22, 0.28, radius);
  col *= mix(0.5, 1.0, vignette);
  col *= mix(1.0, 0.76, uCalm);

  col = mix(vec3(0.02, 0.02, 0.03), col, uFade);
  outColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

interface SceneUniforms {
  texture: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  textureSize: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  mouse: WebGLUniformLocation | null;
  accent: WebGLUniformLocation | null;
  glow: WebGLUniformLocation | null;
  pan: WebGLUniformLocation | null;
  zoom: WebGLUniformLocation | null;
  calm: WebGLUniformLocation | null;
  fade: WebGLUniformLocation | null;
}

/**
 * Demand-driven hardware WebGL2 stage with 5-tap CAS sharpening.
 * Sleeps at 0 FPS idle in work chambers (calm > 0) and wakes cleanly only on
 * scene changes, resize, fade-in, or brief pointer parallax so UI stays 60fps.
 */
export function GpuScene({
  artworkSrc,
  accent,
  glow,
  pan,
  zoom,
  calm,
  reducedMotion,
  visible,
  onUnsupported,
}: GpuSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({ accent, glow, pan, zoom, calm, reducedMotion, visible });
  const imageSrcRef = useRef(artworkSrc);
  const reloadRef = useRef<((src: string) => void) | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);

  paramsRef.current = { accent, glow, pan, zoom, calm, reducedMotion, visible };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl =
      canvas.getContext("webgl2", {
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }) || canvas.getContext("webgl2");
    if (!gl) {
      onUnsupported();
      return;
    }
    const program = buildProgram(gl);
    if (!program) {
      onUnsupported();
      return;
    }

    gl.useProgram(program);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms: SceneUniforms = {
      texture: gl.getUniformLocation(program, "uTex"),
      resolution: gl.getUniformLocation(program, "uRes"),
      textureSize: gl.getUniformLocation(program, "uTexSize"),
      time: gl.getUniformLocation(program, "uTime"),
      mouse: gl.getUniformLocation(program, "uMouse"),
      accent: gl.getUniformLocation(program, "uAccent"),
      glow: gl.getUniformLocation(program, "uGlow"),
      pan: gl.getUniformLocation(program, "uPan"),
      zoom: gl.getUniformLocation(program, "uZoom"),
      calm: gl.getUniformLocation(program, "uCalm"),
      fade: gl.getUniformLocation(program, "uFade"),
    };

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([8, 8, 12, 255]),
    );
    gl.uniform1i(uniforms.texture, 0);

    let textureWidth = 1920;
    let textureHeight = 1080;
    let fade = 0.4;
    let disposed = false;
    let rafId = 0;
    let lastFrame = 0;
    let lastInteraction = performance.now();
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const startedAt = performance.now();

    const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth) * dpr));
      const height = Math.max(1, Math.floor((canvas.clientHeight || window.innerHeight) * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const draw = (now: number) => {
      if (disposed) return;
      const params = paramsRef.current;
      mouseX += (targetX - mouseX) * 0.14;
      mouseY += (targetY - mouseY) * 0.14;
      fade = Math.min(1, fade + 0.12);
      const seconds = (now - startedAt) / 1000;
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.textureSize, textureWidth, textureHeight);
      gl.uniform1f(uniforms.time, params.reducedMotion ? 0 : seconds);
      gl.uniform2f(
        uniforms.mouse,
        params.reducedMotion ? 0 : mouseX,
        params.reducedMotion ? 0 : mouseY,
      );
      gl.uniform3f(uniforms.accent, params.accent[0], params.accent[1], params.accent[2]);
      gl.uniform2f(uniforms.glow, params.glow[0], params.glow[1]);
      gl.uniform2f(uniforms.pan, params.pan[0], params.pan[1]);
      gl.uniform1f(uniforms.zoom, params.zoom);
      gl.uniform1f(uniforms.calm, params.calm);
      gl.uniform1f(uniforms.fade, fade);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const needsAnimation = (now: number) => {
      const params = paramsRef.current;
      if (!params.visible) return false;
      if (fade < 0.995) return true;
      if (params.reducedMotion) return false;
      if (params.calm <= 0.2) return true;
      return now - lastInteraction < 450;
    };

    const scheduleTick = () => {
      if (rafId || disposed) return;
      if (!needsAnimation(performance.now())) return;
      rafId = window.requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      rafId = 0;
      if (disposed || !needsAnimation(now)) return;
      const interval = paramsRef.current.calm > 0.2 ? 1000 / 24 : 1000 / 16;
      if (now - lastFrame >= interval - 1) {
        lastFrame = now;
        draw(now);
      }
      scheduleTick();
    };

    wakeRef.current = () => {
      lastInteraction = performance.now();
      draw(lastInteraction);
      scheduleTick();
    };

    const loadTexture = (src: string) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (disposed) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (anisotropy) {
          const maxAnisotropy = gl.getParameter(
            anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT,
          ) as number;
          gl.texParameterf(
            gl.TEXTURE_2D,
            anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
            Math.min(8, maxAnisotropy || 4),
          );
        }
        textureWidth = image.naturalWidth || 1920;
        textureHeight = image.naturalHeight || 1080;
        fade = 0.55;
        lastInteraction = performance.now();
        draw(lastInteraction);
        scheduleTick();
      };
      image.src = src;
    };
    reloadRef.current = loadTexture;
    loadTexture(imageSrcRef.current);

    const handlePointer = (event: PointerEvent) => {
      lastInteraction = performance.now();
      targetX = (event.clientX / (window.innerWidth || 1) - 0.5) * 2;
      targetY = (event.clientY / (window.innerHeight || 1) - 0.5) * -2;
      scheduleTick();
    };

    const handleResize = () => {
      resize();
      lastInteraction = performance.now();
      draw(lastInteraction);
      scheduleTick();
    };

    const handleLost = (event: Event) => {
      event.preventDefault();
      onUnsupported();
    };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("webglcontextlost", handleLost);
    scheduleTick();

    return () => {
      disposed = true;
      reloadRef.current = null;
      wakeRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("webglcontextlost", handleLost);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, [onUnsupported]);

  useEffect(() => {
    if (imageSrcRef.current !== artworkSrc) {
      imageSrcRef.current = artworkSrc;
      reloadRef.current?.(artworkSrc);
      return;
    }
    wakeRef.current?.();
  }, [artworkSrc, calm, pan, zoom, reducedMotion, visible]);

  return <canvas ref={canvasRef} className="world-gpu-canvas" data-renderer="webgl2" />;
}
