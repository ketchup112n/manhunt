/**
 * Splash line shown at the bottom-right of the wordmark.
 *
 * The demo console can change it over `/api/splash`, so the text is stored in
 * memory rather than baked into the bundle. That means an edit is visible to
 * every visitor until the server restarts, at which point it falls back to the
 * default below. Keep the default current when shipping a deploy.
 */
export const SPLASH_MAX_LENGTH = 48;

/** Same access code as the demo console. */
export const SPLASH_CODE = "1905";

export const DEFAULT_SPLASH = "Tag fast. Run faster.";

/** Collapses whitespace, trims, caps the length, and falls back when empty. */
export function normalizeSplash(input: unknown): string {
  const text = String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SPLASH_MAX_LENGTH);
  return text || DEFAULT_SPLASH;
}
