import type { GamePhase } from "./types";

/** Length of the reveal's final "you are…" hold. */
export const REVEAL_HOLD_MS = 4000;

/** The same hold expressed in whole seconds. */
export const REVEAL_HOLD_SEC = REVEAL_HOLD_MS / 1000;

/** Total reveal length; mirrors the server's `REVEAL_SEC`. */
export const REVEAL_TOTAL_MS = 10_000;

/**
 * How far the server must disagree before we move the local deadline. Keeps
 * the countdown stable when snapshots arrive with normal network jitter.
 */
export const REVEAL_RESYNC_TOLERANCE_MS = 1200;

/**
 * Resolve the local (monotonic-ish) reveal deadline from a snapshot.
 *
 * The countdown must be anchored once and then left alone: re-deriving it from
 * `ceil(revealRemainingSec)` on every snapshot makes the clock jump around and
 * drift behind the server, which is what made the old countdown freeze mid-way
 * and get cut off by the phase change.
 *
 * - Entering the reveal anchors the deadline from the server's remaining time.
 * - Later snapshots never push the deadline out; they only pull it in when the
 *   server is clearly ahead (e.g. a very stale first snapshot).
 * - Leaving the reveal keeps the deadline alive so the overlay can finish its
 *   own countdown, then clears it once it has expired.
 */
export function revealDeadline({
  previousPhase,
  phase,
  currentEndsAt,
  serverRemainingSec,
  now,
}: {
  previousPhase: GamePhase;
  phase: GamePhase;
  currentEndsAt: number;
  serverRemainingSec: number;
  now: number;
}): number {
  if (phase !== "reveal") {
    return currentEndsAt > 0 && now >= currentEndsAt ? 0 : currentEndsAt;
  }

  const serverEnd = now + Math.max(0, serverRemainingSec) * 1000;

  if (previousPhase !== "reveal" || currentEndsAt <= 0) {
    return serverRemainingSec > 0 ? serverEnd : now + REVEAL_TOTAL_MS;
  }

  if (serverEnd < currentEndsAt - REVEAL_RESYNC_TOLERANCE_MS) {
    return serverEnd;
  }

  return currentEndsAt;
}

export type RevealStage = "suspense" | "revealed";

/**
 * The server runs a fixed-length reveal; each phone holds suspense until the
 * last stretch, then flips to its role so every player lands together.
 */
export function revealStage(remainingMs: number): RevealStage {
  return remainingMs > REVEAL_HOLD_MS ? "suspense" : "revealed";
}

/** Whole seconds shown during the suspense stage. */
export function revealCountdownSec(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Suspense countdown that reaches zero right as the role flips, so the number
 * on screen always ends at the reveal instead of stopping mid-way.
 */
export function revealSuspenseSec(remainingMs: number): number {
  return Math.max(0, revealCountdownSec(remainingMs) - REVEAL_HOLD_SEC);
}

/** Seconds left on the role card before the prep phase starts. */
export function revealHoldSec(remainingMs: number): number {
  return Math.min(REVEAL_HOLD_SEC, revealCountdownSec(remainingMs));
}
