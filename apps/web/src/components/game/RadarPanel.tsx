import { Radio, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";

const blips = [
  {
    id: "vex",
    label: "VEX",
    role: "hunter" as const,
    top: "22%",
    left: "68%",
    distance: "312 m",
  },
  {
    id: "wren",
    label: "WREN",
    role: "runner" as const,
    top: "56%",
    left: "27%",
    distance: "184 m",
  },
  {
    id: "ash",
    label: "ASH",
    role: "runner" as const,
    top: "75%",
    left: "66%",
    distance: "427 m",
  },
  {
    id: "kilo",
    label: "KILO",
    role: "hunter" as const,
    top: "41%",
    left: "83%",
    distance: "510 m",
  },
];

export function RadarPanel({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full max-w-[500px] justify-self-center lg:justify-self-end", className)}>
      <div className="absolute -inset-5 rounded-full bg-runner/5 blur-3xl" />
      <Card
        corners
        className="relative overflow-hidden border-line-strong/50 p-3 shadow-[0_40px_120px_rgb(0_0_0/0.35)] sm:p-4"
      >
        <div className="flex items-center justify-between border-b border-line/80 px-1 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="size-3.5 text-runner" />
            <span className="label-mono text-muted">Live field preview</span>
          </div>
          <Chip tone="runner" dot>
            Simulation
          </Chip>
        </div>

        <div className="relative mt-3 aspect-square overflow-hidden rounded-[4px] border border-line/80 bg-[#071011] hud-grid">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(4,9,10,0.75)_100%)]" />

          {[25, 50, 75].map((size) => (
            <div
              key={size}
              className="absolute rounded-full border border-runner/10"
              style={{
                inset: `${(100 - size) / 2}%`,
              }}
            />
          ))}

          <div className="absolute inset-x-0 top-1/2 h-px bg-runner/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-runner/10" />

          <div className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2">
            <div
              className="size-full animate-spin-slow rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--runner) 22%, transparent) 34deg, transparent 78deg)",
              }}
            />
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex size-12 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full border border-ink/30" />
              <span className="flex size-5 items-center justify-center rounded-full border border-runner bg-canvas shadow-[0_0_20px_color-mix(in_srgb,var(--runner)_45%,transparent)]">
                <span className="size-1.5 rounded-full bg-runner" />
              </span>
              <span className="absolute -bottom-6 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.18em] text-ink">
                You
              </span>
            </div>
          </div>

          {blips.map((blip) => (
            <div
              key={blip.id}
              className="absolute animate-drift"
              style={{ top: blip.top, left: blip.left }}
            >
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                <span
                  className={cn(
                    "absolute -inset-3 animate-ping rounded-full border opacity-40",
                    blip.role === "hunter" ? "border-hunter" : "border-runner",
                  )}
                  style={{ animationDuration: "3.4s" }}
                />
                <span
                  className={cn(
                    "relative block size-2 rounded-full",
                    blip.role === "hunter"
                      ? "bg-hunter shadow-[0_0_12px_var(--hunter)]"
                      : "bg-runner shadow-[0_0_12px_var(--runner)]",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.14em]",
                    blip.role === "hunter" ? "text-hunter" : "text-runner",
                  )}
                >
                  {blip.label}
                  <span className="ml-1.5 text-faint">{blip.distance}</span>
                </span>
              </div>
            </div>
          ))}

          <div className="absolute left-2 top-2 space-y-1 font-mono text-[7px] uppercase tracking-[0.2em] text-faint/70">
            <p>SEC 07 / N</p>
            <p>GRID 04.82</p>
          </div>
          <div className="absolute bottom-2 right-2 space-y-1 text-right font-mono text-[7px] uppercase tracking-[0.2em] text-faint/70">
            <p>PING 300S</p>
            <p>LOCK 04</p>
          </div>

          <div className="absolute left-1/2 top-1/2 size-[calc(100%-2px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-runner/15" />
          <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
        </div>

        <div className="mt-3 grid grid-cols-3 divide-x divide-line border-t border-line/80 pt-3">
          <Stat label="Hunters" value="03" tone="hunter" />
          <Stat label="Runners" value="04" tone="runner" />
          <Stat label="Next ping" value="04:12" />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[2px] border border-line bg-canvas/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ScanLine className="size-3.5 text-faint" />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              Standard protocol
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-runner">
            60 min round
          </span>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "hunter" | "runner";
}) {
  return (
    <div className="px-3 first:pl-1 last:pr-1">
      <p className="label-mono">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-mono text-sm tabular",
          tone === "hunter" ? "text-hunter" : tone === "runner" ? "text-runner" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
