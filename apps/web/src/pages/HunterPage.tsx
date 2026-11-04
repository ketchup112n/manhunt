import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CheckCheck,
  ChevronRight,
  Clock3,
  Crosshair,
  Flag,
  HeartPulse,
  LogOut,
  Menu,
  Radar,
  RefreshCcw,
  Shield,
  Signal,
  Siren,
  X,
} from "lucide-react";
import { HunterMap } from "@/components/game/HunterMap";
import { EndMatchModal } from "@/components/game/EndMatchModal";
import { ZonePanel, ZoneRuleNote, ZoneStatusChip } from "@/components/game/ZoneHud";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import {
  DEMO_CENTER,
  getRunnerPositions,
  distanceMeters,
  formatAgo,
  formatClock,
  formatDistance,
  formatLongClock,
  formatRadius,
} from "@/lib/geo";
import { useGame, useYou, useZoneState } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import type { RunnerSignal } from "@/lib/types";
import { cn } from "@/lib/cn";

export function HunterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const players = useGame((state) => state.players);
  const settings = useGame((state) => state.settings);
  const units = usePreferences((state) => state.units);
  const timeLeftSec = useGame((state) => state.timeLeftSec);
  const nextPingSec = useGame((state) => state.nextPingSec);
  const lastPingAgo = useGame((state) => state.lastPingAgo);
  const pingCount = useGame((state) => state.pingCount);
  const pingExpiresAt = useGame((state) => state.pingExpiresAt);
  const endGame = useGame((state) => state.endGame);
  const phase = useGame((state) => state.phase);
  const zone = useZoneState();
  const you = useYou();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [pingWindowOpen, setPingWindowOpen] = useState(false);
  const [tagCode, setTagCode] = useState("");
  const [flash, setFlash] = useState(false);
  const previousPing = useRef(pingCount);

  const hunters = players.filter((player) => player.role === "hunter");
  const activeRunners = players.filter(
    (player) => player.role === "runner" && player.status === "active",
  );
  const awaitingFirstPing = pingCount === 0;

  useEffect(() => {
    if (!pingExpiresAt) return;
    let expiryTimer: number | undefined;
    const syncTimer = window.setTimeout(() => {
      const remaining = pingExpiresAt - Date.now();
      setPingWindowOpen(phase === "active" && pingCount > 0 && remaining > 0);
      if (remaining > 0) {
        expiryTimer = window.setTimeout(() => setPingWindowOpen(false), remaining);
      }
    }, 0);
    return () => {
      window.clearTimeout(syncTimer);
      if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
    };
  }, [pingExpiresAt, phase, pingCount]);

  const signals = useMemo<RunnerSignal[]>(
    () =>
      !pingWindowOpen
        ? []
        : activeRunners
            .map((player) => {
              const position = getRunnerPositions([player]).find((p) => p.id === player.id);
              if (!position) return null;
              return {
                id: player.id,
                name: player.name,
                lat: position.lat,
                lng: position.lng,
                accuracyM: position.accuracyM ?? 10,
                seenAt: lastPingAgo,
              };
            })
            .filter((signal): signal is RunnerSignal => Boolean(signal)),
    [activeRunners, lastPingAgo, pingWindowOpen],
  );

  useEffect(() => {
    if (phase === "ended") navigate("/results");
  }, [phase, navigate]);

  useEffect(() => {
    if (pingCount > previousPing.current) {
      setFlash(true);
      toast("Location ping received", {
        description: `${activeRunners.length} runner signals refreshed on the map.`,
        tone: "success",
      });
      const timer = window.setTimeout(() => setFlash(false), 2400);
      previousPing.current = pingCount;
      return () => window.clearTimeout(timer);
    }
    previousPing.current = pingCount;
  }, [pingCount, activeRunners.length, toast]);

  const pingProgress = settings.pingSec === 0 ? 1 : nextPingSec / settings.pingSec;
  const allCaught = activeRunners.length === 0;

  const openTag = () => {
    setTagCode("");
    setTagOpen(true);
  };

  const submitTag = () => {
    useGame.getState().submitTagCode(tagCode);
    setTagCode("");
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-canvas lg:flex-row">
      <div className="relative min-h-0 flex-1">
        <HunterMap
          hunters={hunters}
          runners={signals}
          playAreaM={settings.playAreaM}
          pingKey={pingCount}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(4,9,10,0.62),transparent_30%,transparent_70%,rgba(4,9,10,0.3))]" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] px-3 pt-3 safe-top sm:px-4">
          <div className="pointer-events-auto mx-auto flex max-w-5xl items-start justify-between gap-2">
            <div className="flex items-center gap-2 rounded-[3px] border border-line-strong/60 bg-surface/90 p-1.5 pr-3 shadow-lg backdrop-blur-md">
              <RoleBadge role="hunter" compact />
              <div className="hidden sm:block">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink">
                  ECHO / FIELD
                </p>
                <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                  Hunter channel
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <ZoneStatusChip tone="hunter" />

              <div className="flex items-center gap-2 rounded-[3px] border border-line-strong/60 bg-surface/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                <ProgressRing
                  progress={pingProgress}
                  size={30}
                  stroke={2}
                  color="var(--hunter)"
                >
                  <Radar className="size-3 text-hunter" />
                </ProgressRing>
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-faint">
                    Next ping
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tabular text-ink">
                    {formatClock(nextPingSec)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-[3px] border border-line-strong/60 bg-surface/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                <Clock3 className="size-3.5 text-faint" />
                <div>
                  <p className="hidden font-mono text-[7px] uppercase tracking-[0.18em] text-faint sm:block">
                    Round
                  </p>
                  <p className="font-mono text-[10px] tabular text-ink">
                    {formatLongClock(timeLeftSec)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Field menu"
                onClick={() => setMenuOpen(true)}
                className="flex size-[46px] items-center justify-center rounded-[3px] border border-line-strong/60 bg-surface/90 text-muted shadow-lg backdrop-blur-md transition-colors hover:text-ink"
              >
                <Menu className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {flash ? (
            <motion.button
              type="button"
              onClick={() => setFlash(false)}
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="absolute left-1/2 top-24 z-[410] -translate-x-1/2 rounded-[3px] border border-hunter/50 bg-surface/95 px-4 py-2 text-center shadow-[0_0_40px_color-mix(in_srgb,var(--hunter)_20%,transparent)] backdrop-blur-md"
            >
              <p className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-hunter">
                <Siren className="size-3.5" />
                Location ping received
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
                {activeRunners.length} signals refreshed
              </p>
            </motion.button>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-none absolute left-3 top-1/2 z-[390] hidden -translate-y-1/2 flex-col gap-2 lg:flex">
          <div className="rounded-[2px] border border-line-strong/50 bg-surface/85 px-2.5 py-2 backdrop-blur-md">
            <Legend tone="runner" label="Runner ping" />
            <Legend tone="hunter" label="Hunter" />
            <Legend tone="self" label="You" />
          </div>
          <div className="rounded-[2px] border border-line-strong/50 bg-surface/85 px-2.5 py-2 text-center backdrop-blur-md">
            <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">Last ping</p>
            <p className="mt-1 font-mono text-[9px] tabular text-ink">
              {pingCount === 0 ? "No ping yet" : formatAgo(lastPingAgo)}
            </p>
          </div>
        </div>
      </div>

      <aside className="relative z-[420] flex h-[46dvh] shrink-0 flex-col border-t border-line bg-surface shadow-[0_-24px_80px_rgb(0_0_0/0.32)] lg:h-auto lg:w-[390px] lg:border-l lg:border-t-0 lg:shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="label-mono mb-1">Field intel</p>
            <h1 className="font-display text-xl font-semibold uppercase leading-none tracking-[0.03em] text-ink">
              Runner signals
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Chip tone="runner" dot>
              {activeRunners.length} active
            </Chip>
            <Chip tone="hunter">{pingCount} pings</Chip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="hidden border-b border-line px-4 py-3.5 lg:block">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                Ping cycle
              </span>
              <span className="font-mono text-[9px] tabular text-ink">
                {formatClock(nextPingSec)} / {formatClock(settings.pingSec)}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-hunter transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.min(100, pingProgress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted">
              Next runner coordinates in{" "}
              <span className="text-ink">{formatClock(nextPingSec)}</span>. Stay moving.
            </p>
          </div>

          <div className="space-y-2 p-3">
            <ZonePanel tone="hunter" />

            {signals.map((signal) => {
              const distance = distanceMeters(DEMO_CENTER, signal);
              return (
                <div
                  key={signal.id}
                  className="group relative overflow-hidden rounded-[3px] border border-line bg-surface-2/45 px-3 py-3 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex size-8 shrink-0 items-center justify-center">
                      <span className="absolute inset-0 animate-ping rounded-full border border-runner/20" />
                      <span className="flex size-7 items-center justify-center rounded-full border border-runner/30 bg-runner/10 font-mono text-[8px] text-runner">
                        {signal.id.slice(0, 2).toUpperCase()}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink">
                          {signal.name}
                        </p>
                        <Chip tone="runner" className="h-4 px-1.5 text-[7px]">
                          Located
                        </Chip>
                      </div>
                      <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
                        Seen {formatAgo(signal.seenAt)} / ±{signal.accuracyM}m
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] tabular text-ink">
                        {formatDistance(distance, units)}
                      </p>
                      <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
                        From you
                      </p>
                    </div>
                    <ChevronRight className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}

            {signals.length === 0 ? (
              awaitingFirstPing ? (
                <div className="rounded-[3px] border border-line bg-surface-2/40 px-4 py-6 text-center">
                  <Radar className="mx-auto size-5 animate-soft-pulse text-hunter" />
                  <p className="mt-3 font-display text-lg font-semibold uppercase text-ink">
                    No intel yet
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    First runner ping in{" "}
                    <span className="text-ink">{formatClock(nextPingSec)}</span>. Scan the
                    field until then.
                  </p>
                </div>
              ) : activeRunners.length > 0 ? (
                <div className="rounded-[3px] border border-line bg-surface-2/40 px-4 py-6 text-center">
                  <Radar className="mx-auto size-5 text-faint" />
                  <p className="mt-3 font-display text-lg font-semibold uppercase text-ink">
                    Ping window closed
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    Runner positions are hidden until the next ping in {formatClock(nextPingSec)}.
                  </p>
                </div>
              ) : (
                <div className="rounded-[3px] border border-runner/25 bg-runner/5 px-4 py-6 text-center">
                  <CheckCheck className="mx-auto size-5 text-runner" />
                  <p className="mt-3 font-display text-lg font-semibold uppercase text-ink">
                    Field clear
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    Every active runner has been caught.
                  </p>
                </div>
              )
            ) : null}

            <div className="rounded-[3px] border border-line bg-canvas/25 px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                  <Signal className="size-3" />
                  Signal quality
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-runner">
                  Nominal
                </span>
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 flex-1 rounded-[1px]",
                      index < 10 ? "bg-runner/70" : "bg-line-strong",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="hidden pt-2 lg:block">
              <p className="label-mono mb-2">Field log</p>
              <div className="space-y-2">
                <LogRow time="00:42" text="WREN signal acquired" tone="runner" />
                <LogRow time="02:18" text="KILO moved 180 m north" tone="hunter" />
                <LogRow time="04:10" text="Ping cycle complete" tone="neutral" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-surface/95 p-3 safe-bottom">
          {allCaught ? (
            <Button
              variant="runner"
              size="lg"
              full
              onClick={() => {
                endGame("hunters");
                navigate("/results");
              }}
            >
              <Flag className="size-4" />
              End operation
            </Button>
          ) : (
            <>
              <Button
                variant="hunter"
                size="lg"
                full
                onClick={openTag}
                className="justify-between px-4"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-black/15">
                    <Crosshair className="size-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-[11px]">Initiate tag</span>
                    <span className="mt-0.5 block font-mono text-[8px] font-normal tracking-[0.1em] opacity-70">
                      Enter runner PIN
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4" />
              </Button>
              <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                {activeRunners.length} runners active
              </p>
            </>
          )}
        </div>
      </aside>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        eyebrow="Field controls"
        title="Hunter menu"
        description="Prototype navigation and round controls."
      >
        <div className="space-y-1.5">
          <MenuRow
            icon={Shield}
            title="Operation rules"
            description={`${Math.round(settings.pingSec / 60)} min ping / ${formatRadius(settings.playAreaM, units)} area`}
            onClick={() => {
              setMenuOpen(false);
              setRulesOpen(true);
            }}
          />
          {you?.isHost ? (
            <MenuRow
              icon={Flag}
              title="End match early"
              description="Choose the winner and finish now"
              danger
              onClick={() => {
                setMenuOpen(false);
                setEndMatchOpen(true);
              }}
            />
          ) : null}
          <MenuRow
            icon={RefreshCcw}
            title="Replay ping"
            description="Trigger a mock location ping"
            onClick={() => {
              useGame.getState().triggerPing();
              setMenuOpen(false);
            }}
          />
          <MenuRow
            icon={LogOut}
            title="Abandon operation"
            description="Return to home without saving"
            danger
            onClick={() => navigate("/")}
          />
        </div>
      </Sheet>

      <Modal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        eyebrow="Operation rules"
        title="Field protocol"
      >
        <div className="space-y-2">
          <RuleRow label="Ping interval" value={`${Math.round(settings.pingSec / 60)} min`} />
          <RuleRow label="Round duration" value={formatLongClock(settings.durationSec)} />
          <RuleRow label="Play area" value={`${formatRadius(settings.playAreaM, units)} radius`} />
          <RuleRow
            label="Shrinking zone"
            value={
              zone.enabled
                ? `On · −${zone.shrinkStepM} m / ${Math.round(zone.intervalSec / 60)} min`
                : "Off"
            }
            accent={zone.enabled ? "runner" : undefined}
          />
          <RuleRow
            label="Hunter tracking"
            value={settings.showHunterTeammates ? "Visible" : "Hidden"}
          />
          <RuleRow
            label="Late joins"
            value={settings.allowLateJoin ? "Allowed" : "Locked"}
          />
          <RuleRow
            label="Runner intel"
            value={settings.showAllHuntersToRunners ? "All hunters visible" : "Nearest only"}
          />
        </div>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-faint">
          Runners never receive hunter names. When intel is enabled, runners
          see anonymous hunter markers with bearing and distance only.
        </p>
        <ZoneRuleNote tone="hunter" />
      </Modal>

      <TagSheet open={tagOpen} onClose={() => setTagOpen(false)} tagCode={tagCode} onTagCodeChange={setTagCode} onSubmit={submitTag} />
      <EndMatchModal open={endMatchOpen} onClose={() => setEndMatchOpen(false)} />
    </div>
  );
}

function Legend({
  tone,
  label,
}: {
  tone: "runner" | "hunter" | "self";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "runner"
            ? "bg-runner"
            : tone === "hunter"
            ? "bg-hunter"
            : "border border-runner bg-ink",
        )}
      />
      <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-muted">{label}</span>
    </div>
  );
}

function LogRow({
  time,
  text,
  tone,
}: {
  time: string;
  text: string;
  tone: "runner" | "hunter" | "neutral";
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-8 shrink-0 font-mono text-[8px] tabular text-faint">{time}</span>
      <span
        className={cn(
          "mt-1 size-1 shrink-0 rounded-full",
          tone === "runner" ? "bg-runner" : tone === "hunter" ? "bg-hunter" : "bg-line-strong",
        )}
      />
      <span className="text-[10px] leading-relaxed text-muted">{text}</span>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  title,
  description,
  onClick,
  danger,
}: {
  icon: typeof HeartPulse;
  title: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[3px] border px-3 py-3 text-left transition-colors",
        danger
          ? "border-danger/20 bg-danger/5 hover:bg-danger/10"
          : "border-line bg-surface-2/40 hover:border-line-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-[2px] border",
          danger
            ? "border-danger/30 text-danger"
            : "border-line-strong text-muted",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex-1">
        <span className={cn("block text-[12px] font-medium", danger ? "text-danger" : "text-ink")}>
          {title}
        </span>
        <span className="mt-0.5 block text-[10px] text-muted">{description}</span>
      </span>
      <ChevronRight className="size-3.5 text-faint" />
    </button>
  );
}

function RuleRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "hunter" | "runner";
}) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">{label}</span>
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.08em]",
          accent === "hunter" ? "text-hunter" : accent === "runner" ? "text-runner" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TagSheet({
  open,
  onClose,
  tagCode,
  onTagCodeChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  tagCode: string;
  onTagCodeChange: (code: string) => void;
  onSubmit: () => void;
}) {
  const navigate = useNavigate();
  const tagState = useGame((state) => state.tagState);
  const tagTargetId = useGame((state) => state.tagTargetId);
  const players = useGame((state) => state.players);
  const activeRunners = players.filter(
    (player) => player.role === "runner" && player.status === "active",
  );
  const target = players.find((player) => player.id === tagTargetId);
  const allCaught = activeRunners.length === 0;

  const close = () => {
    useGame.getState().resetTag();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      eyebrow="Contact protocol"
      title={
        tagState === "success"
          ? "Tag confirmed"
          : tagState === "invalid"
          ? "Invalid PIN"
          : tagState === "no-target"
          ? "No target"
          : "Enter runner PIN"
      }
      footer={
        tagState === "success" ? (
          allCaught ? (
            <Button
              variant="runner"
              full
              onClick={() => {
                useGame.getState().endGame("hunters");
                navigate("/results");
              }}
            >
              <Flag className="size-4" />
              View field report
            </Button>
          ) : (
            <Button
              variant="hunter"
              full
              onClick={() => {
                useGame.getState().resetTag();
                onClose();
              }}
            >
              Continue hunt
              <ArrowRight className="size-4" />
            </Button>
          )
        ) : tagState === "invalid" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="hunter"
              onClick={() => {
                useGame.getState().resetTag();
              }}
            >
              Retry
            </Button>
          </div>
        ) : tagState === "no-target" ? (
          <Button variant="secondary" full onClick={close}>
            Close
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="hunter" onClick={onSubmit} disabled={tagCode.length !== 4}>
              Confirm
            </Button>
          </div>
        )
      }
    >
      {tagState === "idle" ? (
        <div className="py-6 text-center">
          <Crosshair className="mx-auto size-8 text-hunter" />
          <p className="mt-4 font-display text-xl font-semibold uppercase text-ink">
            Enter runner PIN
          </p>
          <p className="mt-2 max-w-xs mx-auto text-[11px] leading-relaxed text-muted">
            Ask the runner for their 4-digit PIN and enter it here to tag them.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={tagCode}
              onChange={(e) => onTagCodeChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-48 text-center font-mono text-xl tracking-[0.5em] border border-line bg-surface px-3 py-2 rounded-[3px] text-ink placeholder:text-faint"
              placeholder="0000"
              autoFocus
            />
          </div>
        </div>
      ) : null}

      {tagState === "success" ? (
        <div className="py-4">
          <div className="flex flex-col items-center rounded-[3px] border border-runner/25 bg-runner/[0.05] px-5 py-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-full border border-runner/35 bg-runner/10 text-runner">
              <CheckCheck className="size-6" />
            </span>
            <p className="mt-4 font-display text-2xl font-semibold uppercase text-ink">
              {target?.name ?? "Runner"} is out
            </p>
            <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-muted">
              The runner was tagged and has been removed from the field.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              <Chip tone="runner">Tag confirmed</Chip>
              <Chip>Spectator</Chip>
              <Chip>{allCaught ? "Field clear" : `${activeRunners.length} remain`}</Chip>
            </div>
          </div>
        </div>
      ) : null}

      {tagState === "invalid" ? (
        <div className="py-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning">
            <X className="size-6" />
          </span>
          <p className="mt-4 font-display text-xl font-semibold uppercase text-ink">
            Invalid PIN
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-muted">
            That PIN does not match any active runner. Verify the code and try again.
          </p>
        </div>
      ) : null}

      {tagState === "no-target" ? (
        <div className="py-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-faint">
            <Radar className="size-6" />
          </span>
          <p className="mt-4 font-display text-xl font-semibold uppercase text-ink">
            No active runners
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-muted">
            All runners have been caught. The field is clear.
          </p>
        </div>
      ) : null}
    </Sheet>
  );
}
