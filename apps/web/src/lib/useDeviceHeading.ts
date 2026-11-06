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

/** Compass heading clockwise from north, or null when the event has no usable value. */
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

/**
 * Subscribes to the device orientation sensor and writes the compass heading
 * into the game store. iOS requires a user gesture before the sensor can be
 * read, so `enable` must be called from a click handler on those devices.
 */
export function useDeviceHeading() {
  const setDeviceHeading = useGame((state) => state.setDeviceHeading);
  const [status, setStatus] = useState<HeadingStatus>(() => {
    const ctor = orientationConstructor();
    if (!ctor) return "unsupported";
    return typeof ctor.requestPermission === "function"
      ? "needs-permission"
      : "listening";
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
    if (!ctor || typeof ctor.requestPermission === "function") {
      return () => cleanupRef.current?.();
    }
    listen();
    return () => cleanupRef.current?.();
  }, [listen]);

  const enable = useCallback(async () => {
    const ctor = orientationConstructor();
    if (!ctor) return;
    setStatus("pending");
    try {
      if (typeof ctor.requestPermission === "function") {
        const result = await ctor.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      }
      listen();
      setStatus("listening");
    } catch {
      setStatus("denied");
    }
  }, [listen]);

  return { status, enable };
}
