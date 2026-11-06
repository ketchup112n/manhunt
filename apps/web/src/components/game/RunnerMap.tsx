import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { distanceMeters, type PositionedPlayer } from "@/lib/geo";
import { createPlayerMarkerIcon } from "@/components/game/playerMarker";
import { usePreferences } from "@/store/preferences";
import { useZoneState } from "@/store/game";
import { cn } from "@/lib/cn";
import type { CaughtSpot, LatLng } from "@/lib/types";

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

function WaitingForGps() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-canvas/85 px-6 text-center">
      <LocateFixed className="size-5 animate-soft-pulse text-runner" />
      <p className="font-display text-base font-semibold uppercase tracking-[0.04em] text-ink">
        Waiting for GPS
      </p>
      <p className="max-w-[260px] text-[10px] leading-relaxed text-muted">
        Allow location access to place yourself and your squad on the map.
      </p>
    </div>
  );
}

export function RunnerMap({
  self,
  teammates,
  hunters,
  caughtSpots,
  center,
  playAreaM,
  heading,
  heightClass = "h-[280px] sm:h-[340px]",
}: {
  self: PositionedPlayer | null;
  teammates: PositionedPlayer[];
  hunters: PositionedPlayer[];
  caughtSpots: CaughtSpot[];
  center: LatLng | null;
  playAreaM: number;
  heading?: number | null;
  heightClass?: string;
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
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[3px] border border-line hud-grid",
          heightClass,
        )}
      >
        <WaitingForGps />
      </div>
    );
  }

  const hunterTargets = self
    ? hunters
        .map((hunter) => ({
          ...hunter,
          distanceM: distanceMeters(self, hunter),
        }))
        .sort((a, b) => a.distanceM - b.distanceM)
    : [];
  const nearbyTeammates = self
    ? teammates
        .map((teammate) => ({
          ...teammate,
          distanceM: distanceMeters(self, teammate),
        }))
        .sort((a, b) => a.distanceM - b.distanceM)
    : [];

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[3px] border border-line",
          heightClass,
        )}
      >
        <MapContainer
          center={[focus.lat, focus.lng]}
          zoom={16}
          zoomControl={false}
          attributionControl
          className="z-0 h-full w-full"
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
                icon={createPlayerMarkerIcon("self", "YOU", { heading })}
              />
            </>
          ) : null}
          {hunters.map((hunter) => (
            <Marker
              key={hunter.id}
              position={[hunter.lat, hunter.lng]}
              icon={createPlayerMarkerIcon("hunter", "HUNTER")}
            />
          ))}
          {teammates.map((teammate) => (
            <Marker
              key={teammate.id}
              position={[teammate.lat, teammate.lng]}
              icon={createPlayerMarkerIcon("runner", teammate.name)}
            />
          ))}
          <MapControls home={focus} />
        </MapContainer>
      </div>
      {hunterTargets.length > 0 || nearbyTeammates.length > 0 ? (
        <div className="border-t border-line bg-surface/80 p-3 backdrop-blur-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px]">
            {hunterTargets.map((target, index) => (
              <div key={target.id} className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full bg-hunter shadow-[0_0_8px_var(--hunter)]" />
                <span className="font-mono uppercase tracking-[0.08em]">
                  Hunter {index + 1}
                </span>
                <span className="font-mono tabular-nums text-ink">
                  {Math.round(target.distanceM)}m
                </span>
              </div>
            ))}
            {nearbyTeammates.map((teammate) => (
              <div key={teammate.id} className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full bg-runner shadow-[0_0_8px_var(--runner)]" />
                <span className="font-mono uppercase tracking-[0.08em]">
                  {teammate.name}
                </span>
                <span className="font-mono tabular-nums text-faint">
                  {Math.round(teammate.distanceM)}m
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
