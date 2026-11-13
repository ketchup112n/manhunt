import { test } from "node:test";
import assert from "node:assert/strict";

import {
  Lobby,
  REVEAL_SEC,
  createLobbyCode,
  normalizeName,
  sanitizeSettings,
} from "./lobby.ts";
import { DEFAULT_SETTINGS } from "./types.ts";

/** Start the round and skip past the synchronized reveal. */
function deploy(lobby: Lobby, hostId: string): void {
  lobby.handle(hostId, { type: "start" });
  lobby.tick(Date.now() + REVEAL_SEC * 1000 + 1);
}

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
  assert.equal(lobby.phase, "reveal");
  deploy(lobby, host.id);
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
  deploy(lobby, hostId);
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
  deploy(lobby, hostId);

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
  deploy(lobby, hostId);

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
  deploy(lobby, host.id);

  const snapshot = lobby.snapshotFor(guest.id, false);
  const hostPosition = snapshot.players.find(
    (player) => player.id === host.id,
  )?.position;
  assert.ok(hostPosition);
  assert.equal(snapshot.nearestHunter, null);
});

test("all-hunter intel can be enabled from the lobby rules", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;

  movePlayer(lobby, hostId, 40.7, -74);
  movePlayer(lobby, runner.id, 40.701, -74);

  const hidden = lobby.snapshotFor(runner.id, false);
  assert.equal(
    hidden.players.find((player) => player.id === hostId)?.position,
    undefined,
  );

  const update = lobby.handle(hostId, {
    type: "updateSettings",
    settings: { showAllHuntersToRunners: true },
  });
  assert.equal(update.error, undefined);
  deploy(lobby, hostId);

  const revealed = lobby.snapshotFor(runner.id, false);
  assert.ok(
    revealed.players.find((player) => player.id === hostId)?.position,
  );
  assert.equal(revealed.nearestHunter, null);
});

test("hunter team tracking controls hunter teammate positions", () => {
  function trackingLobby(tracking: boolean): {
    lobby: Lobby;
    hostId: string;
    teammateId: string;
  } {
    const lobby = new Lobby({
      code: "TEAM12",
      hostName: "ECHO",
      settings: { ...DEFAULT_SETTINGS, prepSec: 0 },
    });
    const host = lobby.host!;
    const teammate = lobby.addPlayer("SCOUT");
    const runner = lobby.addPlayer("ROOK");
    assert.ok("id" in teammate);
    assert.ok("id" in runner);

    lobby.handle(host.id, {
      type: "assignRole",
      playerId: host.id,
      role: "hunter",
    });
    lobby.handle(host.id, {
      type: "assignRole",
      playerId: teammate.id,
      role: "hunter",
    });
    lobby.handle(host.id, {
      type: "assignRole",
      playerId: runner.id,
      role: "runner",
    });
    lobby.handle(host.id, {
      type: "updateSettings",
      settings: { showHunterTeammates: tracking },
    });

    movePlayer(lobby, host.id, 40.7, -74);
    movePlayer(lobby, teammate.id, 40.701, -74);
    movePlayer(lobby, runner.id, 40.702, -74);
    deploy(lobby, host.id);

    return { lobby, hostId: host.id, teammateId: teammate.id };
  }

  const enabled = trackingLobby(true);
  assert.ok(
    enabled.lobby
      .snapshotFor(enabled.hostId, false)
      .players.find((player) => player.id === enabled.teammateId)?.position,
  );

  const disabled = trackingLobby(false);
  assert.equal(
    disabled.lobby
      .snapshotFor(disabled.hostId, false)
      .players.find((player) => player.id === disabled.teammateId)?.position,
    undefined,
  );
});


test("a tagged runner leaves a frozen catch marker and keeps a self-only fix", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;

  movePlayer(lobby, hostId, 40.7, -74);
  movePlayer(lobby, runner.id, 40.705, -74);
  deploy(lobby, hostId);

  const tag = lobby.handle(hostId, {
    type: "submitTag",
    code: runner.tagCode,
  });
  assert.equal(tag.tag?.result, "success");

  const hunterSnapshot = lobby.snapshotFor(hostId, false);
  assert.equal(
    hunterSnapshot.players.find((player) => player.id === runner.id)?.position,
    undefined,
  );
  assert.equal(hunterSnapshot.caughtSpots.length, 1);
  assert.equal(hunterSnapshot.caughtSpots[0].id, runner.id);
  assert.equal(hunterSnapshot.caughtSpots[0].lat, 40.705);

  const selfSnapshot = lobby.snapshotFor(runner.id, false);
  assert.equal(
    selfSnapshot.players.find((player) => player.id === runner.id)?.position
      ?.lat,
    40.705,
  );
  assert.equal(selfSnapshot.caughtSpots[0].lat, 40.705);

  movePlayer(lobby, runner.id, 40.8, -74);
  const movedHunterSnapshot = lobby.snapshotFor(hostId, false);
  assert.equal(movedHunterSnapshot.caughtSpots[0].lat, 40.705);
  assert.equal(
    movedHunterSnapshot.players.find((player) => player.id === runner.id)
      ?.position,
    undefined,
  );

  const movedSelfSnapshot = lobby.snapshotFor(runner.id, false);
  assert.equal(
    movedSelfSnapshot.players.find((player) => player.id === runner.id)
      ?.position?.lat,
    40.8,
  );
});

test("a catch marker falls back to the hunter's fix when the runner has none", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;

  movePlayer(lobby, hostId, 51.5, -0.12);
  deploy(lobby, hostId);
  lobby.handle(hostId, { type: "submitTag", code: runner.tagCode });

  const spot = lobby.snapshotFor(hostId, false).caughtSpots[0];
  assert.equal(spot.lat, 51.5);
  assert.equal(spot.lng, -0.12);
});

test("randomize teams deploys straight into the reveal", () => {
  const { lobby, hostId } = lobbyWithPlayers(3);

  const result = lobby.handle(hostId, { type: "randomizeTeams" });
  assert.equal(result.error, undefined);
  assert.equal(lobby.phase, "reveal");
  assert.equal(lobby.snapshotFor(hostId, false).revealRemainingSec, REVEAL_SEC);

  for (const player of lobby.players.values()) {
    assert.notEqual(player.role, "unassigned");
  }

  lobby.tick(Date.now() + REVEAL_SEC * 1000 + 1);
  assert.equal(lobby.phase, "active");
  assert.equal(lobby.snapshotFor(hostId, false).revealRemainingSec, 0);
});

test("the reveal hands over to the prep countdown", () => {
  const lobby = new Lobby({
    code: "PREP12",
    hostName: "ECHO",
    settings: { ...DEFAULT_SETTINGS, prepSec: 30 },
  });
  const host = lobby.host!;
  lobby.addBots(1);

  lobby.handle(host.id, { type: "randomizeTeams" });
  assert.equal(lobby.phase, "reveal");

  lobby.tick(Date.now() + REVEAL_SEC * 1000 + 1);
  assert.equal(lobby.phase, "prep");
  assert.ok(lobby.snapshotFor(host.id, false).prepRemainingSec > 0);
});

test("randomize teams needs at least two players", () => {
  const lobby = new Lobby({ code: "SOLO12", hostName: "ECHO" });
  const host = lobby.host!;

  const result = lobby.handle(host.id, { type: "randomizeTeams" });
  assert.match(result.error ?? "", /at least 2 players/);
  assert.equal(lobby.phase, "lobby");
});

test("late arrivals during the reveal are dealt a role", () => {
  const { lobby, hostId } = lobbyWithPlayers(3);
  lobby.handle(hostId, { type: "randomizeTeams" });

  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);
  assert.notEqual(guest.role, "unassigned");
  assert.equal(guest.status, "active");
});

test("only the host can end the round", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);
  lobby.handle(hostId, {
    type: "assignRole",
    playerId: guest.id,
    role: "hunter",
  });
  deploy(lobby, hostId);

  const denied = lobby.handle(guest.id, {
    type: "endGame",
    winner: "hunters",
  });
  assert.equal(denied.error, "Only the host can do that.");
  assert.equal(lobby.phase, "active");

  const allowed = lobby.handle(hostId, {
    type: "endGame",
    winner: "runners",
  });
  assert.equal(allowed.error, undefined);
  assert.equal(lobby.phase, "ended");
  assert.equal(lobby.resultWinner, "runners");
});

test("only the host can request a ping", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);
  lobby.handle(hostId, {
    type: "assignRole",
    playerId: guest.id,
    role: "hunter",
  });
  deploy(lobby, hostId);

  const before = lobby.snapshotFor(hostId, false).pingCount;
  const denied = lobby.handle(guest.id, { type: "ping" });
  assert.equal(denied.error, "Only the host can do that.");
  assert.equal(lobby.snapshotFor(hostId, false).pingCount, before);

  const allowed = lobby.handle(hostId, { type: "ping" });
  assert.equal(allowed.error, undefined);
  assert.equal(lobby.snapshotFor(hostId, false).pingCount, before + 1);
});

test("tagging the last runner finishes the round automatically", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);
  lobby.handle(hostId, {
    type: "assignRole",
    playerId: guest.id,
    role: "hunter",
  });
  deploy(lobby, hostId);

  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;
  const result = lobby.handle(guest.id, {
    type: "submitTag",
    code: runner.tagCode,
  });

  assert.equal(result.tag?.result, "success");
  assert.equal(lobby.phase, "ended");
  assert.equal(lobby.resultWinner, "hunters");
});

test("the host can kick a player but not themselves", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);

  const self = lobby.handle(hostId, {
    type: "kickPlayer",
    playerId: hostId,
  });
  assert.equal(self.error, "You cannot remove yourself.");

  const denied = lobby.handle(guest.id, {
    type: "kickPlayer",
    playerId: hostId,
  });
  assert.equal(denied.error, "Only the host can do that.");

  const kicked = lobby.handle(hostId, {
    type: "kickPlayer",
    playerId: guest.id,
  });
  assert.equal(kicked.error, undefined);
  assert.equal(kicked.kickedPlayerId, guest.id);
  assert.equal(lobby.players.has(guest.id), false);
});

test("kicking the last runner finishes an active round", () => {
  const { lobby, hostId } = lobbyWithPlayers(1);
  deploy(lobby, hostId);
  const runner = [...lobby.players.values()].find(
    (player) => player.role === "runner",
  )!;

  const kicked = lobby.handle(hostId, {
    type: "kickPlayer",
    playerId: runner.id,
  });

  assert.equal(kicked.kickedPlayerId, runner.id);
  assert.equal(lobby.phase, "ended");
  assert.equal(lobby.resultWinner, "hunters");
});

test("the host can restart a finished round into the lobby", () => {
  const { lobby, hostId } = lobbyWithPlayers(2);
  const guest = lobby.addPlayer("WREN");
  assert.ok("id" in guest);
  lobby.handle(hostId, {
    type: "assignRole",
    playerId: guest.id,
    role: "runner",
  });
  deploy(lobby, hostId);
  lobby.handle(hostId, { type: "endGame", winner: "runners" });
  assert.equal(lobby.phase, "ended");

  const denied = lobby.handle(guest.id, { type: "rematch" });
  assert.equal(denied.error, "Only the host can do that.");

  const restarted = lobby.handle(hostId, { type: "rematch" });
  assert.equal(restarted.error, undefined);
  assert.equal(lobby.phase, "lobby");
  assert.equal(lobby.resultWinner, null);
  assert.equal(lobby.snapshotFor(hostId, false).revealRemainingSec, 0);
  for (const player of lobby.players.values()) {
    assert.equal(player.status, "active");
    assert.equal(player.ready, false);
    assert.equal(player.caughtAt, null);
  }

  const tooEarly = lobby.handle(hostId, { type: "rematch" });
  assert.match(tooEarly.error ?? "", /finished round/);
});
