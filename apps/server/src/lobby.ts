import { randomUUID } from "node:crypto";
import {
  DEFAULT_SETTINGS,
  type CaughtSpot,
  type ClientMessage,
  type GamePhase,
  type GameSettings,
  type GeoPosition,
  type LatLng,
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

/** Length of the synchronized role reveal before the prep countdown. */
export const REVEAL_SEC = 10;

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
  position: GeoPosition | null;
  /** Last known location at the moment this runner was tagged. */
  caughtAt: GeoPosition | null;
}

export interface ActionResult {
  changed: boolean;
  error?: string;
  tag?: TagResult;
  /** The acting player left and must be detached from their socket. */
  left?: boolean;
  /** No players remain, the lobby can be discarded. */
  empty?: boolean;
  /** A player was removed by the host and their socket must be closed. */
  kickedPlayerId?: string;
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
  private revealEndsAt = 0;
  private startedAt = 0;
  private endsAt = 0;
  private nextPingAt = 0;
  private lastPingAt = 0;
  private pingExpiresAt = 0;
  private pingCount = 0;
  private pingPositions = new Map<string, GeoPosition>();
  private hunterPingPositions = new Map<string, GeoPosition>();
  /** Arena anchor captured at deploy time; null until a player has a fix. */
  center: LatLng | null = null;
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
      position: null,
      caughtAt: null,
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
    // Late arrivals during the reveal are dealt straight into the round.
    if (this.phase === "reveal") {
      player.role = this.openRole();
      player.status = "active";
      player.caughtAt = null;
      player.ready = true;
    }
    return player;
  }

  /** Smaller team, coin-flip when the teams are even. */
  private openRole(): Role {
    const hunters = this.countRole("hunter");
    const runners = this.countRole("runner");
    if (hunters === runners) return Math.random() < 0.5 ? "hunter" : "runner";
    return hunters < runners ? "hunter" : "runner";
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

    if (this.phase === "reveal" && now >= this.revealEndsAt) {
      this.beginPrep(now);
      changed = true;
    }

    if (this.phase === "prep" && now >= this.prepEndsAt) {
      this.beginActive(now);
      changed = true;
    }

    if (this.phase === "active") {
      if (now >= this.endsAt) {
        this.finish("runners");
        changed = true;
      } else if (now >= this.nextPingAt) {
        this.recordPing(now);
        changed = true;
      }
    }

    return changed;
  }

  /** Deploy: hold the roster for a synchronized role reveal before prep. */
  private beginReveal(now: number): void {
    this.phase = "reveal";
    this.resultWinner = null;
    if (!this.center) this.center = this.anchorFromPlayers();
    this.revealEndsAt = now + REVEAL_SEC * 1000;
    if (REVEAL_SEC <= 0) this.beginPrep(now);
  }

  private beginPrep(now: number): void {
    this.phase = "prep";
    this.resultWinner = null;
    if (!this.center) this.center = this.anchorFromPlayers();
    this.prepEndsAt = now + Math.max(0, this.settings.prepSec) * 1000;
    if (this.settings.prepSec <= 0) this.beginActive(now);
  }

  private beginActive(now: number): void {
    this.phase = "active";
    this.startedAt = now;
    this.endsAt = now + Math.max(1, this.settings.durationSec) * 1000;
    this.nextPingAt = now + Math.max(1, this.settings.pingSec) * 1000;
    this.lastPingAt = 0;
    this.pingExpiresAt = 0;
    this.pingCount = 0;
    this.pingPositions.clear();
    this.hunterPingPositions.clear();
    if (!this.center) this.center = this.anchorFromPlayers();
    for (const player of this.players.values()) {
      player.status = "active";
      player.caughtAt = null;
      player.ready = true;
    }
  }

  /**
   * Capture every active runner's fix at ping time for hunters, and every
   * hunter's fix for runners. Both sides see a frozen snapshot for the ping
   * window, so the intel is symmetrical.
   */
  private recordPing(now: number): void {
    this.pingCount += 1;
    this.lastPingAt = now;
    this.pingExpiresAt = now + 10_000;
    this.nextPingAt = now + Math.max(1, this.settings.pingSec) * 1000;
    this.pingPositions.clear();
    this.hunterPingPositions.clear();
    for (const player of this.players.values()) {
      if (!player.position) continue;
      if (player.role === "runner" && player.status === "active") {
        this.pingPositions.set(player.id, { ...player.position });
      } else if (player.role === "hunter") {
        this.hunterPingPositions.set(player.id, { ...player.position });
      }
    }
  }

  /** Host location first, then any other player who has already shared a fix. */
  private anchorFromPlayers(): LatLng | null {
    const hostPosition = this.host?.position;
    if (hostPosition) {
      return { lat: hostPosition.lat, lng: hostPosition.lng };
    }
    for (const player of this.players.values()) {
      if (player.position) {
        return { lat: player.position.lat, lng: player.position.lng };
      }
    }
    return null;
  }

  private finish(winner: Winner): void {
    this.phase = "ended";
    this.resultWinner = winner;
    this.pingExpiresAt = 0;
    this.pingPositions.clear();
    this.hunterPingPositions.clear();
    if (winner === "hunters") {
      for (const player of this.players.values()) {
        if (player.role === "runner") player.status = "caught";
      }
    }
  }

  /** Host restart: return the finished lobby to a fresh briefing room. */
  private resetToLobby(): void {
    this.phase = "lobby";
    this.resultWinner = null;
    this.prepEndsAt = 0;
    this.revealEndsAt = 0;
    this.startedAt = 0;
    this.endsAt = 0;
    this.nextPingAt = 0;
    this.lastPingAt = 0;
    this.pingExpiresAt = 0;
    this.pingCount = 0;
    this.pingPositions.clear();
    this.hunterPingPositions.clear();
    this.center = null;
    for (const player of this.players.values()) {
      player.status = "active";
      player.caughtAt = null;
      player.ready = false;
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
        target.caughtAt = null;
        return { changed: true };
      }

      case "randomizeTeams": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "lobby") {
          return { changed: false, error: "Teams are locked once prep begins." };
        }
        if (this.players.size < 2) {
          return {
            changed: false,
            error: "Add at least 2 players before deploying.",
          };
        }
        this.assignRandomTeams();
        this.beginReveal(Date.now());
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
        this.beginReveal(Date.now());
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
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "active") {
          return { changed: false, error: "Pings only fire during an active round." };
        }
        this.recordPing(Date.now());
        return { changed: true };
      }

      case "updateLocation": {
        const lat = Number(message.lat);
        const lng = Number(message.lng);
        const accuracyM = Number(message.accuracyM);
        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !Number.isFinite(accuracyM) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          return { changed: false, error: "Invalid location fix." };
        }
        player.position = {
          lat,
          lng,
          accuracyM: clamp(accuracyM, 0, 5000),
          at: Date.now(),
        };
        if (
          !this.center &&
          (this.phase === "reveal" ||
            this.phase === "prep" ||
            this.phase === "active")
        ) {
          this.center = { lat, lng };
        }
        return { changed: false };
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
        const spot = target.position ?? player.position;
        target.status = "caught";
        target.caughtAt = spot ? { ...spot, at: Date.now() } : null;
        this.pingPositions.delete(target.id);
        // The last live signal just went dark: the hunt is over immediately so
        // non-host hunters never need an end-round control.
        const stillRunning = runners.some((runner) => runner.id !== target.id);
        if (!stillRunning) this.finish("hunters");
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
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase === "ended") return { changed: false };
        if (message.winner !== "hunters" && message.winner !== "runners") {
          return { changed: false, error: "Unknown winner." };
        }
        this.finish(message.winner);
        return { changed: true };
      }

      case "kickPlayer": {
        const denied = hostOnly();
        if (denied) return denied;
        if (message.playerId === player.id) {
          return { changed: false, error: "You cannot remove yourself." };
        }
        const target = this.players.get(message.playerId);
        if (!target) return { changed: false, error: "Player not found." };
        this.players.delete(target.id);
        this.pingPositions.delete(target.id);
        this.hunterPingPositions.delete(target.id);
        if (this.phase === "active") {
          const activeRunners = [...this.players.values()].filter(
            (candidate) =>
              candidate.role === "runner" && candidate.status === "active",
          );
          if (activeRunners.length === 0) this.finish("hunters");
        }
        return { changed: true, kickedPlayerId: target.id };
      }

      case "rematch": {
        const denied = hostOnly();
        if (denied) return denied;
        if (this.phase !== "ended") {
          return { changed: false, error: "Only a finished round can restart." };
        }
        this.resetToLobby();
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
      player.caughtAt = null;
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

    const viewer = this.players.get(viewerId);
    const viewerRole: Role = viewer?.role ?? "unassigned";
    const started = this.phase !== "lobby";
    const pingOpen = this.phase === "active" && this.pingExpiresAt > now;

    /**
     * Location visibility is decided per viewer:
     * - you always see yourself;
     * - hunters see their own team and runners only inside a ping window;
     * - runners see their squad and hunters inside a ping window, or at all
     *   times when the host enables all-hunter intel;
     * - caught runners and unassigned players never share a location.
     */
    const visiblePosition = (player: LobbyPlayer): GeoPosition | undefined => {
      if (!player.position) return undefined;
      if (player.id === viewerId) return player.position;
      if (!started || player.status === "caught") return undefined;

      if (viewerRole === "hunter") {
        if (player.role === "hunter") {
          return this.settings.showHunterTeammates ? player.position : undefined;
        }
        if (player.role === "runner" && pingOpen) {
          return this.pingPositions.get(player.id);
        }
        return undefined;
      }

      if (viewerRole === "runner") {
        if (player.role === "runner") return player.position;
        if (player.role === "hunter") {
          if (this.settings.showAllHuntersToRunners) return player.position;
          if (pingOpen) return this.hunterPingPositions.get(player.id);
        }
        return undefined;
      }

      return undefined;
    };

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
      position: visiblePosition(player),
    }));

    let nearestHunter: Snapshot["nearestHunter"] = null;
    if (
      viewerRole === "runner" &&
      viewer?.position &&
      !this.settings.showAllHuntersToRunners &&
      !pingOpen
    ) {
      let closest: LobbyPlayer | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of this.players.values()) {
        if (candidate.role !== "hunter" || !candidate.position) continue;
        const distance = distanceMeters(viewer.position, candidate.position);
        if (distance < closestDistance) {
          closest = candidate;
          closestDistance = distance;
        }
      }
      if (closest?.position) {
        nearestHunter = {
          bearing: bearingDegrees(viewer.position, closest.position),
          distanceM: Math.round(closestDistance),
          updatedAt: closest.position.at,
        };
      }
    }

    const caughtSpots: CaughtSpot[] = started
      ? [...this.players.values()]
          .filter((player) => player.status === "caught" && player.caughtAt)
          .map((player) => ({
            id: player.id,
            name: player.name,
            lat: player.caughtAt!.lat,
            lng: player.caughtAt!.lng,
            accuracyM: player.caughtAt!.accuracyM,
            at: player.caughtAt!.at,
          }))
          .sort((a, b) => a.at - b.at)
      : [];

    return {
      code: this.code,
      phase,
      hostId: this.hostId,
      settings: { ...this.settings },
      players,
      youId: viewerId,
      timeLeftSec,
      revealRemainingSec:
        phase === "reveal"
          ? Math.max(0, Math.ceil((this.revealEndsAt - now) / 1000))
          : 0,
      prepRemainingSec:
        phase === "prep"
          ? Math.max(0, Math.ceil((this.prepEndsAt - now) / 1000))
          : 0,
      nextPingSec,
      lastPingAgo,
      pingCount: this.pingCount,
      pingExpiresInMs: Math.max(0, this.pingExpiresAt - now),
      resultWinner: this.resultWinner,
      center: this.center ? { ...this.center } : null,
      nearestHunter,
      caughtSpots,
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

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
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
