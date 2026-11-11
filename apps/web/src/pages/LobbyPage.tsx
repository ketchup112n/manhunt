import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  Check,
  Copy,
  Crown,
  Crosshair,
  GripVertical,
  MapPin,
  Navigation,
  Play,
  Plus,
  QrCode,
  Rabbit,
  Radio,
  Settings2,
  ShieldCheck,
  Shrink,
  Sun,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/FormControls";
import { useToast } from "@/components/ui/Toast";
import { RoleBadge } from "@/components/hud/RoleBadge";
import {
  SettingsEditor,
  SettingsSummary,
} from "@/components/game/SettingsEditor";
import { useGame, useYou } from "@/store/game";
import { formatClock } from "@/lib/geo";
import { zoneScheduleFit, zoneScheduleLabel } from "@/lib/zone";
import type { Player, Role as RoleType } from "@/lib/types";
import { cn } from "@/lib/cn";

export function LobbyPage() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams();
  const { toast } = useToast();
  const you = useYou();
  const players = useGame((s) => s.players);
  const session = useGame((s) => s.session);
  const bootstrapped = useGame((s) => s.bootstrapped);
  const phase = useGame((s) => s.phase);
  const connection = useGame((s) => s.connection);
  const connectionError = useGame((s) => s.connectionError);
  const storeCode = useGame((s) => s.code);
  const code = (session?.code ?? storeCode ?? routeCode ?? "").toUpperCase();
  const assignPlayerRole = useGame((s) => s.assignPlayerRole);
  const randomizeTeams = useGame((s) => s.randomizeTeams);
  const startGame = useGame((s) => s.startGame);
  const skipPrep = useGame((s) => s.skipPrep);
  const setReady = useGame((s) => s.setReady);
  const settings = useGame((s) => s.settings);
  const prepRemainingSec = useGame((s) => s.prepRemainingSec);
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hunters = players.filter((player) => player.role === "hunter");
  const runners = players.filter((player) => player.role === "runner");
  const unassigned = players.filter((player) => player.role === "unassigned");
  const readyCount = players.filter((player) => player.ready).length;
  const isHost = you?.isHost ?? false;
  const joinUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/join/${code}`;

  const hasHunters = hunters.length > 0;
  const hasRunners = runners.length > 0;
  const canStart = hasHunters && hasRunners && unassigned.length === 0;
  const zoneFit = zoneScheduleFit(settings);
  const phaseLabel =
    phase === "prep"
      ? "Preparing"
      : phase === "active"
        ? "Live"
        : phase === "ended"
          ? "Ended"
          : "Waiting";

  useEffect(() => {
    if (!bootstrapped) return;
    const route = (routeCode ?? "").toUpperCase();
    if (!session) {
      if (route) navigate(`/join/${route}`, { replace: true });
      else navigate("/join", { replace: true });
      return;
    }
    if (route && session.code !== route) {
      navigate(`/join/${route}`, { replace: true });
    }
  }, [bootstrapped, session, routeCode, navigate]);

  useEffect(() => {
    if (!session || !you) return;
    if (phase === "active") {
      navigate(
        you.role === "runner"
          ? "/game/runner"
          : you.role === "hunter"
            ? "/game/hunter"
            : "/game/spectator",
        { replace: true },
      );
    } else if (phase === "ended") {
      navigate("/results", { replace: true });
    }
  }, [phase, you, session, navigate]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(label, { tone: "success" });
    } catch {
      toast("Could not access clipboard", { tone: "warning" });
    }
  };

  const copyCode = () => {
    void copyText(code, "Lobby code copied");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const enterField = () => {
    navigate(
      you?.role === "runner"
        ? "/game/runner"
        : you?.role === "hunter"
          ? "/game/hunter"
          : "/game/spectator",
    );
  };

  const startOperation = () => {
    if (!isHost) {
      toast("Only the host can deploy the round", { tone: "warning" });
      return;
    }
    if (!canStart) {
      toast(
        unassigned.length > 0
          ? "Assign every player before deploying"
          : "Both hunters and runners are required to start",
        { tone: "warning" },
      );
      return;
    }
    startGame();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Home" />

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 pb-24 sm:px-6 lg:pb-10">
        <div className="flex flex-col gap-4 border-b border-line py-5 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="h-px w-6 bg-runner" />
              <p className="label-mono text-runner">Lobby</p>
              <Chip
                tone={phase === "active" ? "runner" : "warning"}
                dot
              >
                {phaseLabel}
              </Chip>
            </div>
            <h1 className="display text-3xl font-semibold text-ink sm:text-4xl">
              MANHUNT
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                {you?.isHost ? "Host /" : "Player /"}
              </span>
              <RoleBadge role={you?.role ?? "unassigned"} compact />
            </div>
            <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted">
              Assemble the field. The host assigns every player before the
              operation can deploy. New players appear under standby.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="group flex h-14 items-center gap-3 rounded-[3px] border border-line-strong/60 bg-surface/75 px-4 transition-colors hover:border-runner/40"
            >
              <div className="text-left">
                <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-faint">
                  Lobby code
                </p>
                <p className="mt-1 font-mono text-xl tracking-[0.22em] text-ink">{code}</p>
              </div>
              {copied ? (
                <Check className="size-4 text-runner" />
              ) : (
                <Copy className="size-4 text-faint transition-colors group-hover:text-ink" />
              )}
            </button>
            <Button
              variant="secondary"
              size="lg"
              className="h-14"
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="size-4" />
              Invite
            </Button>
          </div>
        </div>

        {connection !== "connected" ? (
          <div className="mt-3 flex items-center gap-2 rounded-[3px] border border-warning/40 bg-warning/[0.06] px-3 py-2.5">
            <Radio className="size-3.5 shrink-0 text-warning" />
            <p className="text-[11px] leading-relaxed text-warning">
              {connectionError ??
                (connection === "connecting"
                  ? "Connecting to the lobby server..."
                  : "Realtime connection lost. Reconnecting...")}
            </p>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <MetaStat label="Players" value={`${players.length} / ${settings.maxPlayers}`} icon={Users} />
          <MetaStat
            label="Ready"
            value={`${readyCount} / ${players.length}`}
            icon={Check}
            tone="runner"
          />
          <MetaStat
            label="Ping cycle"
            value={`${Math.round(settings.pingSec / 60)} min`}
            icon={Radio}
            tone="hunter"
          />
          <MetaStat
            label="Round"
            value={`${Math.round(settings.durationSec / 60)} min`}
            icon={Radio}
          />
          <MetaStat
            label="Zone"
            value={settings.zoneEnabled ? "Shrinking" : "Static"}
            icon={Shrink}
            tone={settings.zoneEnabled ? "runner" : undefined}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-4">
            {unassigned.length > 0 ? (
              <UnassignedPanel
                players={unassigned}
                isHost={isHost}
                onAssignRole={assignPlayerRole}
                onInvite={() => setQrOpen(true)}
              />
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <TeamPanel
                role="hunter"
                players={hunters}
                maxPlayers={settings.maxPlayers}
                onAssignRole={assignPlayerRole}
                onAdd={() => setQrOpen(true)}
                isHost={isHost}
              />
              <TeamPanel
                role="runner"
                players={runners}
                maxPlayers={settings.maxPlayers}
                onAssignRole={assignPlayerRole}
                onAdd={() => setQrOpen(true)}
                isHost={isHost}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-[3px] border border-line bg-surface/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-info" />
                <p className="text-[11px] leading-relaxed text-muted">
                  Suggested balance is <span className="text-ink">1 hunter per 3 runners</span>.
                  Teams currently field {hunters.length} hunters and {runners.length} runners.
                </p>
              </div>
              <button
                type="button"
                onClick={randomizeTeams}
                disabled={!isHost || phase !== "lobby"}
                className={cn(
                  "shrink-0 rounded-[2px] border px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] transition-colors",
                  isHost && phase === "lobby"
                    ? "border-line-strong text-runner hover:bg-runner/5"
                    : "border-line text-faint cursor-not-allowed",
                )}
              >
                Randomize teams
              </button>
            </div>

            <ActivityFeed />
          </div>

          <aside className="space-y-3 lg:sticky lg:top-4">
            <Card corners className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
                <p className="label-mono">Mission rules</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  disabled={!isHost || phase !== "lobby"}
                >
                  <Settings2 className="size-3.5" />
                  Edit
                </Button>
              </div>
              <div className="p-3">
                <SettingsSummary compact />
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                    Shrinking zone
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[8px] uppercase tracking-[0.12em]",
                      settings.zoneEnabled ? "text-runner" : "text-faint",
                    )}
                  >
                    {zoneScheduleLabel(settings)}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                    Host editable
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-runner">
                    Until deploy
                  </span>
                </div>
                {!zoneFit.fits ? (
                  <div className="mt-2.5 flex items-start gap-1.5 rounded-[2px] border border-warning/40 bg-warning/[0.06] px-2.5 py-2">
                    <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
                    <p className="text-[10px] leading-relaxed text-warning">
                      Zone schedule overruns the round by{" "}
                      {Math.max(1, Math.round(zoneFit.overflowSec / 60))} min. Only{" "}
                      {zoneFit.completedShrinkCount} of {zoneFit.totalShrinkCount}{" "}
                      contractions land in play.
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>

            <AssignmentCard
              player={you}
              isHost={isHost}
              onAssignRole={assignPlayerRole}
              onToggleReady={() => {
                setReady(!(you?.ready ?? false));
                toast(you?.ready ? "Ready state cleared" : "You are ready", {
                  tone: you?.ready ? "default" : "success",
                });
              }}
            />

            <Card className="p-4">
              <p className="label-mono mb-3">Field readiness</p>
              <PermissionRow icon={MapPin} label="Location services" />
              <PermissionRow icon={Navigation} label="Facing direction" />
              <PermissionRow icon={Sun} label="Screen wake lock" />
              <p className="mt-3 border-t border-line pt-3 font-mono text-[8px] leading-relaxed tracking-[0.1em] text-faint">
                Location is requested when the round starts. On phones,
                permissions require a secure HTTPS connection.
              </p>
            </Card>

            {isHost ? (
              <>
                <Button
                  variant={you?.role === "runner" ? "runner" : "hunter"}
                  size="lg"
                  full
                  onClick={startOperation}
                  disabled={!canStart}
                >
                  <Play className="size-4" />
                  {canStart ? "Start operation" : "Assign teams to start"}
                </Button>
                <p className="text-center font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                  {unassigned.length > 0
                    ? `${unassigned.length} player${unassigned.length === 1 ? "" : "s"} still unassigned`
                    : readyCount < players.length
                      ? `${players.length - readyCount} player${players.length - readyCount === 1 ? "" : "s"} not ready`
                      : canStart
                        ? "All players ready"
                        : "Assign at least one hunter and one runner"}
                </p>
              </>
            ) : (
              <div className="rounded-[3px] border border-line bg-surface/45 px-4 py-3 text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink">
                  Waiting for host
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  The host assigns teams and deploys the round. This screen updates
                  automatically.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-md safe-bottom lg:hidden">
        {isHost ? (
          <Button
            variant={you?.role === "runner" ? "runner" : "hunter"}
            size="lg"
            full
            onClick={startOperation}
            disabled={!canStart}
          >
            <Play className="size-4" />
            {canStart ? "Start operation" : "Assign teams to start"}
          </Button>
        ) : (
          <p className="py-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            Waiting for the host to deploy
          </p>
        )}
      </div>

      <Modal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        eyebrow="Invite protocol"
        title="Scan to join"
      >
        <div className="flex flex-col items-center">
          <div className="rounded-md bg-white p-3">
            <QRCodeSVG value={joinUrl} size={196} bgColor="#ffffff" fgColor="#071011" level="M" />
          </div>
          <div className="mt-4 w-full rounded-[3px] border border-line bg-canvas/40 p-3 text-center">
            <p className="label-mono mb-1.5">Lobby code</p>
            <p className="font-mono text-2xl tracking-[0.3em] text-ink">{code}</p>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            Share this code or QR with your players. The host assigns teams in the lobby.
          </p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => void copyText(code, "Lobby code copied")}
            >
              <Copy className="size-3.5" />
              Code
            </Button>
            <Button
              variant="primary"
              onClick={() => void copyText(joinUrl, "Invite link copied")}
            >
              <Copy className="size-3.5" />
              Link
            </Button>
          </div>
        </div>
      </Modal>

      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        eyebrow="Host controls"
        title="Edit protocol"
        description="Changes apply immediately for everyone in the lobby."
        footer={
          <Button variant="runner" full onClick={() => setSettingsOpen(false)}>
            Apply rules
          </Button>
        }
      >
        <SettingsEditor />
      </Sheet>

      {phase === "prep" ? (
        <PrepOverlay
          seconds={prepRemainingSec}
          total={Math.max(1, settings.prepSec)}
          role={you?.role ?? "unassigned"}
          isHost={isHost}
          onSkip={skipPrep}
          onEnter={enterField}
        />
      ) : null}
    </div>
  );
}

function MetaStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "hunter" | "runner";
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[3px] border border-line bg-surface/45 px-3 py-2.5">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-[2px] border",
          tone === "hunter"
            ? "border-hunter/25 bg-hunter/10 text-hunter"
            : tone === "runner"
            ? "border-runner/25 bg-runner/10 text-runner"
            : "border-line bg-surface-2 text-faint",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-faint">{label}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink">{value}</p>
      </div>
    </div>
  );
}

function TeamPanel({
  role,
  players,
  maxPlayers,
  onAssignRole,
  onAdd,
  isHost,
}: {
  role: RoleType;
  players: Player[];
  maxPlayers: number;
  onAssignRole: (id: string, role: RoleType) => void;
  onAdd: () => void;
  isHost: boolean;
}) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const hunter = role === "hunter";
  const Icon = hunter ? Crosshair : Rabbit;
  const emptySlots = Math.max(0, Math.min(2, Math.floor(maxPlayers / 2) - players.length));

  return (
    <Card
      corners
      role="region"
      aria-label={`${hunter ? "Hunters" : "Runners"} team drop zone`}
      onDragOver={(event) => {
        if (!isHost) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIsDropTarget(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDropTarget(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDropTarget(false);
        if (!isHost) return;
        const playerId = event.dataTransfer.getData("text/plain");
        if (playerId) onAssignRole(playerId, role);
      }}
      className={cn(
        "overflow-hidden transition-[border-color,box-shadow]",
        isDropTarget && hunter && "border-hunter/70 shadow-[0_0_24px_color-mix(in_srgb,var(--hunter)_14%,transparent)]",
        isDropTarget && !hunter && "border-runner/70 shadow-[0_0_24px_color-mix(in_srgb,var(--runner)_14%,transparent)]",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-3",
          hunter ? "border-hunter/15 bg-hunter/[0.04]" : "border-runner/15 bg-runner/[0.04]",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-[2px] border",
              hunter
                ? "border-hunter/30 bg-hunter/10 text-hunter"
                : "border-runner/30 bg-runner/10 text-runner",
            )}
          >
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold uppercase leading-none tracking-[0.04em] text-ink">
              {hunter ? "Hunters" : "Runners"}
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
              {isHost
                ? `Drop players here to assign ${hunter ? "hunters" : "runners"}`
                : hunter
                  ? "Close the distance"
                  : "Stay out of reach"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "font-mono text-[10px] tabular",
            hunter ? "text-hunter" : "text-runner",
          )}
        >
          {String(players.length).padStart(2, "0")}
        </span>
      </div>

      <div className="divide-y divide-line/70">
        {players.map((player) => (
          <div
            key={player.id}
            draggable={isHost && !player.isYou}
            aria-label={isHost && !player.isYou ? `Drag ${player.name} to the other team` : undefined}
            title={isHost && !player.isYou ? `Drag ${player.name} to the other team` : undefined}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", player.id);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5",
              isHost && !player.isYou && "cursor-grab active:cursor-grabbing",
            )}
          >
            <div
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-[2px] border font-mono text-[9px]",
                player.isYou
                  ? hunter
                    ? "border-hunter/50 bg-hunter/10 text-hunter"
                    : "border-runner/50 bg-runner/10 text-runner"
                  : "border-line-strong bg-surface-2 text-muted",
              )}
            >
              {player.avatar}
              {player.isYou ? (
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-surface bg-current" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                  {player.name}
                </span>
                {player.isHost ? <Crown className="size-3 shrink-0 text-warning" /> : null}
                {player.isYou ? <Chip className="h-4 px-1.5 text-[7px]">You</Chip> : null}
                {player.isBot ? <Chip className="h-4 px-1.5 text-[7px]">Bot</Chip> : null}
              </div>
              <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                {player.ready ? "Ready" : "Standby"}
                {player.connected ? "" : " / Offline"}
              </p>
            </div>
            <span
              className={cn(
                "size-1.5 rounded-full",
                player.ready
                  ? hunter
                    ? "bg-hunter"
                    : "bg-runner"
                  : "bg-line-strong",
              )}
            />
            {isHost && !player.isYou ? (
              <span
                title={`Drag ${player.name} to the other team`}
                className="shrink-0 text-faint"
              >
                <GripVertical aria-hidden="true" className="size-4" />
              </span>
            ) : null}
          </div>
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <button
            key={`empty-${index}`}
            type="button"
            onClick={onAdd}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/40"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-dashed border-line-strong text-faint">
              <Plus className="size-3.5" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
              Open slot
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 font-mono text-[8px] uppercase tracking-[0.16em] transition-colors",
          hunter ? "text-hunter hover:bg-hunter/5" : "text-runner hover:bg-runner/5",
        )}
      >
        <UserPlus className="size-3" />
        Invite {hunter ? "hunter" : "runner"}
      </button>
    </Card>
  );
}

function AssignmentCard({
  player,
  isHost,
  onAssignRole,
  onToggleReady,
}: {
  player: Player | undefined;
  isHost: boolean;
  onAssignRole: (id: string, role: RoleType) => void;
  onToggleReady: () => void;
}) {
  if (!player) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="label-mono">Your assignment</p>
        <RoleBadge role={player.role} compact />
      </div>
      <div className="mt-3 border-t border-line pt-1">
        <Toggle
          checked={player.ready}
          onChange={onToggleReady}
          label="Ready to deploy"
          description="Confirm you are on site. Your status is visible to the host."
        />
      </div>

      {player.role === "unassigned" ? (
        <div className="mt-3 rounded-[3px] border border-line bg-surface-2/50 p-3 text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink">
            Standby
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            {isHost
              ? "Pick a side to join the field."
              : "The host will assign you to hunters or runners."}
          </p>
          {isHost ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="hunter"
                size="sm"
                onClick={() => onAssignRole(player.id, "hunter")}
              >
                <Crosshair className="size-3.5" />
                Hunter
              </Button>
              <Button
                variant="runner"
                size="sm"
                onClick={() => onAssignRole(player.id, "runner")}
              >
                <Rabbit className="size-3.5" />
                Runner
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isHost && player.role !== "unassigned" ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
            Switch side
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onAssignRole(player.id, "hunter")}
              disabled={player.role === "hunter"}
              className={cn(
                "rounded-[2px] border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] transition-colors",
                player.role === "hunter"
                  ? "border-hunter/40 bg-hunter/10 text-hunter"
                  : "border-line text-faint hover:text-ink",
              )}
            >
              Hunter
            </button>
            <button
              type="button"
              onClick={() => onAssignRole(player.id, "runner")}
              disabled={player.role === "runner"}
              className={cn(
                "rounded-[2px] border px-2 py-1 font-mono text-[7px] uppercase tracking-[0.12em] transition-colors",
                player.role === "runner"
                  ? "border-runner/40 bg-runner/10 text-runner"
                  : "border-line text-faint hover:text-ink",
              )}
            >
              Runner
            </button>
          </div>
        </div>
      ) : null}

      {player.role === "runner" && player.tagCode ? (
        <div className="mt-3 rounded-[3px] border border-runner/25 bg-runner/5 p-3 text-center">
          <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint mb-1">
            Your private tag code
          </p>
          <p className="font-mono text-3xl tracking-[0.3em] text-runner">
            {player.tagCode}
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            Share this 4-digit PIN only when physically caught. Hunters enter
            it to tag you.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function UnassignedPanel({
  players,
  isHost,
  onAssignRole,
  onInvite,
}: {
  players: Player[];
  isHost: boolean;
  onAssignRole: (id: string, role: RoleType) => void;
  onInvite: () => void;
}) {
  return (
    <Card corners className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface-2/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[2px] border border-line-strong bg-surface-2 text-muted">
            <UserPlus className="size-4" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold uppercase leading-none tracking-[0.04em] text-ink">
              Standby
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
              {isHost
                ? "Assign each player to a side"
                : "Waiting for the host to assign sides"}
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] tabular text-muted">
          {String(players.length).padStart(2, "0")}
        </span>
      </div>
      <div className="divide-y divide-line/70">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-surface-2 font-mono text-[9px] text-muted">
              {player.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                  {player.name}
                </span>
                {player.isHost ? (
                  <Crown className="size-3 shrink-0 text-warning" />
                ) : null}
                {player.isYou ? (
                  <Chip className="h-4 px-1.5 text-[7px]">You</Chip>
                ) : null}
                {player.isBot ? (
                  <Chip className="h-4 px-1.5 text-[7px]">Bot</Chip>
                ) : null}
              </div>
              <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                Awaiting assignment
              </p>
            </div>
            {isHost ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onAssignRole(player.id, "hunter")}
                  className="rounded-[2px] border border-hunter/30 bg-hunter/5 px-2 py-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-hunter transition-colors hover:bg-hunter/10"
                >
                  Hunter
                </button>
                <button
                  type="button"
                  onClick={() => onAssignRole(player.id, "runner")}
                  className="rounded-[2px] border border-runner/30 bg-runner/5 px-2 py-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-runner transition-colors hover:bg-runner/10"
                >
                  Runner
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onInvite}
        className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted transition-colors hover:bg-surface-2/40 hover:text-ink"
      >
        <UserPlus className="size-3" />
        Invite another player
      </button>
    </Card>
  );
}

function PermissionRow({
  icon: Icon,
  label,
}: {
  icon: typeof MapPin;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted" />
        <span className="text-[11px] text-muted">{label}</span>
      </div>
      <Chip tone="warning" className="h-5 px-1.5 text-[7px]">
        Mock
      </Chip>
    </div>
  );
}

function ActivityFeed() {
  const players = useGame((state) => state.players);
  const settings = useGame((state) => state.settings);
  const phase = useGame((state) => state.phase);
  const host = players.find((player) => player.isHost);
  const unassigned = players.filter((player) => player.role === "unassigned");
  const hunters = players.filter((player) => player.role === "hunter");
  const runners = players.filter((player) => player.role === "runner");
  const offline = players.filter((player) => !player.connected && !player.isBot);

  const events: { text: string; tone: "hunter" | "runner" | "neutral" }[] = [
    {
      text: `${host?.name ?? "Host"} is hosting this lobby`,
      tone: "neutral",
    },
    {
      text: `${players.length} player${players.length === 1 ? "" : "s"} in the lobby${offline.length ? ` / ${offline.length} offline` : ""}`,
      tone: "neutral",
    },
    {
      text: `${hunters.length} hunter${hunters.length === 1 ? "" : "s"} and ${runners.length} runner${runners.length === 1 ? "" : "s"} assigned`,
      tone: "neutral",
    },
    ...(unassigned.length > 0
      ? [
          {
            text: `${unassigned.map((player) => player.name).join(", ")} awaiting assignment`,
            tone: "neutral" as const,
          },
        ]
      : []),
    {
      text:
        phase === "lobby"
          ? `Protocol set / ${Math.round(settings.pingSec / 60)} min ping cycle / ${Math.round(settings.durationSec / 60)} min round`
          : phase === "prep"
            ? "Prep countdown running. Hunters hold position."
            : phase === "active"
              ? "Operation live. Positions update on each ping."
              : "Operation complete.",
      tone: phase === "active" ? "runner" : "neutral",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="size-3.5 text-faint" />
          <p className="label-mono">Lobby comms</p>
        </div>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
          Live feed
        </span>
      </div>
      <div className="divide-y divide-line/60">
        {events.map((event, index) => (
          <div key={event.text} className="flex items-start gap-3 px-4 py-2.5">
            <span className="w-8 shrink-0 font-mono text-[8px] tabular text-faint">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "mt-1 size-1.5 shrink-0 rounded-full",
                event.tone === "runner"
                  ? "bg-runner"
                  : index === events.length - 1
                    ? "bg-info"
                    : "bg-line-strong",
              )}
            />
            <p className="text-[11px] leading-relaxed text-muted">{event.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PrepOverlay({
  seconds,
  total,
  role,
  isHost,
  onSkip,
  onEnter,
}: {
  seconds: number;
  total: number;
  role: RoleType;
  isHost: boolean;
  onSkip: () => void;
  onEnter: () => void;
}) {
  const hunter = role === "hunter";
  const done = seconds <= 0;
  const pct = done ? 100 : Math.min(100, (seconds / total) * 100);
  const settings = useGame((state) => state.settings);
  const code = useGame((state) => state.code);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-canvas">
      <div className="absolute inset-0 hud-grid opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,var(--canvas)_72%)]" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative z-10 flex items-center justify-between px-5 py-4 safe-top">
        <div className="flex items-center gap-3">
          <span className="size-1.5 animate-soft-pulse rounded-full bg-runner" />
          <span className="label-mono text-muted">Deployment phase</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          Lobby {code}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl text-center">
          <div className="mb-8 flex justify-center">
            <RoleBadge role={role} suffix="Deploying" />
          </div>

          <div className="relative mx-auto flex size-[260px] items-center justify-center sm:size-[320px]">
            <div className="absolute inset-0 rounded-full border border-line/80" />
            <div className="absolute inset-[12%] rounded-full border border-line/60" />
            <div className="absolute inset-[24%] rounded-full border border-line/40" />
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(${hunter ? "var(--hunter)" : "var(--runner)"} ${pct}%, transparent 0)`,
                mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
              }}
            />
            <div className="absolute inset-[8%] rounded-full border border-dashed border-line-strong/50" />
            <div className="relative">
              <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-faint">
                {done ? "Field open" : hunter ? "Hold position" : "Head start"}
              </p>
              <p
                className={cn(
                  "mt-3 font-mono text-6xl tabular tracking-[-0.04em] sm:text-7xl",
                  hunter ? "text-hunter" : "text-runner",
                )}
              >
                {formatClock(seconds)}
              </p>
              <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
                {done ? "Awaiting deployment order" : "Until hunters move"}
              </p>
            </div>
          </div>

          <h2 className="display mt-9 text-4xl font-semibold text-ink sm:text-5xl">
            {done
              ? hunter
                ? "The hunt begins."
                : "You are clear."
              : hunter
              ? "Hold the line."
              : "Get out of sight."}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-muted">
            {done
              ? hunter
                ? "No runner intel until the first ping. Sweep the field and close in."
                : "The clock is live. Keep moving, watch the map, and survive."
              : hunter
              ? "Hunters must stay at the staging point. The first runner ping arrives after the prep countdown."
              : "Runners deploy now. Use the head start to break line of sight and find a hiding place."}
          </p>

          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2">
            <Button
              variant={hunter ? "hunter" : "runner"}
              size="lg"
              full
              onClick={onEnter}
            >
              Enter the field
              <ArrowRight className="size-4" />
            </Button>
            {isHost ? (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip prep and deploy now
              </Button>
            ) : (
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                The field opens automatically when the countdown ends
              </p>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 divide-x divide-line border-t border-line pt-4 text-left">
            <div className="px-3 first:pl-0">
              <p className="label-mono">Ping cycle</p>
              <p className="mt-1.5 font-mono text-xs text-ink">
                {formatClock(settings.pingSec)}
              </p>
            </div>
            <div className="px-3">
              <p className="label-mono">Tag method</p>
              <p className="mt-1.5 font-mono text-xs text-ink">
                Runner-only code
              </p>
            </div>
            <div className="px-3">
              <p className="label-mono">Role</p>
              <p className={cn("mt-1.5 font-mono text-xs", hunter ? "text-hunter" : "text-runner")}>
                {hunter ? "HUNTER" : "RUNNER"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
