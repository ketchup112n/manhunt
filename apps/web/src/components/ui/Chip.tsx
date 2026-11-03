import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipTone = "neutral" | "hunter" | "runner" | "info" | "warning" | "danger";

const tones: Record<ChipTone, string> = {
  neutral: "border-line-strong/70 bg-surface-2/60 text-muted",
  hunter: "border-hunter/30 bg-hunter/10 text-hunter",
  runner: "border-runner/30 bg-runner/10 text-runner",
  info: "border-info/30 bg-info/10 text-info",
  warning: "border-warning/35 bg-warning/10 text-warning",
  danger: "border-danger/35 bg-danger/10 text-danger",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  dot?: boolean;
}

export function Chip({ tone = "neutral", dot, className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[2px] border px-2 font-mono text-[9px] font-medium uppercase leading-none tracking-[0.16em]",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
