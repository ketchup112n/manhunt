export type Role = "hunter" | "runner" | "unassigned";
export type GamePhase = "lobby" | "prep" | "active" | "ended";
export type Winner = "hunters" | "runners";
export type TagState = "idle" | "success" | "invalid" | "no-target";

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
  zoneEnabled: boolean;
  zoneShrinkIntervalSec: number;
  zoneShrinkStepM: number;
  zoneFinalRadiusM: number;
}

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

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  /** Epoch milliseconds when the device reported this fix. */
  at: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Where a runner was tagged. Historical, and never moves after the catch. */
export interface CaughtSpot extends LatLng {
  id: string;
  name: string;
  accuracyM: number;
  at: number;
}

/** Player shape sent to clients. PINs are only included for their owner (or dev clients). */
export interface PublicPlayer {
  id: string;
  name: string;
  role: Role;
  isHost: boolean;
  isBot: boolean;
  ready: boolean;
  status: "active" | "caught";
  avatar: string;
  connected: boolean;
  tagCode?: string;
  /** Present only when this viewer is allowed to see the player's location. */
  position?: GeoPosition;
}

export interface Snapshot {
  code: string;
  phase: GamePhase;
  hostId: string;
  settings: GameSettings;
  players: PublicPlayer[];
  youId: string;
  timeLeftSec: number;
  prepRemainingSec: number;
  nextPingSec: number;
  lastPingAgo: number;
  pingCount: number;
  pingExpiresInMs: number;
  resultWinner: Winner | null;
  /** Arena anchor captured when the round starts, if anyone had a GPS fix. */
  center: LatLng | null;
  /** Bearing and range to the closest hunter, for runners without hunter intel. */
  nearestHunter: { bearing: number; distanceM: number; updatedAt: number } | null;
  /** Frozen locations where runners were tagged this round. */
  caughtSpots: CaughtSpot[];
}

export interface Session {
  code: string;
  playerId: string;
  token: string;
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
