"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SVGProps,
} from "react";
import { cn, type MasterDnaId } from "./skin";

/* ---------- Imperium Lumen Design Tokens ---------- */
export type RenderingCapabilityTier =
  | "reduced-motion"
  | "canvas-2d"
  | "webgl2-full"
  | "minimal"
  | "standard"
  | "radiant"
  | "cinematic";

export interface SpringPhysicsPreset {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

export const LIVING_LIGHT_PALETTE = {
  obsidian: "#070910",
  surface: "#101420",
  elevated: "#171d2e",
  parchment: "#f7f2e3",
  muted: "#b8b09c",
  gold: "#dfc07b",
  goldBright: "#fff4d2",
  cerulean: "#4f8cff",
  emerald: "#34d399",
  amber: "#f59e0b",
  crimson: "#f87171",
} as const;

export const LIVING_LIGHT_TYPOGRAPHY = {
  monument: "Cinzel, Palatino Linotype, Georgia, serif",
  editorial: "Cormorant Garamond, Georgia, serif",
  ui: "Inter, system-ui, sans-serif",
  mono: "JetBrains Mono, ui-monospace, monospace",
} as const;

export const LIVING_LIGHT_MOTION: Readonly<Record<string, SpringPhysicsPreset>> = {
  sanctuary: { stiffness: 210, damping: 28, mass: 1 },
  portal: { stiffness: 260, damping: 24, mass: 0.9 },
  celestial: { stiffness: 120, damping: 22, mass: 1.2 },
};

export const SACRED_VISUAL_COVENANT = {
  zeroHumanFaces: true,
  monocentricUnity: true,
  wcagMinimumContrast: 4.5,
  respectsReducedMotion: true,
} as const;

export const IMPERIUM_LUMEN_TOKENS = {
  id: "01-imperium-lumen" as const,
  palette: LIVING_LIGHT_PALETTE,
  typography: LIVING_LIGHT_TYPOGRAPHY,
  motion: LIVING_LIGHT_MOTION,
  covenant: SACRED_VISUAL_COVENANT,
} as const;

/* ---------- Imperium Icons ---------- */
export function CrownEmblemIcon({ className = "h-6 w-6", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <path d="M4 23h24l-2.5-12-5.5 5L16 6l-4 10-5.5-5L4 23z" strokeLinejoin="round" />
      <circle cx="16" cy="5" r="1.5" fill="currentColor" />
      <line x1="6" y1="26" x2="26" y2="26" strokeLinecap="round" />
    </svg>
  );
}

export function CrescentStarIcon({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <path d="M15.5 16.8A6.8 6.8 0 0 1 10.2 4.5a7.5 7.5 0 1 0 9.3 11.4 6.7 6.7 0 0 1-4 .9z" strokeLinejoin="round" />
      <path d="M17.5 6.5l.8 1.8 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9-1.4-1.3 1.9-.3.8-1.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function OctagramMandalaIcon({ className = "h-6 w-6", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} {...props}>
      <rect x="7" y="7" width="18" height="18" />
      <rect x="7" y="7" width="18" height="18" transform="rotate(45 16 16)" />
      <circle cx="16" cy="16" r="3.2" />
    </svg>
  );
}

export function SearchLensIcon({ className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.2-4.2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Ornaments & Vectors ---------- */
export function SacredCornerBrackets({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className="absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-[var(--dna-accent)]/60" />
      <span className="absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-[var(--dna-accent)]/60" />
      <span className="absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-[var(--dna-accent)]/60" />
      <span className="absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-[var(--dna-accent)]/60" />
    </div>
  );
}

export function DiamondStarOrnament({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={cn("inline-block text-[var(--dna-accent)]", className)}>
      <path d="M8 0l2.1 5.9L16 8l-5.9 2.1L8 16l-2.1-5.9L0 8l5.9-2.1L8 0z" />
    </svg>
  );
}

export function DoorPortalVector({
  doorId,
  active = false,
  className = "h-8 w-8",
}: {
  doorId?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "1.9" : "1.4"}
      data-door={doorId}
      aria-hidden="true"
      className={cn(active ? "text-[var(--dna-accent)]" : "text-[var(--dna-muted)]", className)}
    >
      <path d="M8 32V15C8 9 18 4 18 4s10 5 10 11v17H8z" />
      <path d="M13 32V17c0-3.5 5-6 5-6s5 2.5 5 6v15" opacity="0.65" />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

export function GatewayWaveformVector({
  variant = 0,
  className = "h-6 w-20",
}: {
  variant?: number;
  className?: string;
}) {
  const amp = 4 + (variant % 3) * 2;
  return (
    <svg viewBox="0 0 80 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className={cn("text-[var(--dna-accent)]", className)}>
      <path
        d={`M2 12 Q 10 ${12 - amp}, 18 12 T 34 12 T 50 12 T 66 12 T 78 12`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MeridianArcLines({
  meridians,
  activeIndex,
}: {
  meridians: readonly { readonly x: number; readonly y: number }[];
  activeIndex: number;
}) {
  if (meridians.length < 2) return null;
  const active = meridians[activeIndex] ?? meridians[0]!;
  return (
    <svg
      viewBox="0 0 360 132"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {meridians.map((m, idx) => {
        if (idx === activeIndex) return null;
        const midX = (m.x + active.x) / 2;
        const midY = Math.min(m.y, active.y) - 18;
        return (
          <path
            key={idx}
            d={`M ${m.x} ${m.y} Q ${midX} ${midY} ${active.x} ${active.y}`}
            fill="none"
            stroke="rgba(223, 192, 123, 0.45)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        );
      })}
    </svg>
  );
}

export function SidraConstellationLinks({
  axioms = [],
  selectedId,
  className,
}: {
  axioms?: readonly { id: string; label?: string; x?: number; y?: number }[];
  selectedId?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 120"
      fill="none"
      aria-hidden="true"
      className={cn("h-28 w-full text-[var(--dna-accent)]", className)}
    >
      <circle cx="120" cy="60" r="44" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="3 3" />
      <circle cx="120" cy="60" r="22" stroke="currentColor" strokeOpacity="0.35" />
      {axioms.slice(0, 8).map((ax, i) => {
        const angle = (i / Math.max(1, Math.min(8, axioms.length))) * Math.PI * 2;
        const x = ax.x ?? 120 + Math.cos(angle) * 44;
        const y = ax.y ?? 60 + Math.sin(angle) * 44;
        const isSel = ax.id === selectedId;
        return (
          <g key={ax.id}>
            <line
              x1="120"
              y1="60"
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={isSel ? 0.9 : 0.35}
              strokeWidth={isSel ? 1.8 : 1}
            />
            <circle cx={x} cy={y} r={isSel ? 4.5 : 3} fill="currentColor" />
          </g>
        );
      })}
      <circle cx="120" cy="60" r="4.5" fill="currentColor" />
    </svg>
  );
}

export function TasbihBeadRingVector({
  count = 0,
  target = 33,
  beadCount,
  progressFraction,
  quietMode,
  className = "h-36 w-36",
}: {
  count?: number;
  target?: number;
  beadCount?: number;
  progressFraction?: number;
  quietMode?: boolean;
  className?: string;
}) {
  const effectiveTarget = beadCount ?? target;
  const beads = Math.min(33, Math.max(11, effectiveTarget));
  const filled =
    progressFraction !== undefined
      ? Math.round(Math.max(0, Math.min(1, progressFraction)) * beads)
      : count % effectiveTarget;
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      data-quiet={quietMode ? "true" : "false"}
      className={cn("text-[var(--dna-accent)]", className)}
    >
      <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />
      {Array.from({ length: beads }).map((_, i) => {
        const angle = (i / beads) * Math.PI * 2 - Math.PI / 2;
        const cx = 60 + Math.cos(angle) * 44;
        const cy = 60 + Math.sin(angle) * 44;
        const lit = i < filled;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={lit ? 3.2 : 2.1}
            fill={lit ? "currentColor" : "none"}
            stroke="currentColor"
            strokeOpacity={lit ? 1 : 0.45}
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}

/* ---------- Core Imperium Structural Components ---------- */
export function SkinRoot({
  dnaId = "01-imperium-lumen",
  className,
  style,
  children,
}: {
  dnaId?: MasterDnaId;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div data-dna={dnaId} className={className} style={style}>
      {children}
    </div>
  );
}

export function MotionReveal({
  disabled,
  className,
  children,
}: {
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-motion-disabled={disabled ? "true" : "false"} className={className}>
      {children}
    </div>
  );
}

export function DnaBadge({
  className,
  tone = "accent",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "accent" | "muted" | "secondary" | "success" | "warning" | "danger" }) {
  const toneStyles: Record<string, string> = {
    accent: "border-[var(--dna-accent)]/45 bg-[var(--dna-accent)]/12 text-[var(--dna-accent)]",
    secondary: "border-[var(--dna-accent-secondary)]/45 bg-[var(--dna-accent-secondary)]/12 text-[var(--dna-accent-secondary)]",
    muted: "border-[var(--dna-border)] bg-[var(--dna-surface)] text-[var(--dna-muted)]",
    success: "border-[var(--dna-success)]/45 bg-[var(--dna-success)]/12 text-[var(--dna-success)]",
    warning: "border-[var(--dna-warning)]/45 bg-[var(--dna-warning)]/12 text-[var(--dna-warning)]",
    danger: "border-[var(--dna-danger)]/45 bg-[var(--dna-danger)]/12 text-[var(--dna-danger)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase",
        toneStyles[tone] ?? toneStyles.accent,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export interface DnaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary" | "ghost" | "accent" | "outline";
  asChild?: boolean;
}

export const DnaButton = forwardRef<HTMLButtonElement, DnaButtonProps>(function DnaButton(
  { className, tone = "secondary", asChild = false, children, ...props },
  ref,
) {
  const toneMap: Record<NonNullable<DnaButtonProps["tone"]>, string> = {
    primary: "mw-primary-action",
    accent: "mw-primary-action",
    secondary: "mw-secondary-action",
    outline: "mw-secondary-action",
    ghost:
      "inline-flex min-h-9 items-center justify-center gap-2 px-3 py-1.5 font-mono text-xs text-[var(--dna-muted)] hover:text-[var(--dna-text)] transition-colors cursor-pointer",
  };

  const merged = cn(toneMap[tone], className);
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      ...props,
      className: cn(merged, child.props.className),
    } as Record<string, unknown>);
  }

  return (
    <button ref={ref} type={props.type ?? "button"} className={merged} {...props}>
      {children}
    </button>
  );
});

export const PrimaryAction = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function PrimaryAction({ className, type = "button", ...props }, ref) {
    return <button ref={ref} type={type} className={cn("mw-primary-action", className)} {...props} />;
  },
);

export const SecondaryAction = forwardRef<HTMLElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function SecondaryAction({ className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref as unknown as Ref<HTMLButtonElement>}
        type={type}
        className={cn("mw-secondary-action", className)}
        {...props}
      />
    );
  },
);

export function DnaChamber({
  cornerBrackets = true,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { cornerBrackets?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-[var(--dna-accent)]/30 bg-[var(--dna-surface)]/90 shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
      {...props}
    >
      {cornerBrackets ? <SacredCornerBrackets /> : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function DnaPortalArch({
  className,
  children,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type={props.type ?? "button"}
      data-active={active ? "true" : "false"}
      className={cn(
        "relative flex flex-col items-center justify-center border px-4 py-4 text-center transition-all cursor-pointer",
        active
          ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/15 text-[var(--dna-text)] shadow-[0_0_24px_rgba(223,192,123,0.18)]"
          : "border-[var(--dna-accent)]/25 bg-[var(--dna-surface)]/80 text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/65 hover:text-[var(--dna-text)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StorySection({
  id,
  labelledBy,
  tone = "canvas",
  className,
  children,
}: {
  id?: string;
  labelledBy?: string;
  tone?: "canvas" | "surface" | "elevated";
  className?: string;
  children: ReactNode;
}) {
  const bg =
    tone === "surface"
      ? "bg-[var(--dna-surface)]/85"
      : tone === "elevated"
        ? "bg-[var(--dna-surface-elevated)]/85"
        : "bg-[var(--dna-canvas)]";
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("mw-story-section", bg, className)}>
      <div className="wrap mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  id,
  kicker,
  title,
  description,
  align = "left",
}: {
  id?: string;
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      {kicker ? (
        <p className="font-mono text-xs tracking-[0.26em] text-[var(--dna-accent)] uppercase">
          {kicker}
        </p>
      ) : null}
      <h2
        id={id}
        className="font-monument mt-3 text-3xl sm:text-4xl lg:text-5xl tracking-[0.14em] text-gold-gradient uppercase"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 font-serif text-base sm:text-lg leading-relaxed text-[var(--dna-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function IllustrationFrame({
  aspectRatio = "16/9",
  scrim = false,
  className,
  children,
}: {
  aspectRatio?: "16/9" | "4/3" | "1/1" | "worldTile" | string;
  scrim?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ratioClass =
    aspectRatio === "worldTile"
      ? "aspect-[16/10]"
      : aspectRatio === "4/3"
        ? "aspect-[4/3]"
        : aspectRatio === "1/1"
          ? "aspect-square"
          : "aspect-video";
  return (
    <div className={cn("relative w-full overflow-hidden bg-[var(--dna-canvas)]", ratioClass, className)}>
      {children}
      {scrim ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--dna-canvas)]/70 via-transparent to-transparent"
        />
      ) : null}
    </div>
  );
}

export function SiteNavigation({
  navLabel,
  mobileMenuOpen,
  brand,
  items,
  actions,
  mobileDrawer,
}: {
  navLabel: string;
  mobileMenuOpen?: boolean;
  brand: ReactNode;
  items: readonly {
    id: string;
    label: string;
    href: string;
    active?: boolean;
    onSelect?: (event: MouseEvent<HTMLAnchorElement>) => void;
  }[];
  actions?: ReactNode;
  mobileDrawer?: ReactNode;
}) {
  return (
    <header className="mw-site-nav">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <div className="shrink-0">{brand}</div>
        <nav aria-label={navLabel} className="hidden lg:flex items-center gap-0.5">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={item.onSelect}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap px-2.5 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors",
                item.active
                  ? "text-[var(--dna-accent)] underline underline-offset-8 decoration-2"
                  : "text-[var(--dna-text)]/85 hover:text-[var(--dna-accent)]",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      </div>
      {mobileMenuOpen ? mobileDrawer : null}
    </header>
  );
}

export function IllustratedHero({
  id,
  labelledBy,
  backdrop,
  kicker,
  title,
  subtitle,
  callouts,
  description,
  actions,
  asideContent,
  shelf,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  id?: string;
  labelledBy?: string;
  backdrop?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  callouts?: readonly string[];
  description?: ReactNode;
  actions?: ReactNode;
  asideContent?: ReactNode;
  shelf?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="mw-illustrated-hero" {...rest}>
      {backdrop ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {backdrop}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070910]/90 via-[#070910]/60 to-[#070910]/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070910] via-transparent to-[#070910]/50" />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            {kicker ? (
              <p className="inline-block border border-[var(--dna-accent)]/45 bg-[var(--dna-canvas)]/75 px-3 py-1 font-mono text-[11px] tracking-[0.22em] text-[var(--dna-accent)] uppercase">
                {kicker}
              </p>
            ) : null}
            <div>{title}</div>
            {subtitle ? (
              <p className="font-monument text-lg sm:text-2xl tracking-[0.26em] text-[var(--dna-accent)] uppercase">
                {subtitle}
              </p>
            ) : null}
            {callouts && callouts.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {callouts.map((c) => (
                  <span
                    key={c}
                    className="border border-[var(--dna-text)]/30 bg-[var(--dna-canvas)]/75 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-[var(--dna-text)] uppercase"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
            {description ? (
              <p className="max-w-2xl font-serif text-base sm:text-lg leading-relaxed text-[var(--dna-text)]/90">
                {description}
              </p>
            ) : null}
            {actions ? <div className="pt-2">{actions}</div> : null}
          </div>

          {asideContent ? <div className="lg:col-span-4">{asideContent}</div> : null}
        </div>
      </div>

      {shelf ? (
        <div className="relative z-10 mx-auto mt-10 w-full max-w-7xl px-4 sm:px-8 lg:px-12">
          {shelf}
        </div>
      ) : null}
    </section>
  );
}

export function WorldExplorer({
  heading,
  trailing,
  children,
}: {
  heading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border border-[var(--dna-accent)]/30 bg-[var(--dna-canvas)]/82 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-xs font-bold tracking-[0.22em] text-[var(--dna-accent)] uppercase">
          {heading}
        </div>
        {trailing}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-9">{children}</div>
    </div>
  );
}

export function WorldTile({
  indexLabel,
  title,
  tagline,
  ctaLabel,
  active,
  onClick,
  media,
}: {
  indexLabel: string;
  title: string;
  tagline: string;
  ctaLabel: string;
  active?: boolean;
  onClick?: () => void;
  media?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-active={active ? "true" : "false"}
      aria-pressed={active}
      onClick={onClick}
      className="mw-world-tile group"
    >
      {media ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {media}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070910] via-[#070910]/65 to-[#070910]/20" />
        </div>
      ) : null}
      <div className="relative z-10 flex h-full flex-col justify-between p-2">
        <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--dna-accent)]">
          {indexLabel}
        </span>
        <div className="mt-auto space-y-1">
          <div className="font-monument text-[10.5px] font-bold leading-tight tracking-[0.04em] text-[var(--dna-text)]">
            {title}
          </div>
          <div className="line-clamp-2 text-[10px] leading-snug text-[var(--dna-muted)]">
            {tagline}
          </div>
          <div className="pt-1 font-mono text-[9px] tracking-[0.14em] text-[var(--dna-accent)] uppercase group-hover:underline">
            {ctaLabel} →
          </div>
        </div>
      </div>
    </button>
  );
}

export function WorldAtlas({
  ariaLabel,
  activeId,
  onSelect,
  className,
  items,
}: {
  ariaLabel?: string;
  activeId?: string;
  onSelect: (id: string) => void;
  className?: string;
  items: readonly {
    id: string;
    title: string;
    subtitle: string;
    statusLabel?: string;
    emblem?: ReactNode;
  }[];
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex items-center gap-3 border p-3.5 text-left transition-all cursor-pointer",
              active
                ? "border-[var(--dna-accent)] bg-[var(--dna-accent)]/14 text-[var(--dna-text)] shadow-[0_0_20px_rgba(223,192,123,0.16)]"
                : "border-[var(--dna-accent)]/20 bg-[var(--dna-canvas)]/75 text-[var(--dna-muted)] hover:border-[var(--dna-accent)]/55 hover:text-[var(--dna-text)]",
            )}
          >
            {item.emblem ? (
              <div className="shrink-0 text-[var(--dna-accent)]">{item.emblem}</div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-monument text-sm font-bold tracking-[0.1em] text-[var(--dna-text)]">
                  {item.title}
                </span>
                {item.statusLabel ? (
                  <span className="shrink-0 font-mono text-[9px] tracking-[0.14em] text-[var(--dna-accent)] uppercase">
                    {item.statusLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--dna-muted)]">{item.subtitle}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
