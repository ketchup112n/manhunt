import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/store/game";

export type HeadingStatus =
  | "unsupported"
  | "needs-permission"
  | "pending"
  | "listening"
  | "live"
  | "denied";

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

function orientationConstructor(): OrientationConstructor | null {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return null;
  }
  return window.DeviceOrientationEvent as OrientationConstructor;
}

/** Heading clockwise from north, or null when the event has no usable value. */
function headingFromEvent(event: DeviceOrientationEvent): number | null {
  const webkitHeading = (
    event as DeviceOrientationEvent & { webkitCompassHeading?: number }
  ).webkitCompassHeading;
  if (typeof webkitHeading === "number" && Number.isFinite(webkitHeading)) {
    return ((webkitHeading % 360) + 360) % 360;
  }
  if (typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return (((360 - event.alpha) % 360) + 360) % 360;
  }
  return null;
}

const FACING_PREF_KEY = "manhunt.facing";

function readFacingPref(): "granted" | "denied" | null {
  try {
    const value = window.localStorage.getItem(FACING_PREF_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function writeFacingPref(value: "granted" | "denied"): void {
  try {
    window.localStorage.setItem(FACING_PREF_KEY, value);
  } catch {
    // Storage can be unavailable in private mode; facing still works.
  }
}

/**
 * Subscribes to the device orientation sensor and writes the heading into the
 * game store. Facing turns on by itself: platforms that gate the sensor behind
 * a gesture (iOS) are asked on the first tap anywhere on the page, and a
 * previous grant is remembered so the control never has to be clicked again.
 */
export function useDeviceHeading() {
  const setDeviceHeading = useGame((state) => state.setDeviceHeading);
  const [status, setStatus] = useState<HeadingStatus>(() => {
    const ctor = orientationConstructor();
    if (!ctor) return "unsupported";
    if (typeof ctor.requestPermission !== "function") return "listening";
    return readFacingPref() === "denied" ? "denied" : "needs-permission";
  });
  const cleanupRef = useRef<(() => void) | null>(null);

  const listen = useCallback(() => {
    cleanupRef.current?.();
    if (typeof window === "undefined") return;

    const handler = (event: DeviceOrientationEvent) => {
      const heading = headingFromEvent(event);
      if (heading === null) return;
      setDeviceHeading(heading);
      setStatus("live");
    };

    const absoluteSupported = "ondeviceorientationabsolute" in window;
    const eventName = absoluteSupported
      ? "deviceorientationabsolute"
      : "deviceorientation";
    window.addEventListener(eventName, handler);

    cleanupRef.current = () => {
      window.removeEventListener(eventName, handler);
    };
  }, [setDeviceHeading]);

  useEffect(() => {
    const ctor = orientationConstructor();
    if (!ctor) return () => cleanupRef.current?.();

    if (typeof ctor.requestPermission !== "function") {
      listen();
      return () => cleanupRef.current?.();
    }

    if (readFacingPref() === "denied") {
      return () => cleanupRef.current?.();
    }

    const requestPermission = ctor.requestPermission.bind(ctor);
    let cancelled = false;
    let armed = true;

    const disarm = () => {
      armed = false;
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    };

    const attempt = async (fromGesture: boolean) => {
      try {
        const result = await requestPermission();
        if (cancelled) return;
        if (result === "granted") {
          writeFacingPref("granted");
          listen();
          setStatus("listening");
          disarm();
        } else if (fromGesture) {
          writeFacingPref("denied");
          setStatus("denied");
          disarm();
        }
      } catch {
        if (cancelled || !fromGesture) return;
        writeFacingPref("denied");
        setStatus("denied");
        disarm();
      }
    };

    const onGesture = () => {
      if (!armed) return;
      armed = false;
      void attempt(true);
    };

    // Some browsers (and installed PWAs) grant without a gesture.
    void attempt(false);
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("keydown", onGesture, true);

    return () => {
      cancelled = true;
      disarm();
      cleanupRef.current?.();
    };
  }, [listen]);

  const enable = useCallback(async () => {
    const ctor = orientationConstructor();
    if (!ctor) return;
    setStatus("pending");
    try {
      if (typeof ctor.requestPermission === "function") {
        const result = await ctor.requestPermission();
        if (result !== "granted") {
          writeFacingPref("denied");
          setStatus("denied");
          return;
        }
      }
      writeFacingPref("granted");
      listen();
      setStatus("listening");
    } catch {
      writeFacingPref("denied");
      setStatus("denied");
    }
  }, [listen]);

  return { status, enable };
}
