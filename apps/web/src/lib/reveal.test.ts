import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REVEAL_HOLD_MS,
  REVEAL_HOLD_SEC,
  revealCountdownSec,
  revealHoldSec,
  revealStage,
  revealSuspenseSec,
} from "./reveal.ts";

test("the reveal holds suspense until the final seconds", () => {
  assert.equal(revealStage(6000), "suspense");
  assert.equal(revealStage(REVEAL_HOLD_MS + 1), "suspense");
  assert.equal(revealStage(REVEAL_HOLD_MS), "revealed");
  assert.equal(revealStage(0), "revealed");
});

test("the suspense countdown reaches zero as the role flips", () => {
  assert.equal(REVEAL_HOLD_SEC, 4);
  assert.equal(revealSuspenseSec(10_000), 6);
  assert.equal(revealSuspenseSec(5_000), 1);
  assert.equal(revealSuspenseSec(4_001), 1);
  assert.equal(revealSuspenseSec(4_000), 0);
  assert.equal(revealSuspenseSec(0), 0);

  assert.equal(revealHoldSec(4_000), 4);
  assert.equal(revealHoldSec(1_500), 2);
  assert.equal(revealHoldSec(0), 0);
});

test("the suspense countdown rounds up and never goes negative", () => {
  assert.equal(revealCountdownSec(6000), 6);
  assert.equal(revealCountdownSec(5901), 6);
  assert.equal(revealCountdownSec(5400), 6);
  assert.equal(revealCountdownSec(2001), 3);
  assert.equal(revealCountdownSec(0), 0);
  assert.equal(revealCountdownSec(-500), 0);
});
