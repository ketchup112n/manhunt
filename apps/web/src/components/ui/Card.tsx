import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  quiet?: boolean;
  corners?: boolean;
}

export function Card({ className, quiet, corners, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line",
        quiet ? "bg-surface/45" : "bg-surface/80 backdrop-blur-sm",
        corners && "frame-corners",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  eyebrow,
  title,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="label-mono mb-2">{eyebrow}</p> : null}
        <h2 className="font-display text-xl font-semibold uppercase tracking-[0.04em] text-ink">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}
