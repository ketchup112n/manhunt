/** Length of the reveal's final "you are…" hold. */
export const REVEAL_HOLD_MS = 4000;

/** The same hold expressed in whole seconds. */
export const REVEAL_HOLD_SEC = REVEAL_HOLD_MS / 1000;

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
