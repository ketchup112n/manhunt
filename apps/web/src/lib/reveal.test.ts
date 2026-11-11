import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REVEAL_HOLD_MS,
  revealCountdownSec,
  revealStage,
} from "./reveal.ts";

test("the reveal holds suspense until the final seconds", () => {
  assert.equal(revealStage(6000), "suspense");
  assert.equal(revealStage(REVEAL_HOLD_MS + 1), "suspense");
  assert.equal(revealStage(REVEAL_HOLD_MS), "revealed");
  assert.equal(revealStage(0), "revealed");
});

test("the suspense countdown rounds up and never goes negative", () => {
  assert.equal(revealCountdownSec(6000), 6);
  assert.equal(revealCountdownSec(5901), 6);
  assert.equal(revealCountdownSec(5400), 6);
  assert.equal(revealCountdownSec(2001), 3);
  assert.equal(revealCountdownSec(0), 0);
  assert.equal(revealCountdownSec(-500), 0);
});
