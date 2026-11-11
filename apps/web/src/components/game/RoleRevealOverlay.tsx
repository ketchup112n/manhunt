import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Crosshair, Radar, Rabbit } from "lucide-react";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { useGame, useYou } from "@/store/game";
import {
  REVEAL_HOLD_MS,
  revealCountdownSec,
  revealStage,
} from "@/lib/reveal";
import { cn } from "@/lib/cn";

/**
 * Full-screen, server-timed role reveal. Everyone sees the same suspense, then
 * each phone flips to its own role in the final seconds before the prep phase.
 */
export function RoleRevealOverlay() {
  const you = useYou();
  const players = useGame((state) => state.players);
  const code = useGame((state) => state.code);
  const revealEndsAt = useGame((state) => state.revealEndsAt);
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = Math.max(0, revealEndsAt - now);
  const stage = revealStage(remainingMs);
  const countdown = revealCountdownSec(remainingMs);
  const role = you?.role ?? "unassigned";
  const hunter = role === "hunter";
  const runner = role === "runner";
  const hunters = players.filter((player) => player.role === "hunter").length;
  const runners = players.filter((player) => player.role === "runner").length;
  const accent = hunter ? "var(--hunter)" : runner ? "var(--runner)" : "var(--info)";
  const holdPct = Math.min(
    100,
    Math.max(0, 100 - (remainingMs / REVEAL_HOLD_MS) * 100),
  );

  useEffect(() => {
    if (stage !== "revealed" || reduceMotion) return;
    const timer = window.setTimeout(() => {
      navigator.vibrate?.([40, 60, 140]);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [stage, reduceMotion]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-canvas">
      <div className="absolute inset-0 hud-grid opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,var(--canvas)_72%)]" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: stage === "revealed" ? 1 : 0,
          background: `radial-gradient(circle at 50% 45%, color-mix(in srgb, ${accent} 20%, transparent) 0%, transparent 62%)`,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 safe-top">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "size-1.5 animate-soft-pulse rounded-full",
              hunter ? "bg-hunter" : runner ? "bg-runner" : "bg-info",
            )}
          />
          <span className="label-mono text-muted">Deployment phase</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          Lobby {code}
        </span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <AnimatePresence mode="wait" initial={false}>
          {stage === "suspense" ? (
            <motion.div
              key="suspense"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-lg"
            >
              <div className="relative mx-auto flex size-[248px] items-center justify-center sm:size-[300px]">
                <div className="absolute inset-0 rounded-full border border-line/80" />
                <div className="absolute inset-[13%] rounded-full border border-line/60" />
                <div className="absolute inset-[27%] rounded-full border border-line/40" />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-[6%] rounded-full",
                    !reduceMotion && "animate-[spin_2.8s_linear_infinite]",
                  )}
                  style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, transparent 250deg, ${accent} 360deg)`,
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                    WebkitMask:
                      "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                  }}
                />
                <div className="relative flex flex-col items-center">
                  <Radar className="size-7 animate-soft-pulse text-muted" />
                  <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.3em] text-faint">
                    Assigning teams
                  </p>
                  <p className="mt-3 font-mono text-6xl tabular tracking-[-0.05em] text-ink sm:text-7xl">
                    {countdown}
                  </p>
                </div>
              </div>

              <h2 className="display mt-9 text-3xl font-semibold text-ink sm:text-4xl">
                Phones together.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
                Keep everyone in the circle. Roles drop on every screen at the
                same second.
              </p>
              <p className="mt-6 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                Hunters get pings / runners get a head start
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-full max-w-lg"
              aria-live="polite"
            >
              <div className="flex justify-center">
                {hunter ? (
                  <Crosshair className="size-10 text-hunter" />
                ) : runner ? (
                  <Rabbit className="size-10 text-runner" />
                ) : (
                  <Radar className="size-10 text-muted" />
                )}
              </div>

              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-faint">
                You are
              </p>
              <h2
                className={cn(
                  "display mt-3 text-6xl font-semibold uppercase leading-none tracking-[-0.02em] sm:text-8xl",
                  hunter ? "text-hunter" : runner ? "text-runner" : "text-muted",
                )}
              >
                {hunter ? "Hunter" : runner ? "Runner" : "Standby"}
              </h2>

              <p className="mx-auto mt-5 max-w-sm text-[13px] leading-relaxed text-muted">
                {hunter
                  ? "Hold at the staging point. The first runner ping starts the hunt."
                  : runner
                    ? "You have a head start. Break line of sight and stay moving."
                    : "You are watching this round from the field edge."}
              </p>

              <div className="mt-7 flex justify-center">
                <RoleBadge role={role} suffix="Deploying" />
              </div>

              <div className="mx-auto mt-8 h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-100 ease-linear",
                    hunter ? "bg-hunter" : runner ? "bg-runner" : "bg-info",
                  )}
                  style={{ width: `${holdPct}%` }}
                />
              </div>
              <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                {hunters} hunters / {runners} runners
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>,
    document.body,
  );
}
