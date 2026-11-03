import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { DEMO_CENTER, getHunterPositions } from "@/lib/geo";
import { createPlayerMarkerIcon } from "@/components/game/playerMarker";
import { usePreferences } from "@/store/preferences";
import type { LatLng } from "@/lib/types";

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

export function HunterMap({
  hunters,
  runners,
  playAreaM,
  pingKey,
}: {
  hunters: { id: string; name: string }[];
  runners: { id: string; lat: number; lng: number; name: string }[];
  playAreaM: number;
  pingKey: number;
}) {
  const theme = usePreferences((state) => state.theme);
  const boundary = theme === "dark" ? "#4fe3c1" : "#007a62";
  const hunterPositions = getHunterPositions(hunters);

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
        zoom={15}
        zoomControl={false}
        attributionControl
        className="z-0 size-full"
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Circle
          center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
          radius={playAreaM}
          pathOptions={{
            color: boundary,
            weight: 1,
            opacity: 0.45,
            dashArray: "4 9",
            fillColor: boundary,
            fillOpacity: 0.02,
            interactive: false,
          }}
        />
        <Marker position={[DEMO_CENTER.lat, DEMO_CENTER.lng]} icon={createPlayerMarkerIcon("self", "YOU")} />
        {hunterPositions.map((hunter) => (
          <Marker
            key={hunter.id}
            position={[hunter.lat, hunter.lng]}
            icon={createPlayerMarkerIcon("hunter", hunter.name)}
          />
        ))}
        {runners.map((runner) => (
          <Marker
            key={`${runner.id}-${pingKey}`}
            position={[runner.lat, runner.lng]}
            icon={createPlayerMarkerIcon("runner", runner.name, true)}
          />
        ))}
        <MapControls home={DEMO_CENTER} />
      </MapContainer>
    </div>
  );
}
