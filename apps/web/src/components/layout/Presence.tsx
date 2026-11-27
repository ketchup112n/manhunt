import { useEffect } from "react";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { usePresence } from "@/store/presence";
import { useSplash } from "@/store/splash";

/** How often an active tab reports that it is still open. */
const HEARTBEAT_MS = 15_000;
/** sessionStorage key so a reload in the same tab keeps the same id. */
const ID_KEY = "manhunt-presence-id";

function presenceId(): string {
  try {
    const existing = window.sessionStorage.getItem(ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(ID_KEY, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Keeps the shared online count fresh while the tab is visible. Mounted once at
 * the app root; the count itself is rendered by `PresenceBadge`.
 */
export function PresenceSync() {
  useEffect(() => {
    const id = presenceId();
    let stopped = false;

    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
          cache: "no-store",
          keepalive: true,
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          online?: number;
          splash?: string;
        };
        if (!stopped && typeof data.online === "number") {
          usePresence.getState().setOnline(data.online);
        }
        if (!stopped && typeof data.splash === "string" && data.splash) {
          useSplash.getState().setText(data.splash);
        }
      } catch {
        // Offline or server waking; the next beat retries.
      }
    };

    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void beat();
    };
    const onPageHide = () => {
      try {
        navigator.sendBeacon?.(
          "/api/presence",
          new Blob([JSON.stringify({ id, leave: true })], {
            type: "application/json",
          }),
        );
      } catch {
        // Best effort only; expiry handles anything that is missed.
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}

/** Small live chip for the top bar. */
export function PresenceBadge({ className }: { className?: string }) {
  const online = usePresence((state) => state.online);
  const label = online === null ? "— online" : `${online} online`;

  return (
    <Chip
      tone="runner"
      className={cn("tabular", className)}
      title="Tabs with the site open right now"
    >
      <span className="size-1.5 shrink-0 animate-soft-pulse rounded-full bg-current" />
      {label}
    </Chip>
  );
}
