import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Crosshair, KeyRound, ShieldCheck, Users } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useGame, useYou } from "@/store/game";

const DEMO_CODE = "VX7K2M";

export function JoinPage() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams();
  const you = useYou();
  const setYouName = useGame((s) => s.setYouName);
  const [code, setCode] = useState(routeCode?.toUpperCase() ?? "");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Enter the full 6-character lobby code.");
      return;
    }
    if (!you?.name.trim()) {
      setError("Add a display name before entering.");
      return;
    }
    setError("");
    navigate(`/lobby/${code}`);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Home" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16">
          <div className="animate-rise">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-6 bg-runner" />
              <p className="label-mono text-runner">Field access</p>
            </div>
            <h1 className="display text-5xl font-semibold leading-[0.85] text-ink sm:text-7xl">
              Enter
              <br />
              the <span className="text-runner">hunt.</span>
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted">
              Your host has the key. Enter the six-character code and a display
              name. The host assigns hunters and runners in the lobby. Runners
              share a private 4-digit PIN when physically caught.
            </p>

            <form onSubmit={submit} className="mt-8 max-w-md">
              <div>
                <label
                  htmlFor="lobby-code"
                  className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-faint"
                >
                  Lobby code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <input
                    id="lobby-code"
                    value={code}
                    onChange={(event) => {
                      setCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 6),
                      );
                      setError("");
                    }}
                    placeholder="XXXXXX"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-16 w-full rounded-[3px] border border-line-strong/70 bg-surface/70 pl-11 pr-4 font-mono text-2xl uppercase tracking-[0.35em] text-ink outline-none transition-colors placeholder:tracking-[0.35em] placeholder:text-faint/30 focus:border-runner/60 focus:bg-surface"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                    {code.length}/6
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <div>
                  <label
                    htmlFor="display-name"
                    className="mb-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-faint"
                  >
                    Display name
                  </label>
                  <input
                    id="display-name"
                    value={you?.name ?? ""}
                    onChange={(event) => {
                      setYouName(event.target.value);
                      setError("");
                    }}
                    maxLength={12}
                    className="h-11 w-full rounded-[3px] border border-line bg-canvas/40 px-3.5 font-mono text-xs uppercase tracking-[0.1em] text-ink outline-none transition-colors placeholder:text-faint/60 focus:border-runner/60"
                    placeholder="YOUR NAME"
                  />
                </div>

              </div>

              {error ? (
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-danger">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="runner"
                size="lg"
                full
                className="mt-5"
              >
                Join lobby
                <ArrowRight className="size-4" />
              </Button>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
                  Invite-only / no account required
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCode(DEMO_CODE);
                    setError("");
                  }}
                  className="font-mono text-[8px] uppercase tracking-[0.14em] text-runner transition-opacity hover:opacity-70"
                >
                  Use demo code
                </button>
              </div>
            </form>
          </div>

          <div className="relative animate-rise lg:justify-self-end">
            <div className="absolute -inset-4 rounded-full bg-hunter/5 blur-3xl" />
            <Card corners className="relative w-full max-w-[420px] overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="label-mono">Lobby signal</span>
                <Chip tone="warning" dot>
                  Awaiting
                </Chip>
              </div>

              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#071011] hud-grid">
                <div className="absolute size-[74%] rounded-full border border-runner/10" />
                <div className="absolute size-[52%] rounded-full border border-runner/15" />
                <div className="absolute size-[30%] rounded-full border border-hunter/20" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-runner/10" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-runner/10" />

                <div className="relative flex flex-col items-center">
                  <span className="absolute -inset-10 animate-ping rounded-full border border-runner/20" />
                  <div className="flex size-16 items-center justify-center rounded-full border border-runner/30 bg-canvas/80 shadow-[0_0_40px_color-mix(in_srgb,var(--runner)_15%,transparent)]">
                    <Crosshair className="size-7 text-runner" />
                  </div>
                  <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                    Access point
                  </p>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                    Sector 07 / open
                  </p>
                </div>

                <div className="absolute bottom-3 left-3 font-mono text-[7px] uppercase tracking-[0.18em] text-faint/70">
                  Waiting for credentials
                </div>
                <div className="scanlines pointer-events-none absolute inset-0 opacity-25" />
              </div>

              <div className="divide-y divide-line/80">
                <SignalRow label="Game" value="MANHUNT" />
                <SignalRow label="Players" value="07 / 20" icon={<Users className="size-3" />} />
                <SignalRow label="Protocol" value="CLASSIC / 60 MIN" />
              </div>

              <div className="border-t border-line bg-surface-2/40 px-5 py-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-runner" />
                  <p className="text-[10px] leading-relaxed text-muted">
                    Your location is only shared with players inside the active
                    lobby. Nothing is collected in this prototype.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function SignalRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
        {icon}
        {label}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink">{value}</span>
    </div>
  );
}
