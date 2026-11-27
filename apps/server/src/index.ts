import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { Lobby, createLobbyCode, normalizeName } from "./lobby.ts";
import type {
  ClientMessage,
  GameSettings,
  ServerMessage,
  Session,
} from "./types.ts";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const DEV_PINS =
  process.env.MANHUNT_DEV_PINS === "true" &&
  process.env.NODE_ENV !== "production";
const WEB_DIST = resolve(
  fileURLToPath(new URL("../../web/dist", import.meta.url)),
);
const LOBBY_IDLE_MS = 6 * 60 * 60 * 1000;

const lobbies = new Map<string, Lobby>();
const lastActivity = new Map<string, number>();

/**
 * Lightweight presence tracking for the "N online" label. Each open tab sends
 * a heartbeat with a random id; ids expire after PRESENCE_TTL_MS. Only a
 * timestamp is stored, so no personal data is kept.
 */
const PRESENCE_TTL_MS = 40_000;
const presence = new Map<string, number>();

function prunePresence(now = Date.now()): void {
  for (const [id, seenAt] of presence) {
    if (now - seenAt > PRESENCE_TTL_MS) presence.delete(id);
  }
}

interface SocketContext {
  lobby: Lobby;
  playerId: string;
  alive: boolean;
  /** Last viewer signature sent; used for delta detection. */
  lastSignature: string | null;
  /** Last full snapshot sequence number sent. */
  lastSnapshotSeq: number;
}

const sockets = new Map<WebSocket, SocketContext>();

function touch(lobby: Lobby): void {
  lastActivity.set(lobby.code, Date.now());
}

function json(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  response.end(payload);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 64 * 1024) throw new Error("Request body too large.");
    chunks.push(buffer);
  }
  if (bytes === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function snapshotMessage(lobby: Lobby, playerId: string): ServerMessage {
  return {
    type: "state",
    state: lobby.snapshotFor(playerId, DEV_PINS),
  };
}

function tickMessage(lobby: Lobby): ServerMessage {
  const now = Date.now();
  const { timeLeftSec, nextPingSec, revealRemainingSec, prepRemainingSec, pingCount } = lobby.getTickData(now);

  return {
    type: "tick",
    timeLeftSec,
    nextPingSec,
    revealRemainingSec,
    prepRemainingSec,
    pingCount,
  };
}

function sendState(socket: WebSocket, context: SocketContext): void {
  send(socket, snapshotMessage(context.lobby, context.playerId));
  context.lastSnapshotSeq = context.lobby.getSnapshotSeq();
  context.lastSignature = context.lobby.getViewerSignature(context.playerId, DEV_PINS);
}

function sendTick(socket: WebSocket, context: SocketContext): void {
  send(socket, tickMessage(context.lobby));
}

/** Broadcast full snapshots only to viewers whose relevant data changed. */
function broadcast(lobby: Lobby): void {
  for (const [socket, context] of sockets) {
    if (context.lobby !== lobby) continue;
    const currentSig = lobby.getViewerSignature(context.playerId, DEV_PINS);
    const seqChanged = context.lastSnapshotSeq !== lobby.getSnapshotSeq();

    // Always send full snapshot on first connect or when sequence changed (structural change)
    if (context.lastSignature === null || seqChanged) {
      sendState(socket, context);
    } else if (currentSig !== context.lastSignature) {
      // Viewer-relevant data changed
      sendState(socket, context);
    }
    // Else: no change for this viewer, skip sending
  }
}

/** Lightweight tick broadcast for countdown phases (reveal/prep). */
function broadcastTick(lobby: Lobby): void {
  for (const [socket, context] of sockets) {
    if (context.lobby !== lobby) continue;
    sendTick(socket, context);
  }
}

function validateCode(raw: unknown): string | null {
  const code = String(raw ?? "").toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    });
    response.end();
    return true;
  }

  if (url.pathname === "/api/health") {
    json(response, 200, {
      ok: true,
      lobbies: lobbies.size,
      players: [...lobbies.values()].reduce(
        (total, lobby) => total + lobby.players.size,
        0,
      ),
    });
    return true;
  }

  if (url.pathname === "/api/presence") {
    const now = Date.now();
    if (request.method === "POST") {
      const body = (await readJson(request)) as {
        id?: unknown;
        leave?: unknown;
      };
      const id = String(body.id ?? "").trim().slice(0, 64);
      if (!id) {
        json(response, 400, { error: "A presence id is required." });
        return true;
      }
      if (body.leave === true) {
        presence.delete(id);
      } else {
        presence.set(id, now);
      }
    }
    prunePresence(now);
    json(response, 200, { online: presence.size });
    return true;
  }

  if (url.pathname === "/api/lobbies" && request.method === "POST") {
    const body = (await readJson(request)) as {
      name?: string;
      settings?: Partial<GameSettings>;
      center?: { lat?: number; lng?: number } | null;
    };
    const name = normalizeName(body.name ?? "");
    if (!body.name || !String(body.name).trim()) {
      json(response, 400, { error: "A display name is required." });
      return true;
    }
    if (lobbies.size >= 5000) {
      json(response, 503, { error: "Lobby capacity reached. Try again later." });
      return true;
    }
    const centerLat = Number(body.center?.lat);
    const centerLng = Number(body.center?.lng);
    const center =
      Number.isFinite(centerLat) &&
      Number.isFinite(centerLng) &&
      centerLat >= -90 &&
      centerLat <= 90 &&
      centerLng >= -180 &&
      centerLng <= 180
        ? { lat: centerLat, lng: centerLng }
        : null;
    const code = createLobbyCode(new Set(lobbies.keys()));
    const lobby = new Lobby({
      code,
      hostName: name,
      settings: body.settings,
      center,
    });
    lobbies.set(code, lobby);
    touch(lobby);
    const host = lobby.host;
    if (!host) {
      json(response, 500, { error: "Could not create the lobby." });
      return true;
    }
    const session: Session = { code, playerId: host.id, token: host.token };
    json(response, 201, session);
    return true;
  }

  const joinMatch = url.pathname.match(/^\/api\/lobbies\/([A-Za-z0-9]{6})\/join$/);
  if (joinMatch && request.method === "POST") {
    const code = joinMatch[1].toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby) {
      json(response, 404, { error: "No lobby found with that code." });
      return true;
    }
    const body = (await readJson(request)) as { name?: string };
    if (!body.name || !String(body.name).trim()) {
      json(response, 400, { error: "A display name is required." });
      return true;
    }
    const player = lobby.addPlayer(body.name);
    if ("error" in player) {
      json(response, 409, { error: player.error });
      return true;
    }
    touch(lobby);
    broadcast(lobby);
    const session: Session = {
      code,
      playerId: player.id,
      token: player.token,
    };
    json(response, 201, session);
    return true;
  }

  const infoMatch = url.pathname.match(/^\/api\/lobbies\/([A-Za-z0-9]{6})$/);
  if (infoMatch && request.method === "GET") {
    const lobby = lobbies.get(infoMatch[1].toUpperCase());
    if (!lobby) {
      json(response, 404, { error: "No lobby found with that code." });
      return true;
    }
    json(response, 200, {
      code: lobby.code,
      phase: lobby.phase,
      players: lobby.players.size,
      maxPlayers: lobby.settings.maxPlayers,
      allowLateJoin: lobby.settings.allowLateJoin,
    });
    return true;
  }

  return false;
}

const server = createServer((request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );

  if (url.pathname.startsWith("/api/")) {
    void handleApi(request, response, url).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unexpected server error.";
      json(response, 400, { error: message });
    });
    return;
  }

  serveStatic(url.pathname, response);
});

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function serveStatic(pathname: string, response: ServerResponse): void {
  if (!existsSync(WEB_DIST)) {
    json(response, 200, {
      ok: true,
      message:
        "MANHUNT server is running. Build the web app with `npm run build`, or use `npm run dev` for the Vite dev server.",
    });
    return;
  }

  const relative = normalize(decodeURIComponent(pathname)).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  let file = join(WEB_DIST, relative);
  if (!file.startsWith(WEB_DIST)) file = join(WEB_DIST, "index.html");

  if (!existsSync(file) || !statSync(file).isFile()) {
    file = join(WEB_DIST, "index.html");
  }
  if (!existsSync(file)) {
    json(response, 404, { error: "Not found." });
    return;
  }

  const ext = extname(file).toLowerCase();
  // Vite emits content-hashed filenames under /assets, so they can be cached
  // forever. Anything else (favicon, og-image, manifest) gets a shorter TTL.
  const hashedAsset =
    relative.startsWith("/assets/") || relative.startsWith("assets/");
  const cacheControl =
    ext === ".html"
      ? "no-cache"
      : hashedAsset
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400";
  response.writeHead(200, {
    "content-type": MIME[ext] ?? "application/octet-stream",
    "cache-control": cacheControl,
    // Let Cloudflare cache at the edge even when the zone's default rules are
    // conservative; harmless if the zone already caches.
    "cloudflare-cdn-cache-control": ext === ".html" ? "no-cache" : cacheControl,
  });
  createReadStream(file).pipe(response);
}

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  if (url.pathname !== "/ws") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const code = validateCode(url.searchParams.get("code"));
  const token = url.searchParams.get("token") ?? "";
  const lobby = code ? lobbies.get(code) : undefined;
  const player = lobby?.findByToken(token);
  if (!lobby || !player) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (websocket) => {
    wss.emit("connection", websocket, request);
  });
});

wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  const code = validateCode(url.searchParams.get("code"));
  const token = url.searchParams.get("token") ?? "";
  const lobby = code ? lobbies.get(code) : undefined;
  const player = lobby?.findByToken(token);
  if (!lobby || !player) {
    socket.close(4001, "Lobby or session not found");
    return;
  }

  const context: SocketContext = {
    lobby,
    playerId: player.id,
    alive: true,
    lastSignature: null,
    lastSnapshotSeq: 0,
  };
  sockets.set(socket, context);
  lobby.setConnected(player.id, true);
  touch(lobby);

  socket.on("pong", () => {
    context.alive = true;
  });

  socket.on("message", (data) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      send(socket, { type: "error", message: "Malformed message." });
      return;
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { type?: unknown }).type !== "string"
    ) {
      send(socket, { type: "error", message: "Malformed message." });
      return;
    }

    const result = lobby.handle(player.id, parsed as ClientMessage);
    touch(lobby);
    if (result.tag) {
      send(socket, { type: "tagResult", tag: result.tag });
    }
    if (result.error) {
      send(socket, { type: "error", message: result.error });
    }
    if (result.kickedPlayerId) {
      for (const [peer, peerContext] of sockets) {
        if (
          peerContext.lobby !== lobby ||
          peerContext.playerId !== result.kickedPlayerId
        ) {
          continue;
        }
        send(peer, {
          type: "error",
          message: "The host removed you from the lobby.",
        });
        peer.close(4003, "Removed by host");
        sockets.delete(peer);
      }
    }
    if (result.left) {
      lobby.setConnected(player.id, false);
    }
    if (result.changed || result.left) broadcast(lobby);

    if (result.empty) {
      lobbies.delete(lobby.code);
      lastActivity.delete(lobby.code);
    }
    if (result.left) {
      socket.close(1000, "Left lobby");
    }
  });

  socket.on("close", () => {
    sockets.delete(socket);
    if (lobby.players.has(player.id)) {
      lobby.setConnected(player.id, false);
      broadcast(lobby);
    }
  });

  sendState(socket, context);
  broadcast(lobby);
});

const ticker = setInterval(() => {
  const now = Date.now();
  for (const [code, lobby] of lobbies) {
    const changed = lobby.tick(now);

    if (lobby.phase === "active") {
      // Active phase: full broadcast with delta detection on every tick when state changes
      if (changed) {
        broadcast(lobby);
      }
    } else if (lobby.phase === "reveal" || lobby.phase === "prep") {
      // Reveal/prep phases: lightweight tick broadcast every second for countdowns
      // Full broadcast only when structural changes occur (phase transitions)
      if (changed) {
        broadcast(lobby);
      } else {
        broadcastTick(lobby);
      }
    } else if (changed) {
      // Lobby phase: only broadcast on actual changes
      broadcast(lobby);
    }

    if (lobby.empty) {
      lobbies.delete(code);
      lastActivity.delete(code);
    }
  }

  for (const [socket, context] of sockets) {
    if (!context.alive) {
      socket.terminate();
      sockets.delete(socket);
      continue;
    }
    context.alive = false;
    socket.ping();
  }

  const idleBefore = now - LOBBY_IDLE_MS;
  for (const [code] of lobbies) {
    if ((lastActivity.get(code) ?? now) < idleBefore) {
      lobbies.delete(code);
      lastActivity.delete(code);
    }
  }

  prunePresence(now);
}, 1000);

server.listen(PORT, HOST, () => {
  const display = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`MANHUNT server listening on http://${display}:${PORT}`);
  console.log(
    DEV_PINS
      ? "Dev mode: debug PINs are included in snapshots."
      : "Production mode: runner PINs are private.",
  );
  if (existsSync(WEB_DIST)) {
    console.log(`Serving built web app from ${WEB_DIST}`);
  }
});

function shutdown(): void {
  clearInterval(ticker);
  for (const socket of sockets.keys()) socket.close(1001, "Server shutting down");
  server.close(() => process.exit(0));
  windowlessTimeout();
}

function windowlessTimeout(): void {
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
