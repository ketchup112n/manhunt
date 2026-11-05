import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  Crosshair,
  Eye,
  Flag,
  FlaskConical,
  Home,
  LogIn,
  Moon,
  Play,
  Rabbit,
  Radio,
  RotateCcw,
  Settings,
  SquarePlus,
  Sun,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Slider } from "@/components/ui/FormControls";
import { useToast } from "@/components/ui/Toast";
import { useGame, useYou } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import { cn } from "@/lib/cn";

export function DevPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const you = useYou();
  const phase = useGame((state) => state.phase);
  const pingCount = useGame((state) => state.pingCount);
  const deviceHeading = useGame((state) => state.deviceHeading);
  const triggerPing = useGame((state) => state.triggerPing);
  const startGame = useGame((state) => state.startGame);
  const endGame = useGame((state) => state.endGame);
  const fillBots = useGame((state) => state.fillBots);
  const removeBots = useGame((state) => state.removeBots);
  const setDeviceHeading = useGame((state) => state.setDeviceHeading);
  const resetGame = useGame((state) => state.resetGame);
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const resetPreferences = usePreferences((state) => state.resetPreferences);
  const players = useGame((state) => state.players);
  const code = useGame((state) => state.code);
  const session = useGame((state) => state.session);
  const lobbyPath = session?.code ? `/lobby/${session.code}` : "/join";

  const screens: { label: string; path: string; icon: LucideIcon }[] = [
    { label: "Home", path: "/", icon: Home },
    { label: "Create", path: "/create", icon: SquarePlus },
    { label: "Join", path: "/join", icon: LogIn },
    { label: "Lobby", path: lobbyPath, icon: Users },
    { label: "Hunter", path: "/game/hunter", icon: Crosshair },
    { label: "Runner", path: "/game/runner", icon: Rabbit },
    { label: "Spectator", path: "/game/spectator", icon: Eye },
    { label: "Results", path: "/results", icon: Trophy },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const reset = () => {
    resetGame();
    resetPreferences();
    toast("Session reset", {
      description: "Left the lobby and restored default preferences.",
      tone: "success",
    });
    setOpen(false);
  };

  const runners = players.filter((p) => p.role === "runner");
  const bots = players.filter((p) => p.isBot);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open demo controls"
        aria-expanded={open}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-[3px] border border-r-0 border-runner/30 bg-surface/85 px-1.5 py-2.5 text-runner/70 shadow-[0_8px_30px_rgb(0_0_0/0.28)] backdrop-blur-md transition-colors hover:bg-surface hover:text-runner"
      >
        <FlaskConical className="size-3" />
        <span className="font-mono text-[7px] uppercase tracking-[0.24em] [writing-mode:vertical-rl]">
          Demo
        </span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Prototype controls"
        title="Demo console"
        description="Jump between screens, force events, and simulate sensor input. This panel only renders in development builds."
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Reset data
            </Button>
            <Button variant="hunter" onClick={() => setOpen(false)}>
              Close console
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <section>
            <SectionLabel label="Screens" meta={`${screens.length} routes`} />
            <div className="grid grid-cols-3 gap-1.5">
              {screens.map((screen) => {
                const active =
                  screen.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(screen.path);
                return (
                  <button
                    key={screen.path}
                    type="button"
                    onClick={() => go(screen.path)}
                    className={cn(
                      "flex h-[62px] flex-col items-center justify-center gap-1.5 rounded-[3px] border font-mono text-[8px] uppercase tracking-[0.1em] transition-colors",
                      active
                        ? "border-runner/50 bg-runner/10 text-runner"
                        : "border-line bg-surface-2/40 text-faint hover:border-line-strong hover:text-muted",
                    )}
                  >
                    <screen.icon className="size-3.5" />
                    {screen.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <SectionLabel
              label="Field state"
              meta={`${phase}${phase === "active" ? ` / ${pingCount} pings` : ""}`}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <DevAction
                icon={Radio}
                label="Trigger ping"
                onClick={() => {
                  triggerPing();
                  toast("Ping fired", { tone: "warning" });
                }}
              />
              <DevAction
                icon={Play}
                label="Start round"
                onClick={() => {
                  startGame();
                  toast("Round started", { tone: "success" });
                }}
              />
              <DevAction
                icon={Flag}
                label="Hunters win"
                tone="hunter"
                onClick={() => {
                  endGame("hunters");
                  go("/results");
                }}
              />
              <DevAction
                icon={Flag}
                label="Runners win"
                tone="runner"
                onClick={() => {
                  endGame("runners");
                  go("/results");
                }}
              />
            </div>
          </section>

          <section>
            <SectionLabel
              label="Lobby"
              meta={code ? `Code ${code}` : "Not connected"}
            />
            <div className="rounded-[3px] border border-line bg-surface-2/40 p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {session
                ? "You are connected to a live lobby. Roles are assigned by the host."
                : "Create or join a lobby to test multiplayer. Bots are available to the host."}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <DevAction
                icon={Users}
                label="Fill with bots"
                onClick={() => {
                  fillBots(8);
                  toast("Adding bots", { tone: "success" });
                }}
              />
              <DevAction
                icon={RotateCcw}
                label={`Clear bots${bots.length ? ` (${bots.length})` : ""}`}
                onClick={() => {
                  removeBots();
                  toast("Removing bots", { tone: "default" });
                }}
              />
            </div>
          </section>

          <section>
            <SectionLabel label="Host-assigned role" meta={you?.name ?? "—"} />
            <div className="rounded-[3px] border border-line bg-surface-2/40 p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {you
                ? `Current role: ${you.role}. Use the lobby team controls to move players between hunters and runners.`
                : "Role is assigned by the host in the lobby. This screen has no active session."}
            </div>
          </section>

          <section>
            <SectionLabel label="Runner PINs (dev only)" meta={`${runners.length} active`} />
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {runners.map((runner) => (
                <div
                  key={runner.id}
                  className="flex items-center justify-between rounded-[3px] border border-line bg-surface-2/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex size-7 items-center justify-center rounded-[2px] border border-runner/25 bg-runner/10 text-runner font-mono text-[8px]"
                    >
                      {runner.avatar}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                      {runner.name}
                    </span>
                    {runner.isYou ? <span className="font-mono text-[7px] text-faint">(You)</span> : null}
                    {runner.status === "caught" ? (
                      <span className="font-mono text-[7px] text-danger">CAUGHT</span>
                    ) : null}
                  </div>
                  <span className="font-mono text-[10px] tabular tracking-[0.2em] text-ink">
                    {runner.tagCode ?? "••••"}
                  </span>
                </div>
              ))}
              {runners.length === 0 && (
                <p className="text-center text-[11px] text-muted">No active runners</p>
              )}
            </div>
          </section>

          <section>
            <SectionLabel label="Sensor simulation" meta={`${Math.round(deviceHeading)}°`} />
            <div className="rounded-[3px] border border-line bg-surface-2/40 px-3.5 py-3">
              <Slider
                label="Compass heading"
                hint="Simulates the phone pointing direction on the runner HUD."
                value={deviceHeading}
                min={0}
                max={359}
                step={1}
                onChange={setDeviceHeading}
                display={`${Math.round(deviceHeading)}°`}
                minLabel="0° N"
                maxLabel="359°"
                accent="var(--runner)"
              />
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                  <Compass className="size-3" />
                  Runner view only
                </span>
                <div className="flex gap-1">
                  {[0, 90, 180, 270].map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setDeviceHeading(angle)}
                      className="rounded-[2px] border border-line bg-canvas/40 px-1.5 py-1 font-mono text-[8px] tabular text-muted transition-colors hover:border-runner/40 hover:text-runner"
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionLabel label="Display" meta={theme} />
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                className={cn(
                  "flex items-center gap-2 rounded-[3px] border px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                  theme === "dark"
                    ? "border-runner/45 bg-runner/10 text-runner"
                    : "border-line bg-surface-2/40 text-faint hover:text-muted",
                )}
              >
                <Moon className="size-3.5" /> Night ops
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                className={cn(
                  "flex items-center gap-2 rounded-[3px] border px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                  theme === "light"
                    ? "border-runner/45 bg-runner/10 text-runner"
                    : "border-line bg-surface-2/40 text-faint hover:text-muted",
                )}
              >
                <Sun className="size-3.5" /> Daylight
              </button>
            </div>
          </section>

          <p className="border-t border-line pt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em] text-faint">
            Dev only / live lobby state / debug PINs come from the local server.
          </p>
        </div>
      </Sheet>
    </>
  );
}

function SectionLabel({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="label-mono">{label}</p>
      {meta ? (
        <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-faint">{meta}</span>
      ) : null}
    </div>
  );
}

function DevAction({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "hunter" | "runner";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-2 rounded-[3px] border px-3 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
        tone === "hunter"
          ? "border-hunter/25 bg-hunter/5 text-hunter hover:bg-hunter/10"
          : tone === "runner"
          ? "border-runner/25 bg-runner/5 text-runner hover:bg-runner/10"
          : "border-line bg-surface-2/40 text-muted hover:border-line-strong hover:text-ink",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}