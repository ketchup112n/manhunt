import { type LatLng, type Units } from "@/lib/types";

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistance(meters: number, units: Units): string {
  if (units === "imperial") {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.round(feet)} ft`;
    return `${(meters / 1609.344).toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRadius(meters: number, units: Units): string {
  if (units === "imperial") {
    const miles = meters / 1609.344;
    return `${miles.toFixed(miles < 1 ? 2 : 1)} mi`;
  }
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatLongClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatAgo(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
}

export const DEMO_CENTER = { lat: 40.7829, lng: -73.9654 };

// Unified mock positions for all players (used regardless of assigned role)
export const MOCK_PLAYER_POSITIONS = [
  { id: "you", name: "ECHO", lat: 40.7829, lng: -73.9654 },
  { id: "vex", name: "VEX", lat: 40.7841, lng: -73.9637 },
  { id: "kilo", name: "KILO", lat: 40.7809, lng: -73.9681 },
  { id: "wren", name: "WREN", lat: 40.7852, lng: -73.9601, accuracyM: 8 },
  { id: "ash", name: "ASH", lat: 40.7798, lng: -73.9622, accuracyM: 12 },
  { id: "rook", name: "ROOK", lat: 40.7871, lng: -73.9698, accuracyM: 6 },
  { id: "nova", name: "NOVA", lat: 40.7783, lng: -73.9702, accuracyM: 18 },
];

export function getPlayerPosition(id: string) {
  return MOCK_PLAYER_POSITIONS.find((p) => p.id === id);
}

export function getHunterPositions(players: { id: string }[]) {
  const hunterIds = new Set(players.map((p) => p.id));
  return MOCK_PLAYER_POSITIONS.filter((pos) => hunterIds.has(pos.id));
}

export function getRunnerPositions(players: { id: string }[]) {
  const runnerIds = new Set(players.map((p) => p.id));
  return MOCK_PLAYER_POSITIONS.filter((pos) => runnerIds.has(pos.id));
}

export function nearestHunter(
  from: LatLng,
  hunters: { id: string; lat: number; lng: number }[],
) {
  if (hunters.length === 0) return null;

  let best = hunters[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const hunter of hunters) {
    const d = distanceMeters(from, hunter);
    if (d < bestDistance) {
      best = hunter;
      bestDistance = d;
    }
  }

  return { hunter: best, distanceM: bestDistance, bearing: bearingDegrees(from, best) };
}