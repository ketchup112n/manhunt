import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Crosshair,
  Flag,
  HeartPulse,
  LogOut,
  Menu,
  Navigation,
  Radar,
  RefreshCcw,
  Shield,
  Sun,
} from "lucide-react";
import { EndMatchModal } from "@/components/game/EndMatchModal";
import { GpsBanner } from "@/components/game/GpsBanner";
import { RunnerMap } from "@/components/game/RunnerMap";
import { useFieldMapData } from "@/components/game/useFieldMapData";
import { ZonePanel, ZoneRuleNote, ZoneStatusChip } from "@/components/game/ZoneHud";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import {
  formatClock,
  formatLongClock,
  formatRadius,
} from "@/lib/geo";
import { useDeviceHeading } from "@/lib/useDeviceHeading";
import { useGame, useYou, useZoneState } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import { cn } from "@/lib/cn";

export function RunnerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const you = useYou();
  const players = useGame((state) => state.players);
  const settings = useGame((state) => state.settings);
  const timeLeftSec = useGame((state) => state.timeLeftSec);
  const nextPingSec = useGame((state) => state.nextPingSec);
  const lastPingAgo = useGame((state) => state.lastPingAgo);
  const pingCount = useGame((state) => state.pingCount);
  const pingExpiresAt = useGame((state) => state.pingExpiresAt);
  const deviceHeading = useGame((state) => state.deviceHeading);
  const phase = useGame((state) => state.phase);
  const zone = useZoneState();
  const units = usePreferences((state) => state.units);
  const { self, teammates, hunters: visibleHunters, caughtSpots, center } =
    useFieldMapData();
  const { status: headingStatus, enable: enableHeading } = useDeviceHeading();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [pingWindowOpen, setPingWindowOpen] = useState(false);
  const previousPing = useRef(pingCount);

  const hunters = players.filter((player) => player.role === "hunter");
  const activeRunners = players.filter(
    (player) => player.role === "runner" && player.status === "active",
  );

  const pingProgress = settings.pingSec === 0 ? 0 : nextPingSec / settings.pingSec;
  const recentlyLocated = pingWindowOpen && pingCount > 0;
  const facingHeading =
    headingStatus === "live"
      ? deviceHeading
      : import.meta.env.DEV
        ? deviceHeading
        : undefined;

  useEffect(() => {
    if (!pingExpiresAt) return;
    let expiryTimer: number | undefined;
    const syncTimer = window.setTimeout(() => {
      const remaining = pingExpiresAt - Date.now();
      setPingWindowOpen(remaining > 0 && phase === "active");
      if (remaining > 0) {
        expiryTimer = window.setTimeout(() => setPingWindowOpen(false), remaining);
      }
    }, 0);
    return () => {
      window.clearTimeout(syncTimer);
      if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
    };
  }, [pingExpiresAt, phase]);

  useEffect(() => {
    if (you?.status === "caught") {
      navigate("/game/spectator");
    }
  }, [you?.status, navigate]);

  useEffect(() => {
    if (phase === "ended") navigate("/results");
  }, [phase, navigate]);

  useEffect(() => {
    if (pingCount > previousPing.current) {
      setFlash(true);
      toast("Location broadcast", {
        description: "Hunters just received your last known position.",
        tone: "warning",
      });
      previousPing.current = pingCount;
      const timer = window.setTimeout(() => setFlash(false), 2400);
      return () => window.clearTimeout(timer);
    }
    previousPing.current = pingCount;
  }, [pingCount, toast]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-0 hud-grid opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--runner)_9%,transparent),transparent_65%)]" />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 safe-top sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <RoleBadge role="runner" compact />
          <div className="hidden min-w-0 sm:block">
            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
              MANHUNT
            </span>
            <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-faint">
              Runner channel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ZoneStatusChip tone="runner" />

          <div className="flex items-center gap-1.5 rounded-[3px] border border-line-strong/60 bg-surface/85 px-2.5 py-1.5 backdrop-blur">
            <Clock3 className="size-3.5 text-faint" />
            <div>
              <p className="hidden font-mono text-[7px] uppercase tracking-[0.18em] text-faint sm:block">
                Round
              </p>
              <p className="font-mono text-[10px] tabular text-ink">{formatLongClock(timeLeftSec)}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Runner menu"
            onClick={() => setMenuOpen(true)}
            className="flex size-[42px] items-center justify-center rounded-[3px] border border-line-strong/60 bg-surface/85 text-muted backdrop-blur transition-colors hover:text-ink"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-8 sm:px-6">
        <div className="flex items-center justify-between border-y border-line/70 py-2">
          <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
            <span className="size-1.5 animate-soft-pulse rounded-full bg-runner" />
            Live field / runner channel
          </div>
          <div className="hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[0.18em] text-faint sm:flex">
            <span>Live GPS</span>
            <span className="h-3 w-px bg-line-strong" />
            <span className={recentlyLocated ? "text-warning" : "text-runner"}>
              {recentlyLocated ? "Exposed" : "Signal secure"}
            </span>
          </div>
        </div>

        <GpsBanner className="mt-3" />

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile
            icon={Radar}
            label="Next ping"
            value={formatClock(nextPingSec)}
            tone={nextPingSec < 60 ? "warning" : "runner"}
          />
          <StatTile icon={Crosshair} label="Hunters" value={String(hunters.length)} tone="hunter" />
          <StatTile
            icon={HeartPulse}
            label="Runners"
            value={`${activeRunners.length} active`}
            tone="runner"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
          <Card corners className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <p className="label-mono mb-1">Live positions</p>
                <h1 className="font-display text-xl font-semibold uppercase leading-none tracking-[0.03em] text-ink">
                  Field map
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={recentlyLocated ? "warning" : "runner"} dot>
                  {recentlyLocated ? "Exposed" : "Tracking"}
                </Chip>
                <Chip
                  tone={settings.showAllHuntersToRunners ? "hunter" : "runner"}
                >
                  {settings.showAllHuntersToRunners
                    ? `${hunters.length} hunters visible`
                    : "Squad view"}
                </Chip>
                {headingStatus === "needs-permission" ||
                headingStatus === "denied" ||
                headingStatus === "pending" ? (
                  <button
                    type="button"
                    onClick={() => void enableHeading()}
                    disabled={headingStatus === "pending"}
                    className="flex items-center gap-1.5 rounded-[2px] border border-line-strong bg-surface-2 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-runner/40 hover:text-runner disabled:cursor-wait disabled:opacity-60"
                  >
                    <Navigation className="size-3" />
                    {headingStatus === "pending"
                      ? "Enabling"
                      : headingStatus === "denied"
                        ? "Retry facing"
                        : "Enable facing"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-3">
              <RunnerMap
                self={self}
                teammates={teammates}
                hunters={visibleHunters}
                caughtSpots={caughtSpots}
                center={center}
                playAreaM={settings.playAreaM}
                heading={facingHeading}
                heightClass="h-[400px] sm:h-[500px] lg:h-[560px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-4 py-2.5 font-mono text-[7px] uppercase tracking-[0.12em] text-faint">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-runner" />
                You / facing arrow
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-runner/50" />
                Squad
              </span>
              {settings.showAllHuntersToRunners ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-hunter" />
                  Hunters
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-danger" />
                Caught site
              </span>
            </div>

            {!settings.showAllHuntersToRunners ? (
              <p className="border-t border-line px-4 py-2.5 font-mono text-[7px] uppercase leading-relaxed tracking-[0.12em] text-faint">
                Only your squad and caught sites are marked. Enable all-hunter
                intel in lobby rules to reveal anonymous hunter markers.
              </p>
            ) : null}
          </Card>

          <aside className="space-y-3">
            <ZonePanel tone="runner" />

            <ExposureCard
              nextPingSec={nextPingSec}
              lastPingAgo={lastPingAgo}
              pingProgress={pingProgress}
              pingSec={settings.pingSec}
              recentlyLocated={recentlyLocated}
            />

            <Card className="p-4">
              <p className="label-mono mb-3">Your PIN</p>
              <div className="rounded-[3px] border border-runner/25 bg-runner/5 px-4 py-3 text-center">
                <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint mb-1">
                  Private code (share to be tagged)
                </p>
                <p className="font-mono text-3xl tracking-[0.3em] text-runner">
                  {you?.tagCode ?? "----"}
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  Hunters enter this 4-digit PIN to tag you. Show it only when
                  physically caught.
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <p className="label-mono mb-3">Field notes</p>
              <Note icon={Sun} text="Keep this screen open. Phones pause sensors when locked." />
              <Note
                icon={Crosshair}
                text="Hunters can tag you by entering your PIN. Do not let them close in."
              />
              <Note icon={Shield} text="You cannot be tagged unless a hunter has your PIN." />
            </Card>

            <div className="rounded-[3px] border border-line bg-surface/40 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                  Play area
                </span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-runner">
                  {zone.enabled
                    ? zone.phase === "closed"
                      ? "Boundary closed"
                      : zone.isShrinking
                        ? "Shrinking now"
                        : "Holding"
                    : `Static · ${formatRadius(settings.playAreaM, units)}`}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 18 }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      zone.enabled
                        ? index < Math.round(zone.overallProgress * 18)
                          ? "bg-warning/70"
                          : "bg-line-strong"
                        : index < 15
                          ? "bg-runner/60"
                          : "bg-line-strong",
                    )}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 flex flex-col items-start justify-between gap-2 border-t border-line pt-3 font-mono text-[8px] uppercase tracking-[0.16em] text-faint sm:flex-row sm:items-center">
          <span>Runners win if at least one survives the round.</span>
          <span className="text-muted">
            {formatLongClock(timeLeftSec)} remaining / {activeRunners.length} runners in play
          </span>
        </div>
      </main>

      <AnimatePresence>
        {flash ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-[3px] border border-warning/50 bg-surface/95 px-4 py-2.5 text-center shadow-[0_0_40px_color-mix(in_srgb,var(--warning)_18%,transparent)] backdrop-blur-md"
          >
            <p className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-warning">
              <AlertTriangle className="size-3.5" />
              Location broadcast
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
              Hunters received your last position
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        eyebrow="Field controls"
        title="Runner menu"
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
          {you?.isHost ? (
            <MenuRow
              icon={RefreshCcw}
              title="Replay ping"
              description="Broadcast every runner position now"
              onClick={() => {
                useGame.getState().triggerPing();
                setMenuOpen(false);
              }}
            />
          ) : null}
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
            label="All-hunter intel"
            value={settings.showAllHuntersToRunners ? "Enabled (map + list)" : "Disabled (squad only)"}
          />
        </div>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-faint">
          The map shows your squad and caught sites. When all-hunter intel is
          enabled, anonymous hunter markers also appear with their distance.
        </p>
        <ZoneRuleNote tone="runner" />
      </Modal>
      <EndMatchModal open={endMatchOpen} onClose={() => setEndMatchOpen(false)} />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Radar;
  label: string;
  value: string;
  tone: "runner" | "hunter" | "warning" | "neutral";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[3px] border border-line bg-surface/50 px-3 py-2.5">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-[2px] border",
          tone === "runner"
            ? "border-runner/25 bg-runner/10 text-runner"
            : tone === "hunter"
            ? "border-hunter/25 bg-hunter/10 text-hunter"
            : tone === "warning"
            ? "border-warning/30 bg-warning/10 text-warning"
            : "border-line bg-surface-2 text-faint",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">{label}</p>
        <p
          className={cn(
            "mt-1 truncate font-mono text-[11px] uppercase tracking-[0.06em]",
            tone === "warning" ? "text-warning" : "text-ink",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ExposureCard({
  nextPingSec,
  lastPingAgo,
  pingProgress,
  pingSec,
  recentlyLocated,
}: {
  nextPingSec: number;
  lastPingAgo: number;
  pingProgress: number;
  pingSec: number;
  recentlyLocated: boolean;
}) {
  return (
    <Card
      corners
      className={cn(
        "overflow-hidden transition-colors",
        recentlyLocated && "border-warning/40",
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Radar className={cn("size-3.5", recentlyLocated ? "text-warning" : "text-runner")} />
          <p className="label-mono">Signal exposure</p>
        </div>
        <Chip tone={recentlyLocated ? "warning" : "runner"} dot>
          {recentlyLocated ? "Located" : "Hidden"}
        </Chip>
      </div>
      <div className="p-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
          {recentlyLocated ? "Last broadcast" : "Next broadcast in"}
        </p>
        <p
          className={cn(
            "mt-2 font-mono text-4xl tabular tracking-[-0.04em]",
            recentlyLocated ? "text-warning" : "text-ink",
          )}
        >
          {formatClock(recentlyLocated ? lastPingAgo : nextPingSec)}
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              recentlyLocated ? "bg-warning" : "bg-runner",
            )}
            style={{ width: `${Math.min(100, Math.max(0, pingProgress * 100))}%` }}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Every {Math.round(pingSec / 60)} minutes, hunters receive your
          coordinates for ten seconds. Your position is hidden again until
          the next ping.
        </p>
      </div>
    </Card>
  );
}

function Note({ icon: Icon, text }: { icon: typeof Sun; text: string }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-line/60 py-2.5 last:border-0 last:pb-0 first:pt-0">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-faint" />
      <p className="text-[10px] leading-relaxed text-muted">{text}</p>
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
          danger ? "border-danger/30 text-danger" : "border-line-strong text-muted",
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
