import { useEffect } from "react";
import { distanceMeters } from "@/lib/geo";
import { useGame } from "@/store/game";

/** Don't spam the socket; the server rebroadcasts once per second anyway. */
const MIN_INTERVAL_MS = 2000;
const MIN_DISTANCE_M = 5;

/**
 * Streams the device's GPS fix to the lobby server while a round is in prep or
 * active. Locations are only requested during a round, so the browser
 * permission prompt appears when the player actually needs it.
 */
export function LocationSync() {
  const session = useGame((state) => state.session);
  const phase = useGame((state) => state.phase);
  const enabled =
    Boolean(session) && (phase === "prep" || phase === "active");

  useEffect(() => {
    if (!enabled) {
      useGame.getState().setPositionStatus("idle");
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      useGame
        .getState()
        .setPositionStatus(
          "unsupported",
          "This browser does not support location access.",
        );
      return;
    }

    useGame.getState().setPositionStatus("requesting");

    let cancelled = false;
    let lastSentAt = 0;
    let lastSent: { lat: number; lng: number } | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (fix) => {
        if (cancelled) return;
        const position = {
          lat: fix.coords.latitude,
          lng: fix.coords.longitude,
          accuracyM: Math.round(fix.coords.accuracy),
          at: fix.timestamp || Date.now(),
        };
        useGame.getState().setLivePosition(position);

        const now = Date.now();
        const moved = lastSent
          ? distanceMeters(lastSent, position)
          : Number.POSITIVE_INFINITY;
        if (now - lastSentAt < MIN_INTERVAL_MS && moved < MIN_DISTANCE_M) {
          return;
        }

        useGame
          .getState()
          .updateLocation(position.lat, position.lng, position.accuracyM);
        lastSentAt = now;
        lastSent = { lat: position.lat, lng: position.lng };
      },
      (error) => {
        if (cancelled) return;
        if (error.code === error.PERMISSION_DENIED) {
          useGame
            .getState()
            .setPositionStatus(
              "denied",
              "Location permission is blocked. Allow it in your browser settings to appear on the map.",
            );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          useGame
            .getState()
            .setPositionStatus(
              "error",
              "No GPS fix yet. Move into the open and keep the screen on.",
            );
        } else {
          useGame
            .getState()
            .setPositionStatus(
              "error",
              "Location request timed out. Keep the screen open and try again.",
            );
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, session?.playerId]);

  return null;
}
