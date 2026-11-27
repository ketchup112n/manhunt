import { CircleDashed, Crosshair, Rabbit } from "lucide-react";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/cn";

export function RoleBadge({
  role,
  suffix,
  className,
  compact,
}: {
  role: Role;
  suffix?: string;
  className?: string;
  compact?: boolean;
}) {
  const isHunter = role === "hunter";
  const isRunner = role === "runner";
  const Icon = isHunter ? Crosshair : isRunner ? Rabbit : CircleDashed;
  const label = isHunter ? "Hunter" : isRunner ? "Runner" : "Standby";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[2px] border px-2.5 font-mono uppercase leading-none tracking-[0.18em]",
        compact ? "h-7 text-[9px]" : "h-8 text-[10px]",
        isHunter
          ? "border-hunter/35 bg-hunter/10 text-hunter"
          : isRunner
            ? "border-runner/35 bg-runner/10 text-runner"
            : "border-line-strong bg-surface-2 text-muted",
        className,
      )}
    >
      <Icon className={compact ? "size-3" : "size-3.5"} />
      {label}
      {suffix ? (
        <>
          <span className="opacity-30">/</span>
          <span className="text-current/70">{suffix}</span>
        </>
      ) : null}
    </span>
  );
}
