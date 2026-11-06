import { toPositionedPlayer, type PositionedPlayer } from "@/lib/geo";
import { useGame, useYou } from "@/store/game";

/**
 * Shared field-map data for runners and spectators. A caught runner keeps the
 * same viewing rules as an active runner: their own fix, active squad members,
 * and hunter markers when the host has enabled all-hunter intel.
 */
export function useFieldMapData() {
  const you = useYou();
  const players = useGame((state) => state.players);
  const settings = useGame((state) => state.settings);
  const livePosition = useGame((state) => state.livePosition);
  const center = useGame((state) => state.center);
  const caughtSpots = useGame((state) => state.caughtSpots);

  const self = toPositionedPlayer({
    id: you?.id ?? "",
    name: you?.name ?? "YOU",
    position: livePosition ?? you?.position,
  });

  const teammates = players
    .filter(
      (player) =>
        player.role === "runner" &&
        player.status === "active" &&
        player.id !== you?.id,
    )
    .map(toPositionedPlayer)
    .filter((player): player is PositionedPlayer => player !== null);

  const hunters = settings.showAllHuntersToRunners
    ? players
        .filter((player) => player.role === "hunter")
        .map(toPositionedPlayer)
        .filter((hunter): hunter is PositionedPlayer => hunter !== null)
    : [];

  return { self, teammates, hunters, caughtSpots, center };
}
