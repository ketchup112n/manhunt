import { CircleDot, Minimize2, Shrink, TriangleAlert } from "lucide-react";
import { useZoneState } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import { formatClock, formatRadius } from "@/lib/geo";
import type { ZoneState } from "@/lib/zone";
import { cn } from "@/lib/cn";

/** Truthful label for whatever the boundary is doing right now. */
function zonePhaseLabel(zone: ZoneState): string {
  switch (zone.phase) {
    case "holding":
      return "Holding";
    case "contracting":
      return "Shrinking";
    case "closed":
      return "Closed";
    default:
      return "Static";
  }
}

/**
 * Compact shrinking-zone readout for the in-game top bar. Shows the live
 * radius, the countdown to the next contraction, and turns to a warning only
 * while the boundary is actually moving.
 */
export function ZoneStatusChip({
  tone = "runner",
}: {
  tone?: "hunter" | "runner";
}) {
  const zone = useZoneState();
  const units = usePreferences((state) => state.units);

  if (!zone.enabled) return null;

  const accent = zone.isShrinking ? "var(--warning)" : `var(--${tone})`;
  const Icon = zone.isShrinking ? TriangleAlert : Shrink;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[3px] border bg-surface/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md",
        zone.isShrinking ? "border-warning/50" : "border-line-strong/60",
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="size-3.5 shrink-0" style={{ color: accent }} />
      <div>
        <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-faint">
          Zone
        </p>
        <p
          className="mt-0.5 font-mono text-[10px] tabular"
          style={{ color: accent }}
        >
          {formatRadius(zone.currentRadiusM, units)}
        </p>
      </div>
      <div className="hidden min-w-[54px] sm:block">
        <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
          {zone.phase === "closed" ? "Locked" : "Next"}
        </p>
        <p className="mt-0.5 font-mono text-[10px] tabular text-ink">
          {zone.phase === "closed"
            ? "Final"
            : zone.isShrinking
              ? formatClock(zone.contractEndsInSec)
              : formatClock(zone.nextShrinkInSec)}
        </p>
      </div>
      {zone.phase !== "closed" ? (
        <div className="h-6 w-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="w-full rounded-full transition-[height] duration-1000 ease-linear"
            style={{
              height: `${Math.max(6, zone.overallProgress * 100)}%`,
              background: accent,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Detailed shrinking-zone card for the field map column. Explains the
 * schedule and warns runners when the boundary is closing in.
 */
export function ZonePanel({ tone = "runner" }: { tone?: "hunter" | "runner" }) {
  const zone = useZoneState();
  const units = usePreferences((state) => state.units);

  if (!zone.enabled) return null;

  const accent = zone.isShrinking ? "var(--warning)" : `var(--${tone})`;

  return (
    <div
      className={cn(
        "rounded-[3px] border bg-surface/60 px-3 py-2.5 transition-colors",
        zone.isShrinking ? "border-warning/40" : "border-line",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
          <CircleDot className="size-3" />
          Shrinking zone
        </span>
        <span
          className="font-mono text-[8px] uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          {zonePhaseLabel(zone)}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
            Live radius
          </p>
          <p
            className="mt-1 font-mono text-lg tabular leading-none"
            style={{ color: accent }}
          >
            {formatRadius(zone.currentRadiusM, units)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
            {zone.phase === "closed"
              ? "Final radius"
              : zone.isShrinking
                ? "Closes in"
                : "Next contraction"}
          </p>
          <p className="mt-1 font-mono text-sm tabular leading-none text-ink">
            {zone.phase === "closed"
              ? formatRadius(zone.finalRadiusM, units)
              : zone.isShrinking
                ? formatClock(zone.contractEndsInSec)
                : formatClock(zone.nextShrinkInSec)}
          </p>
        </div>
      </div>

      {zone.phase !== "closed" ? (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.min(100, zone.overallProgress * 100)}%`, background: accent }}
          />
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between border-t border-line/70 pt-2 font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
        <span>
          −{zone.shrinkStepM} m every {Math.round(zone.intervalSec / 60)} min
        </span>
        <span>
          {zone.shrinkCount}/{zone.totalShrinkCount} steps
        </span>
      </div>
    </div>
  );
}

/**
 * Small inline note explaining what happens when the zone closes in.
 * Used in the field protocol modal.
 */
export function ZoneRuleNote({ tone = "runner" }: { tone?: "hunter" | "runner" }) {
  const zone = useZoneState();
  const units = usePreferences((state) => state.units);

  if (!zone.enabled) return null;

  return (
    <p className="mt-3 border-t border-line pt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-faint">
      <Minimize2 className="mr-1 inline size-3 align-[-2px]" />
      The play area contracts from {formatRadius(zone.startRadiusM, units)} to{" "}
      {formatRadius(zone.finalRadiusM, units)}, losing {zone.shrinkStepM} m every{" "}
      {Math.round(zone.intervalSec / 60)} min.
      {tone === "runner"
        ? " Stay inside the boundary or be caught in the open."
        : " The zone forces runners into tighter pockets."}
    </p>
  );
}
