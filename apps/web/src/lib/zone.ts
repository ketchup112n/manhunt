import type { GameSettings } from "@/lib/types";

/**
 * What the boundary is doing right now.
 *
 * - `off`: the shrinking zone is disabled, the play area never changes.
 * - `holding`: the boundary is parked at its current radius.
 * - `contracting`: the boundary is actively travelling inward.
 * - `closed`: every contraction is done, the zone sits at its final radius.
 */
export type ZonePhase = "off" | "holding" | "contracting" | "closed";

export interface ZoneState {
  /** Shrinking area is switched on for this round. */
  enabled: boolean;
  /** What the boundary is doing right now. */
  phase: ZonePhase;
  /** Radius the zone started the round with. */
  startRadiusM: number;
  /** Radius the zone will settle at and never shrink below. */
  finalRadiusM: number;
  /** Live radius right now. */
  currentRadiusM: number;
  /** Radius the zone will hold at after the next contraction finishes. */
  nextRadiusM: number;
  /** Meters lost per contraction. */
  shrinkStepM: number;
  /** Seconds between contractions. */
  intervalSec: number;
  /** Seconds since the round went live. */
  elapsedSec: number;
  /** Seconds until the boundary starts moving again. Zero while contracting. */
  nextShrinkInSec: number;
  /** Seconds until the current contraction settles. Zero while holding. */
  contractEndsInSec: number;
  /** True while the boundary is parked between contractions. */
  isHolding: boolean;
  /** True while the boundary is actively moving inward. */
  isShrinking: boolean;
  /** True once every contraction is done and the zone sits at its final radius. */
  isFinal: boolean;
  /** How many contractions have been completed. */
  shrinkCount: number;
  /** How many contractions will happen in total. */
  totalShrinkCount: number;
  /** Progress through the current interval, 0 to 1. */
  progress: number;
  /** Progress through the current contraction, 0 to 1. Zero while holding. */
  contractProgress: number;
  /** Progress through the whole schedule, 0 to 1. */
  overallProgress: number;
}

export const ZONE_MIN_INTERVAL_SEC = 60;
export const ZONE_MAX_INTERVAL_SEC = 900;
export const ZONE_MIN_STEP_M = 25;
export const ZONE_MAX_STEP_M = 1000;
export const ZONE_MIN_FINAL_M = 50;

/**
 * Share of every interval the boundary spends holding still. The remaining
 * time is the contraction itself, so runners always get a warning window
 * before the boundary moves.
 */
export const ZONE_HOLD_FRACTION = 0.8;

/** Seconds the boundary spends travelling between two radii. */
export function zoneContractDurationSec(intervalSec: number): number {
  return Math.max(5, Math.round(intervalSec * (1 - ZONE_HOLD_FRACTION)));
}

/** Seconds the boundary spends parked between two contractions. */
export function zoneHoldDurationSec(intervalSec: number): number {
  return Math.max(0, intervalSec - zoneContractDurationSec(intervalSec));
}

interface ResolvedZone {
  startRadiusM: number;
  finalRadiusM: number;
  shrinkStepM: number;
  intervalSec: number;
}

/**
 * Single source of truth for the zone numbers. Both the settings editor and
 * the live round read through this, so the sliders and the HUD can never
 * describe two different schedules.
 */
function resolveZone(settings: GameSettings): ResolvedZone {
  const startRadiusM = Math.max(50, settings.playAreaM);

  // The final radius can never be larger than the radius the zone starts at.
  const finalRadiusM = Math.min(
    Math.max(ZONE_MIN_FINAL_M, settings.zoneFinalRadiusM),
    startRadiusM,
  );

  // A step larger than the remaining travel would describe a schedule that
  // can never run, so it is pulled down to the distance that is actually left.
  const travelM = Math.max(0, startRadiusM - finalRadiusM);
  const shrinkStepM =
    travelM > 0
      ? Math.min(
          Math.max(ZONE_MIN_STEP_M, settings.zoneShrinkStepM),
          Math.max(ZONE_MIN_STEP_M, travelM),
        )
      : Math.min(
          ZONE_MAX_STEP_M,
          Math.max(ZONE_MIN_STEP_M, settings.zoneShrinkStepM),
        );

  const intervalSec = Math.min(
    ZONE_MAX_INTERVAL_SEC,
    Math.max(ZONE_MIN_INTERVAL_SEC, settings.zoneShrinkIntervalSec),
  );

  return { startRadiusM, finalRadiusM, shrinkStepM, intervalSec };
}

/**
 * Keeps the zone values internally consistent no matter which control was
 * touched last, so the sliders can never describe an impossible schedule.
 */
export function normalizeZoneSettings(settings: GameSettings): GameSettings {
  const { finalRadiusM, shrinkStepM, intervalSec } = resolveZone(settings);

  return {
    ...settings,
    zoneFinalRadiusM: finalRadiusM,
    zoneShrinkStepM: shrinkStepM,
    zoneShrinkIntervalSec: intervalSec,
  };
}

export function clampZoneSettings(settings: GameSettings): ResolvedZone {
  return resolveZone(settings);
}

/** How many contractions it takes to travel from the start radius to the final one. */
export function zoneTotalShrinkCount(settings: GameSettings): number {
  const { startRadiusM, finalRadiusM, shrinkStepM } = resolveZone(settings);
  if (finalRadiusM >= startRadiusM) return 0;
  return Math.ceil((startRadiusM - finalRadiusM) / shrinkStepM);
}

/**
 * Battle-royale style zone. Every interval is split in two: the boundary
 * holds still for most of it, then contracts inward over the last stretch.
 * The zone only counts as closed once the final contraction has finished,
 * so the warning indicator clears while the boundary is parked.
 */
export function computeZoneState(
  settings: GameSettings,
  elapsedSec: number,
): ZoneState {
  const { startRadiusM, finalRadiusM, shrinkStepM, intervalSec } =
    resolveZone(settings);

  const safeElapsed = Math.max(0, elapsedSec);
  const totalShrinkCount = zoneTotalShrinkCount(settings);

  if (!settings.zoneEnabled) {
    return {
      enabled: false,
      phase: "off",
      startRadiusM,
      finalRadiusM,
      currentRadiusM: startRadiusM,
      nextRadiusM: startRadiusM,
      shrinkStepM,
      intervalSec,
      elapsedSec: safeElapsed,
      nextShrinkInSec: 0,
      contractEndsInSec: 0,
      isHolding: false,
      isShrinking: false,
      isFinal: false,
      shrinkCount: 0,
      totalShrinkCount,
      progress: 0,
      contractProgress: 0,
      overallProgress: 0,
    };
  }

  if (totalShrinkCount === 0) {
    // The zone is on but there is nothing to contract, so the boundary is
    // already parked at its final radius.
    return {
      enabled: true,
      phase: "closed",
      startRadiusM,
      finalRadiusM,
      currentRadiusM: startRadiusM,
      nextRadiusM: startRadiusM,
      shrinkStepM,
      intervalSec,
      elapsedSec: safeElapsed,
      nextShrinkInSec: 0,
      contractEndsInSec: 0,
      isHolding: false,
      isShrinking: false,
      isFinal: true,
      shrinkCount: 0,
      totalShrinkCount,
      progress: 1,
      contractProgress: 1,
      overallProgress: 1,
    };
  }

  const contractSec = zoneContractDurationSec(intervalSec);
  const holdSec = zoneHoldDurationSec(intervalSec);

  const cycleIndex = Math.floor(safeElapsed / intervalSec);
  const cycleElapsed = safeElapsed % intervalSec;

  if (cycleIndex >= totalShrinkCount) {
    // Every contraction has finished, the zone is locked at its final radius.
    return {
      enabled: true,
      phase: "closed",
      startRadiusM,
      finalRadiusM,
      currentRadiusM: finalRadiusM,
      nextRadiusM: finalRadiusM,
      shrinkStepM,
      intervalSec,
      elapsedSec: safeElapsed,
      nextShrinkInSec: 0,
      contractEndsInSec: 0,
      isHolding: false,
      isShrinking: false,
      isFinal: true,
      shrinkCount: totalShrinkCount,
      totalShrinkCount,
      progress: 1,
      contractProgress: 1,
      overallProgress: 1,
    };
  }

  const radiusAtCycleStart = Math.max(
    finalRadiusM,
    startRadiusM - cycleIndex * shrinkStepM,
  );
  const radiusAtCycleEnd = Math.max(
    finalRadiusM,
    startRadiusM - (cycleIndex + 1) * shrinkStepM,
  );

  const isContracting = cycleElapsed >= holdSec;
  const contractElapsed = isContracting ? cycleElapsed - holdSec : 0;
  const contractProgress = isContracting
    ? Math.min(1, contractElapsed / contractSec)
    : 0;

  return {
    enabled: true,
    phase: isContracting ? "contracting" : "holding",
    startRadiusM,
    finalRadiusM,
    currentRadiusM: isContracting
      ? radiusAtCycleStart - (radiusAtCycleStart - radiusAtCycleEnd) * contractProgress
      : radiusAtCycleStart,
    nextRadiusM: radiusAtCycleEnd,
    shrinkStepM,
    intervalSec,
    elapsedSec: safeElapsed,
    nextShrinkInSec: isContracting ? 0 : holdSec - cycleElapsed,
    contractEndsInSec: isContracting ? contractSec - contractElapsed : 0,
    isHolding: !isContracting,
    isShrinking: isContracting,
    isFinal: false,
    shrinkCount: cycleIndex,
    totalShrinkCount,
    progress: cycleElapsed / intervalSec,
    contractProgress,
    overallProgress: (cycleIndex + contractProgress) / totalShrinkCount,
  };
}

export interface ZoneScheduleFit {
  /** How many contractions the schedule contains. */
  totalShrinkCount: number;
  /** Seconds from the start of the round until the last contraction finishes. */
  completesAtSec: number;
  /** Seconds the round lasts. */
  durationSec: number;
  /** True when the last contraction finishes before the round ends. */
  fits: boolean;
  /** Seconds the schedule runs past the end of the round. */
  overflowSec: number;
  /** How many contractions actually land inside the round. */
  completedShrinkCount: number;
}

/**
 * Checks whether the configured schedule can actually finish contracting
 * inside the round, so the host can be warned before the operation starts.
 */
export function zoneScheduleFit(settings: GameSettings): ZoneScheduleFit {
  const durationSec = Math.max(0, settings.durationSec);

  if (!settings.zoneEnabled) {
    return {
      totalShrinkCount: 0,
      completesAtSec: 0,
      durationSec,
      fits: true,
      overflowSec: 0,
      completedShrinkCount: 0,
    };
  }

  const { intervalSec } = resolveZone(settings);
  const totalShrinkCount = zoneTotalShrinkCount(settings);
  const completesAtSec = totalShrinkCount * intervalSec;

  return {
    totalShrinkCount,
    completesAtSec,
    durationSec,
    fits: completesAtSec <= durationSec,
    overflowSec: Math.max(0, completesAtSec - durationSec),
    completedShrinkCount: Math.min(
      totalShrinkCount,
      Math.floor(durationSec / intervalSec),
    ),
  };
}

/** Short human label for the zone schedule, used in summaries and rules. */
export function zoneScheduleLabel(settings: GameSettings): string {
  if (!settings.zoneEnabled) return "Off";
  if (zoneTotalShrinkCount(settings) === 0) return "No contractions";
  const { finalRadiusM, shrinkStepM, intervalSec } = resolveZone(settings);
  const minutes = Math.round(intervalSec / 60);
  return `−${shrinkStepM}m / ${minutes}min → ${finalRadiusM}m`;
}
