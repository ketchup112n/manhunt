import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  type GamePhase,
  type GameSettings,
  type Player,
  type Role,
  type TagState,
  type Winner,
} from "@/lib/types";

const INITIAL_PLAYERS: Player[] = [
  {
    id: "you",
    name: "ECHO",
    role: "hunter",
    isYou: true,
    isHost: true,
    ready: true,
    status: "active",
    avatar: "EC",
    tagCode: "2048",
  },
  {
    id: "vex",
    name: "VEX",
    role: "hunter",
    isYou: false,
    isHost: false,
    ready: true,
    status: "active",
    avatar: "VX",
    tagCode: "7315",
  },
  {
    id: "kilo",
    name: "KILO",
    role: "hunter",
    isYou: false,
    isHost: false,
    ready: true,
    status: "active",
    avatar: "KL",
    tagCode: "9182",
  },
  {
    id: "wren",
    name: "WREN",
    role: "runner",
    isYou: false,
    isHost: false,
    ready: true,
    status: "active",
    avatar: "WR",
    tagCode: "4821",
  },
  {
    id: "ash",
    name: "ASH",
    role: "runner",
    isYou: false,
    isHost: false,
    ready: true,
    status: "active",
    avatar: "AS",
    tagCode: "7390",
  },
  {
    id: "rook",
    name: "ROOK",
    role: "runner",
    isYou: false,
    isHost: false,
    ready: true,
    status: "active",
    avatar: "RK",
    tagCode: "1156",
  },
  {
    id: "nova",
    name: "NOVA",
    role: "runner",
    isYou: false,
    isHost: false,
    ready: true,
    status: "active",
    avatar: "NV",
    tagCode: "6204",
  },
];

interface GameStore {
  code: string;
  gameName: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  timeLeftSec: number;
  nextPingSec: number;
  lastPingAgo: number;
  pingCount: number;
  pingExpiresAt: number;
  tagState: TagState;
  tagTargetId: string | null;
  incomingTag: boolean;
  incomingTagDeadline: number;
  resultWinner: Winner | null;
  deviceHeading: number;

  setYouName: (name: string) => void;
  setGameName: (name: string) => void;
  /** Legacy preview action, retained until all old navigation affordances are removed. */
  setRole: (role: Role) => void;
  triggerIncomingTag: () => void;
  respondIncomingTag: (accepted: boolean) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  assignPlayerRole: (id: string, role: Role) => void;
  randomizeTeams: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  tick: () => void;
  triggerPing: () => void;
  submitTagCode: (code: string) => void;
  resetTag: () => void;
  endGame: (winner: Winner) => void;
  setDeviceHeading: (heading: number) => void;
  resetGame: () => void;
}

const initialState = {
  code: "VX7K2M",
  gameName: "MANHUNT",
  phase: "lobby" as GamePhase,
  settings: DEFAULT_SETTINGS,
  players: INITIAL_PLAYERS,
  timeLeftSec: 2825,
  nextPingSec: 206,
  lastPingAgo: 94,
  pingCount: 2,
  pingExpiresAt: 0,
  tagState: "idle" as TagState,
  tagTargetId: null as string | null,
  incomingTag: false,
  incomingTagDeadline: 0,
  resultWinner: null as Winner | null,
  deviceHeading: 24,
};

function catchTarget(players: Player[], id: string | null): Player[] {
  if (!id) return players;
  return players.map((p) => (p.id === id ? { ...p, status: "caught" } : p));
}

export const useGame = create<GameStore>((set, get) => ({
  ...initialState,

  setYouName: (name) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.isYou
          ? {
              ...p,
              name: name.toUpperCase().slice(0, 12),
              avatar: name.slice(0, 2).toUpperCase() || "YO",
            }
          : p,
      ),
    })),

  setGameName: (gameName) => set({ gameName: gameName.toUpperCase().slice(0, 24) }),

  setRole: (role) => set((state) => ({
    players: state.players.map((player) => player.isYou ? { ...player, role } : player),
  })),

  triggerIncomingTag: () => set({ incomingTag: true, incomingTagDeadline: Date.now() + 15_000 }),

  respondIncomingTag: (accepted) => set((state) => ({
    incomingTag: false,
    players: accepted ? catchTarget(state.players, state.players.find((player) => player.isYou)?.id ?? null) : state.players,
  })),

  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),

  assignPlayerRole: (id, role) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, role } : p)),
      tagState: "idle",
      tagTargetId: null,
    })),

  randomizeTeams: () =>
    set((state) => {
      const shuffled = [...state.players];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }

      const hunterCount =
        shuffled.length <= 1
          ? shuffled.length
          : Math.max(1, Math.floor(Math.random() * (shuffled.length - 1)) + 1);
      const hunterIds = new Set(shuffled.slice(0, hunterCount).map((player) => player.id));

      return {
        players: state.players.map((player) => ({
          ...player,
          role: hunterIds.has(player.id) ? "hunter" : "runner",
        })),
        tagState: "idle",
        tagTargetId: null,
      };
    }),

  setReady: (ready) =>
    set((state) => ({
      players: state.players.map((p) => (p.isYou ? { ...p, ready } : p)),
    })),

  startGame: () => {
    const state = get();
    const hasHunters = state.players.some((player) => player.role === "hunter");
    const hasRunners = state.players.some((player) => player.role === "runner");
    if (!hasHunters || !hasRunners) return;

    set({
      phase: "active",
      players: state.players.map((p) => ({
        ...p,
        status: "active",
        ready: true,
      })),
      tagState: "idle",
      tagTargetId: null,
      lastPingAgo: 0,
      nextPingSec: state.settings.pingSec,
      timeLeftSec: state.settings.durationSec,
      pingCount: 0,
      pingExpiresAt: 0,
      resultWinner: null,
    });
  },

  tick: () =>
    set((state) => {
      if (state.phase !== "active") return {};

      if (state.timeLeftSec <= 1) {
        return {
          timeLeftSec: 0,
          phase: "ended" as GamePhase,
          resultWinner: "runners" as Winner,
        };
      }

      if (state.nextPingSec <= 1) {
        return {
          timeLeftSec: state.timeLeftSec - 1,
          nextPingSec: state.settings.pingSec,
          lastPingAgo: 0,
          pingCount: state.pingCount + 1,
          pingExpiresAt: Date.now() + 10_000,
        };
      }

      return {
        timeLeftSec: state.timeLeftSec - 1,
        nextPingSec: state.nextPingSec - 1,
        lastPingAgo: state.lastPingAgo + 1,
      };
    }),

  triggerPing: () =>
    set((state) => ({
      nextPingSec: state.settings.pingSec,
      lastPingAgo: 0,
      pingCount: state.pingCount + 1,
      pingExpiresAt: Date.now() + 10_000,
    })),

  submitTagCode: (rawCode) => {
    const code = rawCode.replace(/\D/g, "").slice(0, 4);
    const activeRunners = get().players.filter(
      (player) => player.role === "runner" && player.status === "active",
    );

    if (activeRunners.length === 0) {
      set({ tagState: "no-target", tagTargetId: null });
      return;
    }

    const target = activeRunners.find((runner) => runner.tagCode === code);
    if (!target) {
      set({ tagState: "invalid", tagTargetId: null });
      return;
    }

    set((state) => ({
      tagState: "success",
      tagTargetId: target.id,
      players: catchTarget(state.players, target.id),
    }));
  },

  resetTag: () => set({ tagState: "idle", tagTargetId: null }),

  endGame: (winner) =>
    set((state) => ({
      phase: "ended",
      resultWinner: winner,
      tagState: "idle",
      players:
        winner === "hunters"
          ? state.players.map((p) =>
              p.role === "runner" ? { ...p, status: "caught" } : p,
            )
          : state.players,
    })),

  setDeviceHeading: (deviceHeading) => set({ deviceHeading }),

  resetGame: () => set({ ...initialState, players: INITIAL_PLAYERS }),
}));

export const useYou = () => useGame((s) => s.players.find((p) => p.isYou));
export const useHunters = () =>
  useGame((s) => s.players.filter((p) => p.role === "hunter"));
export const useRunners = () =>
  useGame((s) => s.players.filter((p) => p.role === "runner"));
