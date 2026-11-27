import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clampZoneSettings,
  computeZoneState,
  normalizeZoneSettings,
  zoneContractDurationSec,
  zoneHoldDurationSec,
  zoneScheduleFit,
  zoneScheduleLabel,
  zoneTotalShrinkCount,
  ZONE_MAX_INTERVAL_SEC,
  ZONE_MIN_FINAL_M,
  ZONE_MIN_INTERVAL_SEC,
  ZONE_MIN_STEP_M,
} from "./zone.ts";
import { DEFAULT_SETTINGS, type GameSettings } from "../lib/types.ts";

/** Builds settings on top of the defaults so each case states only what matters. */
function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

test("zone is off and never moves when disabled", () => {
  const state = computeZoneState(settings({ zoneEnabled: false }), 900);

  assert.equal(state.enabled, false);
  assert.equal(state.phase, "off");
  assert.equal(state.isShrinking, false);
  assert.equal(state.isHolding, false);
  assert.equal(state.isFinal, false);
  assert.equal(state.currentRadiusM, 1000);
  assert.equal(state.nextRadiusM, 1000);
  assert.equal(state.overallProgress, 0);
});

test("every interval splits into a hold phase then a contraction phase", () => {
  // 300 s interval, 80% hold, so 240 s parked and 60 s moving.
  assert.equal(zoneHoldDurationSec(300), 240);
  assert.equal(zoneContractDurationSec(300), 60);
  assert.equal(zoneHoldDurationSec(120) + zoneContractDurationSec(120), 120);
  assert.equal(zoneHoldDurationSec(900) + zoneContractDurationSec(900), 900);
});

test("holding phase keeps the radius parked and counts down to the contraction", () => {
  const base = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkIntervalSec: 300,
    zoneShrinkStepM: 150,
    zoneFinalRadiusM: 100,
  });

  const atStart = computeZoneState(base, 0);
  assert.equal(atStart.phase, "holding");
  assert.equal(atStart.isHolding, true);
  assert.equal(atStart.isShrinking, false);
  assert.equal(atStart.isFinal, false);
  assert.equal(atStart.currentRadiusM, 1000);
  assert.equal(atStart.nextShrinkInSec, 240);
  assert.equal(atStart.contractEndsInSec, 0);

  const justBefore = computeZoneState(base, 239);
  assert.equal(justBefore.phase, "holding");
  assert.equal(justBefore.currentRadiusM, 1000);
  assert.equal(justBefore.nextShrinkInSec, 1);

  const lastHoldSecond = computeZoneState(base, 240);
  assert.equal(lastHoldSecond.phase, "contracting");
  assert.equal(lastHoldSecond.isHolding, false);
  assert.equal(lastHoldSecond.isShrinking, true);
  assert.equal(lastHoldSecond.currentRadiusM, 1000);
  assert.equal(lastHoldSecond.nextShrinkInSec, 0);
  assert.equal(lastHoldSecond.contractEndsInSec, 60);
});

test("radius contracts linearly during the contraction and lands on the next step", () => {
  const base = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkIntervalSec: 300,
    zoneShrinkStepM: 150,
    zoneFinalRadiusM: 100,
  });

  // Contraction runs from t=240 to t=300 and loses 150 m over that window.
  const halfway = computeZoneState(base, 270);
  assert.equal(halfway.phase, "contracting");
  assert.equal(halfway.currentRadiusM, 925);
  assert.equal(halfway.nextRadiusM, 850);
  assert.equal(halfway.contractEndsInSec, 30);
  assert.equal(halfway.contractProgress, 0.5);

  const settled = computeZoneState(base, 300);
  assert.equal(settled.phase, "holding");
  assert.equal(settled.currentRadiusM, 850);
  // The next contraction will take the boundary from 850 down to 700.
  assert.equal(settled.nextRadiusM, 700);
  assert.equal(settled.shrinkCount, 1);
  assert.equal(settled.isFinal, false);
});

test("zone is not final while the last contraction is still running", () => {
  const base = settings({
    zoneEnabled: true,
    playAreaM: 400,
    zoneShrinkIntervalSec: 300,
    zoneShrinkStepM: 150,
    zoneFinalRadiusM: 100,
  });

  // Two contractions: 1000 -> 850 -> 700, but the final radius is 100 so the
  // second contraction lands on 100 and the zone closes at t=600.
  const duringLast = computeZoneState(base, 570);
  assert.equal(duringLast.phase, "contracting");
  assert.equal(duringLast.isShrinking, true);
  assert.equal(duringLast.isFinal, false);
  assert.equal(duringLast.totalShrinkCount, 2);
  assert.ok(duringLast.currentRadiusM < 700);
  assert.ok(duringLast.currentRadiusM > 100);

  const atClose = computeZoneState(base, 600);
  assert.equal(atClose.phase, "closed");
  assert.equal(atClose.isFinal, true);
  assert.equal(atClose.isShrinking, false);
  assert.equal(atClose.isHolding, false);
  assert.equal(atClose.currentRadiusM, 100);
  assert.equal(atClose.nextRadiusM, 100);
  assert.equal(atClose.shrinkCount, 2);
  assert.equal(atClose.nextShrinkInSec, 0);
  assert.equal(atClose.overallProgress, 1);
});

test("warning clears while the boundary is parked between contractions", () => {
  const base = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkIntervalSec: 300,
    zoneShrinkStepM: 150,
    zoneFinalRadiusM: 100,
  });

  const holding = computeZoneState(base, 100);
  const shrinking = computeZoneState(base, 270);

  assert.equal(holding.isShrinking, false);
  assert.equal(shrinking.isShrinking, true);
  // The two states are mutually exclusive, so the warning can clear.
  assert.notEqual(holding.isShrinking, shrinking.isShrinking);
});

test("radius never drops below the final radius and never rises", () => {
  const base = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkIntervalSec: 120,
    zoneShrinkStepM: 200,
    zoneFinalRadiusM: 150,
  });

  let previous = Number.POSITIVE_INFINITY;
  for (let elapsed = 0; elapsed <= 3600; elapsed += 7) {
    const state = computeZoneState(base, elapsed);
    assert.ok(state.currentRadiusM <= previous, `radius grew at t=${elapsed}`);
    assert.ok(state.currentRadiusM >= 150, `radius fell below final at t=${elapsed}`);
    previous = state.currentRadiusM;
  }
});

test("total shrink count and final radius agree with the configured step", () => {
  const base = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkStepM: 150,
    zoneFinalRadiusM: 100,
  });

  assert.equal(zoneTotalShrinkCount(base), 6);
  assert.equal(clampZoneSettings(base).finalRadiusM, 100);

  const coarse = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkStepM: 300,
    zoneFinalRadiusM: 100,
  });
  // 900 m of travel at 300 m per step needs 3 steps.
  assert.equal(zoneTotalShrinkCount(coarse), 3);
});

test("normalize keeps the schedule internally consistent", () => {
  const normalized = normalizeZoneSettings(
    settings({
      zoneEnabled: true,
      playAreaM: 1000,
      zoneShrinkStepM: 2000,
      zoneFinalRadiusM: 100,
      zoneShrinkIntervalSec: 5,
    }),
  );

  // Only 900 m of travel is left, so the step is pulled down to that.
  assert.equal(normalized.zoneShrinkStepM, 900);
  assert.equal(normalized.zoneFinalRadiusM, 100);
  // The interval is clamped into the supported range.
  assert.equal(normalized.zoneShrinkIntervalSec, ZONE_MIN_INTERVAL_SEC);

  const clampedInterval = normalizeZoneSettings(
    settings({ zoneShrinkIntervalSec: 99999 }),
  );
  assert.equal(clampedInterval.zoneShrinkIntervalSec, ZONE_MAX_INTERVAL_SEC);
});

test("normalize stops the final radius from exceeding the start radius", () => {
  const normalized = normalizeZoneSettings(
    settings({
      zoneEnabled: true,
      playAreaM: 300,
      zoneFinalRadiusM: 900,
      zoneShrinkStepM: 150,
    }),
  );

  // The final radius can never be larger than the area the zone starts in.
  assert.equal(normalized.zoneFinalRadiusM, 300);
  // With no travel left there is nothing to contract.
  assert.equal(zoneTotalShrinkCount(normalized), 0);
  assert.equal(zoneScheduleLabel(normalized), "No contractions");
});

test("editor and live round agree on the same schedule", () => {
  const raw = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneShrinkStepM: 2000,
    zoneFinalRadiusM: 100,
    zoneShrinkIntervalSec: 300,
  });

  // The editor stores the normalized numbers, and the live round must read
  // exactly the same schedule from them.
  const stored = normalizeZoneSettings(raw);
  const live = computeZoneState(stored, 270);
  const clamped = clampZoneSettings(stored);

  assert.equal(live.shrinkStepM, clamped.shrinkStepM);
  assert.equal(live.finalRadiusM, clamped.finalRadiusM);
  assert.equal(live.intervalSec, clamped.intervalSec);
  assert.equal(live.totalShrinkCount, zoneTotalShrinkCount(stored));
  assert.equal(live.currentRadiusM, 550);
  assert.equal(live.nextRadiusM, 100);
});

test("schedule fit reports a schedule that cannot finish inside the round", () => {
  const fits = zoneScheduleFit(
    settings({
      zoneEnabled: true,
      durationSec: 3600,
      playAreaM: 1000,
      zoneShrinkIntervalSec: 300,
      zoneShrinkStepM: 150,
      zoneFinalRadiusM: 100,
    }),
  );

  // 6 contractions at 300 s each finish exactly at 1800 s.
  assert.equal(fits.totalShrinkCount, 6);
  assert.equal(fits.completesAtSec, 1800);
  assert.equal(fits.fits, true);
  assert.equal(fits.overflowSec, 0);
  assert.equal(fits.completedShrinkCount, 6);

  const overruns = zoneScheduleFit(
    settings({
      zoneEnabled: true,
      durationSec: 900,
      playAreaM: 1000,
      zoneShrinkIntervalSec: 300,
      zoneShrinkStepM: 150,
      zoneFinalRadiusM: 100,
    }),
  );

  assert.equal(overruns.fits, false);
  assert.equal(overruns.completesAtSec, 1800);
  assert.equal(overruns.overflowSec, 900);
  assert.equal(overruns.completedShrinkCount, 3);

  const off = zoneScheduleFit(settings({ zoneEnabled: false, durationSec: 900 }));
  assert.equal(off.fits, true);
  assert.equal(off.totalShrinkCount, 0);
});

test("zone schedule label describes the configured schedule", () => {
  assert.equal(
    zoneScheduleLabel(
      settings({
        zoneEnabled: true,
        playAreaM: 1000,
        zoneShrinkIntervalSec: 300,
        zoneShrinkStepM: 150,
        zoneFinalRadiusM: 100,
      }),
    ),
    "−150m / 5min → 100m",
  );
  assert.equal(zoneScheduleLabel(settings({ zoneEnabled: false })), "Off");
});

test("zone constants stay within the supported bounds", () => {
  assert.equal(ZONE_MIN_INTERVAL_SEC, 60);
  assert.equal(ZONE_MAX_INTERVAL_SEC, 900);
  assert.equal(ZONE_MIN_STEP_M, 25);
  assert.equal(ZONE_MIN_FINAL_M, 50);
});

test("a zone with nothing to contract is immediately closed", () => {
  const state = computeZoneState(
    settings({
      zoneEnabled: true,
      playAreaM: 100,
      zoneShrinkStepM: 25,
      zoneFinalRadiusM: 100,
    }),
    0,
  );

  assert.equal(state.phase, "closed");
  assert.equal(state.isFinal, true);
  assert.equal(state.totalShrinkCount, 0);
  assert.equal(state.currentRadiusM, 100);
});
