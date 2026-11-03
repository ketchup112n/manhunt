import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import { DevPanel } from "@/components/game/DevPanel";
import { usePreferences } from "@/store/preferences";
import { useGame } from "@/store/game";
import { HomePage } from "@/pages/HomePage";
import { CreateLobbyPage } from "@/pages/CreateLobbyPage";
import { JoinPage } from "@/pages/JoinPage";
import { LobbyPage } from "@/pages/LobbyPage";
import { HunterPage } from "@/pages/HunterPage";
import { RunnerPage } from "@/pages/RunnerPage";
import { SpectatorPage } from "@/pages/SpectatorPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function ThemeSync() {
  const theme = usePreferences((state) => state.theme);
  const reduceMotion = usePreferences((state) => state.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", theme === "dark" ? "#070b0c" : "#f1eee5");
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion ? "reduced" : "full";
  }, [reduceMotion]);

  return null;
}

function GameClock() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = useGame.getState();
      if (state.phase === "active") state.tick();
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  return (
    <div className="app-field">
      <div className="relative z-10 min-h-dvh">
        <Outlet />
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <ThemeSync />
      <GameClock />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="create" element={<CreateLobbyPage />} />
            <Route path="join" element={<JoinPage />} />
            <Route path="join/:code" element={<JoinPage />} />
            <Route path="lobby/:code" element={<LobbyPage />} />
            <Route path="game/hunter" element={<HunterPage />} />
            <Route path="game/runner" element={<RunnerPage />} />
            <Route path="game/spectator" element={<SpectatorPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="game" element={<Navigate to="/game/hunter" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <DevPanel />
      </BrowserRouter>
    </ToastProvider>
  );
}
