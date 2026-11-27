import { test } from "node:test";
import assert from "node:assert/strict";

import { currentZoneRadiusM } from "./zone.ts";
import { DEFAULT_SETTINGS, type GameSettings } from "./types.ts";

function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

test("a disabled zone keeps the configured play area", () => {
  const zone = settings({ zoneEnabled: false });

  assert.equal(currentZoneRadiusM(zone, 0), 1000);
  assert.equal(currentZoneRadiusM(zone, 9999), 1000);
});

test("the zone contracts inside each interval and settles at the final radius", () => {
  const zone = settings({
    zoneEnabled: true,
    playAreaM: 1000,
    zoneFinalRadiusM: 100,
    zoneShrinkStepM: 150,
    zoneShrinkIntervalSec: 300,
  });

  // 300s intervals split into a 240s hold and a 60s contraction.
  assert.equal(currentZoneRadiusM(zone, 0), 1000);
  assert.equal(currentZoneRadiusM(zone, 240), 1000);
  assert.equal(currentZoneRadiusM(zone, 270), 925);
  assert.equal(currentZoneRadiusM(zone, 300), 850);
  assert.equal(currentZoneRadiusM(zone, 1800), 100);
  assert.equal(currentZoneRadiusM(zone, 5000), 100);
});
