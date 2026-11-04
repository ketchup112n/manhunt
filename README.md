# MANHUNT

A mobile-first, realtime lobby for a real-world manhunt game. Hosts create a lobby, share a six-character code, assign players to teams, and deploy the round. Hunters receive periodic runner location pings and register catches with a runner-only PIN. Runners get a compass, a private tag code, and an optional shrinking play area.

Lobby state, timers, pings, and PIN validation live on a small WebSocket server, so players on different devices can join the same game. Locations and compass headings are still simulated; real geolocation and device sensors are not wired up yet.

## Quick start

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

`npm run dev` starts both processes:

- Web app: <http://localhost:5173>
- Realtime server: <http://localhost:8787>

The Vite dev server proxies `/api` and `/ws` to the backend. Open the site on a phone or another browser, create a lobby, and share the code.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API/WebSocket server and the Vite dev server together |
| `npm run dev:web` | Start only the Vite dev server |
| `npm run dev:server` | Start only the realtime server |
| `npm run build` | Type-check + build the web app, then type-check the server |
| `npm run start` | Serve the built web app and realtime API on port 8787 |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check both workspaces |
| `npm run test` | Run zone-schedule and lobby unit tests |
| `npm run preview` | Preview the production web build |

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `MANHUNT_DEV_PINS` | `false` | Include every runner PIN in snapshots for the dev console. `npm run dev` sets it to `true` |
| `NODE_ENV` | unset | `production` disables debug PINs even if the flag is set |

For a production build:

```bash
npm run build
NODE_ENV=production npm start
```

The server serves `apps/web/dist` and falls back to `index.html` for client routes.

### Test from other devices

The server binds to `0.0.0.0`, so phones on the same Wi-Fi can use your LAN IP directly. To test over the internet without deploying, expose the single server port with a Cloudflare quick tunnel:

```bash
npm run build
MANHUNT_DEV_PINS=true npm start            # terminal 1: app + API on :8787
cloudflared tunnel --url http://localhost:8787   # terminal 2
```

Open the printed `https://….trycloudflare.com` URL on each device and share the lobby code. WebSockets work over the tunnel without extra configuration.

Caveats:

- The tunnel only lives while `cloudflared` and the server are running, and your machine stays awake.
- Quick tunnel URLs change every time you restart the tunnel.
- `MANHUNT_DEV_PINS=true` exposes every runner PIN to the dev console, so only use it for testing.
- Lobbies are in memory; restarting the server clears them.

Cloudflare Pages can host the static build, but it cannot run the Node WebSocket server this app needs. Point Pages at a separately hosted server, or port the lobby to Workers + Durable Objects, before using it as a real deployment.

## Stack

- React 19 + React Router 7
- Vite 7 + TypeScript 5.9
- Tailwind CSS v4 design tokens with dark / daylight themes
- Zustand for client state and persisted preferences
- Node.js HTTP + `ws` for lobby state, timers, pings, and PIN validation
- Leaflet + react-leaflet with dark-filtered OpenStreetMap tiles
- Motion for transitions, lucide-react icons, qrcode.react for lobby invites

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing / entry |
| `/create` | Create a real lobby and configure rules |
| `/join` | Join with a lobby code |
| `/join/:code` | Join with a prefilled code |
| `/lobby/:code` | Host lobby, standby list, team assignment, invite QR, editable settings, prep |
| `/game/hunter` | Hunter map HUD, ping intel, PIN tag flow |
| `/game/runner` | Runner compass HUD, exposure status, private PIN, optional hunter map |
| `/game/spectator` | Spectator field view |
| `/results` | After-action report |
| `/settings` | Display, units, sound, haptics, motion |
| `*` | Not found |

## Multiplayer flow

1. The host opens **Create lobby**, picks a display name, reviews the rules, and presses **Create lobby**.
2. The server creates a six-character code and returns a private session token. The token is stored in `localStorage` so a reload reconnects the same player.
3. Players open **Join**, enter the code and a name. They appear under **Standby** until the host assigns them.
4. The host moves players between **Hunters** and **Runners** with the team buttons or drag-and-drop, or uses **Randomize teams**. Every player must be assigned before the round can start.
5. The host starts the operation. The server runs the prep countdown, then activates the round. Phones follow the server clock and route each player to the correct screen.
6. During the round, the server fires pings on schedule. Hunters see last-known runner positions for ten seconds after each ping.
7. A hunter asks a caught runner for their four-digit PIN and enters it. The server validates the PIN, marks the runner caught, and moves them to spectator mode.
8. The round ends when time expires, every runner is caught, or the host ends it early.

### Dev bots

The dev console (right-edge **Demo** tab, development builds only) can fill the lobby with bots for solo testing. Bots are assigned a balanced mix of hunters and runners, marked ready, and can be cleared again. The same panel reveals runner PINs and lets you jump between screens.

### Privacy

- The server sends a player's PIN only to that player.
- In development, `npm run dev` sets `MANHUNT_DEV_PINS=true`, so the demo console can show every PIN. The production `start` script leaves the flag off.
- Session tokens are bearer credentials for the socket; they are not passwords and are only stored locally.
- Teams and settings are host-controlled. The server rejects team changes, rule edits, and early endings from other players.

### Shrinking zone

When enabled, the play area behaves like a battle-royale circle. Each interval is split into a **hold** phase and a **contraction** phase:

- The boundary holds still for 80% of the interval, so runners get a warning window.
- It then contracts linearly to the next radius over the remaining 20%.
- The zone never drops below the configured final radius and stops moving once every contraction is complete.

The same schedule powers the settings summary, the lobby schedule warning, the map circles, the in-field zone chip/panel, and the unit tests in `apps/web/src/lib/zone.test.ts`. If the schedule would run past the end of the round, the host sees a warning before deploying.

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/lobbies` | Create a lobby: `{ name, settings }` → `{ code, playerId, token }` |
| `POST /api/lobbies/:code/join` | Join a lobby: `{ name }` → `{ code, playerId, token }` |
| `GET /api/lobbies/:code` | Lobby summary and player count |
| `GET /api/health` | Server health and lobby count |
| `WS /ws?code=...&token=...` | Realtime state and actions |

Every socket receives a tailored snapshot: lobby settings, player list, roles, connection state, countdowns, ping status, and the caller's own PIN. Client actions are sent as JSON messages (`assignRole`, `start`, `submitTag`, `fillBots`, and so on) and validated server-side.

## Project structure

```text
apps/
  server/
    src/
      index.ts      HTTP, WebSocket transport, static serving
      lobby.ts      lobby state machine, timers, PINs, bot fill
      lobby.test.ts server unit tests
      types.ts      shared wire protocol types
  web/
    src/
      components/   brand, game HUD, zone HUD, layout, UI primitives
      lib/          types, geo math, simulated positions, zone schedule, utilities
      pages/        route screens
      store/        Zustand realtime session and preferences
      styles/       tokens, themes, HUD textures, Leaflet styling
```

## Current limitations

- **No accounts or persistence.** Lobbies live in server memory and disappear after six idle hours or a server restart. A restart requires players to join again.
- **Simulated location and sensors.** Positions are deterministic offsets around a staging point and compass headings are simulated. No browser geolocation or orientation APIs are used.
- **No pressure testing.** One process, in-memory state, and no rate limiting; suitable for a friend-group game, not a public deployment.
- **Map tiles require network access.** Leaflet renders OpenStreetMap tiles with a CSS filter for the dark theme.
- **Basic resilience only.** The client reconnects with backoff, but the host keeps their role while offline and there is no host migration during a round.
- **Dev console is dev-only.** It is gated behind `import.meta.env.DEV` and absent from production builds.

## Next steps

- Geolocation ingestion with real ping positions
- Device orientation permissions and compass calibration
- Redis-backed rooms or a database for persistence across restarts
- Authentication, rate limiting, and host migration during a round
- Production map tile provider and offline/error states
- Accessibility and performance pass, including route-level code splitting
