import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Crosshair, Radar, Rabbit } from "lucide-react";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { Button } from "@/components/ui/Button";
import { useGame, useYou } from "@/store/game";
import {
  REVEAL_HOLD_MS,
  REVEAL_TOTAL_MS,
  revealHoldSec,
  revealStage,
  revealSuspenseSec,
} from "@/lib/reveal";
import { cn } from "@/lib/cn";

const SPARK_COUNT = 22;

/** Deterministic pseudo-random in [0, 1) so renders stay pure. */
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Full-screen, server-timed role reveal. Everyone sees the same suspense, then
 * each phone flips to its own role in the final seconds before the prep phase.
 */
export function RoleRevealOverlay() {
  const you = useYou();
  const players = useGame((state) => state.players);
  const code = useGame((state) => state.code);
  const revealEndsAt = useGame((state) => state.revealEndsAt);
  const connection = useGame((state) => state.connection);
  const dismissReveal = useGame((state) => state.dismissReveal);
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [scan, setScan] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  // The reveal is presentation-only: keep it up until its own clock runs out,
  // even if the server has already moved to prep or active underneath.
  const active = revealEndsAt > 0 && now < revealEndsAt;
  const remainingMs = active
    ? Math.min(REVEAL_TOTAL_MS, revealEndsAt - now)
    : 0;
  const stage = revealStage(remainingMs);
  const suspenseSec = revealSuspenseSec(remainingMs);
  const holdSec = revealHoldSec(remainingMs);
  const role = you?.role ?? "unassigned";
  const hunter = role === "hunter";
  const runner = role === "runner";
  const roleAccent = hunter
    ? "var(--hunter)"
    : runner
      ? "var(--runner)"
      : "var(--info)";
  // Keep the suspense neutral so the colour does not spoil the role.
  const accent = stage === "revealed" ? roleAccent : "var(--info)";
  const hunters = players.filter((player) => player.role === "hunter").length;
  const runners = players.filter((player) => player.role === "runner").length;
  const holdPct = Math.min(
    100,
    Math.max(0, 100 - (remainingMs / REVEAL_HOLD_MS) * 100),
  );

  const names = useMemo(() => players.map((player) => player.name), [players]);
  const scanName = names.length > 0 ? names[scan % names.length] : "FIELD";

  const sparks = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, (_, index) => {
        const angle =
          (Math.PI * 2 * index) / SPARK_COUNT + (noise(index) - 0.5) * 0.5;
        const distance = 80 + noise(index + 11) * 150;
        return {
          id: index,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 3 + noise(index + 23) * 5,
          delay: noise(index + 37) * 0.12,
        };
      }),
    [],
  );

  useEffect(() => {
    if (!active || stage !== "suspense") return;
    const timer = window.setInterval(
      () => setScan((value) => value + 1),
      420,
    );
    return () => window.clearInterval(timer);
  }, [active, stage]);

  useEffect(() => {
    if (!active || stage !== "revealed" || reduceMotion) return;
    const timer = window.setTimeout(() => {
      navigator.vibrate?.([40, 60, 140]);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [active, stage, reduceMotion]);

  if (!active) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-canvas">
      <div className="absolute inset-0 hud-grid opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,var(--canvas)_72%)]" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />

      {stage === "revealed" && !reduceMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[150vmax] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg 16deg, color-mix(in srgb, ${roleAccent} 8%, transparent) 16deg 22deg, transparent 22deg 40deg)`,
          }}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{
            opacity: { duration: 0.4 },
            rotate: { duration: 46, repeat: Infinity, ease: "linear" },
          }}
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: stage === "revealed" ? 1 : 0,
          background: `radial-gradient(circle at 50% 45%, color-mix(in srgb, ${roleAccent} 22%, transparent) 0%, transparent 62%)`,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 safe-top">
        <div className="flex items-center gap-3">
          <span
            className="size-1.5 animate-soft-pulse rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="label-mono text-muted">Deployment phase</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          {connection === "connected" ? `Lobby ${code}` : "Reconnecting"}
        </span>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <AnimatePresence mode="wait" initial={false}>
          {stage === "suspense" ? (
            <motion.div
              key="suspense"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
            >
              <div className="relative mx-auto flex size-[248px] items-center justify-center sm:size-[300px]">
                {[0, 1, 2].map((index) => (
                  <motion.span
                    key={index}
                    aria-hidden
                    className="absolute inset-0 rounded-full border"
                    style={{
                      borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
                    }}
                    initial={{ opacity: 0.45, scale: 1 }}
                    animate={
                      reduceMotion
                        ? { opacity: 0.2, scale: 1.08 }
                        : { opacity: [0.45, 0], scale: [1, 1.45] }
                    }
                    transition={{
                      duration: 2.4,
                      repeat: reduceMotion ? 0 : Infinity,
                      delay: index * 0.8,
                      ease: "easeOut",
                    }}
                  />
                ))}

                <div className="absolute inset-0 rounded-full border border-line/80" />
                <div className="absolute inset-[13%] rounded-full border border-line/60" />
                <div className="absolute inset-[27%] rounded-full border border-line/40" />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-[6%] rounded-full",
                    !reduceMotion && "animate-[spin_2.4s_linear_infinite]",
                  )}
                  style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, transparent 244deg, ${accent} 360deg)`,
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
                  <motion.p
                    key={suspenseSec}
                    initial={reduceMotion ? false : { scale: 1.18, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.28 }}
                    className="mt-2 font-mono text-6xl tabular tracking-[-0.05em] text-ink sm:text-7xl"
                  >
                    {suspenseSec}
                  </motion.p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.24em] text-faint">
                    Until roles drop
                  </p>
                </div>
              </div>

              <div className="mt-7 flex items-center justify-center gap-2 font-mono text-[8px] uppercase tracking-[0.24em] text-faint">
                <span>Locking in</span>
                <span className="min-w-[9ch] text-left text-runner">
                  {scanName}
                  <span className="animate-soft-pulse">_</span>
                </span>
              </div>

              <h2 className="display mt-6 text-3xl font-semibold text-ink sm:text-4xl">
                Phones together.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
                Keep everyone in the circle. Roles drop on every screen at the
                same second.
              </p>
              <p className="mt-5 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                Hunters get pings / runners get a head start
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.82, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 210, damping: 15 }}
              className="relative w-full max-w-lg"
              aria-live="polite"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${roleAccent} 28%, transparent)`,
                }}
              />

              <motion.div
                className="relative flex justify-center"
                animate={
                  reduceMotion ? undefined : { y: [0, -7, 0], rotate: [0, -4, 0] }
                }
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                {hunter ? (
                  <Crosshair className="size-11 text-hunter" />
                ) : runner ? (
                  <Rabbit className="size-11 text-runner" />
                ) : (
                  <Radar className="size-11 text-muted" />
                )}
              </motion.div>

              <p className="relative mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-faint">
                You are
              </p>
              <h2
                className={cn(
                  "display relative mt-3 text-6xl font-semibold uppercase leading-none tracking-[-0.02em] sm:text-8xl",
                  hunter ? "text-hunter" : runner ? "text-runner" : "text-muted",
                )}
                style={{
                  textShadow: `0 0 42px color-mix(in srgb, ${roleAccent} 55%, transparent)`,
                }}
              >
                {hunter ? "Hunter" : runner ? "Runner" : "Standby"}
              </h2>

              <p className="relative mx-auto mt-5 max-w-sm text-[13px] leading-relaxed text-muted">
                {hunter
                  ? "Hold at the staging point. The first runner ping starts the hunt."
                  : runner
                    ? "You have a head start. Break line of sight and stay moving."
                    : "You are watching this round from the field edge."}
              </p>

              <div className="relative mt-7 flex justify-center">
                <RoleBadge role={role} suffix="Deploying" />
              </div>

              <div className="relative mx-auto mt-8 h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-100 ease-linear",
                    hunter ? "bg-hunter" : runner ? "bg-runner" : "bg-info",
                  )}
                  style={{ width: `${holdPct}%` }}
                />
              </div>
              <p className="relative mt-3 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                Deploying in {holdSec}s
              </p>
              <p className="relative mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                {hunters} hunters / {runners} runners
              </p>

              <div className="relative mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={dismissReveal}
                >
                  Continue to the field
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {stage === "revealed" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
        >
          {!reduceMotion ? (
            <>
              <motion.div
                className="absolute inset-0"
                style={{ backgroundColor: roleAccent }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.32, 0] }}
                transition={{ duration: 0.65, times: [0, 0.12, 1] }}
              />

              {[0, 1].map((index) => (
                <motion.span
                  key={index}
                  className="absolute left-1/2 top-1/2 rounded-full border-2"
                  style={{
                    width: 280,
                    height: 280,
                    marginLeft: -140,
                    marginTop: -140,
                    borderColor: roleAccent,
                  }}
                  initial={{ scale: 0.4, opacity: 0.7 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  transition={{
                    duration: 1.1,
                    delay: index * 0.16,
                    ease: "easeOut",
                  }}
                />
              ))}

              {sparks.map((spark) => (
                <motion.span
                  key={spark.id}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: spark.size,
                    height: spark.size,
                    backgroundColor: roleAccent,
                  }}
                  initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
                  animate={{
                    x: spark.x,
                    y: spark.y,
                    opacity: 0,
                    scale: 0.2,
                  }}
                  transition={{
                    duration: 0.95,
                    delay: spark.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
