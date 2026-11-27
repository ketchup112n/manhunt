import { useEffect } from "react";
import { distanceMeters } from "@/lib/geo";
import { useGame, useYou } from "@/store/game";

/** Don't spam the socket; the server rebroadcasts once per second anyway. */
const MIN_INTERVAL_MS = 2000;
const MIN_DISTANCE_M = 5;
/** Backoff multiplier for GPS error recovery. */
const ERROR_BACKOFF_MS = 5000;
/** Maximum interval when stationary (reduces battery). */
const MAX_STATIONARY_INTERVAL_MS = 10_000;

interface WakeLockLike {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> };
};

/** Determine if the current role/phase needs high-accuracy GPS. */
function needsHighAccuracy(phase: string, role: string, status: string): boolean {
  if (phase !== "active") return false;
  if (status === "caught") return false;
  return role === "hunter" || role === "runner";
}

/** Determine if wake lock should be held for the current role/phase. */
function needsWakeLock(phase: string, role: string, status: string): boolean {
  if (phase !== "active") return false;
  if (status === "caught") return false;
  return role === "hunter" || role === "runner";
}

export function LocationSync() {
  const session = useGame((state) => state.session);
  const phase = useGame((state) => state.phase);
  const you = useYou();
  const enabled =
    Boolean(session) && (phase === "prep" || phase === "active");

  useEffect(() => {
    if (!enabled) {
      useGame.getState().setPositionStatus("idle");
      return;
    }

    const role = you?.role ?? "unassigned";
    const status = you?.status ?? "active";

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
    let consecutiveErrors = 0;
    let currentIntervalMs = MIN_INTERVAL_MS;

    const onFix = (fix: GeolocationPosition) => {
      if (cancelled) return;
      consecutiveErrors = 0;
      currentIntervalMs = MIN_INTERVAL_MS;

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

      // Adaptive interval: increase when stationary
      if (moved < MIN_DISTANCE_M) {
        currentIntervalMs = Math.min(currentIntervalMs * 1.5, MAX_STATIONARY_INTERVAL_MS);
      } else {
        currentIntervalMs = MIN_INTERVAL_MS;
      }

      if (now - lastSentAt < currentIntervalMs && moved < MIN_DISTANCE_M) {
        return;
      }

      store.updateLocation(position.lat, position.lng, position.accuracyM);
      lastSentAt = now;
      lastSent = { lat: position.lat, lng: position.lng };
    };

    const onError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      consecutiveErrors += 1;

      if (error.code === error.PERMISSION_DENIED) {
        useGame.getState().setLocationPermission("denied");
        useGame
          .getState()
          .setPositionStatus(
            "denied",
            "Location permission is blocked. Allow it in your browser settings to appear on the map.",
          );
        // Stop watching on permission denied
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        return;
      }

      if (error.code === error.POSITION_UNAVAILABLE) {
        // Back off on unavailable position
        const backoff = Math.min(ERROR_BACKOFF_MS * consecutiveErrors, 30_000);
        setTimeout(() => {
          if (!cancelled && watchId !== null) {
            startWatch();
          }
        }, backoff);
        useGame
          .getState()
          .setPositionStatus(
            "error",
            "No GPS fix yet. Move into the open and keep this tab in the foreground.",
          );
        return;
      }

      // TIMEOUT or other errors
      const backoff = Math.min(ERROR_BACKOFF_MS * consecutiveErrors, 30_000);
      setTimeout(() => {
        if (!cancelled && watchId !== null) {
          startWatch();
        }
      }, backoff);
      useGame
        .getState()
        .setPositionStatus(
          "error",
          "Location request timed out. Keep the screen open and try again.",
        );
    };

    const startWatch = () => {
      if (cancelled) return;
      try {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        const highAccuracy = needsHighAccuracy(phase, role, status);
        watchId = navigator.geolocation.watchPosition(onFix, onError, {
          enableHighAccuracy: highAccuracy,
          maximumAge: highAccuracy ? 2000 : 10_000,
          timeout: highAccuracy ? 15000 : 30_000,
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
      if (!needsWakeLock(phase, role, status)) return;
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

    const releaseWakeLock = () => {
      void wakeLock?.release().catch(() => {});
      wakeLock = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        // Tab hidden: release wake lock but keep watch (browser may suspend it)
        releaseWakeLock();
        return;
      }
      // Tab visible: restart watch and reacquire wake lock if needed
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
      releaseWakeLock();
    };
  }, [enabled, session?.playerId, phase, you?.role, you?.status]);

  return null;
}
