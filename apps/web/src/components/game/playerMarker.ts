import L, { type DivIcon } from "leaflet";

export type PlayerMarkerRole = "self" | "hunter" | "runner";

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

export function createPlayerMarkerIcon(
  role: PlayerMarkerRole,
  name: string,
  ping = false,
): DivIcon {
  const label = escapeHtml(name);
  const initials = role === "hunter" ? "H" : role === "self" ? "★" :
    escapeHtml(name.trim().slice(0, 2).toUpperCase() || "R");

  return L.divIcon({
    className: "manhunt-player-marker",
    html: `<span class="player-marker player-marker--${role}">
      ${ping ? '<span class="player-marker__ping" aria-hidden="true"></span>' : ""}
      <span class="player-marker__avatar" aria-hidden="true">${initials}</span>
      <span class="player-marker__label">${label}</span>
    </span>`,
    iconSize: [88, 66],
    iconAnchor: [44, 32],
  });
}
