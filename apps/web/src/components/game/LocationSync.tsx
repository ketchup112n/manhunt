import { useEffect } from "react";
import { distanceMeters } from "@/lib/geo";
import { useGame } from "@/store/game";

/** Don't spam the socket; the server rebroadcasts once per second anyway. */
const MIN_INTERVAL_MS = 2000;
const MIN_DISTANCE_M = 5;

interface WakeLockLike {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> };
};

/**
 * Streams the device's GPS fix to the lobby server while a round is in prep or
 * active. Also keeps the screen awake and re-acquires the watch whenever the
 * tab returns to the foreground.
 *
 * Note: mobile browsers suspend JavaScript and geolocation when the tab is
 * backgrounded, so no web app can truly track in the background. The wake lock
 * stops the screen from sleeping, and the visibility handler resumes the watch
 * as soon as the player returns.
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
        .setLocationPermission("unsupported");
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
    let watchId: number | null = null;
    let lastSentAt = 0;
    let lastSent: { lat: number; lng: number } | null = null;
    let wakeLock: WakeLockLike | null = null;

    const onFix = (fix: GeolocationPosition) => {
      if (cancelled) return;
      const position = {
        lat: fix.coords.latitude,
        lng: fix.coords.longitude,
        accuracyM: Math.round(fix.coords.accuracy),
        at: fix.timestamp || Date.now(),
      };
      const store = useGame.getState();
      store.setLocationPermission("granted");
      store.setLivePosition(position);

      const now = Date.now();
      const moved = lastSent
        ? distanceMeters(lastSent, position)
        : Number.POSITIVE_INFINITY;
      if (now - lastSentAt < MIN_INTERVAL_MS && moved < MIN_DISTANCE_M) {
        return;
      }

      store.updateLocation(position.lat, position.lng, position.accuracyM);
      lastSentAt = now;
      lastSent = { lat: position.lat, lng: position.lng };
    };

    const onError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      if (error.code === error.PERMISSION_DENIED) {
        useGame.getState().setLocationPermission("denied");
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
            "No GPS fix yet. Move into the open and keep this tab in the foreground.",
          );
      } else {
        useGame
          .getState()
          .setPositionStatus(
            "error",
            "Location request timed out. Keep the screen open and try again.",
          );
      }
    };

    const startWatch = () => {
      if (cancelled) return;
      try {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = navigator.geolocation.watchPosition(onFix, onError, {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 15000,
        });
      } catch {
        useGame
          .getState()
          .setPositionStatus(
            "error",
            "Location could not start. Check your browser permissions and retry.",
          );
      }
    };

    const acquireWakeLock = async () => {
      const api = (navigator as WakeLockNavigator).wakeLock;
      if (!api || document.visibilityState !== "visible") return;
      try {
        const lock = await api.request("screen");
        if (cancelled) {
          void lock.release().catch(() => {});
          return;
        }
        wakeLock = lock;
        lock.addEventListener?.("release", () => {
          if (wakeLock === lock) wakeLock = null;
        });
      } catch {
        // Wake lock is a progressive enhancement (iOS Safari may reject it).
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      // iOS and Android may silently stop the watch while hidden. Starting a
      // fresh watch on return is the most reliable web-only recovery.
      startWatch();
      void acquireWakeLock();
    };

    startWatch();
    void acquireWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      void wakeLock?.release().catch(() => {});
    };
  }, [enabled, session?.playerId]);

  return null;
}
