import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Crosshair,
  Eye,
  Flag,
  FlaskConical,
  Home,
  LogIn,
  Moon,
  Navigation,
  Play,
  Rabbit,
  Radio,
  RotateCcw,
  Settings,
  SquarePlus,
  Sun,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Slider } from "@/components/ui/FormControls";
import { useToast } from "@/components/ui/Toast";
import { useGame, useYou } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import { useSplash, SPLASH_MAX_LENGTH } from "@/store/splash";
import { cn } from "@/lib/cn";

export function DevPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [codePrompt, setCodePrompt] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const splash = useSplash((state) => state.text);
  const setSplashText = useSplash((state) => state.setText);
  const [splashDraft, setSplashDraft] = useState("");
  const [savingSplash, setSavingSplash] = useState(false);


  useEffect(() => {
    if (!codePrompt) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCodePrompt(false);
        setEnteredCode("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [codePrompt]);

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

  const DEMO_CODE = "1905";

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

  const handleOpen = () => {
    setEnteredCode("");
    setCodePrompt(true);
  };

  const handleCodeSubmit = () => {
    if (enteredCode === DEMO_CODE) {
      setCodePrompt(false);
      setEnteredCode("");
      setSplashDraft(useSplash.getState().text ?? "");
      setOpen(true);
    } else {
      toast("Invalid code", { tone: "danger" });
      setEnteredCode("");
    }
  };

  const saveSplash = async () => {
    setSavingSplash(true);
    try {
      const response = await fetch("/api/splash", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: DEMO_CODE, text: splashDraft }),
      });
      const data = (await response.json().catch(() => null)) as
        | { text?: string; error?: string }
        | null;
      if (!response.ok || !data?.text) {
        toast(data?.error ?? "Could not save the splash", { tone: "danger" });
        return;
      }
      setSplashText(data.text);
      setSplashDraft(data.text);
      toast(splashDraft.trim() ? "Splash updated" : "Splash reset", {
        tone: "success",
        description: "Every open tab picks it up within a few seconds.",
      });
    } catch {
      toast("Could not reach the server", { tone: "danger" });
    } finally {
      setSavingSplash(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open demo controls"
        aria-expanded={open || codePrompt}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-[3px] border border-r-0 border-runner/30 bg-surface/85 px-1.5 py-2.5 text-runner/70 shadow-[0_8px_30px_rgb(0_0_0/0.28)] backdrop-blur-md transition-colors hover:bg-surface hover:text-runner"
      >
        <FlaskConical className="size-3" />
        <span className="font-mono text-[7px] uppercase tracking-[0.24em] [writing-mode:vertical-rl]">
          Demo
        </span>
      </button>

      {codePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => {
              setCodePrompt(false);
              setEnteredCode("");
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative z-10 w-full max-w-xs mx-auto rounded-[4px] border border-line-strong/60 bg-surface shadow-[0_40px_120px_rgb(0_0_0/0.55)]"
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:pt-6">
              <div>
                <p className="label-mono">Demo console</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  Enter the access code to use prototype controls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCodePrompt(false);
                  setEnteredCode("");
                }}
                aria-label="Close"
                className="flex size-8 shrink-0 items-center justify-center rounded-[2px] text-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 pt-4 pb-5">
              <div className="mt-4 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) =>
                    setEnteredCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  className="min-w-0 flex-1 text-center font-mono text-xl tracking-[0.6em] border border-line bg-surface px-3 py-2 rounded-[3px] text-ink caret-ink"
                />
                <button
                  type="button"
                  onClick={handleCodeSubmit}
                  disabled={enteredCode.length !== 4}
                  className="flex size-9 shrink-0 items-center justify-center rounded-[3px] border border-runner/30 bg-runner/10 text-runner font-mono text-[9px] uppercase tracking-[0.12em] hover:bg-runner/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  Unlock
                </button>
              </div>
              <p className="mt-3 w-full font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                Wrong code clears the field.
              </p>
            </div>
          </motion.div>
        </div>
      )}

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
                label="Facing direction"
                hint="Simulates the phone pointing direction on the field map."
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
                  <Navigation className="size-3" />
                  Runner + hunter view
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

          <section>
            <SectionLabel
              label="Logo splash"
              meta={`${splashDraft.length}/${SPLASH_MAX_LENGTH}`}
            />
            <div className="rounded-[3px] border border-line bg-surface-2/40 p-3">
              <input
                type="text"
                value={splashDraft}
                onChange={(event) =>
                  setSplashDraft(event.target.value.slice(0, SPLASH_MAX_LENGTH))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveSplash();
                }}
                maxLength={SPLASH_MAX_LENGTH}
                placeholder="Text beside the logo"
                className="w-full rounded-[2px] border border-line bg-canvas/60 px-2.5 py-2 font-display text-[13px] text-ink caret-ink outline-none transition-colors focus:border-runner/50"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {["Tag fast", "Trust no one", "Stay off the grid"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSplashDraft(preset)}
                    className="rounded-[2px] border border-line bg-canvas/40 px-1.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-faint transition-colors hover:border-runner/40 hover:text-runner"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span
                  className={cn(
                    "font-mono text-[8px] uppercase tracking-[0.1em]",
                    splash === splashDraft ? "text-faint" : "text-warning",
                  )}
                >
                  {splash === splashDraft ? "Live" : "Unsaved"}
                </span>
                <Button
                  size="sm"
                  variant="runner"
                  disabled={savingSplash}
                  onClick={() => void saveSplash()}
                >
                  {savingSplash ? "Saving" : "Save splash"}
                </Button>
              </div>
            </div>
            <p className="mt-1.5 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-faint">
              Empty text restores the default. Hidden on phones, and the free
              server forgets edits when it restarts.
            </p>
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