import { create } from "zustand";
import { useMemo } from "react";
import {
  DEFAULT_SETTINGS,
  type ClientMessage,
  type GamePhase,
  type GameSettings,
  type GeoPosition,
  type LatLng,
  type LobbySession,
  type Player,
  type Role,
  type ServerMessage,
  type Snapshot,
  type TagState,
  type Winner,
} from "@/lib/types";
import { computeZoneState, type ZoneState } from "@/lib/zone";

const SESSION_KEY = "manhunt-session";
const NAME_KEY = "manhunt-name";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

export type PositionStatus =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "unsupported"
  | "error";

interface ActionResult {
  ok: boolean;
  error?: string;
  code?: string;
}

interface GameStore {
  code: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  session: LobbySession | null;
  connection: ConnectionState;
  connectionError: string | null;
  bootstrapped: boolean;
  draftName: string;
  actionError: { message: string; at: number } | null;
  timeLeftSec: number;
  prepRemainingSec: number;
  nextPingSec: number;
  lastPingAgo: number;
  pingCount: number;
  pingExpiresAt: number;
  tagState: TagState;
  tagTargetId: string | null;
  resultWinner: Winner | null;
  deviceHeading: number;
  center: LatLng | null;
  nearestHunter: { bearing: number; distanceM: number; updatedAt: number } | null;
  livePosition: GeoPosition | null;
  positionStatus: PositionStatus;
  positionError: string | null;

  bootstrap: () => void;
  createLobby: (name: string, settings: GameSettings) => Promise<ActionResult>;
  joinLobby: (code: string, name: string) => Promise<ActionResult>;
  leaveLobby: () => void;
  setDraftName: (name: string) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  assignPlayerRole: (id: string, role: Role) => void;
  randomizeTeams: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  skipPrep: () => void;
  triggerPing: () => void;
  submitTagCode: (code: string) => void;
  resetTag: () => void;
  endGame: (winner: Winner) => void;
  fillBots: (count?: number) => void;
  removeBots: () => void;
  setDeviceHeading: (heading: number) => void;
  updateLocation: (lat: number, lng: number, accuracyM: number) => void;
  setLivePosition: (position: GeoPosition) => void;
  setPositionStatus: (status: PositionStatus, error?: string | null) => void;
  resetGame: () => void;
  clearActionError: () => void;
}

const initialState = {
  code: "",
  phase: "lobby" as GamePhase,
  settings: DEFAULT_SETTINGS,
  players: [] as Player[],
  session: null as LobbySession | null,
  connection: "idle" as ConnectionState,
  connectionError: null as string | null,
  bootstrapped: false,
  draftName: "",
  actionError: null as { message: string; at: number } | null,
  timeLeftSec: DEFAULT_SETTINGS.durationSec,
  prepRemainingSec: 0,
  nextPingSec: DEFAULT_SETTINGS.pingSec,
  lastPingAgo: 0,
  pingCount: 0,
  pingExpiresAt: 0,
  tagState: "idle" as TagState,
  tagTargetId: null as string | null,
  resultWinner: null as Winner | null,
  deviceHeading: 24,
  center: null as LatLng | null,
  nearestHunter: null as {
    bearing: number;
    distanceM: number;
    updatedAt: number;
  } | null,
  livePosition: null as GeoPosition | null,
  positionStatus: "idle" as PositionStatus,
  positionError: null as string | null,
};

let socket: WebSocket | null = null;
let reconnectTimer: number | undefined;
let reconnectAttempts = 0;
let intentionalClose = false;
let bootstrappedOnce = false;

function readSession(): LobbySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LobbySession>;
    if (
      typeof parsed.code === "string" &&
      typeof parsed.playerId === "string" &&
      typeof parsed.token === "string"
    ) {
      return {
        code: parsed.code,
        playerId: parsed.playerId,
        token: parsed.token,
      };
    }
  } catch {
    // Corrupt storage is equivalent to no session.
  }
  return null;
}

function writeSession(session: LobbySession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage may be unavailable in private mode.
  }
}

function readName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // Ignore storage failures.
  }
}

function websocketUrl(session: LobbySession): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws?code=${encodeURIComponent(
    session.code,
  )}&token=${encodeURIComponent(session.token)}`;
}

function clearReconnect(): void {
  if (reconnectTimer !== undefined) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
}

function closeSocket(): void {
  clearReconnect();
  if (socket) {
    intentionalClose = true;
    socket.close();
    socket = null;
  }
}

function send(message: ClientMessage): boolean {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  }
  return false;
}

function actionError(message: string): { message: string; at: number } {
  return { message, at: Date.now() };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "The server rejected the request.");
  }
  return payload;
}

export const useGame = create<GameStore>((set, get) => {
  function applySnapshot(state: Snapshot): void {
    set({
      code: state.code,
      phase: state.phase,
      settings: state.settings,
      players: state.players.map((player) => ({
        ...player,
        isYou: player.id === state.youId,
      })),
      timeLeftSec: state.timeLeftSec,
      prepRemainingSec: state.prepRemainingSec,
      nextPingSec: state.nextPingSec,
      lastPingAgo: state.lastPingAgo,
      pingCount: state.pingCount,
      pingExpiresAt:
        state.pingExpiresInMs > 0 ? Date.now() + state.pingExpiresInMs : 0,
      resultWinner: state.resultWinner,
      center: state.center,
      nearestHunter: state.nearestHunter,
      connection: "connected",
      connectionError: null,
    });
  }

  function handleMessage(raw: string): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case "state":
        applySnapshot(message.state);
        break;
      case "tagResult":
        set({
          tagState: message.tag.result,
          tagTargetId:
            message.tag.result === "success" ? message.tag.targetId : null,
        });
        break;
      case "error":
        set({ actionError: actionError(message.message) });
        break;
      default:
        break;
    }
  }

  function connect(session: LobbySession): void {
    closeSocket();
    intentionalClose = false;
    clearReconnect();
    set({
      session,
      connection: "connecting",
      connectionError: null,
    });

    let next: WebSocket;
    try {
      next = new WebSocket(websocketUrl(session));
    } catch {
      set({
        connection: "disconnected",
        connectionError: "Could not open a realtime connection.",
      });
      return;
    }
    socket = next;

    next.addEventListener("open", () => {
      if (socket !== next) return;
      reconnectAttempts = 0;
      set({ connection: "connected", connectionError: null });
    });

    next.addEventListener("message", (event) => {
      if (socket !== next) return;
      handleMessage(String(event.data));
    });

    next.addEventListener("close", (event) => {
      if (socket !== next) return;
      socket = null;
      if (intentionalClose) {
        set({ connection: "disconnected" });
        return;
      }
      if (event.code === 4001 || event.code === 1008) {
        writeSession(null);
        set({
          session: null,
          connection: "disconnected",
          connectionError:
            "That lobby is closed or the session expired. Join the lobby again.",
          players: [],
          code: "",
        });
        return;
      }

      const current = get().session;
      if (!current) {
        set({ connection: "disconnected" });
        return;
      }
      reconnectAttempts += 1;
      const delay = Math.min(5000, 750 * reconnectAttempts);
      set({
        connection: reconnectAttempts > 2 ? "disconnected" : "connecting",
      });
      reconnectTimer = window.setTimeout(() => {
        if (get().session) connect(current);
      }, delay);
    });

    next.addEventListener("error", () => {
      // The close handler owns reconnection and user-facing errors.
    });
  }

  return {
    ...initialState,
    draftName: readName(),

    bootstrap: () => {
      if (bootstrappedOnce) {
        set({ bootstrapped: true });
        return;
      }
      bootstrappedOnce = true;
      const session = readSession();
      set({
        bootstrapped: true,
        draftName: readName(),
        session,
      });
      if (session) connect(session);
    },

    createLobby: async (name, settings) => {
      const cleanName = name.trim();
      if (!cleanName) return { ok: false, error: "Add a display name first." };
      try {
        const session = await post<LobbySession>("/api/lobbies", {
          name: cleanName,
          settings,
        });
        writeSession(session);
        writeName(cleanName.toUpperCase().slice(0, 12));
        set({
          draftName: cleanName.toUpperCase().slice(0, 12),
          tagState: "idle",
          tagTargetId: null,
        });
        connect(session);
        return { ok: true, code: session.code };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not create the lobby.",
        };
      }
    },

    joinLobby: async (rawCode, name) => {
      const code = rawCode.trim().toUpperCase();
      const cleanName = name.trim();
      if (code.length !== 6) {
        return { ok: false, error: "Enter the full 6-character lobby code." };
      }
      if (!cleanName) return { ok: false, error: "Add a display name first." };
      try {
        const session = await post<LobbySession>(
          `/api/lobbies/${encodeURIComponent(code)}/join`,
          { name: cleanName },
        );
        writeSession(session);
        writeName(cleanName.toUpperCase().slice(0, 12));
        set({
          draftName: cleanName.toUpperCase().slice(0, 12),
          tagState: "idle",
          tagTargetId: null,
        });
        connect(session);
        return { ok: true, code: session.code };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Could not join the lobby.",
        };
      }
    },

    leaveLobby: () => {
      send({ type: "leave" });
      intentionalClose = true;
      closeSocket();
      writeSession(null);
      set({
        ...initialState,
        draftName: get().draftName,
        bootstrapped: true,
      });
    },

    setDraftName: (name) => {
      const clean = name.toUpperCase().slice(0, 12);
      writeName(clean);
      set({ draftName: clean });
    },

    updateSettings: (settings) => {
      set((state) => ({ settings: { ...state.settings, ...settings } }));
      if (get().session) send({ type: "updateSettings", settings });
    },

    assignPlayerRole: (id, role) => {
      send({ type: "assignRole", playerId: id, role });
    },

    randomizeTeams: () => {
      send({ type: "randomizeTeams" });
    },

    setReady: (ready) => {
      send({ type: "setReady", ready });
    },

    startGame: () => {
      if (!send({ type: "start" })) {
        set({ actionError: actionError("Not connected to the lobby.") });
      }
    },

    skipPrep: () => {
      send({ type: "skipPrep" });
    },

    triggerPing: () => {
      send({ type: "ping" });
    },

    submitTagCode: (rawCode) => {
      const code = rawCode.replace(/\D/g, "").slice(0, 4);
      if (code.length !== 4) {
        set({ tagState: "invalid", tagTargetId: null });
        return;
      }
      if (!send({ type: "submitTag", code })) {
        set({
          tagState: "idle",
          actionError: actionError("Not connected to the lobby."),
        });
      }
    },

    resetTag: () => set({ tagState: "idle", tagTargetId: null }),

    endGame: (winner) => {
      send({ type: "endGame", winner });
    },

    fillBots: (count) => {
      send({ type: "fillBots", count });
    },

    removeBots: () => {
      send({ type: "removeBots" });
    },

    setDeviceHeading: (deviceHeading) => set({ deviceHeading }),

    updateLocation: (lat, lng, accuracyM) => {
      send({ type: "updateLocation", lat, lng, accuracyM });
    },

    setLivePosition: (position) =>
      set({
        livePosition: position,
        positionStatus: "live",
        positionError: null,
      }),

    setPositionStatus: (positionStatus, positionError = null) =>
      set({ positionStatus, positionError }),

    resetGame: () => {
      get().leaveLobby();
    },

    clearActionError: () => set({ actionError: null }),
  };
});

export const useYou = () => useGame((s) => s.players.find((p) => p.isYou));
export const useHunters = () =>
  useGame((s) => s.players.filter((p) => p.role === "hunter"));
export const useRunners = () =>
  useGame((s) => s.players.filter((p) => p.role === "runner"));

/**
 * Live shrinking-zone state for the active round. Each interval splits into a
 * hold phase and a contraction phase, so the radius is derived from the round
 * clock rather than stepped in discrete jumps.
 */
export const useZoneState = (): ZoneState => {
  const settings = useGame((s) => s.settings);
  const timeLeftSec = useGame((s) => s.timeLeftSec);
  const phase = useGame((s) => s.phase);

  return useMemo(() => {
    const elapsedSec =
      phase === "active" || phase === "ended"
        ? Math.max(0, settings.durationSec - timeLeftSec)
        : 0;
    return computeZoneState(settings, elapsedSec);
  }, [phase, settings, timeLeftSec]);
};
