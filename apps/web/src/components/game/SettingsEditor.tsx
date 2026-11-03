import { useState } from "react";
import {
  ChevronDown,
  Clock3,
  Crosshair,
  Map,
  SlidersHorizontal,
  TimerReset,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  NumberStepper,
  PresetChips,
  Slider,
  Toggle,
} from "@/components/ui/FormControls";
import { useGame } from "@/store/game";
import { formatDurationLabel, formatRadius } from "@/lib/geo";
import { usePreferences } from "@/store/preferences";
import { cn } from "@/lib/cn";
import type { GameSettings } from "@/lib/types";

export function SettingsEditor({ compact }: { compact?: boolean }) {
  const settings = useGame((s) => s.settings);
  const updateSettings = useGame((s) => s.updateSettings);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const units = usePreferences((s) => s.units);
  const pingMinutes = Math.round(settings.pingSec / 60);
  const durationMinutes = Math.round(settings.durationSec / 60);
  const prepMinutes = Math.round(settings.prepSec / 60);
  const estimatedPings = Math.max(1, Math.floor(settings.durationSec / settings.pingSec));

  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    updateSettings({ [key]: value } as Partial<GameSettings>);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <Section
        icon={TimerReset}
        index="01"
        title="Timing"
        description="How often hunters see you, and how long the round runs."
        compact={compact}
      >
        <div className={cn("space-y-6", compact && "space-y-4")}>
          <Slider
            label="Ping interval"
            hint="Hunters receive a location snapshot of every active runner."
            value={settings.pingSec}
            min={60}
            max={900}
            step={30}
            onChange={(value) => set("pingSec", value)}
            display={`${pingMinutes} min`}
            minLabel="1 min"
            maxLabel="15 min"
            accent="var(--hunter)"
            compact={compact}
          />
          <PresetChips
            options={[
              { label: "Blitz · 2m", value: 120 },
              { label: "Standard · 5m", value: 300 },
              { label: "Sniper · 10m", value: 600 },
            ]}
            value={settings.pingSec}
            onChange={(value) => set("pingSec", value)}
            className={compact ? "gap-1" : undefined}
          />

          <div className={cn("hairline", compact && "my-2")} />

          <Slider
            label="Round duration"
            value={settings.durationSec}
            min={900}
            max={10800}
            step={300}
            onChange={(value) => set("durationSec", value)}
            display={formatDurationLabel(durationMinutes)}
            minLabel="15 min"
            maxLabel="3 hr"
            compact={compact}
          />
          <PresetChips
            options={[
              { label: "Quick · 30m", value: 1800 },
              { label: "Classic · 60m", value: 3600 },
              { label: "Long · 90m", value: 5400 },
            ]}
            value={settings.durationSec}
            onChange={(value) => set("durationSec", value)}
            className={compact ? "gap-1" : undefined}
          />

          <div className={cn("hairline", compact && "my-2")} />

          <Slider
            label="Runner head start"
            hint="Prep countdown before hunters are allowed to move."
            value={settings.prepSec}
            min={60}
            max={600}
            step={30}
            onChange={(value) => set("prepSec", value)}
            display={`${prepMinutes} min`}
            minLabel="1 min"
            maxLabel="10 min"
            compact={compact}
          />
        </div>
      </Section>

      <Section
        icon={Crosshair}
        index="02"
        title="Rules of engagement"
        description="Field size and which team intelligence is shared."
        compact={compact}
      >
        <div className={cn("space-y-6", compact && "space-y-4")}>
          <Slider
            label="Play area radius"
            hint="Soft boundary around the starting point. Leaving it triggers a warning."
            value={settings.playAreaM}
            min={250}
            max={5000}
            step={250}
            onChange={(value) => set("playAreaM", value)}
            display={formatRadius(settings.playAreaM, units)}
            minLabel="250 m"
            maxLabel="5 km"
            compact={compact}
          />

          <div className={cn("divide-y divide-line/80", compact && "space-y-2")}>
            <Toggle
              label="Show all hunters to runners"
              description="Runners see anonymous hunter markers with bearing & distance."
              checked={settings.showAllHuntersToRunners}
              onChange={(value) => set("showAllHuntersToRunners", value)}
              compact={compact}
            />
            <Toggle
              label="Hunter team tracking"
              description="Hunters can see each other's live positions for coordination."
              checked={settings.showHunterTeammates}
              onChange={(value) => set("showHunterTeammates", value)}
              compact={compact}
            />
            <Toggle
              label="Allow late joins"
              description="Players can enter the lobby after the operation begins."
              checked={settings.allowLateJoin}
              onChange={(value) => set("allowLateJoin", value)}
              compact={compact}
            />
            <Toggle
              label="Caught players spectate"
              description="Eliminated runners can follow the round without location data."
              checked={settings.allowSpectators}
              onChange={(value) => set("allowSpectators", value)}
              compact={compact}
            />
          </div>
        </div>
      </Section>

      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className={cn(
            "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2/40",
            compact && "py-3 px-4",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-[2px] border border-line bg-surface-2 text-faint">
              <SlidersHorizontal className="size-3.5" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink">
                Advanced protocol
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Update rate, player cap, and sensor cadence.
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-faint transition-transform duration-200",
              advancedOpen && "rotate-180",
            )}
          />
        </button>

        {advancedOpen ? (
          <div className="border-t border-line px-5 pb-4">
            <Slider
              label="Location update interval"
              hint="How often each phone sends a location sample to the field."
              value={settings.locationIntervalSec}
              min={2}
              max={15}
              step={1}
              onChange={(value) => set("locationIntervalSec", value)}
              display={`${settings.locationIntervalSec} s`}
              minLabel="2 s"
              maxLabel="15 s"
              compact={compact}
            />
            <div className={cn("my-4 hairline", compact && "my-2")} />
            <Slider
              label="Compass refresh"
              hint="How often runner bearings are recalculated."
              value={settings.compassIntervalSec}
              min={1}
              max={10}
              step={1}
              onChange={(value) => set("compassIntervalSec", value)}
              display={`${settings.compassIntervalSec} s`}
              minLabel="1 s"
              maxLabel="10 s"
              compact={compact}
            />
            <div className={cn("my-4 hairline", compact && "my-2")} />
            <NumberStepper
              label="Maximum players"
              hint="Includes both hunters and runners."
              value={settings.maxPlayers}
              min={2}
              max={20}
              step={1}
              onChange={(value) => set("maxPlayers", value)}
              display={`${settings.maxPlayers}`}
            />
            <div className="mt-3 rounded-[2px] border border-line bg-canvas/30 px-3 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                Estimated intel events
              </p>
              <p className="mt-1 font-mono text-sm tabular text-ink">
                {estimatedPings} pings <span className="text-faint">/ round</span>
              </p>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Section({
  icon: Icon,
  index,
  title,
  description,
  children,
  compact,
}: {
  icon: LucideIcon;
  index: string;
  title: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Card corners className={cn("p-5", compact && "p-4")}>
      <div className={cn("mb-5 flex items-start justify-between gap-4 border-b border-line pb-4", compact && "mb-4 pb-3")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line bg-surface-2 text-muted">
            <Icon className="size-3.5" />
          </span>
          <div>
            <h2 className={cn("font-display font-semibold uppercase tracking-[0.04em] text-ink", compact ? "text-base" : "text-lg")}>
              {title}
            </h2>
            <p className={cn("mt-1 max-w-md leading-relaxed text-muted", compact ? "text-[10px]" : "text-[11px]")}>
              {description}
            </p>
          </div>
        </div>
        <span className="font-mono text-[9px] tabular text-faint">{index}</span>
      </div>
      {children}
    </Card>
  );
}

export function SettingsSummary({ compact }: { compact?: boolean }) {
  const settings = useGame((s) => s.settings);
  const units = usePreferences((s) => s.units);
  const items = [
    { label: "Ping", value: `${Math.round(settings.pingSec / 60)} min`, icon: Clock3 },
    {
      label: "Round",
      value: formatDurationLabel(Math.round(settings.durationSec / 60)),
      icon: TimerReset,
    },
    {
      label: "Prep",
      value: `${Math.round(settings.prepSec / 60)} min`,
      icon: Users,
    },
    { label: "Field", value: formatRadius(settings.playAreaM, units), icon: Map },
    { label: "Intel", value: settings.showAllHuntersToRunners ? "All hunters" : "Compass only", icon: Crosshair },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", compact && "gap-1.5")}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-[3px] border border-line bg-surface-2/45 px-3 py-2.5",
            compact && "px-2.5 py-2",
          )}
        >
          <div className="flex items-center gap-1.5">
            <item.icon className="size-3 text-faint" />
            <p className={cn("font-mono uppercase tracking-[0.16em] text-faint", compact ? "text-[7px]" : "text-[8px]")}>
              {item.label}
            </p>
          </div>
          <p className={cn("mt-1 font-mono tabular text-ink", compact ? "text-[10px]" : "text-[11px]")}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SettingsCallout() {
  const settings = useGame((s) => s.settings);
  const estimated = Math.max(1, Math.floor(settings.durationSec / settings.pingSec));
  return (
    <div className="flex items-start gap-2.5 rounded-[3px] border border-info/20 bg-info/5 px-3 py-2.5">
      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-info" />
      <p className="text-[11px] leading-relaxed text-muted">
        Runners will be located <span className="text-ink">{estimated} times</span> this round.
        Hunters receive coordinates only at those pings.
      </p>
    </div>
  );
}

export function RulesChips() {
  const settings = useGame((s) => s.settings);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip tone="hunter">Ping {Math.round(settings.pingSec / 60)}m</Chip>
      <Chip>{Math.round(settings.durationSec / 60)}m round</Chip>
      <Chip tone="runner">Private tag code</Chip>
      <Chip>{settings.showAllHuntersToRunners ? "Hunter map on" : "Hunter map off"}</Chip>
    </div>
  );
}