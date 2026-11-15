import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/store/game";

const DISMISS_KEY = "manhunt-location-prompt-dismissed";

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Entry-level location prompt. The browser only shows its native permission
 * dialog after a user gesture, so this surfaces a clear action as soon as the
 * site opens. Inside a round the GPS banner takes over with the same retry.
 */
export function LocationGate() {
  const { pathname } = useLocation();
  const permission = useGame((state) => state.locationPermission);
  const setLocationPermission = useGame(
    (state) => state.setLocationPermission,
  );
  const requestLocationAccess = useGame(
    (state) => state.requestLocationAccess,
  );
  const phase = useGame((state) => state.phase);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(
    () =>
      typeof navigator === "undefined" ||
      !navigator.permissions?.query,
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationPermission("unsupported");
      return;
    }
    if (!navigator.permissions?.query) {
      return;
    }

    let active = true;
    let status: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (!active) return;
        status = result;
        const apply = () => {
          setLocationPermission(
            result.state === "granted"
              ? "granted"
              : result.state === "denied"
                ? "denied"
                : "unknown",
          );
        };
        apply();
        result.onchange = apply;
        setChecked(true);
      })
      .catch(() => {
        // Safari has no geolocation permission query; the CTA still works.
        setChecked(true);
      });

    return () => {
      active = false;
      if (status) status.onchange = null;
    };
  }, [setLocationPermission]);

  const inGame =
    pathname.startsWith("/game") ||
    phase === "reveal" ||
    phase === "prep" ||
    phase === "active";

  const suppressed =
    pathname.startsWith("/results") || pathname.startsWith("/settings");

  if (!checked) return null;
  if (permission === "granted" || permission === "unsupported") return null;
  if (suppressed) return null;
  // Once a round is starting the modal would cover the field. The in-game
  // GpsBanner owns the persistent prompt (with retry) at that point.
  if (inGame || dismissed) return null;

  const enable = async () => {
    setBusy(true);
    await requestLocationAccess();
    setBusy(false);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  };

  const denied = permission === "denied";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-line-strong/60 bg-surface shadow-[0_40px_120px_rgb(0_0_0/0.55)]">
        <div className="relative overflow-hidden border-b border-line px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--runner)_10%,transparent),transparent_70%)]" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[3px] border border-runner/30 bg-runner/10 text-runner">
              <LocateFixed className="size-5" />
            </span>
            <div>
              <p className="label-mono text-runner">Live location</p>
              <h2 className="mt-0.5 font-display text-xl font-semibold uppercase leading-none text-ink">
                {denied ? "Location is blocked" : "Turn on location"}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-[12px] leading-relaxed text-muted">
            {denied
              ? "Your browser has blocked location for this site. Open the site controls (the lock or aA icon in the address bar), allow Location, then retry."
              : "MANHUNT places you on the field with your phone's GPS. Runners and hunters only see positions during the round — you can enable location now or before you deploy."}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="runner"
              className="flex-1"
              onClick={() => void enable()}
              disabled={busy}
            >
              <LocateFixed className="size-4" />
              {busy ? "Requesting…" : denied ? "Retry location" : "Enable location"}
            </Button>
            {!denied ? (
              <Button variant="secondary" className="flex-1" onClick={dismiss}>
                Not now
              </Button>
            ) : null}
          </div>
          {denied ? (
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full text-center font-mono text-[8px] uppercase tracking-[0.14em] text-faint transition-colors hover:text-muted"
            >
              Continue without location
            </button>
          ) : null}
          <p className="mt-3 text-center font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
            Requires HTTPS · never shared outside your lobby
          </p>
        </div>
      </div>
    </div>
  );
}
