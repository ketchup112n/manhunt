import { useNavigate } from "react-router-dom";
import { ArrowRight, Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import {
  SettingsCallout,
  SettingsEditor,
  SettingsSummary,
} from "@/components/game/SettingsEditor";
import { useGame, useYou } from "@/store/game";

export function CreateLobbyPage() {
  const navigate = useNavigate();
  const you = useYou();
  const setYouName = useGame((s) => s.setYouName);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar backTo="/" backLabel="Home" />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line py-5 sm:py-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-px w-6 bg-hunter" />
              <p className="label-mono text-hunter">New lobby</p>
            </div>
            <h1 className="display text-3xl font-semibold text-ink sm:text-4xl">
              Configure the hunt.
            </h1>
            <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-muted">
              Set the rules before your friends join. Every value can be changed
              again in the lobby — until the round starts.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
          <div className="space-y-2.5">
            <Card corners className="p-4">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-line pb-3">
                <div>
                  <h2 className="font-display text-base font-semibold uppercase tracking-[0.04em] text-ink">
                    Host profile
                  </h2>
                </div>
                <Chip tone="hunter">Host</Chip>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label
                    htmlFor="display-name"
                    className="mb-1.5 block font-mono text-[8px] uppercase tracking-[0.16em] text-faint"
                  >
                    Display name
                  </label>
                  <input
                    id="display-name"
                    value={you?.name ?? ""}
                    onChange={(event) => setYouName(event.target.value)}
                    placeholder="YOUR NAME"
                    maxLength={12}
                    className="h-11 w-full rounded-[3px] border border-line bg-canvas/40 px-3 font-mono text-sm uppercase tracking-[0.08em] text-ink outline-none transition-colors placeholder:text-faint/60 focus:border-runner/60"
                  />
                </div>
              </div>
            </Card>

            <SettingsEditor compact />

            <div className="flex items-start gap-2 rounded-[3px] border border-line bg-surface/50 px-3 py-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-[10px] leading-relaxed text-muted">
                You are the host. You can assign teams, edit every rule, pause
                the round, and resolve tag disputes from the lobby.
              </p>
            </div>
          </div>

          <aside className="hidden lg:sticky lg:top-6 lg:block">
            <Card corners className="overflow-hidden">
              <div className="border-b border-line bg-surface-2/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="label-mono">Lobby brief</p>
                  <ShieldCheck className="size-4 text-runner" />
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold uppercase leading-none text-ink">
                  MANHUNT
                </h2>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                  Hosted by {you?.name || "YOU"}
                </p>
              </div>

              <div className="p-4">
                <SettingsSummary compact />
                <div className="mt-3">
                  <SettingsCallout />
                </div>

                <div className="my-4 hairline" />

                <div className="space-y-2 text-[10px] text-muted">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="size-3.5 text-faint" />
                    <span>Private lobby — code only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-faint" />
                    <span>Location shared only during play</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="size-3.5 text-faint" />
                    <span>Editable until the round starts</span>
                  </div>
                </div>

                <Button
                  variant="hunter"
                  size="lg"
                  full
                  className="mt-5"
                  onClick={() => navigate("/lobby/VX7K2M")}
                >
                  Create lobby
                  <ArrowRight className="size-4" />
                </Button>
                <p className="mt-2 text-center font-mono text-[7px] uppercase tracking-[0.16em] text-faint">
                  A join code will be generated
                </p>
              </div>
            </Card>

            <div className="mt-2 flex items-center justify-between rounded-[3px] border border-line bg-surface/40 px-3 py-2.5">
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
            onClick={() => navigate("/lobby/VX7K2M")}
          >
            Create lobby
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
