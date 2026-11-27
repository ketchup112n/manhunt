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

export interface PositionedPlayer extends LatLng {
  id: string;
  name: string;
  accuracyM: number;
  updatedAt: number;
}

/** Flatten a player's last server-known fix into something a map can render. */
export function toPositionedPlayer(player: {
  id: string;
  name: string;
  position?: { lat: number; lng: number; accuracyM: number; at: number };
}): PositionedPlayer | null {
  if (!player.position) return null;
  return {
    id: player.id,
    name: player.name,
    lat: player.position.lat,
    lng: player.position.lng,
    accuracyM: player.position.accuracyM,
    updatedAt: player.position.at,
  };
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