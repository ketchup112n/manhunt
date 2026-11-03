export type Role = "hunter" | "runner";
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
  tagRadiusM: number;
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  isYou: boolean;
  isHost: boolean;
  ready: boolean;
  status: "active" | "caught";
  avatar: string;
  tagCode: string;
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
  tagRadiusM: 20,
};
