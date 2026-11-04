import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { LocateFixed, Minus, Plus } from "lucide-react";
import {
  DEMO_CENTER,
  getHunterPositions,
  getRunnerPositions,
  distanceMeters,
  bearingDegrees,
} from "@/lib/geo";
import { createPlayerMarkerIcon } from "@/components/game/playerMarker";
import { usePreferences } from "@/store/preferences";
import { useZoneState } from "@/store/game";
import type { LatLng, Player } from "@/lib/types";

function MapControls({ home }: { home: LatLng }) {
  const map = useMap();
  return (
    <div className="pointer-events-auto absolute bottom-4 right-5 z-[500] flex flex-col gap-1.5 lg:bottom-5">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => map.zoomIn()}
        className="flex size-9 items-center justify-center rounded-[2px] border border-line-strong/70 bg-surface/90 text-muted shadow-lg backdrop-blur transition-colors hover:text-ink"
      >
        <Plus className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => map.zoomOut()}
        className="flex size-9 items-center justify-center rounded-[2px] border border-line-strong/70 bg-surface/90 text-muted shadow-lg backdrop-blur transition-colors hover:text-ink"
      >
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Center on my position"
        onClick={() => map.flyTo([home.lat, home.lng], 16, { duration: 0.6 })}
        className="flex size-9 items-center justify-center rounded-[2px] border border-runner/40 bg-surface/90 text-runner shadow-lg backdrop-blur transition-colors hover:bg-surface"
      >
        <LocateFixed className="size-4" />
      </button>
    </div>
  );
}

export function RunnerMap({
  hunters,
  runners,
  selfId,
  showHunters,
  playAreaM,
}: {
  hunters: Pick<Player, "id" | "name">[];
  runners: Pick<Player, "id" | "name">[];
  selfId: string;
  showHunters: boolean;
  playAreaM: number;
}) {
  const theme = usePreferences((state) => state.theme);
  const zone = useZoneState();
  const boundary = theme === "dark" ? "#4fe3c1" : "#007a62";
  const hunterPositions = showHunters ? getHunterPositions(hunters) : [];
  const teammatePositions = getRunnerPositions(runners.filter((runner) => runner.id !== selfId));
  const radius = zone.enabled ? zone.currentRadiusM : playAreaM;
  const shrinking = zone.enabled && zone.isShrinking;
  const activeBoundary = shrinking ? "#ffc24b" : boundary;

  // Runner's position is always ECHO's position (DEMO_CENTER)
  const runnerPos: LatLng = DEMO_CENTER;

  const hunterTargets = hunterPositions
    .map((hunter) => ({
      id: hunter.id,
      name: hunter.name,
      distanceM: distanceMeters(runnerPos, hunter),
      bearing: bearingDegrees(runnerPos, hunter),
    }))
    .sort((a, b) => a.distanceM - b.distanceM);

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="relative h-[280px] w-full overflow-hidden rounded-[3px] border border-line sm:h-[340px]">
        <MapContainer
          center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
          zoom={15}
          zoomControl={false}
          attributionControl
          className="z-0 h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {zone.enabled ? (
            <Circle
              center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
              radius={zone.startRadiusM}
              pathOptions={{
                color: boundary,
                weight: 1,
                opacity: 0.25,
                dashArray: "4 9",
                interactive: false,
              }}
            />
          ) : null}
          <Circle
            center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
            radius={radius}
            pathOptions={{
              color: activeBoundary,
              weight: zone.enabled ? 1.5 : 1,
              opacity: zone.enabled ? 0.7 : 0.45,
              dashArray: zone.enabled ? undefined : "4 9",
              fillColor: activeBoundary,
              fillOpacity: zone.enabled ? 0.03 : 0.02,
              interactive: false,
            }}
          />
          <Marker
            position={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
            icon={createPlayerMarkerIcon("self", "YOU")}
          />
          {hunterPositions.map((hunter) => (
            <Marker
              key={hunter.id}
              position={[hunter.lat, hunter.lng]}
              icon={createPlayerMarkerIcon("hunter", "HUNTER")}
            />
          ))}
          {teammatePositions.map((runner) => (
            <Marker
              key={runner.id}
              position={[runner.lat, runner.lng]}
              icon={createPlayerMarkerIcon("runner", runner.name)}
            />
          ))}
          <MapControls home={DEMO_CENTER} />
        </MapContainer>
      </div>
      {(hunterTargets.length > 0 || teammatePositions.length > 0) && (
        <div className="border-t border-line bg-surface/80 p-3 backdrop-blur-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px]">
            {hunterTargets.map((target, index) => (
              <div key={target.id} className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full bg-hunter shadow-[0_0_8px_var(--hunter)]" />
                <span className="font-mono uppercase tracking-[0.08em]">Hunter {index + 1}</span>
                <span className="font-mono tabular-nums text-ink">
                  {Math.round(target.distanceM)}m · {Math.round(target.bearing)}°
                </span>
              </div>
            ))}
            {teammatePositions.map((runner) => (
              <div key={runner.id} className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full bg-runner shadow-[0_0_8px_var(--runner)]" />
                <span className="font-mono uppercase tracking-[0.08em]">{runner.name}</span>
                <span className="font-mono text-faint">SQUAD</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
