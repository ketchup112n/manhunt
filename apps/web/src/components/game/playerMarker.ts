import L, { type DivIcon } from "leaflet";

export type PlayerMarkerRole = "self" | "hunter" | "runner" | "caught";

export interface PlayerMarkerOptions {
  ping?: boolean;
  /** Compass heading in degrees, clockwise from north. */
  heading?: number | null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function normalizeHeading(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
}

export function createPlayerMarkerIcon(
  role: PlayerMarkerRole,
  name: string,
  options: PlayerMarkerOptions = {},
): DivIcon {
  const { ping = false, heading } = options;
  const label = escapeHtml(name);
  const initials =
    role === "hunter"
      ? "H"
      : role === "self"
        ? "★"
        : role === "caught"
          ? "✕"
          : escapeHtml(name.trim().slice(0, 2).toUpperCase() || "R");
  const degrees = role === "self" ? normalizeHeading(heading) : null;
  const headingMarkup =
    degrees === null
      ? ""
      : `<span class="player-marker__heading" style="--heading: ${degrees.toFixed(1)}deg" aria-hidden="true"><svg viewBox="0 0 12 12" focusable="false"><path d="M6 0 11 11 6 8.2 1 11z"/></svg></span>`;

  return L.divIcon({
    className: "manhunt-player-marker",
    html: `<span class="player-marker player-marker--${role}">
      ${ping ? '<span class="player-marker__ping" aria-hidden="true"></span>' : ""}
      ${headingMarkup}
      <span class="player-marker__avatar" aria-hidden="true">${initials}</span>
      <span class="player-marker__label">${label}</span>
    </span>`,
    iconSize: [88, 66],
    iconAnchor: [44, 32],
  });
}
