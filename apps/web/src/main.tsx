import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";
import { App } from "@/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
