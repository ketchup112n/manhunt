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
  Navigation,
  Radar,
  RefreshCcw,
  Shield,
  Signal,
  Siren,
  UserMinus,
  X,
} from "lucide-react";
import { HunterMap } from "@/components/game/HunterMap";
import { GpsBanner } from "@/components/game/GpsBanner";
import { EndMatchModal } from "@/components/game/EndMatchModal";
import { KickPlayerSheet } from "@/components/game/KickPlayerSheet";
import { ZoneRuleNote, ZoneStatusChip } from "@/components/game/ZoneHud";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import {
  formatClock,
  formatLongClock,
  formatRadius,
} from "@/lib/geo";
import { useGame, useYou, useZoneState } from "@/store/game";
import { useDeviceHeading } from "@/lib/useDeviceHeading";
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
  const phase = useGame((state) => state.phase);
  const center = useGame((state) => state.center);
  const livePosition = useGame((state) => state.livePosition);
  const caughtSpots = useGame((state) => state.caughtSpots);
  const deviceHeading = useGame((state) => state.deviceHeading);
  const zone = useZoneState();
  const you = useYou();
  const { status: headingStatus, enable: enableHeading } = useDeviceHeading();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [kickOpen, setKickOpen] = useState(false);
  const [pingWindowOpen, setPingWindowOpen] = useState(false);
  const [tagCode, setTagCode] = useState("");
  const [flash, setFlash] = useState(false);
  const previousPing = useRef(pingCount);

  const hunters = players.filter((player) => player.role === "hunter");
  const activeRunners = players.filter(
    (player) => player.role === "runner" && player.status === "active",
  );

  /** Prefer the newest device fix over the last one the server echoed back. */
  const selfFix = livePosition ?? you?.position ?? null;
  const self = selfFix
    ? {
        id: you?.id ?? "",
        name: you?.name ?? "YOU",
        lat: selfFix.lat,
        lng: selfFix.lng,
        accuracyM: selfFix.accuracyM,
      }
    : null;

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
            .filter((player) => player.position)
            .map((player) => ({
              id: player.id,
              name: player.name,
              lat: player.position!.lat,
              lng: player.position!.lng,
              accuracyM: player.position!.accuracyM,
              seenAt: lastPingAgo,
            })),
    [activeRunners, lastPingAgo, pingWindowOpen],
  );

  useEffect(() => {
    if (phase === "ended") navigate("/results");
  }, [phase, navigate]);

  useEffect(() => {
    if (pingCount > previousPing.current) {
      setFlash(true);
      toast("Location ping received", {
        description: `${activeRunners.length} runner signals refreshed — both sides are exposed for ten seconds.`,
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
  const facingHeading =
    headingStatus === "live"
      ? deviceHeading
      : import.meta.env.DEV
        ? deviceHeading
        : undefined;

  const openTag = () => {
    setTagCode("");
    setTagOpen(true);
  };

  const submitTag = () => {
    useGame.getState().submitTagCode(tagCode);
    setTagCode("");
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-canvas">
      <div className="absolute inset-0">
        <HunterMap
          self={self}
          hunters={hunters}
          runners={signals}
          caughtSpots={caughtSpots}
          center={center}
          playAreaM={settings.playAreaM}
          pingKey={pingCount}
          heading={facingHeading}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(4,9,10,0.62),transparent_30%,transparent_70%,rgba(4,9,10,0.3))]" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />
        <GpsBanner className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-3 z-[405] max-w-[280px] lg:left-5" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] px-3 pt-3 safe-top sm:px-4">
          <div className="pointer-events-auto mx-auto flex max-w-5xl items-start justify-between gap-2">
            <div className="flex items-center gap-2 rounded-[3px] border border-line-strong/60 bg-surface/90 p-1.5 pr-3 shadow-lg backdrop-blur-md">
              <RoleBadge role="hunter" compact />
              <div className="hidden sm:block">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink">
                  {you?.name ?? "YOU"} / FIELD
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

          {headingStatus === "denied" || headingStatus === "pending" ? (
            <div className="pointer-events-auto mx-auto mt-1.5 flex max-w-5xl">
              <button
                type="button"
                onClick={() => void enableHeading()}
                disabled={headingStatus === "pending"}
                className="flex items-center gap-1.5 rounded-[3px] border border-line-strong/60 bg-surface/90 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted shadow-lg backdrop-blur-md transition-colors hover:border-hunter/40 hover:text-hunter disabled:cursor-wait disabled:opacity-60"
              >
                <Navigation className="size-3" />
                {headingStatus === "pending"
                  ? "Enabling"
                  : headingStatus === "denied"
                    ? "Retry facing"
                    : "Enable facing"}
              </button>
            </div>
          ) : null}
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
            <Legend tone="caught" label="Caught site" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[500]">
        <SignalQuality />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[420]">
        <div className="pointer-events-auto border-t border-line bg-surface/95 p-3 safe-bottom backdrop-blur-md">
          <div className="mx-auto max-w-5xl">
            {allCaught ? (
              you?.isHost ? (
                <Button
                  variant="runner"
                  size="lg"
                  full
                  onClick={() => {
                    useGame.getState().endGame("hunters");
                    navigate("/results");
                  }}
                >
                  <Flag className="size-4" />
                  End operation
                </Button>
              ) : (
                <div className="rounded-[3px] border border-line bg-surface-2/40 px-4 py-3 text-center">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink">
                    Field clear
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    The round is finishing automatically.
                  </p>
                </div>
              )
            ) : (
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
            )}
          </div>
        </div>
      </div>

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
          {you?.isHost ? (
            <MenuRow
              icon={UserMinus}
              title="Remove a player"
              description="Kick anyone out of this game"
              danger
              onClick={() => {
                setMenuOpen(false);
                setKickOpen(true);
              }}
            />
          ) : null}
          {you?.isHost ? (
            <MenuRow
              icon={RefreshCcw}
              title="Replay ping"
              description="Expose both teams' positions for ten seconds"
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
            label="Runner intel"
            value={settings.showAllHuntersToRunners ? "All hunters (live)" : "Nearest + pings"}
          />
        </div>
        <p className="mt-4 border-t border-line pt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-faint">
          Hunter markers are anonymous. When intel is enabled, runners see
          bearing and distance to nearby hunters, never a live position unless
          the host has enabled all-hunter intel.
        </p>
        <ZoneRuleNote tone="hunter" />
      </Modal>

      <TagSheet open={tagOpen} onClose={() => setTagOpen(false)} tagCode={tagCode} onTagCodeChange={setTagCode} onSubmit={submitTag} />
      <EndMatchModal open={endMatchOpen} onClose={() => setEndMatchOpen(false)} />
      <KickPlayerSheet open={kickOpen} onClose={() => setKickOpen(false)} />
    </div>
  );
}

function Legend({
  tone,
  label,
}: {
  tone: "runner" | "hunter" | "self" | "caught";
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
              : tone === "caught"
                ? "bg-danger"
                : "border border-runner bg-ink",
        )}
      />
      <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-muted">{label}</span>
    </div>
  );
}

function SignalQuality() {
  return (
    <div
      role="img"
      aria-label="Signal quality: nominal"
      title="Signal quality: nominal"
      className="pointer-events-auto flex items-center gap-1.5 rounded-[2px] border border-line-strong/50 bg-surface/85 px-1.5 py-1 backdrop-blur-md"
    >
      <Signal className="size-2.5 text-faint" />
      <span className="flex items-end gap-[2px]">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "w-[3px] rounded-[1px]",
              index === 0 && "h-1",
              index === 1 && "h-1.5",
              index === 2 && "h-2",
              index === 3 && "h-2.5",
              index < 3 ? "bg-runner/80" : "bg-line-strong",
            )}
          />
        ))}
      </span>
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
              onClick={() => navigate("/results")}
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
