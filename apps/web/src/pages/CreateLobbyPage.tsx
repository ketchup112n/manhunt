import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import {
  SettingsCallout,
  SettingsEditor,
  SettingsSummary,
} from "@/components/game/SettingsEditor";
import { useGame } from "@/store/game";

export function CreateLobbyPage() {
  const navigate = useNavigate();
  const draftName = useGame((s) => s.draftName);
  const setDraftName = useGame((s) => s.setDraftName);
  const settings = useGame((s) => s.settings);
  const createLobby = useGame((s) => s.createLobby);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    const result = await createLobby(draftName, settings);
    setBusy(false);
    if (result.ok && result.code) {
      navigate(`/lobby/${result.code}`);
    } else {
      setError(result.error ?? "Could not create the lobby.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Home" />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-px w-5 bg-hunter" />
              <p className="label-mono text-hunter">New lobby</p>
            </div>
            <h1 className="display text-2xl font-semibold text-ink sm:text-3xl">
              Configure the hunt.
            </h1>
          </div>
          <p className="hidden max-w-md text-[11px] leading-relaxed text-muted sm:block">
            Set the rules before your friends join. Every value stays editable in
            the lobby until the round starts.
          </p>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
          <div className="space-y-2">
            <Card corners className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-faint">
                Host
              </span>
              <input
                id="display-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="YOUR NAME"
                maxLength={12}
                className="h-9 w-full max-w-[220px] rounded-[3px] border border-line bg-canvas/40 px-3 font-mono text-xs uppercase tracking-[0.08em] text-ink outline-none transition-colors placeholder:text-faint/60 focus:border-runner/60"
              />
              <Chip tone="hunter" className="ml-auto">
                Host
              </Chip>
            </Card>

            <SettingsEditor compact />

            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
              Host controls: assign teams · edit rules · pause round
            </p>
          </div>

          <aside className="hidden lg:sticky lg:top-6 lg:block">
            <Card corners className="overflow-hidden">
              <div className="border-b border-line bg-surface-2/50 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="label-mono">Lobby brief</p>
                  <ShieldCheck className="size-4 text-runner" />
                </div>
                <h2 className="mt-1.5 font-display text-xl font-semibold uppercase leading-none text-ink">
                  MANHUNT
                </h2>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                  Hosted by {draftName || "YOU"}
                </p>
              </div>

              <div className="p-3.5">
                <SettingsSummary compact />
                <div className="mt-3">
                  <SettingsCallout />
                </div>

                <div className="my-3 hairline" />

                <div className="space-y-2 text-[10px] text-muted">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="size-3.5 text-faint" />
                    <span>Private lobby, code only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-faint" />
                    <span>Location shared only during play</span>
                  </div>
                </div>

                {error ? (
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-danger">
                    {error}
                  </p>
                ) : null}

                <Button
                  variant="hunter"
                  size="lg"
                  full
                  className="mt-4"
                  onClick={() => void create()}
                  disabled={busy}
                >
                  {busy ? "Creating..." : "Create lobby"}
                  <ArrowRight className="size-4" />
                </Button>
                <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                  A join code will be generated
                </p>
              </div>
            </Card>

            <div className="mt-2 flex items-center justify-between rounded-[3px] border border-line bg-surface/40 px-3 py-2">
              <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                Prototype mode
              </span>
              <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-runner">
                No data collected
              </span>
            </div>
          </aside>
        </div>

        {/* Mobile sticky create button */}
        <div className="lg:hidden sticky bottom-0 z-50 bg-gradient-to-t from-canvas via-canvas/95 to-transparent py-4">
          <Button
            variant="hunter"
            size="lg"
            full
            className="mx-4 max-w-6xl"
            onClick={() => void create()}
            disabled={busy}
          >
            {busy ? "Creating..." : "Create lobby"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
