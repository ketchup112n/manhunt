import { randomUUID } from "node:crypto";
import {
  DEFAULT_SETTINGS,
  type ClientMessage,
  type GamePhase,
  type GameSettings,
  type PublicPlayer,
  type Role,
  type Snapshot,
  type TagResult,
  type Winner,
} from "./types.ts";

const BOT_NAMES = [
  "LYNX",
  "ORCA",
  "FALCON",
  "VIPER",
  "RAVEN",
  "COBRA",
  "WOLF",
  "TIGER",
  "HAWK",
  "GHOST",
  "ONYX",
  "SABLE",
  "JACKAL",
  "MAVERICK",
  "RIPTIDE",
  "NOMAD",
];

const MAX_CODE_ATTEMPTS = 10;

export interface LobbyPlayer {
  id: string;
  token: string;
  name: string;
  avatar: string;
  role: Role;
  isHost: boolean;
  isBot: boolean;
  ready: boolean;
  status: "active" | "caught";
  tagCode: string;
  connected: boolean;
  lastSeen: number;
}

export interface ActionResult {
  changed: boolean;
  error?: string;
  tag?: TagResult;
  /** The acting player left and must be detached from their socket. */
  left?: boolean;
  /** No players remain, the lobby can be discarded. */
  empty?: boolean;
}

interface LobbyOptions {
  code: string;
  hostName: string;
  settings?: Partial<GameSettings>;
}

export class Lobby {
  readonly code: string;
  readonly createdAt = Date.now();
  phase: GamePhase = "lobby";
  settings: GameSettings;
  players = new Map<string, LobbyPlayer>();
  resultWinner: Winner | null = null;

  private prepEndsAt = 0;
  private startedAt = 0;
  private endsAt = 0;
  private nextPingAt = 0;
  private lastPingAt = 0;
  private pingExpiresAt = 0;
  private pingCount = 0;
  private botCursor = 0;

  constructor(options: LobbyOptions) {
    this.code = options.code;
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };
    const host = this.createPlayer(options.hostName, { isHost: true });
    this.players.set(host.id, host);
  }

  get host(): LobbyPlayer | undefined {
    return [...this.players.values()].find((player) => player.isHost);
  }

  get hostId(): string {
    return this.host?.id ?? "";
  }

  get empty(): boolean {
    return this.players.size === 0;
  }

  get isFull(): boolean {
    return this.players.size >= this.settings.maxPlayers;
  }

  private createPlayer(
    rawName: string,
    options: { isHost?: boolean; isBot?: boolean } = {},
  ): LobbyPlayer {
    const name = normalizeName(rawName);
    return {
      id: randomUUID(),
      token: randomUUID().replace(/-/g, ""),
      name,
      avatar: name.slice(0, 2).toUpperCase() || "??",
      role: "unassigned",
      isHost: options.isHost ?? false,
      isBot: options.isBot ?? false,
      ready: options.isBot ?? false,
      status: "active",
      tagCode: this.uniqueTagCode(),
      connected: options.isBot ?? false,
      lastSeen: Date.now(),
    };
  }

  private uniqueTagCode(): string {
    const used = new Set(
      [...this.players.values()].map((player) => player.tagCode),
    );
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      if (!used.has(code)) return code;
    }
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  addPlayer(rawName: string): LobbyPlayer | { error: string } {
    if (this.phase !== "lobby" && !this.settings.allowLateJoin) {
      return { error: "This lobby is no longer accepting players." };
    }
    if (this.isFull) return { error: "This lobby is full." };
    const player = this.createPlayer(rawName);
    this.players.set(player.id, player);
    return player;
  }

  addBots(rawCount = 8): number {
    const slots = Math.max(0, this.settings.maxPlayers - this.players.size);
    const count = Math.min(Math.max(1, rawCount), slots);
    for (let index = 0; index < count; index += 1) {
      const name = this.nextBotName();
      const bot = this.createPlayer(name, { isBot: true });
      bot.ready = true;
      bot.connected = true;
      bot.role = this.balancedRole();
      this.players.set(bot.id, bot);
    }
    return count;
  }

  private nextBotName(): string {
    const used = new Set([...this.players.values()].map((player) => player.name));
    for (let attempt = 0; attempt < BOT_NAMES.length; attempt += 1) {
      const name = BOT_NAMES[this.botCursor % BOT_NAMES.length];
      this.botCursor += 1;
      if (!used.has(name)) return name;
    }
    return `${BOT_NAMES[this.botCursor % BOT_NAMES.length]}${this.players.size}`;
  }

  private balancedRole(): Role {
    const hunters = [...this.players.values()].filter(
      (player) => player.role === "hunter",
    ).length;
    const runners = [...this.players.values()].filter(
      (player) => player.role === "runner",
    ).length;
    if (hunters === runners) {
      return this.botCursor % 2 === 0 ? "hunter" : "runner";
    }
    return hunters < runners ? "hunter" : "runner";
  }

  removeBots(): number {
    let removed = 0;
    for (const [id, player] of this.players) {
      if (player.isBot) {
        this.players.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  findPlayer(playerId: string): LobbyPlayer | undefined {
    return this.players.get(playerId);
  }

  findByToken(token: string): LobbyPlayer | undefined {
    return [...this.players.values()].find((player) => player.token === token);
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = connected;
    player.lastSeen = Date.now();
  }

  removePlayer(playerId: string): ActionResult {
    const player = this.players.get(playerId);
    if (!player) return { changed: false };
    this.players.delete(playerId);

    if (this.empty) {
      return { changed: true, left: true, empty: true };
    }

    if (player.isHost) {
      const successor =
        [...this.players.values()].find(
          (candidate) => !candidate.isBot && candidate.connected,
        ) ??
        [...this.players.values()].find((candidate) => !candidate.isBot) ??
        [...this.players.values()][0];
      if (successor) {
        for (const candidate of this.players.values()) {
          candidate.isHost = candidate.id === successor.id;
        }
      }
    }

    return { changed: true, left: true };
  }

  /** Advance the authoritative clocks. Returns true when clients need a new snapshot. */
  tick(now = Date.now()): boolean {
    let changed = false;

    if (this.phase === "prep" && now >= this.prepEndsAt) {
      this.beginActive(now);
      changed = true;
    }

    if (this.phase === "active") {
      if (now >= this.endsAt) {
        this.finish("runners");
        changed = true;
      } else if (now >= this.nextPingAt) {
        this.pingCount += 1;
        this.lastPingAt = now;
        this.pingExpiresAt = now + 10_000;
        this.nextPingAt = now + Math.max(1, this.settings.pingSec) * 1000;
        changed = true;
      }
    }

    return changed;
  }

  private beginActive(now: number): void {
    this.phase = "active";
    this.startedAt = now;
    this.endsAt = now + Math.max(1, this.settings.durationSec) * 1000;
    this.nextPingAt = now + Math.max(1, this.settings.pingSec) * 1000;
    this.lastPingAt = 0;
    this.pingExpiresAt = 0;
    this.pingCount = 0;
    for (const player of this.players.values()) {
      player.status = "active";
      player.ready = true;
    }
  }

  private finish(winner: Winner): void {
    this.phase = "ended";
    this.resultWinner = winner;
    this.pingExpiresAt = 0;
    if (winner === "hunters") {
      for (const player of this.players.values()) {
        if (player.role === "runner") player.status = "caught";
      }
    }
  }

  handle(playerId: string, message: ClientMessage): ActionResult {
    const player = this.players.get(playerId);
    if (!player) return { changed: false, error: "Player not found." };
    player.lastSeen = Date.now();

    const hostOnly = (): ActionResult | null =>
      player.isHost ? null : { changed: false, error: "Only the host can do that." };

    switch (message.type) {
      case "updateSettings": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "lobby") {
          return { changed: false, error: "Rules are locked once prep begins." };
        }
        this.settings = sanitizeSettings({
          ...this.settings,
          ...message.settings,
        });
        return { changed: true };
      }

      case "assignRole": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "lobby") {
          return { changed: false, error: "Teams are locked once prep begins." };
        }
        const target = this.players.get(message.playerId);
        if (!target) return { changed: false, error: "Player not found." };
        if (!isRole(message.role)) {
          return { changed: false, error: "Unknown role." };
        }
        target.role = message.role;
        target.status = "active";
        return { changed: true };
      }

      case "randomizeTeams": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "lobby") {
          return { changed: false, error: "Teams are locked once prep begins." };
        }
        this.assignRandomTeams();
        return { changed: true };
      }

      case "setReady": {
        if (this.phase !== "lobby" && this.phase !== "prep") {
          return { changed: false, error: "The round has already started." };
        }
        player.ready = Boolean(message.ready);
        return { changed: true };
      }

      case "start": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "lobby") {
          return { changed: false, error: "The round has already started." };
        }
        const hunters = this.countRole("hunter");
        const runners = this.countRole("runner");
        if (hunters === 0 || runners === 0) {
          return { changed: false, error: "Assign at least one hunter and one runner." };
        }
        const unassigned = this.countRole("unassigned");
        if (unassigned > 0) {
          return {
            changed: false,
            error: `Assign every player first (${unassigned} still unassigned).`,
          };
        }
        this.phase = "prep";
        this.prepEndsAt = Date.now() + Math.max(0, this.settings.prepSec) * 1000;
        this.resultWinner = null;
        if (this.settings.prepSec <= 0) this.beginActive(Date.now());
        return { changed: true };
      }

      case "skipPrep": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "prep") {
          return { changed: false, error: "Not in the prep phase." };
        }
        this.beginActive(Date.now());
        return { changed: true };
      }

      case "ping": {
        if (!player.isHost && player.role !== "hunter") {
          return { changed: false, error: "Only hunters can request a ping." };
        }
        if (this.phase !== "active") {
          return { changed: false, error: "Pings only fire during an active round." };
        }
        const now = Date.now();
        this.pingCount += 1;
        this.lastPingAt = now;
        this.pingExpiresAt = now + 10_000;
        this.nextPingAt = now + Math.max(1, this.settings.pingSec) * 1000;
        return { changed: true };
      }

      case "submitTag": {
        if (player.role !== "hunter") {
          return { changed: false, error: "Only hunters can tag runners." };
        }
        if (this.phase !== "active") {
          return { changed: false, error: "Tags only count during an active round." };
        }
        const code = String(message.code ?? "").replace(/\D/g, "").slice(0, 4);
        const runners = [...this.players.values()].filter(
          (candidate) =>
            candidate.role === "runner" && candidate.status === "active",
        );
        if (runners.length === 0) {
          return { changed: false, tag: { result: "no-target" } };
        }
        const target = runners.find((runner) => runner.tagCode === code);
        if (!target) return { changed: false, tag: { result: "invalid" } };
        target.status = "caught";
        return {
          changed: true,
          tag: {
            result: "success",
            targetId: target.id,
            targetName: target.name,
          },
        };
      }

      case "endGame": {
        if (this.phase === "ended") return { changed: false };
        if (message.winner !== "hunters" && message.winner !== "runners") {
          return { changed: false, error: "Unknown winner." };
        }
        const fieldClear =
          this.countRole("runner") > 0 &&
          [...this.players.values()].every(
            (candidate) =>
              candidate.role !== "runner" || candidate.status === "caught",
          );
        const canClose =
          player.isHost ||
          (message.winner === "hunters" && player.role === "hunter" && fieldClear);
        if (!canClose) {
          return { changed: false, error: "Only the host can end the round." };
        }
        this.finish(message.winner);
        return { changed: true };
      }

      case "fillBots": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "lobby") {
          return { changed: false, error: "Bots can only join the lobby." };
        }
        const added = this.addBots(message.count ?? 8);
        return added > 0
          ? { changed: true }
          : { changed: false, error: "The lobby is full." };
      }

      case "removeBots": {
        const denied = hostOnly();
        if (denied) return denied;
        const removed = this.removeBots();
        return removed > 0
          ? { changed: true }
          : { changed: false, error: "There are no bots to remove." };
      }

      case "leave":
        return this.removePlayer(playerId);

      default:
        return { changed: false, error: "Unknown message." };
    }
  }

  private countRole(role: Role): number {
    return [...this.players.values()].filter((player) => player.role === role)
      .length;
  }

  private assignRandomTeams(): void {
    const players = [...this.players.values()];
    if (players.length === 0) return;
    if (players.length === 1) {
      players[0].role = "hunter";
      return;
    }

    const shuffled = [...players];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    const hunterCount = Math.max(
      1,
      Math.floor(Math.random() * (players.length - 1)) + 1,
    );
    const hunterIds = new Set(
      shuffled.slice(0, hunterCount).map((player) => player.id),
    );
    for (const player of players) {
      player.role = hunterIds.has(player.id) ? "hunter" : "runner";
      player.status = "active";
    }
  }

  snapshotFor(viewerId: string, includeAllPins: boolean): Snapshot {
    const now = Date.now();
    const phase = this.phase;
    const timeLeftSec =
      phase === "active"
        ? Math.max(0, Math.ceil((this.endsAt - now) / 1000))
        : phase === "ended"
          ? 0
          : Math.max(0, Math.round(this.settings.durationSec));

    const nextPingSec =
      phase === "active"
        ? Math.max(0, Math.ceil((this.nextPingAt - now) / 1000))
        : phase === "prep"
          ? Math.max(0, Math.ceil((this.prepEndsAt - now) / 1000))
          : Math.max(0, Math.round(this.settings.pingSec));

    const lastPingAgo =
      phase === "active"
        ? Math.max(
            0,
            Math.floor(
              (now - (this.lastPingAt || this.startedAt || now)) / 1000,
            ),
          )
        : 0;

    const players: PublicPlayer[] = [...this.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      role: player.role,
      isHost: player.isHost,
      isBot: player.isBot,
      ready: player.ready,
      status: player.status,
      avatar: player.avatar,
      connected: player.isBot || player.connected,
      tagCode:
        includeAllPins || player.id === viewerId ? player.tagCode : undefined,
    }));

    return {
      code: this.code,
      phase,
      hostId: this.hostId,
      settings: { ...this.settings },
      players,
      youId: viewerId,
      timeLeftSec,
      prepRemainingSec:
        phase === "prep"
          ? Math.max(0, Math.ceil((this.prepEndsAt - now) / 1000))
          : 0,
      nextPingSec,
      lastPingAgo,
      pingCount: this.pingCount,
      pingExpiresInMs: Math.max(0, this.pingExpiresAt - now),
      resultWinner: this.resultWinner,
    };
  }
}

export function normalizeName(rawName: string): string {
  const name = String(rawName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 12);
  return name || "PLAYER";
}

export function createLobbyCode(existing: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS * 10; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!existing.has(code)) return code;
  }
  throw new Error("Could not allocate a lobby code.");
}

function isRole(value: unknown): value is Role {
  return value === "hunter" || value === "runner" || value === "unassigned";
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Keep host-supplied values inside ranges the UI and the zone schedule can
 * actually handle. Clients send incremental patches, so merge first.
 */
export function sanitizeSettings(settings: GameSettings): GameSettings {
  return {
    prepSec: Math.round(clamp(settings.prepSec, 0, 1800)),
    pingSec: Math.round(clamp(settings.pingSec, 1, 3600)),
    durationSec: Math.round(clamp(settings.durationSec, 30, 86_400)),
    playAreaM: Math.round(clamp(settings.playAreaM, 50, 10_000)),
    showAllHuntersToRunners: Boolean(settings.showAllHuntersToRunners),
    showHunterTeammates: Boolean(settings.showHunterTeammates),
    allowLateJoin: Boolean(settings.allowLateJoin),
    allowSpectators: Boolean(settings.allowSpectators),
    locationIntervalSec: Math.round(
      clamp(settings.locationIntervalSec, 1, 300),
    ),
    compassIntervalSec: Math.round(clamp(settings.compassIntervalSec, 1, 120)),
    maxPlayers: Math.round(clamp(settings.maxPlayers, 2, 50)),
    zoneEnabled: Boolean(settings.zoneEnabled),
    zoneShrinkIntervalSec: Math.round(
      clamp(settings.zoneShrinkIntervalSec, 30, 3600),
    ),
    zoneShrinkStepM: Math.round(clamp(settings.zoneShrinkStepM, 10, 5000)),
    zoneFinalRadiusM: Math.round(
      clamp(settings.zoneFinalRadiusM, 10, 5000),
    ),
  };
}
