import { useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { DevPanel } from "@/components/game/DevPanel";
import { usePreferences } from "@/store/preferences";
import { useGame, useYou } from "@/store/game";
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
import type { Role } from "@/lib/types";

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

/** Restores the persisted lobby session and surfaces server action errors. */
function RealtimeSync() {
  const bootstrap = useGame((state) => state.bootstrap);
  const actionError = useGame((state) => state.actionError);
  const clearActionError = useGame((state) => state.clearActionError);
  const { toast } = useToast();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!actionError) return;
    toast(actionError.message, { tone: "warning" });
    clearActionError();
  }, [actionError, clearActionError, toast]);

  return null;
}

function homeForRole(role: Role, code: string): string {
  if (role === "hunter") return "/game/hunter";
  if (role === "runner") return "/game/runner";
  return code ? `/lobby/${code}` : "/join";
}

/**
 * Keeps players on the screen that matches the role the host gave them.
 * Without a session the routes stay open so the dev console can preview them.
 */
function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const you = useYou();
  const session = useGame((state) => state.session);
  const phase = useGame((state) => state.phase);
  const code = useGame((state) => state.code);
  const bootstrapped = useGame((state) => state.bootstrapped);

  if (!bootstrapped) return null;
  if (!session || !you) return <>{children}</>;
  if (phase === "ended") return <Navigate to="/results" replace />;
  if (phase === "lobby") {
    return <Navigate to={code ? `/lobby/${code}` : "/join"} replace />;
  }
  if (you.role !== role) {
    return <Navigate to={homeForRole(you.role, code)} replace />;
  }
  return <>{children}</>;
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
      <RealtimeSync />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="create" element={<CreateLobbyPage />} />
            <Route path="join" element={<JoinPage />} />
            <Route path="join/:code" element={<JoinPage />} />
            <Route path="lobby/:code" element={<LobbyPage />} />
            <Route
              path="game/hunter"
              element={
                <RoleGate role="hunter">
                  <HunterPage />
                </RoleGate>
              }
            />
            <Route
              path="game/runner"
              element={
                <RoleGate role="runner">
                  <RunnerPage />
                </RoleGate>
              }
            />
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
