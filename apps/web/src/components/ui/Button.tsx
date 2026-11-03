import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "hunter" | "runner" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-canvas hover:bg-ink/90 active:bg-ink/80 shadow-[0_0_0_1px_color-mix(in_srgb,var(--ink)_12%,transparent)]",
  secondary:
    "border border-line bg-surface-2/70 text-ink hover:border-line-strong hover:bg-surface-3 active:bg-surface-3/80",
  ghost:
    "border border-transparent text-muted hover:bg-surface-2 hover:text-ink",
  hunter:
    "bg-hunter text-[#140704] hover:brightness-110 active:brightness-95 shadow-[0_0_32px_color-mix(in_srgb,var(--hunter)_18%,transparent)]",
  runner:
    "bg-runner text-[#04100d] hover:brightness-110 active:brightness-95 shadow-[0_0_32px_color-mix(in_srgb,var(--runner)_18%,transparent)]",
  danger:
    "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[11px] gap-1.5",
  md: "h-11 px-4 text-xs gap-2",
  lg: "h-14 px-6 text-sm gap-2.5",
  icon: "size-10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  full?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  full,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-[3px] font-mono font-semibold uppercase tracking-[0.14em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-35",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function buttonStyles(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-[3px] font-mono font-semibold uppercase tracking-[0.14em] transition-all duration-150",
    variants[variant],
    sizes[size],
    className,
  );
}
