import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SPLASH,
  SPLASH_MAX_LENGTH,
  normalizeSplash,
} from "./splash.ts";

test("splash text is trimmed and inner whitespace is collapsed", () => {
  assert.equal(normalizeSplash("  tag   fast \n now "), "tag fast now");
});

test("empty splash falls back to the default", () => {
  assert.equal(normalizeSplash(""), DEFAULT_SPLASH);
  assert.equal(normalizeSplash("   "), DEFAULT_SPLASH);
  assert.equal(normalizeSplash(null), DEFAULT_SPLASH);
  assert.equal(normalizeSplash(undefined), DEFAULT_SPLASH);
});

test("splash text is capped at the display limit", () => {
  assert.equal(normalizeSplash("x".repeat(200)).length, SPLASH_MAX_LENGTH);
});
