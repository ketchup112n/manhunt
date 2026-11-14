import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REVEAL_HOLD_MS,
  REVEAL_HOLD_SEC,
  REVEAL_TOTAL_MS,
  revealCountdownSec,
  revealDeadline,
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

test("a whole reveal counts 6→1, then holds the role for four seconds", () => {
  const endsAt = revealDeadline({
    previousPhase: "lobby",
    phase: "reveal",
    currentEndsAt: 0,
    serverRemainingSec: 10,
    now: 0,
  });

  const suspense: number[] = [];
  for (let now = 0; now < endsAt; now += 100) {
    const remaining = Math.max(0, endsAt - now);
    if (revealStage(remaining) !== "suspense") continue;
    const value = revealSuspenseSec(remaining);
    if (suspense.at(-1) !== value) suspense.push(value);
  }

  assert.deepEqual(suspense, [6, 5, 4, 3, 2, 1]);

  const hold = [4000, 3000, 2000, 1000, 0].map(revealHoldSec);
  assert.deepEqual(hold, [4, 3, 2, 1, 0]);
});

test("the suspense countdown rounds up and never goes negative", () => {
  assert.equal(revealCountdownSec(6000), 6);
  assert.equal(revealCountdownSec(5901), 6);
  assert.equal(revealCountdownSec(5400), 6);
  assert.equal(revealCountdownSec(2001), 3);
  assert.equal(revealCountdownSec(0), 0);
  assert.equal(revealCountdownSec(-500), 0);
});

test("the reveal deadline is anchored once when the phase changes", () => {
  assert.equal(
    revealDeadline({
      previousPhase: "lobby",
      phase: "reveal",
      currentEndsAt: 0,
      serverRemainingSec: 10,
      now: 1_000,
    }),
    11_000,
  );

  assert.equal(
    revealDeadline({
      previousPhase: "lobby",
      phase: "reveal",
      currentEndsAt: 0,
      serverRemainingSec: 0,
      now: 5_000,
    }),
    5_000 + REVEAL_TOTAL_MS,
  );
});

test("later snapshots never push the reveal deadline out", () => {
  assert.equal(
    revealDeadline({
      previousPhase: "reveal",
      phase: "reveal",
      currentEndsAt: 11_000,
      serverRemainingSec: 10,
      now: 2_500,
    }),
    11_000,
  );

  assert.equal(
    revealDeadline({
      previousPhase: "reveal",
      phase: "reveal",
      currentEndsAt: 11_000,
      serverRemainingSec: 9,
      now: 2_000,
    }),
    11_000,
  );
});

test("a clearly stale deadline is pulled back in", () => {
  assert.equal(
    revealDeadline({
      previousPhase: "reveal",
      phase: "reveal",
      currentEndsAt: 16_000,
      serverRemainingSec: 6,
      now: 3_000,
    }),
    9_000,
  );
});

test("the deadline survives the phase change and expires locally", () => {
  assert.equal(
    revealDeadline({
      previousPhase: "reveal",
      phase: "prep",
      currentEndsAt: 11_000,
      serverRemainingSec: 0,
      now: 9_000,
    }),
    11_000,
  );

  assert.equal(
    revealDeadline({
      previousPhase: "reveal",
      phase: "active",
      currentEndsAt: 11_000,
      serverRemainingSec: 0,
      now: 11_000,
    }),
    0,
  );

  assert.equal(
    revealDeadline({
      previousPhase: "lobby",
      phase: "lobby",
      currentEndsAt: 0,
      serverRemainingSec: 0,
      now: 2_000,
    }),
    0,
  );
});
