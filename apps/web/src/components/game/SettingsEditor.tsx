import { useState } from "react";
import {
  ChevronDown,
  Clock3,
  Crosshair,
  Map,
  Shrink,
  SlidersHorizontal,
  TimerReset,
  TriangleAlert,
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
import {
  normalizeZoneSettings,
  zoneScheduleFit,
  zoneScheduleLabel,
  ZONE_MAX_INTERVAL_SEC,
  ZONE_MAX_STEP_M,
  ZONE_MIN_FINAL_M,
  ZONE_MIN_INTERVAL_SEC,
  ZONE_MIN_STEP_M,
} from "@/lib/zone";
import { usePreferences } from "@/store/preferences";
import { cn } from "@/lib/cn";
import type { GameSettings } from "@/lib/types";

type SectionId = "timing" | "field" | "zone" | "advanced";

export function SettingsEditor({ compact }: { compact?: boolean }) {
  const settings = useGame((s) => s.settings);
  const updateSettings = useGame((s) => s.updateSettings);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    timing: true,
    field: true,
    zone: true,
    advanced: false,
  });
  const units = usePreferences((s) => s.units);
  const pingMinutes = Math.round(settings.pingSec / 60);
  const durationMinutes = Math.round(settings.durationSec / 60);
  const prepMinutes = Math.round(settings.prepSec / 60);
  const estimatedPings = Math.max(1, Math.floor(settings.durationSec / settings.pingSec));
  const zoneFit = zoneScheduleFit(settings);

  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const next = { ...settings, [key]: value } as GameSettings;
    updateSettings(normalizeZoneSettings(next));
  };

  const toggle = (id: SectionId) =>
    setOpen((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <CollapsibleSection
        icon={TimerReset}
        index="01"
        title="Timing"
        summary={`${pingMinutes}m ping · ${formatDurationLabel(durationMinutes)} · ${prepMinutes}m prep`}
        expanded={open.timing}
        onToggle={() => toggle("timing")}
        compact={compact}
      >
        <div className={cn("space-y-4", compact && "space-y-3")}>
          <CompactSlider
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

          <div className={cn("hairline", compact && "my-1.5")} />

          <CompactSlider
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

          <div className={cn("hairline", compact && "my-1.5")} />

          <CompactSlider
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
      </CollapsibleSection>

      <CollapsibleSection
        icon={Crosshair}
        index="02"
        title="Rules of engagement"
        summary={`${formatRadius(settings.playAreaM, units)} field · ${
          settings.showAllHuntersToRunners ? "all hunters" : "squad only"
        }`}
        expanded={open.field}
        onToggle={() => toggle("field")}
        compact={compact}
      >
        <div className={cn("space-y-4", compact && "space-y-3")}>
          <CompactSlider
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
      </CollapsibleSection>

      <CollapsibleSection
        icon={Shrink}
        index="03"
        title="Shrinking zone"
        summary={
          settings.zoneEnabled
            ? zoneScheduleLabel(settings)
            : "Static play area"
        }
        expanded={open.zone}
        onToggle={() => toggle("zone")}
        compact={compact}
        accent={settings.zoneEnabled ? "runner" : undefined}
      >
        <div className={cn("space-y-4", compact && "space-y-3")}>
          <Toggle
            label="Battle royale play area"
            description="The boundary contracts on a timer, forcing runners into tighter pockets."
            checked={settings.zoneEnabled}
            onChange={(value) => set("zoneEnabled", value)}
            compact={compact}
          />

          {settings.zoneEnabled ? (
            <>
              <div className={cn("hairline", compact && "my-1.5")} />

              <CompactSlider
                label="Shrink interval"
                hint="How often the boundary moves inward."
                value={settings.zoneShrinkIntervalSec}
                min={ZONE_MIN_INTERVAL_SEC}
                max={ZONE_MAX_INTERVAL_SEC}
                step={30}
                onChange={(value) => set("zoneShrinkIntervalSec", value)}
                display={`${Math.round(settings.zoneShrinkIntervalSec / 60)} min`}
                minLabel="1 min"
                maxLabel="15 min"
                accent="var(--warning)"
                compact={compact}
              />
              <PresetChips
                options={[
                  { label: "Fast · 2m", value: 120 },
                  { label: "Normal · 5m", value: 300 },
                  { label: "Slow · 10m", value: 600 },
                ]}
                value={settings.zoneShrinkIntervalSec}
                onChange={(value) => set("zoneShrinkIntervalSec", value)}
                className={compact ? "gap-1" : undefined}
              />

              <div className={cn("hairline", compact && "my-1.5")} />

              <CompactSlider
                label="Shrink step"
                hint="Radius lost on every contraction."
                value={settings.zoneShrinkStepM}
                min={ZONE_MIN_STEP_M}
                max={ZONE_MAX_STEP_M}
                step={25}
                onChange={(value) => set("zoneShrinkStepM", value)}
                display={`−${settings.zoneShrinkStepM} m`}
                minLabel="25 m"
                maxLabel="1000 m"
                accent="var(--warning)"
                compact={compact}
              />

              <div className={cn("hairline", compact && "my-1.5")} />

              <CompactSlider
                label="Final radius"
                hint="Smallest the field ever gets. The zone stops here."
                value={settings.zoneFinalRadiusM}
                min={ZONE_MIN_FINAL_M}
                max={Math.max(ZONE_MIN_FINAL_M + 50, settings.playAreaM)}
                step={25}
                onChange={(value) => set("zoneFinalRadiusM", value)}
                display={formatRadius(settings.zoneFinalRadiusM, units)}
                minLabel="50 m"
                maxLabel={formatRadius(settings.playAreaM, units)}
                accent="var(--warning)"
                compact={compact}
              />

              <div
                className={cn(
                  "rounded-[2px] border px-3 py-2.5",
                  zoneFit.fits
                    ? "border-line bg-canvas/30"
                    : "border-warning/40 bg-warning/[0.06]",
                )}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                  Zone schedule
                </p>
                <p className="mt-1 font-mono text-sm tabular text-ink">
                  {zoneScheduleLabel(settings)}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  {formatRadius(settings.playAreaM, units)} shrinks to{" "}
                  {formatRadius(settings.zoneFinalRadiusM, units)} in{" "}
                  {zoneFit.totalShrinkCount} steps.
                </p>
                {zoneFit.fits ? (
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    Finishes at{" "}
                    <span className="text-ink">
                      {formatDurationLabel(Math.round(zoneFit.completesAtSec / 60))}
                    </span>{" "}
                    into a {formatDurationLabel(durationMinutes)} round.
                  </p>
                ) : (
                  <div className="mt-2 flex items-start gap-1.5 border-t border-warning/20 pt-2">
                    <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
                    <p className="text-[10px] leading-relaxed text-warning">
                      Schedule runs past the round by{" "}
                      {formatDurationLabel(Math.round(zoneFit.overflowSec / 60))}.
                      Only {zoneFit.completedShrinkCount} of {zoneFit.totalShrinkCount}{" "}
                      contractions land inside the round. Shorten the interval or
                      extend the round.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        icon={SlidersHorizontal}
        index="04"
        title="Advanced protocol"
        summary="Update rate and player cap."
        expanded={open.advanced}
        onToggle={() => toggle("advanced")}
        compact={compact}
      >
        <div className={cn("space-y-4", compact && "space-y-3")}>
          <CompactSlider
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
          <div className={cn("hairline", compact && "my-1.5")} />
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
          <div className="rounded-[2px] border border-line bg-canvas/30 px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
              Estimated intel events
            </p>
            <p className="mt-1 font-mono text-sm tabular text-ink">
              {estimatedPings} pings <span className="text-faint">/ round</span>
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

/**
 * Slider that hides its hint text unless the row is hovered or focused, so a
 * stack of sliders stays visually compact while the guidance stays reachable.
 */
function CompactSlider({
  hint,
  ...props
}: React.ComponentProps<typeof Slider> & { hint?: string }) {
  if (!hint) return <Slider {...props} />;

  return (
    <div className="group/slider">
      <Slider {...props} hint={undefined} />
      <p className="hidden text-[10px] leading-relaxed text-muted group-hover/slider:block group-focus-within/slider:block [@media(hover:none)]:block">
        {hint}
      </p>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  index,
  title,
  summary,
  children,
  expanded,
  onToggle,
  compact,
  accent,
}: {
  icon: LucideIcon;
  index: string;
  title: string;
  summary: string;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  compact?: boolean;
  accent?: "runner" | "hunter";
}) {
  return (
    <Card corners className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/40",
          compact && "px-3.5 py-2",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[2px] border bg-surface-2",
            accent === "runner"
              ? "border-runner/30 text-runner"
              : "border-line text-muted",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.04em] text-ink">
              {title}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
              {index}
            </span>
          </span>
          <span className="mt-0.5 block truncate font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
            {summary}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-faint transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className={cn("border-t border-line px-4 py-3.5", compact && "px-3.5 py-3")}>
          {children}
        </div>
      ) : null}
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
    { label: "Intel", value: settings.showAllHuntersToRunners ? "All hunters" : "Squad only", icon: Crosshair },
    {
      label: "Zone",
      value: settings.zoneEnabled ? "Shrinking" : "Static",
      icon: Shrink,
    },
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
      <Chip>{settings.showAllHuntersToRunners ? "Hunter intel on" : "Hunter intel off"}</Chip>
      {settings.zoneEnabled ? <Chip tone="warning">Zone shrinking</Chip> : null}
    </div>
  );
}
