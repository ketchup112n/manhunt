import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { createPlayerMarkerIcon } from "@/components/game/playerMarker";
import { usePreferences } from "@/store/preferences";
import { useZoneState } from "@/store/game";
import type { CaughtSpot, LatLng, Player, RunnerSignal } from "@/lib/types";

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

/** Pan to the device's first fix without fighting the user's pans afterwards. */
function FollowSelf({ position }: { position: LatLng | null }) {
  const map = useMap();
  const followed = useRef(false);

  useEffect(() => {
    if (!position || followed.current) return;
    followed.current = true;
    map.flyTo([position.lat, position.lng], 16, { duration: 0.6 });
  }, [position, map]);

  return null;
}

/** Rendered when we have neither our own fix nor a server-side arena anchor. */
function WaitingForGps() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-canvas/85 px-6 text-center">
      <LocateFixed className="size-6 animate-soft-pulse text-runner" />
      <p className="font-display text-lg font-semibold uppercase tracking-[0.04em] text-ink">
        Waiting for GPS
      </p>
      <p className="max-w-xs text-[11px] leading-relaxed text-muted">
        Allow location access so the field can place you and your squad on the
        map. Nothing is shown until a fix arrives.
      </p>
    </div>
  );
}

export function HunterMap({
  self,
  hunters,
  runners,
  caughtSpots,
  center,
  playAreaM,
  pingKey,
}: {
  self: { id: string; name: string; lat: number; lng: number; accuracyM: number } | null;
  hunters: Player[];
  runners: RunnerSignal[];
  caughtSpots: CaughtSpot[];
  center: LatLng | null;
  playAreaM: number;
  pingKey: number;
}) {
  const theme = usePreferences((state) => state.theme);
  const zone = useZoneState();
  const boundary = theme === "dark" ? "#4fe3c1" : "#007a62";
  const radius = zone.enabled ? zone.currentRadiusM : playAreaM;
  const shrinking = zone.enabled && zone.isShrinking;
  const activeBoundary = shrinking ? "#ffc24b" : boundary;
  const focus: LatLng | null = self ?? center;

  if (!focus) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#071011] hud-grid">
        <WaitingForGps />
      </div>
    );
  }

  const teammates = hunters.filter(
    (hunter) => hunter.id !== self?.id && hunter.position,
  );

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[focus.lat, focus.lng]}
        zoom={16}
        zoomControl={false}
        attributionControl
        className="z-0 size-full"
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FollowSelf position={self} />
        {zone.enabled && center ? (
          <Circle
            center={[center.lat, center.lng]}
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
        {center ? (
          <Circle
            center={[center.lat, center.lng]}
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
        ) : null}
        {caughtSpots.map((spot) => (
          <Marker
            key={`caught-${spot.id}`}
            position={[spot.lat, spot.lng]}
            icon={createPlayerMarkerIcon("caught", spot.name)}
            zIndexOffset={-200}
          />
        ))}
        {self ? (
          <>
            <Circle
              center={[self.lat, self.lng]}
              radius={Math.max(4, self.accuracyM)}
              pathOptions={{
                color: boundary,
                weight: 1,
                opacity: 0.35,
                fillColor: boundary,
                fillOpacity: 0.08,
                interactive: false,
              }}
            />
            <Marker
              position={[self.lat, self.lng]}
              icon={createPlayerMarkerIcon("self", self.name)}
            />
          </>
        ) : null}
        {teammates.map((hunter) => (
          <Marker
            key={hunter.id}
            position={[hunter.position!.lat, hunter.position!.lng]}
            icon={createPlayerMarkerIcon("hunter", hunter.name)}
          />
        ))}
        {runners.map((runner) => (
          <Marker
            key={`${runner.id}-${pingKey}`}
            position={[runner.lat, runner.lng]}
            icon={createPlayerMarkerIcon("runner", runner.name, { ping: true })}
          />
        ))}
        <MapControls home={focus} />
      </MapContainer>
    </div>
  );
}
