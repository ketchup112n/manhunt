import { test } from "node:test";
import assert from "node:assert/strict";

import { Lobby, createLobbyCode, normalizeName, sanitizeSettings } from "./lobby.ts";
import { DEFAULT_SETTINGS } from "./types.ts";

function lobbyWithPlayers(count = 3): { lobby: Lobby; hostId: string } {
  const lobby = new Lobby({
    code: "ABC123",
    hostName: "ECHO",
    settings: { ...DEFAULT_SETTINGS, prepSec: 0 },
  });
  const host = lobby.host!;
  lobby.addBots(count);
  for (const player of lobby.players.values()) {
    if (player.isBot) player.role = "runner";
  }
  lobby.handle(host.id, { type: "assignRole", playerId: host.id, role: "hunter" });
  return { lobby, hostId: host.id };
}

test("a new lobby starts with only the host, unassigned", () => {
  const lobby = new Lobby({ code: "ABC123", hostName: "echo" });

  assert.equal(lobby.players.size, 1);
  const host = lobby.host!;
  assert.equal(host.name, "ECHO");
  assert.equal(host.role, "unassigned");
  assert.equal(host.isHost, true);
  assert.equal(lobby.phase, "lobby");
});

test("starting requires both teams and every player assigned", () => {
  const lobby = new Lobby({
    code: "ABC123",
    hostName: "ECHO",
    settings: { ...DEFAULT_SETTINGS, prepSec: 0 },
  });
  const host = lobby.host!;

  const noTeams = lobby.handle(host.id, { type: "start" });
  assert.equal(noTeams.error, "Assign at least one hunter and one runner.");

  lobby.addBots(2);
  for (const player of lobby.players.values()) {
    if (player.isBot) player.role = "runner";
  }
  lobby.handle(host.id, {
    type: "assignRole",
    playerId: host.id,
    role: "hunter",
  });

  const guest = lobby.addPlayer("ROOK");
  assert.ok("id" in guest);
  const stillUnassigned = lobby.handle(host.id, { type: "start" });
  assert.match(stillUnassigned.error ?? "", /still unassigned/);

  lobby.handle(host.id, {
    type: "assignRole",
    playerId: guest.id,
    role: "runner",
  });
  const started = lobby.handle(host.id, { type: "start" });
  assert.equal(started.error, undefined);
  assert.equal(lobby.phase, "active");
});

test("only the host can change rules or assign teams", () => {
  const { lobby } = lobbyWithPlayers();
  const guest = [...lobby.players.values()].find((player) => !player.isHost)!;

  const rules = lobby.handle(guest.id, {
    type: "updateSettings",
    settings: { pingSec: 10 },
  });
  assert.equal(rules.error, "Only the host can do that.");

  const teams = lobby.handle(guest.id, {
    type: "assignRole",
    playerId: guest.id,
    role: "hunter",
  });
  assert.equal(teams.error, "Only the host can do that.");
});

test("hunters tag active runners by their private PIN", () => {
  const { lobby, hostId } = lobbyWithPlayers();
  lobby.handle(hostId, { type: "start" });
  assert.equal(lobby.phase, "active");

  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;
  const snapshot = lobby.snapshotFor(hostId, true);
  const visible = snapshot.players.find((player) => player.id === runner.id);
  assert.equal(visible?.tagCode, runner.tagCode);

  const invalid = lobby.handle(hostId, { type: "submitTag", code: "0000" });
  assert.deepEqual(invalid.tag, { result: "invalid" });

  const success = lobby.handle(hostId, {
    type: "submitTag",
    code: runner.tagCode,
  });
  assert.equal(success.tag?.result, "success");
  assert.equal(runner.status, "caught");
});

test("PINs are hidden from other players when dev mode is off", () => {
  const { lobby, hostId } = lobbyWithPlayers();
  const guest = [...lobby.players.values()].find((player) => !player.isHost)!;
  const snapshot = lobby.snapshotFor(guest.id, false);

  for (const player of snapshot.players) {
    if (player.id === guest.id) {
      assert.equal(player.tagCode, guest.tagCode);
    } else {
      assert.equal(player.tagCode, undefined);
    }
  }

  const own = lobby.snapshotFor(hostId, false);
  assert.equal(
    own.players.find((player) => player.id === hostId)?.tagCode,
    lobby.host?.tagCode,
  );
});

test("filling and removing bots respects the player limit", () => {
  const lobby = new Lobby({
    code: "ABC123",
    hostName: "ECHO",
    settings: { ...DEFAULT_SETTINGS, maxPlayers: 5 },
  });

  assert.equal(lobby.addBots(10), 4);
  assert.equal(lobby.players.size, 5);
  assert.equal(lobby.removeBots(), 4);
  assert.equal(lobby.players.size, 1);
});

test("a leaving host hands the lobby to another human", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);

  const result = lobby.handle(hostId, { type: "leave" });
  assert.equal(result.left, true);
  assert.equal(lobby.host?.name, "WREN");
});

test("settings are clamped into supported ranges", () => {
  const settings = sanitizeSettings({
    ...DEFAULT_SETTINGS,
    durationSec: -50,
    maxPlayers: 500,
    pingSec: 0,
  });

  assert.equal(settings.durationSec, 30);
  assert.equal(settings.maxPlayers, 50);
  assert.equal(settings.pingSec, 1);
});

test("names and codes are normalized", () => {
  assert.equal(normalizeName("  echo!! "), "ECHO");
  assert.equal(normalizeName(""), "PLAYER");
  const code = createLobbyCode(new Set(["AAAAAA"]));
  assert.match(code, /^[A-Z0-9]{6}$/);
  assert.notEqual(code, "AAAAAA");
});

function movePlayer(
  lobby: Lobby,
  playerId: string,
  lat: number,
  lng: number,
  accuracyM = 8,
) {
  return lobby.handle(playerId, {
    type: "updateLocation",
    lat,
    lng,
    accuracyM,
  });
}

test("location fixes are validated, clamped, and private", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const guest = lobby.addPlayer("ROOK");
  assert.ok("id" in guest);

  const invalid = movePlayer(lobby, hostId, 120, 0);
  assert.equal(invalid.error, "Invalid location fix.");

  const valid = movePlayer(lobby, hostId, 40.7, -74, 9000);
  assert.equal(valid.error, undefined);
  assert.equal(lobby.host?.position?.accuracyM, 5000);
  assert.equal(lobby.host?.position?.lat, 40.7);

  const ownSnapshot = lobby.snapshotFor(hostId, false);
  assert.ok(
    ownSnapshot.players.find((player) => player.id === hostId)?.position,
  );

  const guestSnapshot = lobby.snapshotFor(guest.id, false);
  assert.equal(
    guestSnapshot.players.find((player) => player.id === hostId)?.position,
    undefined,
  );
});

test("the arena center anchors from the host, then the first fix", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;

  movePlayer(lobby, runner.id, 10, 10);
  assert.equal(lobby.center, null);

  movePlayer(lobby, hostId, 40.71, -74);
  lobby.handle(hostId, { type: "start" });
  assert.deepEqual(lobby.center, { lat: 40.71, lng: -74 });

  const fallback = lobbyWithPlayers(1);
  const fallbackRunner = [...fallback.lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;
  fallback.lobby.handle(fallback.hostId, { type: "start" });
  assert.equal(fallback.lobby.center, null);

  movePlayer(fallback.lobby, fallbackRunner.id, 51.5, -0.12);
  assert.deepEqual(fallback.lobby.center, { lat: 51.5, lng: -0.12 });
});

test("hunters see runners only during a ping window, frozen at ping time", () => {
  const { lobby, hostId } = lobbyWithPlayers(2);
  const runners = [...lobby.players.values()].filter(
    (player) => player.role === "runner",
  );
  lobby.handle(hostId, { type: "start" });

  runners.forEach((runner, index) => {
    movePlayer(lobby, runner.id, 40.7 + index * 0.001, -74);
  });

  const hidden = lobby.snapshotFor(hostId, false);
  assert.equal(
    hidden.players.find((player) => player.id === runners[0].id)?.position,
    undefined,
  );

  lobby.handle(hostId, { type: "ping" });
  const pinged = lobby.snapshotFor(hostId, false);
  const frozen = pinged.players.find(
    (player) => player.id === runners[0].id,
  )?.position;
  assert.equal(frozen?.lat, 40.7);

  movePlayer(lobby, runners[0].id, 41, -75);
  const stillFrozen = lobby.snapshotFor(hostId, false);
  assert.equal(
    stillFrozen.players.find((player) => player.id === runners[0].id)?.position
      ?.lat,
    40.7,
  );

  const tag = lobby.handle(hostId, {
    type: "submitTag",
    code: runners[0].tagCode,
  });
  assert.equal(tag.tag?.result, "success");
  const caught = lobby.snapshotFor(hostId, false);
  assert.equal(
    caught.players.find((player) => player.id === runners[0].id)?.position,
    undefined,
  );
});

test("runners see their squad and the nearest hunter bearing", () => {
  const { lobby, hostId } = lobbyWithPlayers(2);
  const runners = [...lobby.players.values()].filter(
    (player) => player.role === "runner",
  );
  movePlayer(lobby, hostId, 40.7, -74);
  movePlayer(lobby, runners[0].id, 40.7005, -74);
  movePlayer(lobby, runners[1].id, 40.702, -74);
  lobby.handle(hostId, { type: "start" });

  const snapshot = lobby.snapshotFor(runners[0].id, false);
  const byId = new Map(snapshot.players.map((player) => [player.id, player]));

  assert.ok(byId.get(runners[0].id)?.position);
  assert.ok(byId.get(runners[1].id)?.position);
  assert.equal(byId.get(hostId)?.position, undefined);
  assert.ok(snapshot.nearestHunter);
  assert.ok(snapshot.nearestHunter.distanceM > 40);
  assert.ok(snapshot.nearestHunter.distanceM < 70);
});

test("all-hunter intel reveals hunter positions and hides the nearest hint", () => {
  const lobby = new Lobby({
    code: "XYZ123",
    hostName: "ECHO",
    settings: {
      ...DEFAULT_SETTINGS,
      prepSec: 0,
      showAllHuntersToRunners: true,
    },
  });
  const host = lobby.host!;
  const guest = lobby.addPlayer("ROOK");
  assert.ok("id" in guest);
  lobby.handle(host.id, {
    type: "assignRole",
    playerId: guest.id,
    role: "runner",
  });
  lobby.handle(host.id, {
    type: "assignRole",
    playerId: host.id,
    role: "hunter",
  });

  movePlayer(lobby, host.id, 40.7, -74);
  movePlayer(lobby, guest.id, 40.701, -74);
  lobby.handle(host.id, { type: "start" });

  const snapshot = lobby.snapshotFor(guest.id, false);
  const hostPosition = snapshot.players.find(
    (player) => player.id === host.id,
  )?.position;
  assert.ok(hostPosition);
  assert.equal(snapshot.nearestHunter, null);
});
