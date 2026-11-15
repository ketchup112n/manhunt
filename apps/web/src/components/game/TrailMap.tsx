import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
} from "react-leaflet";
import { latLngBounds, type LatLngBoundsExpression } from "leaflet";
import { usePreferences } from "@/store/preferences";
import { cn } from "@/lib/cn";
import type { LatLng } from "@/lib/types";

/**
 * The viewer's own route from the finished round. Purely informational, so
 * panning/zooming is enabled but no controls are shown.
 */
export function TrailMap({
  trail,
  className,
}: {
  trail: LatLng[];
  className?: string;
}) {
  const theme = usePreferences((state) => state.theme);
  const accent = theme === "dark" ? "#4fe3c1" : "#007a62";
  const start = trail[0];
  const end = trail[trail.length - 1];

  if (!start || !end) {
    return (
      <div
        className={cn(
          "flex min-h-[220px] items-center justify-center border-t border-line bg-surface-2/30 px-6 text-center",
          className,
        )}
      >
        <p className="max-w-[260px] font-mono text-[8px] uppercase leading-relaxed tracking-[0.14em] text-faint">
          No route was recorded — the device did not report location during this
          round.
        </p>
      </div>
    );
  }

  const positions = trail.map(
    (point) => [point.lat, point.lng] as [number, number],
  );
  const bounds: LatLngBoundsExpression = latLngBounds(positions).pad(0.15);
  const singlePoint = trail.length === 1;

  return (
    <div className={cn("relative h-[260px] w-full", className)}>
      <MapContainer
        center={[start.lat, start.lng]}
        zoom={16}
        bounds={singlePoint ? undefined : bounds}
        boundsOptions={{ padding: [28, 28], maxZoom: 17 }}
        zoomControl={false}
        attributionControl
        className="z-0 h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {trail.length > 1 ? (
          <Polyline
            positions={positions}
            pathOptions={{
              color: accent,
              weight: 4,
              opacity: 0.85,
              lineJoin: "round",
            }}
          />
        ) : null}
        <CircleMarker
          center={[start.lat, start.lng]}
          radius={6}
          pathOptions={{
            color: "#0b0e0d",
            weight: 2,
            fillColor: accent,
            fillOpacity: 1,
          }}
        >
          <title>Start</title>
        </CircleMarker>
        {trail.length > 1 ? (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={6}
            pathOptions={{
              color: "#0b0e0d",
              weight: 2,
              fillColor: "#ffc24b",
              fillOpacity: 1,
            }}
          >
            <title>Finish</title>
          </CircleMarker>
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex items-center gap-3 rounded-[2px] border border-line/70 bg-surface/85 px-2 py-1.5 font-mono text-[7px] uppercase tracking-[0.14em] text-muted backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-runner" /> Start
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" /> Finish
        </span>
      </div>
    </div>
  );
}
