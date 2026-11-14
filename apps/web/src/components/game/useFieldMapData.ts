import { toPositionedPlayer, type PositionedPlayer } from "@/lib/geo";
import { useGame, useYou } from "@/store/game";

/**
 * Shared field-map data for runners and spectators. A caught runner keeps the
 * same viewing rules as an active runner: their own fix, active squad members,
 * and hunter markers whenever the server allows them (ping window or
 * all-hunter intel).
 */
export function useFieldMapData() {
  const you = useYou();
  const players = useGame((state) => state.players);
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

  // The server only includes hunter positions when the viewer is allowed to
  // see them, so render whichever markers came through.
  const hunters = players
    .filter((player) => player.role === "hunter")
    .map(toPositionedPlayer)
    .filter((hunter): hunter is PositionedPlayer => hunter !== null);

  return { self, teammates, hunters, caughtSpots, center };
}
