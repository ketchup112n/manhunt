/** Length of the reveal's final "you are…" hold. */
export const REVEAL_HOLD_MS = 2000;

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
