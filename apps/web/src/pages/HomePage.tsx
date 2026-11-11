import { Link } from "react-router-dom";
import { ArrowUpRight, Crosshair, Radar, Navigation, Fingerprint } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { RadarPanel } from "@/components/game/RadarPanel";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

const steps = [
  {
    index: "01",
    icon: Radar,
    title: "Hunters receive pings",
    body: "Runner coordinates are revealed at set intervals. Between pings, the hunters are blind — and the clock is against them.",
    meta: "Location intelligence",
    tone: "hunter" as const,
  },
  {
    index: "02",
    icon: Navigation,
    title: "Runners hold the line",
    body: "A live field map keeps your squad and the caught sites in view, with a facing arrow on your own marker. Stay out of reach, keep moving, and survive the round.",
    meta: "Directional awareness",
    tone: "runner" as const,
  },
  {
    index: "03",
    icon: Fingerprint,
    title: "The tag decides it",
    body: "A hunter must get close and enter the runner's private 4-digit PIN. One clean handoff removes a runner from the field — no confirmation needed.",
    meta: "PIN handoff",
    tone: "neutral" as const,
  },
];

export function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar right={<Chip tone="runner" dot className="hidden sm:inline-flex">Realtime</Chip>} />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex items-center justify-between border-y border-line/60 py-2.5 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
          <span className="flex items-center gap-2">
            <span className="size-1.5 animate-soft-pulse rounded-full bg-runner" />
            System online
          </span>
          <span className="hidden sm:block">Field protocol / 04.82</span>
          <span>Built for the streets</span>
        </div>

        <section className="grid flex-1 items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:py-16">
          <div className="animate-rise">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-runner" />
              <span className="label-mono text-runner">Real-world pursuit protocol</span>
            </div>

            <h1 className="display text-[clamp(4.4rem,15vw,9.5rem)] font-bold leading-[0.78] tracking-[-0.025em] text-ink">
              Hide.
              <br />
              Run.
              <br />
              <span className="text-runner">Survive.</span>
            </h1>

            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-muted sm:text-base">
              A live game of hide and seek across the real world. Hunters get
              periodic location pings. Runners get a live field map with a
              facing arrow. The city decides the rest.
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Link to="/create" className={buttonStyles("primary", "lg", "group sm:min-w-[210px]")}>
                Create a lobby
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link to="/join" className={buttonStyles("secondary", "lg", "sm:min-w-[190px]")}>
                Join with code
              </Link>
            </div>

            <div className="mt-9 grid max-w-md grid-cols-3 divide-x divide-line border-t border-line pt-4">
              {[
                ["02", "Roles"],
                ["05 min", "Ping cycle"],
                ["PIN", "Handoff tag"],
              ].map(([value, label]) => (
                <div key={label} className="px-4 first:pl-0">
                  <p className="font-mono text-sm tabular text-ink">{value}</p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-rise pb-2 lg:pb-0">
            <div className="absolute left-1/2 top-0 hidden -translate-x-1/2 -translate-y-6 items-center gap-2 font-mono text-[8px] uppercase tracking-[0.22em] text-faint lg:flex">
              <Crosshair className="size-3" />
              Field preview
            </div>
            <RadarPanel className="lg:mt-2" />
          </div>
        </section>

        <section className="relative z-10 pb-12 sm:pb-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="label-mono mb-2">Protocol briefing</p>
              <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
                Two roles. One outcome.
              </h2>
            </div>
            <span className="hidden font-mono text-[8px] uppercase tracking-[0.18em] text-faint md:block">
              Read before deploy
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step) => (
              <Card
                key={step.index}
                corners
                className="group relative overflow-hidden p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={
                      step.tone === "hunter"
                        ? "flex size-10 items-center justify-center rounded-[3px] border border-hunter/25 bg-hunter/10 text-hunter"
                        : step.tone === "runner"
                          ? "flex size-10 items-center justify-center rounded-[3px] border border-runner/25 bg-runner/10 text-runner"
                          : "flex size-10 items-center justify-center rounded-[3px] border border-line-strong bg-surface-2 text-muted"
                    }
                  >
                    <step.icon className="size-4.5" />
                  </span>
                  <span className="font-mono text-[10px] tabular text-faint">{step.index}</span>
                </div>
                <h3 className="mt-8 font-display text-xl font-semibold uppercase tracking-[0.03em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 min-h-[72px] text-[12px] leading-relaxed text-muted">{step.body}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                  <span className="size-1 rounded-full bg-current text-faint" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                    {step.meta}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 font-mono text-[8px] uppercase tracking-[0.16em] text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Manhunt / realtime lobby 0.2</span>
          <span className="text-faint/80">Play outdoors. Stay aware. Respect the city.</span>
        </div>
      </footer>
    </div>
  );
}
