import { useEffect, useState } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed, MapPin, TriangleAlert } from "lucide-react";
import { Slider } from "@/components/ui/FormControls";
import { useGame } from "@/store/game";
import { usePreferences } from "@/store/preferences";
import { formatRadius } from "@/lib/geo";
import { normalizeZoneSettings } from "@/lib/zone";
import type { LatLng } from "@/lib/types";
import { cn } from "@/lib/cn";

const arenaIcon = L.divIcon({
  className: "arena-center-marker",
  html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;border:2px solid #0b0e0d;background:#ffc24b;box-shadow:0 0 0 4px rgba(255,194,75,0.25),0 2px 6px rgba(0,0,0,0.4);"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function pickCenter(event: L.LeafletMouseEvent, onPick: (center: LatLng) => void) {
  onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
}

function MapClickPicker({ onPick }: { onPick: (center: LatLng) => void }) {
  useMapEvents({
    click: (event) => pickCenter(event, onPick),
  });
  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    const current = map.getCenter();
    const distance = current.distanceTo([center.lat, center.lng]);
    if (distance > 500) {
      map.setView([center.lat, center.lng], Math.max(map.getZoom(), 15));
    }
  }, [center.lat, center.lng, map]);
  return null;
}

type LocateStatus = "idle" | "requesting" | "denied" | "error" | "unsupported";

/**
 * Interactive arena setup: drag the pin (or tap the map) to choose the play
 * area, and size the circle without leaving the create screen. The chosen
 * centre is sent with the create request; the server falls back to the host's
 * GPS fix when none was picked.
 */
export function ArenaPicker() {
  const settings = useGame((state) => state.settings);
  const updateDraftSettings = useGame((state) => state.updateDraftSettings);
  const draftArena = useGame((state) => state.draftArena);
  const setDraftArena = useGame((state) => state.setDraftArena);
  const livePosition = useGame((state) => state.livePosition);
  const requestLocationAccess = useGame(
    (state) => state.requestLocationAccess,
  );
  const units = usePreferences((state) => state.units);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>("idle");

  const center = draftArena ?? (livePosition
    ? { lat: livePosition.lat, lng: livePosition.lng }
    : null);

  const locate = async () => {
    setLocateStatus("requesting");
    const granted = await requestLocationAccess();
    if (granted) {
      const position = useGame.getState().livePosition;
      if (position) {
        setDraftArena({ lat: position.lat, lng: position.lng });
      }
      setLocateStatus("idle");
      return;
    }
    const permission = useGame.getState().locationPermission;
    setLocateStatus(
      permission === "unsupported"
        ? "unsupported"
        : permission === "denied"
          ? "denied"
          : "error",
    );
  };

  // The entry-level permission prompt covers the initial request. Here the
  // "Use my location" action fills the map when no fix is available yet.
  return (
    <div className="overflow-hidden rounded-[3px] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div>
          <p className="label-mono">Play area</p>
          <p className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
            Drag the pin or tap the map
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-runner">
            {formatRadius(settings.playAreaM, units)}
          </span>
          <MapPin className="size-3.5 text-faint" />
        </div>
      </div>

      {center ? (
        <div className="relative h-[260px] w-full">
          <MapContainer
            center={[center.lat, center.lng]}
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
            <Recenter center={center} />
            <MapClickPicker onPick={setDraftArena} />
            <Circle
              center={[center.lat, center.lng]}
              radius={settings.playAreaM}
              pathOptions={{
                color: "#4fe3c1",
                weight: 1.5,
                opacity: 0.7,
                fillColor: "#4fe3c1",
                fillOpacity: 0.08,
                interactive: false,
              }}
            />
            <Marker
              position={[center.lat, center.lng]}
              icon={arenaIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const point = event.target.getLatLng();
                  setDraftArena({ lat: point.lat, lng: point.lng });
                },
              }}
            />
          </MapContainer>
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locateStatus === "requesting"}
            className="pointer-events-auto absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-[2px] border border-line-strong/70 bg-surface/90 px-2.5 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-muted shadow-lg backdrop-blur transition-colors hover:text-ink disabled:opacity-60"
          >
            <LocateFixed
              className={cn(
                "size-3.5",
                locateStatus === "requesting" && "animate-soft-pulse",
              )}
            />
            {locateStatus === "requesting" ? "Locating" : "My location"}
          </button>
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 bg-surface-2/30 px-6 text-center">
          <MapPin className="size-6 text-faint" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
              {locateStatus === "denied"
                ? "Location permission blocked"
                : locateStatus === "unsupported"
                  ? "Location not supported"
                  : locateStatus === "error"
                    ? "Could not get a fix"
                    : "Finding your arena"}
            </p>
            <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-muted">
              {locateStatus === "denied"
                ? "Allow location access in your browser settings, then try again. You can also create the lobby and pick the centre by GPS at deploy."
                : "The circle is anchored to your position. Allow location access to place it, or try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void locate()}
            disabled={locateStatus === "requesting"}
            className="flex items-center gap-1.5 rounded-[2px] border border-runner/40 bg-runner/10 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-runner transition-colors hover:bg-runner/15 disabled:opacity-60"
          >
            <LocateFixed className="size-3.5" />
            {locateStatus === "requesting" ? "Locating" : "Use my location"}
          </button>
          {locateStatus === "denied" || locateStatus === "error" ? (
            <p className="flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warning">
              <TriangleAlert className="size-3" />
              GPS anchor will be used instead
            </p>
          ) : null}
        </div>
      )}

      <div className="border-t border-line px-3.5 py-3">
        <Slider
          label="Play area radius"
          hint="Resize the circle around the chosen centre. Leaving it triggers a boundary warning."
          value={settings.playAreaM}
          min={250}
          max={5000}
          step={50}
          onChange={(value) =>
            updateDraftSettings(
              normalizeZoneSettings({ ...settings, playAreaM: value }),
            )
          }
          display={formatRadius(settings.playAreaM, units)}
          minLabel={formatRadius(250, units)}
          maxLabel={formatRadius(5000, units)}
          compact
        />
        {center ? (
          <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-faint">
            Centre {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
          </p>
        ) : null}
        {locateStatus === "denied" || locateStatus === "error" ? (
          <p className="mt-1.5 font-mono text-[7px] uppercase leading-relaxed tracking-[0.12em] text-warning">
            {locateStatus === "denied"
              ? "Location blocked — allow it in your browser settings, or drag the pin after the map loads."
              : "Could not get a fix — move into the open and try again."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
