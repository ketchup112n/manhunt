import { useNavigate } from "react-router-dom";
import {
  Info,
  MapPin,
  Monitor,
  Moon,
  Navigation,
  RotateCcw,
  Ruler,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl, Toggle } from "@/components/ui/FormControls";
import { useToast } from "@/components/ui/Toast";
import { usePreferences } from "@/store/preferences";
import { useGame } from "@/store/game";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/types";

export function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const sound = usePreferences((s) => s.sound);
  const haptics = usePreferences((s) => s.haptics);
  const reduceMotion = usePreferences((s) => s.reduceMotion);
  const setPreference = usePreferences((s) => s.setPreference);

  const resetAll = () => {
    useGame.getState().resetGame();
    usePreferences.getState().resetPreferences();
    toast("Session reset", {
      description: "Left the lobby and restored default preferences.",
      tone: "success",
    });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Home" />

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 pb-14 sm:px-6">
        <div className="border-b border-line py-6 sm:py-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-runner" />
            <p className="label-mono text-runner">Field preferences</p>
          </div>
          <h1 className="display text-4xl font-semibold text-ink sm:text-5xl">Settings.</h1>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-muted">
            Tune the display and feedback for your device. These preferences stay
            on this browser and do not affect the game rules.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <Card corners className="p-5">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="label-mono mb-1.5">Appearance</p>
                <h2 className="font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
                  Field theme
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Daylight mode increases contrast for direct sun.
                </p>
              </div>
              <Chip tone="runner">Display</Chip>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ThemeCard
                theme="dark"
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                icon={Moon}
                title="Night ops"
                description="Low-light tactical HUD"
              />
              <ThemeCard
                theme="light"
                active={theme === "light"}
                onClick={() => setTheme("light")}
                icon={Sun}
                title="Daylight"
                description="High-contrast outdoor mode"
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <SettingSection
              icon={Ruler}
              title="Units"
              description="Used for distance, radius, and map readouts."
            >
              <SegmentedControl
                value={units}
                onChange={setUnits}
                options={[
                  { value: "metric", label: "Metric", icon: <Ruler className="size-3.5" /> },
                  { value: "imperial", label: "Imperial", icon: <MapPin className="size-3.5" /> },
                ]}
              />
            </SettingSection>

            <div className="border-t border-line" />

            <SettingSection
              icon={Volume2}
              title="Feedback"
              description="In-game cues are simulated in this build."
            >
              <div className="divide-y divide-line/70">
                <Toggle
                  checked={sound}
                  onChange={(value) => setPreference("sound", value)}
                  label="Sound cues"
                  description="Ping broadcasts, tag alerts, and round transitions."
                />
                <Toggle
                  checked={haptics}
                  onChange={(value) => setPreference("haptics", value)}
                  label="Haptic feedback"
                  description="Vibration on supported Android devices."
                />
                <Toggle
                  checked={reduceMotion}
                  onChange={(value) => setPreference("reduceMotion", value)}
                  label="Reduce motion"
                  description="Disable radar sweeps, pulses, and needle easing."
                />
              </div>
            </SettingSection>

            <div className="border-t border-line" />

            <SettingSection
              icon={Smartphone}
              title="Sensors"
              description="Location is requested when the round starts. Facing direction is requested separately on iOS."
            >
              <div className="space-y-2">
                <PermissionLine icon={MapPin} label="Precise location" />
                <PermissionLine icon={Navigation} label="Facing direction" />
                <PermissionLine icon={Sun} label="Screen wake lock" />
                <PermissionLine icon={Monitor} label="Fullscreen mode" />
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-info/20 bg-info/5 px-3 py-2.5">
                <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
                <p className="text-[10px] leading-relaxed text-muted">
                  iOS asks once, then remembers your choice. Location and device
                  facing direction are read from this device for the live field
                  map; facing switches on with your first tap on the field page.
                </p>
              </div>
            </SettingSection>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-start gap-3 border-b border-line px-5 py-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line bg-surface-2 text-faint">
                <Sparkles className="size-3.5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
                  Session data
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Preferences stay in this browser. Lobby state lives on the
                  server, and your session token is stored locally so a reload
                  reconnects you.
                </p>
              </div>
            </div>
            <div className="grid gap-2 p-5 sm:grid-cols-2">
              <Button variant="secondary" onClick={resetAll}>
                <RotateCcw className="size-3.5" />
                Leave lobby and reset
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
              >
                <Trash2 className="size-3.5" />
                Clear browser data
              </Button>
            </div>
          </Card>

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-line bg-surface/40 px-5 py-4 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                Manhunt / realtime lobby
              </p>
              <p className="mt-1 text-[11px] text-muted">
                WebSocket lobby · server timers · simulated locations
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Back to field
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ThemeCard({
  theme,
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  theme: Theme;
  active: boolean;
  onClick: () => void;
  icon: typeof Moon;
  title: string;
  description: string;
}) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative overflow-hidden rounded-[3px] border p-3 text-left transition-all",
        active
          ? "border-runner/60 bg-runner/[0.05]"
          : "border-line bg-surface-2/40 hover:border-line-strong",
      )}
    >
      <div
        className={cn(
          "relative h-24 overflow-hidden rounded-[2px] border",
          dark ? "border-[#243538] bg-[#071011]" : "border-[#d6dbd4] bg-[#f3f0e7]",
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 flex h-5 items-center justify-between border-b px-2",
            dark ? "border-[#1e2d30]" : "border-[#d6dbd4]",
          )}
        >
          <span className={cn("h-1 w-8 rounded-full", dark ? "bg-[#4fe3c1]" : "bg-[#007a62]")} />
          <span className={cn("h-1 w-4 rounded-full", dark ? "bg-[#31464a]" : "bg-[#b9c2ba]")} />
        </div>
        <div className="absolute left-2 top-8 space-y-1.5">
          <span className={cn("block h-1.5 w-20 rounded-full", dark ? "bg-[#e9f3f1]" : "bg-[#0d1a1b]")} />
          <span className={cn("block h-1 w-12 rounded-full", dark ? "bg-[#647a77]" : "bg-[#7a8a85]")} />
          <span className={cn("mt-3 block h-6 w-28 rounded-[2px] border", dark ? "border-[#ff6b3d]/50 bg-[#ff6b3d]/10" : "border-[#c63a12]/40 bg-[#c63a12]/10")} />
        </div>
        <div
          className={cn(
            "absolute bottom-2 right-2 size-10 rounded-full border",
            dark ? "border-[#4fe3c1]/40" : "border-[#007a62]/40",
          )}
        >
          <div className={cn("absolute left-1/2 top-1/2 h-4 w-px -translate-y-full", dark ? "bg-[#4fe3c1]" : "bg-[#007a62]")} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-3.5", active ? "text-runner" : "text-faint")} />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink">{title}</span>
        </div>
        <span
          className={cn(
            "size-2 rounded-full border",
            active ? "border-runner bg-runner" : "border-line-strong",
          )}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted">{description}</p>
    </button>
  );
}

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Moon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line bg-surface-2 text-faint">
          <Icon className="size-3.5" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
            {title}
          </h2>
          <p className="mt-1 text-[11px] text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PermissionLine({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted" />
        <span className="text-[11px] text-muted">{label}</span>
      </div>
      <Chip tone="warning" className="h-5 px-1.5 text-[7px]">
        Simulated
      </Chip>
    </div>
  );
}
