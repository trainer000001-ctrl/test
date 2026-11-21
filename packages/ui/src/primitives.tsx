"use client";

import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn, type SkinName } from "./skin";

/* ---------- Alert ---------- */
export function Alert({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full border p-4 text-sm",
        variant === "destructive"
          ? "border-[var(--destructive)] bg-[var(--destructive)]/10 text-[var(--destructive)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-xs opacity-90", className)} {...props} />;
}

/* ---------- Badge ---------- */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "imperium"
    | "dna"
    | "blue"
    | "pink"
    | "yellow"
    | "green";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
    secondary: "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    destructive: "border-transparent bg-[var(--destructive)] text-[var(--destructive-foreground)]",
    outline: "border-[var(--border)] bg-transparent text-[var(--foreground)]",
    imperium: "border-[var(--dna-accent)]/50 bg-[var(--dna-accent)]/15 text-[var(--dna-accent)]",
    dna: "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
    blue: "border-[var(--blue)]/50 bg-[var(--blue)]/15 text-[var(--blue)]",
    pink: "border-[var(--pink)]/50 bg-[var(--pink)]/15 text-[var(--pink)]",
    yellow: "border-[var(--yellow)]/50 bg-[var(--yellow)]/15 text-[var(--yellow)]",
    green: "border-[var(--green)]/50 bg-[var(--green)]/15 text-[var(--green)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Button ---------- */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "plain"
    | "imperiumPrimary"
    | "dna";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild = false, children, ...props },
  ref,
) {
  const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default:
      "border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
    destructive:
      "border border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90",
    outline:
      "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)]",
    secondary:
      "border border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90",
    ghost: "border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
    link: "border-0 bg-transparent text-[var(--primary)] underline-offset-4 hover:underline",
    plain: "",
    imperiumPrimary:
      "border-2 border-[var(--dna-canvas)] bg-[var(--dna-accent)] text-[var(--dna-canvas)] font-bold shadow-[3px_3px_0_var(--brand-pink)] hover:bg-[var(--dna-text)]",
    dna: "border border-[var(--dna-accent)] bg-[var(--dna-accent)]/15 text-[var(--dna-text)] hover:bg-[var(--dna-accent)]/25",
  };

  const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
    default: variant === "plain" ? "" : "min-h-9 px-4 py-2 text-xs",
    sm: variant === "plain" ? "" : "min-h-8 px-3 py-1.5 text-xs",
    lg: variant === "plain" ? "" : "min-h-11 px-6 py-2.5 text-sm",
    icon: variant === "plain" ? "" : "h-9 w-9 p-0",
  };

  const mergedClass = cn(
    variant === "plain"
      ? ""
      : "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      ...props,
      className: cn(mergedClass, child.props.className),
    } as Record<string, unknown>);
  }

  return (
    <button ref={ref} className={mergedClass} {...props}>
      {children}
    </button>
  );
});

/* ---------- Card ---------- */
export function Card({
  className,
  skin,
  ...props
}: HTMLAttributes<HTMLDivElement> & { skin?: string }) {
  return (
    <div
      data-card-skin={skin}
      className={cn(
        "border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-[var(--muted-foreground)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

/* ---------- Inputs ---------- */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full border border-[var(--input)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-9 border border-[var(--input)] bg-[var(--background)] px-2.5 py-1 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-medium leading-none text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  id,
  "aria-label": ariaLabel,
  disabled,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="checkbox"
      aria-label={ariaLabel}
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "h-4 w-4 accent-[var(--primary)] border border-[var(--border)] bg-[var(--background)] cursor-pointer",
        className,
      )}
    />
  );
}

export function Slider({
  id,
  min = 0,
  max = 100,
  step = 1,
  value = [0],
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  onValueChange?: (value: number[]) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      id={id}
      type="range"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value[0] ?? min}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn("zine-range w-full", className)}
    />
  );
}

/* ---------- Skeleton & ScrollArea ---------- */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse bg-[var(--muted)]", className)} {...props} />;
}

export function ScrollArea({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-y-auto overflow-x-hidden", className)} {...props}>
      {children}
    </div>
  );
}

/* ---------- Empty State ---------- */
export function Empty({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-[var(--border)] p-8 text-center",
        className,
      )}
      {...props}
    />
  );
}
export function EmptyHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}
export function EmptyTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold text-base text-[var(--foreground)]", className)} {...props} />;
}
export function EmptyDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-[var(--muted-foreground)]", className)} {...props} />;
}
export function EmptyContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4", className)} {...props} />;
}

/* ---------- Tabs ---------- */
const TabsCtx = createContext<{ value: string; setValue: (v: string) => void }>({
  value: "",
  setValue: () => {},
});

export function Tabs({
  defaultValue = "",
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsCtx.Provider value={{ value: current, setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1 border border-[var(--border)] bg-[var(--muted)] p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = useContext(TabsCtx);
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
        active
          ? "bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = useContext(TabsCtx);
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={className} {...props}>
      {children}
    </div>
  );
}

/* ---------- Dialog ---------- */
const DialogCtx = createContext<{ open: boolean; setOpen: (o: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = (o: boolean) => {
    setInternal(o);
    onOpenChange?.(o);
  };
  return <DialogCtx.Provider value={{ open: isOpen, setOpen }}>{children}</DialogCtx.Provider>;
}

export function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: ReactNode;
}) {
  const { setOpen } = useContext(DialogCtx);
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: () => void }>;
    return cloneElement(child, {
      onClick: () => {
        child.props.onClick?.();
        setOpen(true);
      },
    });
  }
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

export function DialogContent({
  className,
  hideClose,
  onOpenAutoFocus: _onOpenAutoFocus,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  hideClose?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
}) {
  const { open, setOpen } = useContext(DialogCtx);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-lg border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-2xl",
          className,
        )}
        {...props}
      >
        {!hideClose && (
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 px-2 py-1 font-mono text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 text-left", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-[var(--muted-foreground)]", className)} {...props} />;
}

/* ---------- Sheet ---------- */
const SheetCtx = createContext<{ open: boolean; setOpen: (o: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = (o: boolean) => {
    setInternal(o);
    onOpenChange?.(o);
  };
  return <SheetCtx.Provider value={{ open: isOpen, setOpen }}>{children}</SheetCtx.Provider>;
}

export function SheetContent({
  side = "right",
  hideClose,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { side?: "left" | "right" | "top" | "bottom"; hideClose?: boolean }) {
  const { open, setOpen } = useContext(SheetCtx);
  if (!open) return null;
  const sidePos =
    side === "left"
      ? "left-0 top-0 bottom-0"
      : side === "top"
        ? "left-0 right-0 top-0"
        : side === "bottom"
          ? "left-0 right-0 bottom-0"
          : "right-0 top-0 bottom-0";
  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "fixed z-50 w-full max-w-md border-l border-[var(--border)] bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-2xl",
          sidePos,
          className,
        )}
        {...props}
      >
        {!hideClose && (
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 px-2 py-1 font-mono text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 pb-4", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold", className)} {...props} />;
}

/* ---------- DropdownMenu & Popover ---------- */
const MenuCtx = createContext<{ open: boolean; setOpen: (o: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(false);
  const open = controlledOpen ?? internal;
  const setOpen = (next: boolean) => {
    setInternal(next);
    onOpenChange?.(next);
  };
  return (
    <MenuCtx.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </MenuCtx.Provider>
  );
}

export function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: ReactNode;
}) {
  const { open, setOpen } = useContext(MenuCtx);
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: () => void }>;
    return cloneElement(child, {
      onClick: () => {
        child.props.onClick?.();
        setOpen(!open);
      },
    });
  }
  return (
    <button type="button" onClick={() => setOpen(!open)}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  className,
  align = "end",
  side: _side,
  sideOffset: _sideOffset,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  side?: string;
  sideOffset?: number;
}) {
  const { open } = useContext(MenuCtx);
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-1.5 min-w-44 border border-[var(--border)] bg-[var(--popover)] p-1 text-[var(--popover-foreground)] shadow-xl",
        align === "start" ? "left-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  onClick,
  onSelect,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { onSelect?: () => void }) {
  const { setOpen } = useContext(MenuCtx);
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        onSelect?.();
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-[var(--border)]", className)} />;
}

export const Popover = DropdownMenu;
export const PopoverTrigger = DropdownMenuTrigger;
export const PopoverContent = DropdownMenuContent;

/* ---------- Tooltip ---------- */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const TooltipCtx = createContext<{ open: boolean; setOpen: (o: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipCtx.Provider value={{ open, setOpen }}>
      <span
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
    </TooltipCtx.Provider>
  );
}

export function TooltipTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: ReactNode;
}) {
  if (asChild && isValidElement(children)) return children;
  return <span>{children}</span>;
}

export function TooltipContent({
  className,
  children,
}: HTMLAttributes<HTMLDivElement>) {
  const { open } = useContext(TooltipCtx);
  if (!open) return null;
  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap border border-[var(--border)] bg-[var(--popover)] px-2.5 py-1 text-xs text-[var(--popover-foreground)] shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Command Palette ---------- */
const CommandCtx = createContext<{ query: string; setQuery: (q: string) => void }>({
  query: "",
  setQuery: () => {},
});

export function CommandDialog({
  open,
  onOpenChange,
  title = "Command Palette",
  skin,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  skin?: SkinName;
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;
  return (
    <CommandCtx.Provider value={{ query, setQuery }}>
      <div
        data-skin={skin}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 pt-20 p-4 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl overflow-hidden border-2 border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-2xl"
        >
          {children}
        </div>
      </div>
    </CommandCtx.Provider>
  );
}

export function CommandInput({
  placeholder,
  value,
  onValueChange,
  autoFocus = true,
  dir,
  className,
}: {
  placeholder?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  autoFocus?: boolean;
  dir?: string;
  className?: string;
}) {
  const ctx = useContext(CommandCtx);
  const current = value ?? ctx.query;
  return (
    <div className="border-b border-[var(--border)] px-3 py-2.5">
      <input
        type="text"
        autoFocus={autoFocus}
        dir={dir}
        value={current}
        onChange={(e) => {
          ctx.setQuery(e.target.value);
          onValueChange?.(e.target.value);
        }}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none",
          className,
        )}
      />
    </div>
  );
}

export function CommandList({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-h-80 overflow-y-auto p-2 space-y-2", className)}>{children}</div>;
}

export function CommandEmpty({ children }: { children: ReactNode }) {
  return <div className="py-6 text-center font-mono text-xs text-[var(--muted-foreground)]">{children}</div>;
}

export function CommandGroup({
  heading,
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {heading ? (
        <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          {heading}
        </div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

export function CommandItem({
  value,
  onSelect,
  className,
  children,
}: {
  value?: string;
  onSelect?: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const { query } = useContext(CommandCtx);
  const hay = (value ?? "").toLowerCase();
  if (query.trim() && hay && !hay.includes(query.trim().toLowerCase())) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={() => onSelect?.(value ?? "")}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CommandSeparator() {
  return <div className="my-1 h-px bg-[var(--border)]" />;
}

export function CommandShortcut({ className, children }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ml-auto font-mono text-[10px] text-[var(--muted-foreground)]", className)}>
      {children}
    </span>
  );
}
