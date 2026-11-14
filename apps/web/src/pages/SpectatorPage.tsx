import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  EyeOff,
  Flag,
  Footprints,
  LogOut,
  Radio,
  ShieldX,
  Timer,
} from "lucide-react";
import { GpsBanner } from "@/components/game/GpsBanner";
import { RunnerMap } from "@/components/game/RunnerMap";
import { useFieldMapData } from "@/components/game/useFieldMapData";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { useGame, useYou } from "@/store/game";
import { formatLongClock } from "@/lib/geo";

export function SpectatorPage() {
  const navigate = useNavigate();
  const you = useYou();
  const players = useGame((state) => state.players);
  const settings = useGame((state) => state.settings);
  const timeLeftSec = useGame((state) => state.timeLeftSec);
  const activeRunners = players.filter(
    (p) => p.role === "runner" && p.status === "active",
  ).length;
  const hunters = players.filter((p) => p.role === "hunter").length;
  const survived = Math.max(0, settings.durationSec - timeLeftSec);
  const caught = you?.role === "runner" && you.status === "caught";
  const { self, teammates, hunters: hunterMarkers, caughtSpots, center } =
    useFieldMapData();

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Exit field" />

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 pb-12 sm:px-6">
        <div className="mt-3 overflow-hidden rounded-xl border border-danger/25 bg-surface/75">
          <div className="relative overflow-hidden px-5 py-9 text-center sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--danger)_10%,transparent),transparent_65%)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-danger/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-danger/15" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-danger/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[460px] -translate-x-1/2 bg-danger/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-px -translate-y-1/2 bg-danger/10" />
            <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />

            <div className="relative">
              <div className="mb-5 flex justify-center gap-1.5">
                <Chip tone={caught ? "danger" : "runner"} dot>
                  {caught ? "Runner eliminated" : "Observer"}
                </Chip>
                <Chip>Spectator mode</Chip>
              </div>

              <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
                <ShieldX className="size-7" />
              </div>

              <h1 className="display mt-6 text-5xl font-semibold leading-[0.82] text-ink sm:text-7xl">
                {caught ? (
                  <>
                    Out of
                    <br />
                    the hunt.
                  </>
                ) : (
                  <>
                    Watching
                    <br />
                    the field.
                  </>
                )}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-muted">
                {caught
                  ? "A hunter confirmed your PIN tag. You're out of the round, but your device stays on your own map while other players can no longer see you."
                  : "You are observing this round. The host has not assigned you to a side, so no other player's intel is shared."}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {caught ? (
                  <>
                    <RoleBadge role="runner" suffix="Caught" />
                    <Chip tone="hunter">Tag confirmed</Chip>
                  </>
                ) : (
                  <>
                    <RoleBadge role="unassigned" />
                    <Chip>No active role</Chip>
                  </>
                )}
              </div>

              <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 divide-x divide-line border-y border-line py-4">
                <Stat label="Survived" value={formatLongClock(survived)} icon={Timer} />
                <Stat label="Runners left" value={String(activeRunners)} icon={Footprints} tone="runner" />
                <Stat label="Hunters" value={String(hunters)} icon={Radio} tone="hunter" />
              </div>
            </div>
          </div>

          <div className="grid gap-0 border-t border-line md:grid-cols-2">
            <div className="border-b border-line p-5 md:border-b-0 md:border-r">
              <p className="label-mono mb-3">Field status</p>
              <div className="space-y-3">
                <StatusRow
                  icon={EyeOff}
                  title="Hidden from other players"
                  description="Your live position is no longer sent to hunters or runners."
                  tone="runner"
                />
                <StatusRow
                  icon={Radio}
                  title="Spectator intel active"
                  description="You still see your squad and caught sites, plus hunter markers when all-hunter intel is enabled."
                />
                <StatusRow
                  icon={Footprints}
                  title={`${activeRunners} runner${activeRunners === 1 ? "" : "s"} still active`}
                  description={`${hunters} hunters remain in the field.`}
                  tone="hunter"
                />
              </div>
            </div>

            <div className="p-5">
              <p className="label-mono mb-3">Comms log</p>
              <div className="space-y-3">
                <CommsRow time="18:42" text="Tag confirmed by a hunter" tone="danger" />
                <CommsRow time="18:42" text="Your signal left the hunter feed" tone="runner" />
                <CommsRow time="18:43" text="Spectator channel opened" tone="neutral" />
                <CommsRow time="18:44" text="Round continues without you" tone="neutral" />
              </div>
            </div>
          </div>

          <div className="border-t border-line p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-mono mb-1">Spectator map</p>
                <p className="text-[10px] text-muted">
                  You stay on your own map. Other players cannot see you.
                </p>
              </div>
              <Chip tone="runner" dot>
                Hidden from field
              </Chip>
            </div>
            <GpsBanner className="mt-3" />
            <div className="mt-3">
              <RunnerMap
                self={self}
                teammates={teammates}
                hunters={hunterMarkers}
                caughtSpots={caughtSpots}
                center={center}
                playAreaM={settings.playAreaM}
                heightClass="h-[340px] sm:h-[420px]"
              />
            </div>
            <p className="mt-3 border-t border-line pt-3 font-mono text-[7px] uppercase leading-relaxed tracking-[0.12em] text-faint">
              Squad and caught sites are visible. Hunter markers appear only when
              all-hunter intel is enabled.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
            <Flag className="size-3.5" />
            Round time remaining {formatLongClock(timeLeftSec)}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/")}>
              <LogOut className="size-3.5" />
              Leave
            </Button>
            <Button variant="runner" onClick={() => navigate("/results")}>
              Field report
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
          {you?.name ?? "RUNNER"} / spectator channel / hidden from field
        </p>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Timer;
  tone?: "hunter" | "runner";
}) {
  return (
    <div className="px-2">
      <Icon
        className={
          tone === "hunter"
            ? "mx-auto size-3.5 text-hunter"
            : tone === "runner"
              ? "mx-auto size-3.5 text-runner"
              : "mx-auto size-3.5 text-faint"
        }
      />
      <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-sm tabular text-ink">{value}</p>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: typeof EyeOff;
  title: string;
  description: string;
  tone?: "hunter" | "runner";
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={
          tone === "runner"
            ? "flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-runner/25 bg-runner/10 text-runner"
            : tone === "hunter"
              ? "flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-hunter/25 bg-hunter/10 text-hunter"
              : "flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line bg-surface-2 text-faint"
        }
      >
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className="text-[11px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

function CommsRow({
  time,
  text,
  tone,
}: {
  time: string;
  text: string;
  tone: "danger" | "runner" | "neutral";
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-9 shrink-0 font-mono text-[8px] tabular text-faint">{time}</span>
      <span
        className={
          tone === "danger"
            ? "mt-1.5 size-1 shrink-0 rounded-full bg-danger"
            : tone === "runner"
              ? "mt-1.5 size-1 shrink-0 rounded-full bg-runner"
              : "mt-1.5 size-1 shrink-0 rounded-full bg-line-strong"
        }
      />
      <span className="text-[10px] leading-relaxed text-muted">{text}</span>
    </div>
  );
}
