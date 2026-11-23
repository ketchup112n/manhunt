import { useEffect, type ReactNode, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { DevPanel } from "@/components/game/DevPanel";
import { LocationSync } from "@/components/game/LocationSync";
import { LocationGate } from "@/components/game/LocationGate";
import { RoleRevealOverlay } from "@/components/game/RoleRevealOverlay";
import { usePreferences } from "@/store/preferences";
import { useGame, useYou } from "@/store/game";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import type { Role } from "@/lib/types";

const CreateLobbyPage = lazy(() => import("@/pages/CreateLobbyPage").then((m) => ({ default: m.CreateLobbyPage })));
const JoinPage = lazy(() => import("@/pages/JoinPage").then((m) => ({ default: m.JoinPage })));
const LobbyPage = lazy(() => import("@/pages/LobbyPage").then((m) => ({ default: m.LobbyPage })));
const HunterPage = lazy(() => import("@/pages/HunterPage").then((m) => ({ default: m.HunterPage })));
const RunnerPage = lazy(() => import("@/pages/RunnerPage").then((m) => ({ default: m.RunnerPage })));
const SpectatorPage = lazy(() => import("@/pages/SpectatorPage").then((m) => ({ default: m.SpectatorPage })));
const ResultsPage = lazy(() => import("@/pages/ResultsPage").then((m) => ({ default: m.ResultsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function LoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <svg className="h-10 w-10 text-runner/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="62.83" strokeDashoffset="15.71" />
          </svg>
          <svg className="absolute h-10 w-10 text-runner animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeDasharray="62.83" strokeDashoffset="15.71" />
          </svg>
        </div>
        <p className="label-mono text-ink">Loading…</p>
      </div>
    </div>
  );
}

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

/** Shown to a player the host has removed from the lobby. */
function RemovalNotice() {
  const notice = useGame((state) => state.removalNotice);
  const clearRemovalNotice = useGame((state) => state.clearRemovalNotice);
  const navigate = useNavigate();

  if (!notice) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-line-strong/60 bg-surface p-6 text-center shadow-[0_40px_120px_rgb(0_0_0/0.55)]">
        <p className="label-mono mb-2 text-danger">Removed</p>
        <h2 className="display text-2xl font-semibold text-ink">
          You are out of this lobby
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{notice}</p>
        <Button
          full
          className="mt-5"
          onClick={() => {
            clearRemovalNotice();
            navigate("/", { replace: true });
          }}
        >
          Return home
        </Button>
      </div>
    </div>,
    document.body,
  );
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
      <LocationSync />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route
              path="create"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CreateLobbyPage />
                </Suspense>
              }
            />
            <Route
              path="join"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <JoinPage />
                </Suspense>
              }
            />
            <Route
              path="join/:code"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <JoinPage />
                </Suspense>
              }
            />
            <Route
              path="lobby/:code"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <LobbyPage />
                </Suspense>
              }
            />
            <Route
              path="game/hunter"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <RoleGate role="hunter">
                    <HunterPage />
                  </RoleGate>
                </Suspense>
              }
            />
            <Route
              path="game/runner"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <RoleGate role="runner">
                    <RunnerPage />
                  </RoleGate>
                </Suspense>
              }
            />
            <Route
              path="game/spectator"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <SpectatorPage />
                </Suspense>
              }
            />
            <Route
              path="results"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ResultsPage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route path="game" element={<Navigate to="/game/hunter" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <RemovalNotice />
        <LocationGate />
        <RoleRevealOverlay />
        <DevPanel />
      </BrowserRouter>
    </ToastProvider>
  );
}
