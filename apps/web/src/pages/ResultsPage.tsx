import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Copy,
  Crosshair,
  Flag,
  MapPin,
  Radar,
  RotateCcw,
  ShieldCheck,
  Skull,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { RoleBadge } from "@/components/hud/RoleBadge";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import { formatLongClock, formatRadius } from "@/lib/geo";
import { cn } from "@/lib/cn";

export function ResultsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const players = useGame((state) => state.players);
  const settings = useGame((state) => state.settings);
  const resultWinner = useGame((state) => state.resultWinner);
  const phase = useGame((state) => state.phase);
  const units = usePreferences((state) => state.units);
  const pingCount = useGame((state) => state.pingCount);
  const timeLeftSec = useGame((state) => state.timeLeftSec);
  const code = useGame((state) => state.code);
  const rematch = useGame((state) => state.rematch);
  const isHost = players.some((player) => player.isYou && player.isHost);
  const winner = resultWinner ?? "runners";
  const runnersWin = winner === "runners";
  const runners = players.filter((player) => player.role === "runner");
  const caught = runners.filter((player) => player.status === "caught").length;
  const elapsed = settings.durationSec - timeLeftSec;
  const preview = phase !== "ended";
  const catchesDisplay = preview && caught === 0 ? (runnersWin ? 3 : runners.length) : caught;
  const survivorsDisplay = Math.max(0, runners.length - catchesDisplay);
  const pingDisplay = preview ? Math.max(pingCount, 9) : pingCount;

  useEffect(() => {
    if (phase === "lobby" && code) {
      navigate(`/lobby/${code}`, { replace: true });
    }
  }, [phase, code, navigate]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(
        `MANHUNT — ${runnersWin ? "Runners escaped" : "Hunters swept"} in ${formatLongClock(elapsed)}. ${catchesDisplay} tags confirmed.`,
      );
      toast("Field report copied", { tone: "success" });
    } catch {
      toast("Could not access clipboard", { tone: "warning" });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        backTo="/"
        backLabel="Exit"
        right={
          <Chip tone={runnersWin ? "runner" : "hunter"} dot className="hidden sm:inline-flex">
            Final report
          </Chip>
        }
      />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-12 sm:px-6">
        <section className="relative mt-2 overflow-hidden rounded-xl border border-line-strong/50 bg-surface/70">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 70% 80% at 85% 20%, color-mix(in srgb, var(--${runnersWin ? "runner" : "hunter"}) 14%, transparent), transparent 65%)`,
            }}
          />
          <div className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 select-none font-display text-[220px] font-bold leading-none text-ink/[0.025] lg:block">
            {runnersWin ? "RUN" : "HUNT"}
          </div>
          <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />

          <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="h-px w-6 bg-current text-faint" />
                <p className="label-mono">After-action report</p>
                <Chip tone={runnersWin ? "runner" : "hunter"}>MANHUNT</Chip>
              </div>

              <h1 className="display text-[clamp(3.5rem,9vw,7.5rem)] font-bold leading-[0.78] tracking-[-0.02em] text-ink">
                {runnersWin ? (
                  <>
                    Runners
                    <br />
                    <span className="text-runner">escape.</span>
                  </>
                ) : (
                  <>
                    Hunters
                    <br />
                    <span className="text-hunter">sweep.</span>
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-md text-[13px] leading-relaxed text-muted">
                {runnersWin
                  ? `The field held. ${survivorsDisplay} runner${survivorsDisplay === 1 ? "" : "s"} made it to the final whistle while ${catchesDisplay} were tagged out.`
                  : `No signal left alive. Hunters closed every runner channel and ended the round with ${runners.length} confirmed tags.`}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Chip tone={runnersWin ? "runner" : "hunter"} dot>
                  {runnersWin ? "Runner victory" : "Hunter victory"}
                </Chip>
                <Chip>
                  <Clock3 className="mr-0.5 size-2.5" />
                  {formatLongClock(elapsed)} elapsed
                </Chip>
                <Chip>{runners.length} runners deployed</Chip>
              </div>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                {isHost ? (
                  <Button
                    variant={runnersWin ? "runner" : "hunter"}
                    size="lg"
                    onClick={rematch}
                  >
                    <RotateCcw className="size-4" />
                    Run it back
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" disabled>
                    <RotateCcw className="size-4" />
                    Waiting for host
                  </Button>
                )}
                <Button variant="secondary" size="lg" onClick={copySummary}>
                  <Copy className="size-4" />
                  Copy summary
                </Button>
              </div>
              {!isHost ? (
                <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                  The host can restart the lobby for a rematch
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 self-end lg:self-center">
              <ResultStat label="Round time" value={formatLongClock(elapsed)} icon={Clock3} />
              <ResultStat label="Ping events" value={String(pingDisplay)} icon={Radar} tone="hunter" />
              <ResultStat label="Tags" value={String(catchesDisplay)} icon={Crosshair} tone="hunter" />
              <ResultStat
                label="Survivors"
                value={String(runnersWin ? survivorsDisplay : 0)}
                icon={ShieldCheck}
                tone="runner"
              />
              <div className="col-span-2 flex items-center justify-between rounded-[3px] border border-line bg-canvas/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Trophy className={runnersWin ? "size-3.5 text-runner" : "size-3.5 text-hunter"} />
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                    Lobby code
                  </span>
                </div>
                <span className="font-mono text-[11px] tracking-[0.22em] text-ink">{code}</span>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-4">
            <BottomMeta label="Mode" value="Classic protocol" />
            <BottomMeta label="Ping cycle" value={`${Math.round(settings.pingSec / 60)} min`} />
            <BottomMeta label="Tag method" value="Runner-only code" />
            <BottomMeta label="Field radius" value={formatRadius(settings.playAreaM, units)} />
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-faint" />
                <p className="label-mono">Player debrief</p>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                {players.length} players
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 font-mono text-[7px] font-medium uppercase tracking-[0.16em] text-faint">
                      Display name
                    </th>
                    <th className="px-4 py-2 font-mono text-[7px] font-medium uppercase tracking-[0.16em] text-faint">
                      Side
                    </th>
                    <th className="px-4 py-2 font-mono text-[7px] font-medium uppercase tracking-[0.16em] text-faint">
                      Outcome
                    </th>
                    <th className="px-4 py-2 text-right font-mono text-[7px] font-medium uppercase tracking-[0.16em] text-faint">
                      Signals
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => {
                    const hunter = player.role === "hunter";
                    const caughtPlayer = player.role === "runner" && player.status === "caught";
                    return (
                      <tr key={player.id} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "flex size-7 items-center justify-center rounded-[2px] border font-mono text-[8px]",
                                hunter
                                  ? "border-hunter/25 bg-hunter/10 text-hunter"
                                  : "border-runner/25 bg-runner/10 text-runner",
                              )}
                            >
                              {player.avatar}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                              {player.name}
                            </span>
                            {player.isYou ? (
                              <Chip className="h-4 px-1.5 text-[7px]">You</Chip>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <RoleBadge role={player.role} compact />
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "font-mono text-[9px] uppercase tracking-[0.1em]",
                              caughtPlayer
                                ? "text-danger"
                                : hunter
                                ? "text-hunter"
                                : "text-runner",
                            )}
                          >
                            {hunter ? "Active" : caughtPlayer ? "Caught" : "Survived"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[9px] tabular text-muted">
                          {hunter
                            ? `${Math.max(0, 3 - index)} tags`
                            : caughtPlayer
                            ? "lost"
                            : `${String(index + 2).padStart(2, "0")} pings`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-line bg-surface-2/30 px-4 py-2.5">
              <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
                Field report generated by the lobby server
              </span>
              <button
                type="button"
                onClick={copySummary}
                className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-runner transition-opacity hover:opacity-70"
              >
                <Copy className="size-3" />
                Share
              </button>
            </div>
          </Card>

          <div className="space-y-3">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="label-mono">Operation timeline</p>
                <Flag className="size-3.5 text-faint" />
              </div>
              <div className="p-4">
                <TimelineRow
                  time="00:00"
                  title="Field open"
                  text={`Runners deployed with a ${Math.round(settings.prepSec / 60)} minute head start.`}
                  tone="neutral"
                />
                <TimelineRow
                  time={formatLongClock(Math.min(elapsed, settings.pingSec))}
                  title="First ping"
                  text={`${pingDisplay} location ping${pingDisplay === 1 ? "" : "s"} broadcast to hunters.`}
                  tone="hunter"
                />
                {runners
                  .filter((runner) => runner.status === "caught")
                  .slice(0, 2)
                  .map((runner) => (
                    <TimelineRow
                      key={runner.id}
                      time={formatLongClock(elapsed)}
                      title="Tag confirmed"
                      text={`${runner.name} was removed from the field.`}
                      tone="danger"
                    />
                  ))}
                <TimelineRow
                  time={formatLongClock(elapsed)}
                  title="Round end"
                  text={runnersWin ? "One runner survived. Runners take the round." : "All channels cleared. Hunters take the round."}
                  tone={runnersWin ? "runner" : "hunter"}
                  last
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="label-mono">Field verdict</p>
                <Trophy className={runnersWin ? "size-4 text-runner" : "size-4 text-hunter"} />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold uppercase leading-none text-ink">
                {runnersWin ? "Not all who wander are found." : "No signal left behind."}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {runnersWin
                  ? "The runner map kept the last survivor one step ahead."
                  : "Ping discipline and runner PIN tags decided the field."}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                <MapPin className="size-3.5 text-faint" />
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                  Central field / sector 07
                </span>
              </div>
            </Card>

            <Button variant="ghost" full onClick={() => navigate("/")}>
              <ArrowRight className="size-3.5 rotate-180" />
              Exit to home
            </Button>
          </div>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-line pt-4 font-mono text-[8px] uppercase tracking-[0.16em] text-faint sm:flex-row">
          <span className="flex items-center gap-2">
            {runnersWin ? <Zap className="size-3 text-runner" /> : <Skull className="size-3 text-hunter" />}
            {runnersWin ? "Runners surviving" : "Hunters prevailing"}
          </span>
          <span>MANHUNT / after-action report / lobby server</span>
        </footer>
      </main>
    </div>
  );
}

function ResultStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
  tone?: "hunter" | "runner";
}) {
  return (
    <div className="rounded-[3px] border border-line bg-surface-2/45 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-3",
            tone === "hunter" ? "text-hunter" : tone === "runner" ? "text-runner" : "text-faint",
          )}
        />
        <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">{label}</p>
      </div>
      <p className="mt-2 font-mono text-lg tabular text-ink">{value}</p>
    </div>
  );
}

function BottomMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{value}</p>
    </div>
  );
}

function TimelineRow({
  time,
  title,
  text,
  tone,
  last,
}: {
  time: string;
  title: string;
  text: string;
  tone: "neutral" | "hunter" | "runner" | "danger";
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      {!last ? (
        <span className="absolute left-[47px] top-4 h-full w-px bg-line" aria-hidden="true" />
      ) : null}
      <span className="w-9 shrink-0 pt-0.5 font-mono text-[8px] tabular text-faint">{time}</span>
      <span
        className={cn(
          "relative z-10 mt-1 size-1.5 shrink-0 rounded-full ring-4 ring-surface",
          tone === "hunter"
            ? "bg-hunter"
            : tone === "runner"
            ? "bg-runner"
            : tone === "danger"
            ? "bg-danger"
            : "bg-line-strong",
        )}
      />
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink">{title}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}