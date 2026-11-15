import { useState } from "react";
import { AlertTriangle, LocateFixed, RotateCw } from "lucide-react";
import { useGame } from "@/store/game";
import { cn } from "@/lib/cn";

/**
 * Small status strip for the device location stream. Hidden once a fix is
 * flowing; otherwise it explains why the player is missing from the map.
 */
export function GpsBanner({ className }: { className?: string }) {
  const status = useGame((state) => state.positionStatus);
  const message = useGame((state) => state.positionError);
  const requestLocationAccess = useGame(
    (state) => state.requestLocationAccess,
  );
  const [busy, setBusy] = useState(false);

  if (status === "live" || status === "idle") return null;

  const pending = status === "requesting";
  const retryable = status !== "unsupported";
  const Icon = pending ? LocateFixed : AlertTriangle;

  const retry = async () => {
    setBusy(true);
    await requestLocationAccess();
    setBusy(false);
  };

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-2 rounded-[3px] border px-3 py-2 backdrop-blur-md",
        pending
          ? "border-runner/30 bg-surface/90 text-runner"
          : "border-warning/45 bg-surface/95 text-warning",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-3.5 shrink-0", pending && "animate-soft-pulse")}
      />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[8px] uppercase tracking-[0.16em]">
          {pending ? "Acquiring GPS" : "Location unavailable"}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {pending
            ? "Allow location access when your browser asks. You appear on the map as soon as a fix arrives."
            : (message ??
              "Enable location access so the field can place you on the map.")}
        </p>
        {!pending ? (
          <p className="mt-1 font-mono text-[7px] uppercase leading-relaxed tracking-[0.1em] text-faint">
            Keep this tab in the foreground — browsers pause GPS in the
            background and resume when you return.
          </p>
        ) : null}
      </div>
      {!pending && retryable ? (
        <button
          type="button"
          onClick={() => void retry()}
          disabled={busy}
          className="flex shrink-0 items-center gap-1 rounded-[2px] border border-warning/40 bg-warning/10 px-2 py-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warning transition-colors hover:bg-warning/15 disabled:opacity-60"
        >
          <RotateCw className="size-3" />
          {busy ? "Trying" : "Retry"}
        </button>
      ) : null}
    </div>
  );
}
