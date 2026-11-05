export type Role = "hunter" | "runner" | "unassigned";
export type Theme = "dark" | "light";
export type Units = "metric" | "imperial";
export type GamePhase = "lobby" | "prep" | "active" | "ended";
export type TagState = "idle" | "success" | "invalid" | "no-target";
export type Winner = "hunters" | "runners";

export interface GameSettings {
  prepSec: number;
  pingSec: number;
  durationSec: number;
  playAreaM: number;
  showAllHuntersToRunners: boolean;
  showHunterTeammates: boolean;
  allowLateJoin: boolean;
  allowSpectators: boolean;
  locationIntervalSec: number;
  compassIntervalSec: number;
  maxPlayers: number;
  /** Battle-royale style shrinking play area. */
  zoneEnabled: boolean;
  /** Seconds between each zone contraction. */
  zoneShrinkIntervalSec: number;
  /** Meters removed from the radius on every contraction. */
  zoneShrinkStepM: number;
  /** Radius the zone settles at and never shrinks below. */
  zoneFinalRadiusM: number;
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  /** Epoch milliseconds when the device reported this fix. */
  at: number;
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  isYou: boolean;
  isHost: boolean;
  isBot: boolean;
  ready: boolean;
  status: "active" | "caught";
  avatar: string;
  /** Only present for the player who owns the PIN (and dev snapshots). */
  tagCode?: string;
  connected: boolean;
  /** Present only when this viewer is allowed to see the player's location. */
  position?: GeoPosition;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RunnerSignal extends LatLng {
  id: string;
  name: string;
  accuracyM: number;
  seenAt: number;
}

export interface Preferences {
  theme: Theme;
  units: Units;
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  northUp: boolean;
}

export interface LobbySession {
  code: string;
  playerId: string;
  token: string;
}

export interface Snapshot {
  code: string;
  phase: GamePhase;
  hostId: string;
  settings: GameSettings;
  players: Omit<Player, "isYou">[];
  youId: string;
  timeLeftSec: number;
  prepRemainingSec: number;
  nextPingSec: number;
  lastPingAgo: number;
  pingCount: number;
  pingExpiresInMs: number;
  resultWinner: Winner | null;
  center: LatLng | null;
  nearestHunter: { bearing: number; distanceM: number; updatedAt: number } | null;
}

export type TagResult =
  | { result: "success"; targetId: string; targetName: string }
  | { result: "invalid" }
  | { result: "no-target" };

export type ClientMessage =
  | { type: "updateSettings"; settings: Partial<GameSettings> }
  | { type: "assignRole"; playerId: string; role: Role }
  | { type: "randomizeTeams" }
  | { type: "setReady"; ready: boolean }
  | { type: "start" }
  | { type: "skipPrep" }
  | { type: "ping" }
  | { type: "updateLocation"; lat: number; lng: number; accuracyM: number }
  | { type: "submitTag"; code: string }
  | { type: "endGame"; winner: Winner }
  | { type: "fillBots"; count?: number }
  | { type: "removeBots" }
  | { type: "leave" };

export type ServerMessage =
  | { type: "state"; state: Snapshot }
  | { type: "tagResult"; tag: TagResult }
  | { type: "error"; message: string };

export const DEFAULT_SETTINGS: GameSettings = {
  prepSec: 120,
  pingSec: 300,
  durationSec: 3600,
  playAreaM: 1000,
  showAllHuntersToRunners: false,
  showHunterTeammates: true,
  allowLateJoin: true,
  allowSpectators: true,
  locationIntervalSec: 5,
  compassIntervalSec: 3,
  maxPlayers: 20,
  zoneEnabled: false,
  zoneShrinkIntervalSec: 300,
  zoneShrinkStepM: 150,
  zoneFinalRadiusM: 100,
};
