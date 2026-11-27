import { TileLayer } from "react-leaflet";
import { usePreferences } from "@/store/preferences";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const STADIA_DARK_URL = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const STADIA_ATTRIBUTION = '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Max zoom level to cap tile requests and reduce data usage. */
const MAX_ZOOM = 18;

/**
 * Theme-aware tile layer component.
 * Uses OpenStreetMap for light theme, Stadia Maps Alidade Smooth Dark for dark theme.
 * Includes maxZoom to cap tile requests.
 */
export function MapTileLayer() {
  const theme = usePreferences((state) => state.theme);

  if (theme === "dark") {
    return (
      <TileLayer
        url={STADIA_DARK_URL}
        attribution={STADIA_ATTRIBUTION}
        maxZoom={MAX_ZOOM}
        subdomains="abcd"
      />
    );
  }

  return (
    <TileLayer
      url={OSM_URL}
      attribution={OSM_ATTRIBUTION}
      maxZoom={MAX_ZOOM}
      subdomains="abc"
    />
  );
}