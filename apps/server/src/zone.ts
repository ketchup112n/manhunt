import type { GameSettings } from "./types.ts";

/**
 * Server mirror of the shrinking-zone maths in `apps/web/src/lib/zone.ts`.
 *
 * The server only needs the live radius: it decides whether a runner has left
 * the play area. Keep the constants and the hold/contract split in sync with
 * the client so both sides agree on where the boundary sits.
 */
export const ZONE_MIN_FINAL_M = 50;
export const ZONE_MIN_INTERVAL_SEC = 60;
export const ZONE_MAX_INTERVAL_SEC = 900;
export const ZONE_MIN_STEP_M = 25;
export const ZONE_MAX_STEP_M = 1000;
export const ZONE_HOLD_FRACTION = 0.8;

/** Seconds the boundary spends travelling between two radii. */
function zoneContractDurationSec(intervalSec: number): number {
  return Math.max(5, Math.round(intervalSec * (1 - ZONE_HOLD_FRACTION)));
}

/** Seconds the boundary spends parked between two contractions. */
function zoneHoldDurationSec(intervalSec: number): number {
  return Math.max(0, intervalSec - zoneContractDurationSec(intervalSec));
}

interface ResolvedZone {
  startRadiusM: number;
  finalRadiusM: number;
  shrinkStepM: number;
  intervalSec: number;
}

function resolveZone(settings: GameSettings): ResolvedZone {
  const startRadiusM = Math.max(50, settings.playAreaM);

  const finalRadiusM = Math.min(
    Math.max(ZONE_MIN_FINAL_M, settings.zoneFinalRadiusM),
    startRadiusM,
  );

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

function zoneTotalShrinkCount(settings: GameSettings): number {
  const { startRadiusM, finalRadiusM, shrinkStepM } = resolveZone(settings);
  if (finalRadiusM >= startRadiusM) return 0;
  return Math.ceil((startRadiusM - finalRadiusM) / shrinkStepM);
}

/**
 * Radius of the play area at a given point in the active round. A disabled
 * zone never moves, so the radius stays at the configured play area.
 */
export function currentZoneRadiusM(
  settings: GameSettings,
  elapsedSec: number,
): number {
  const { startRadiusM, finalRadiusM, shrinkStepM, intervalSec } =
    resolveZone(settings);

  if (!settings.zoneEnabled) return startRadiusM;

  const totalShrinkCount = zoneTotalShrinkCount(settings);
  if (totalShrinkCount === 0) return startRadiusM;

  const safeElapsed = Math.max(0, elapsedSec);
  const cycleIndex = Math.floor(safeElapsed / intervalSec);
  if (cycleIndex >= totalShrinkCount) return finalRadiusM;

  const radiusAtCycleStart = Math.max(
    finalRadiusM,
    startRadiusM - cycleIndex * shrinkStepM,
  );
  const radiusAtCycleEnd = Math.max(
    finalRadiusM,
    startRadiusM - (cycleIndex + 1) * shrinkStepM,
  );

  const holdSec = zoneHoldDurationSec(intervalSec);
  const contractSec = zoneContractDurationSec(intervalSec);
  const cycleElapsed = safeElapsed % intervalSec;
  if (cycleElapsed < holdSec) return radiusAtCycleStart;

  const contractProgress = Math.min(1, (cycleElapsed - holdSec) / contractSec);
  return (
    radiusAtCycleStart -
    (radiusAtCycleStart - radiusAtCycleEnd) * contractProgress
  );
}
