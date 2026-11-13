import { useState } from "react";
import { Crown, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/store/game";
import { cn } from "@/lib/cn";

/**
 * Host-only roster management during a round. Kicking disconnects the player
 * immediately; the server enforces the host check.
 */
export function KickPlayerSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const players = useGame((state) => state.players);
  const kickPlayer = useGame((state) => state.kickPlayer);
  const { toast } = useToast();
  const [targetId, setTargetId] = useState<string | null>(null);

  const candidates = players.filter((player) => !player.isYou);
  const target = players.find((player) => player.id === targetId) ?? null;

  const confirm = () => {
    if (!target) return;
    kickPlayer(target.id);
    toast(`${target.name} removed from the game`, { tone: "warning" });
    setTargetId(null);
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        eyebrow="Host controls"
        title="Remove a player"
        description="Kicked players are disconnected immediately and lose their place in this round."
      >
        {candidates.length === 0 ? (
          <p className="rounded-[3px] border border-line bg-surface-2/40 px-4 py-6 text-center text-[11px] leading-relaxed text-muted">
            There is nobody else in this lobby yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {candidates.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-[3px] border border-line bg-surface-2/40 px-3 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-surface-2 font-mono text-[9px] text-muted">
                  {player.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                      {player.name}
                    </span>
                    {player.isHost ? (
                      <Crown className="size-3 shrink-0 text-warning" />
                    ) : null}
                    {player.isBot ? (
                      <Chip className="h-4 px-1.5 text-[7px]">Bot</Chip>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
                    {player.role}
                    {player.connected ? "" : " / Offline"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetId(player.id)}
                  aria-label={`Remove ${player.name} from the game`}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[2px] border border-line text-faint transition-colors",
                    "hover:border-danger/50 hover:bg-danger/10 hover:text-danger",
                  )}
                >
                  <UserMinus className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      <Modal
        open={Boolean(target)}
        onClose={() => setTargetId(null)}
        eyebrow="Host controls"
        title={target ? `Remove ${target.name}?` : "Remove player"}
      >
        <p className="text-sm leading-relaxed text-muted">
          {target?.name ?? "This player"} will be disconnected from the lobby
          right away. They can only return if late joins are enabled.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setTargetId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm}>
            <UserMinus className="size-4" />
            Remove
          </Button>
        </div>
      </Modal>
    </>
  );
}
