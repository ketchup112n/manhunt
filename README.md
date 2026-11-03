# MANHUNT

A mobile-first, frontend-only prototype for a real-world manhunt game. Hosts configure the round, assign players to teams manually or at random, and choose whether runners can view all hunters on a map. Hunters receive periodic runner location pings and register catches with a runner-only code. Runners get a compass and private tag code.

This is still a UI prototype: players, locations, pings, tags, timers, and rooms are mock data. There is no backend, authentication, real geolocation, or realtime transport yet.

## Quick start

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server exposes the demo console in development builds only.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting |
| `npm run preview` | Preview the production build |

## Stack

- React 19 + React Router 7
- Vite 7 + TypeScript 5.9
- Tailwind CSS v4 design tokens with dark / daylight themes
- Zustand for mock game state and persisted preferences
- Leaflet + react-leaflet with dark-filtered OpenStreetMap tiles
- Motion for transitions, lucide-react icons, qrcode.react for lobby invites

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing / role entry |
| `/create` | Create lobby and configure rules |
| `/join` | Join with an operation code |
| `/join/:code` | Join with a prefilled code |
| `/lobby/:code` | Host lobby, teams, invite QR, editable settings, prep |
| `/game/hunter` | Hunter map HUD, ping intel, tag flow |
| `/game/runner` | Runner compass HUD, exposure status, incoming tag |
| `/game/spectator` | Spectator field view |
| `/results` | After-action report |
| `/settings` | Display, units, sound, haptics, motion |
| `*` | Not found |

The default mock operation is **NIGHTFALL** with code **VX7K2M**, host call sign **ECHO**, hunters **ECHO / VEX / KILO**, and runners **WREN / ASH / ROOK / NOVA**.

## Demo flow

1. Open `/lobby/VX7K2M` to skip setup and land in a populated lobby.
2. In the lobby, assign players to teams with **Move**, or use **Randomize teams**. Players cannot select their own side.
3. Start the operation, skip the prep overlay, and enter the field.
4. As a hunter, wait for the first ping, inspect last-known runner positions, then enter a runner's private tag code to register a catch.
5. As a runner, use the compass, keep your private tag code secret until physically caught, and view the hunter map if the host enabled it.
6. End the round from the demo console or menu to see the after-action report.

### Demo console

The vertical **DEMO** tab on the right edge opens prototype controls in development builds only:

- Jump to any screen
- Trigger pings, start the round, force a winner, reset all mock data
- Simulate the runner's compass heading
- Toggle night ops / daylight

Tag modal timings are mocked: the hunter tag sheet auto-confirms after ~5.6 s, and the runner incoming-tag modal auto-declines after 15 s.

## Prototype behavior and limitations

- **No backend.** Players, pings, tags, timers, and results live in memory and reset on reload. Theme and other preferences persist in `localStorage` under `manhunt-prefs`.
- **Mock location and sensors.** All positions and compass headings are static or simulated; no browser geolocation or device orientation APIs are used.
- **No rooms or realtime.** The join code is a UI prop. Invite QR codes point at the mock join route.
- **Map tiles require network access.** Leaflet renders OpenStreetMap tiles with a CSS filter for the dark theme.
- **Tags are simulated.** A hunter enters the runner's private code. In a real game, codes must be private per player and validated by the server.
- **Demo console is dev-only.** It is gated behind `import.meta.env.DEV` and is absent from production builds.
- **Not production-ready.** Expect placeholder accessibility, no analytics, no error reporting, and mock fallbacks when `/results` is opened directly.

## Project structure

```text
apps/web/
  src/
    components/   brand, game HUD, layout, UI primitives
    lib/          types, geo math, mock positions, utilities
    pages/        route screens
    store/        Zustand game state and preferences
    styles/       tokens, themes, HUD textures, Leaflet styling
```

## Next steps

- Real backend with rooms, auth, and WebSocket presence
- Geolocation ingestion with ping scheduling and server-side tag validation
- Device orientation permissions and compass calibration
- Production map tile provider and offline/error states
- Accessibility and performance pass, including route-level code splitting
