import { AlertTriangle, LocateFixed } from "lucide-react";
import { useGame } from "@/store/game";
import { cn } from "@/lib/cn";

/**
 * Small status strip for the device location stream. Hidden once a fix is
 * flowing; otherwise it explains why the player is missing from the map.
 */
export function GpsBanner({ className }: { className?: string }) {
  const status = useGame((state) => state.positionStatus);
  const message = useGame((state) => state.positionError);

  if (status === "live" || status === "idle") return null;

  const pending = status === "requesting";
  const Icon = pending ? LocateFixed : AlertTriangle;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none flex items-start gap-2 rounded-[3px] border px-3 py-2 backdrop-blur-md",
        pending
          ? "border-runner/30 bg-surface/90 text-runner"
          : "border-warning/45 bg-surface/95 text-warning",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-3.5 shrink-0", pending && "animate-soft-pulse")}
      />
      <div className="min-w-0">
        <p className="font-mono text-[8px] uppercase tracking-[0.16em]">
          {pending ? "Acquiring GPS" : "Location unavailable"}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {pending
            ? "Allow location access when your browser asks. You appear on the map as soon as a fix arrives."
            : (message ??
              "Enable location access so the field can place you on the map.")}
        </p>
      </div>
    </div>
  );
}
