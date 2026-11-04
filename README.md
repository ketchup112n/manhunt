# MANHUNT

A mobile-first, frontend-only prototype for a real-world manhunt game. Hosts configure the round, assign players to teams manually or at random, and choose whether runners can view all hunters on a map. Hunters receive periodic runner location pings and register catches with a runner-only PIN. Runners get a compass, a private tag code, and an optional shrinking play area.

This is still a UI prototype: players, locations, pings, tags, timers, zones, and rooms are mock data. There is no backend, authentication, real geolocation, or realtime transport yet.

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
| `npm run test` | Run the zone schedule unit tests |
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
| `/` | Landing / entry |
| `/create` | Create lobby and configure rules |
| `/join` | Join with a lobby code |
| `/join/:code` | Join with a prefilled code |
| `/lobby/:code` | Host lobby, team assignment, invite QR, editable settings, prep |
| `/game/hunter` | Hunter map HUD, ping intel, PIN tag flow |
| `/game/runner` | Runner compass HUD, exposure status, private PIN, optional hunter map |
| `/game/spectator` | Spectator field view |
| `/results` | After-action report |
| `/settings` | Display, units, sound, haptics, motion |
| `*` | Not found |

The default mock lobby is **MANHUNT** with code **VX7K2M**, host display name **ECHO**, hunters **ECHO / VEX / KILO**, and runners **WREN / ASH / ROOK / NOVA**. Every runner has a unique 4-digit PIN.

## Demo flow

1. Open `/lobby/VX7K2M` to skip setup and land in a populated lobby.
2. In the lobby, assign players to teams with **Move**, or use **Randomize teams**. Players cannot select their own side.
3. Optionally edit the protocol, including the shrinking zone, from **Mission rules → Edit**.
4. Start the operation, skip the prep overlay, and enter the field.
5. As a hunter, wait for the first ping, inspect last-known runner positions, then enter a runner's private PIN to register a catch.
6. As a runner, use the compass, keep your private PIN secret until physically caught, and view all hunters on the map if the host enabled it.
7. End the round from the demo console or menu to see the after-action report.

### Shrinking zone

When enabled, the play area behaves like a battle-royale circle. Each interval is split into a **hold** phase and a **contraction** phase:

- The boundary holds still for 80% of the interval, so runners get a warning window.
- It then contracts linearly to the next radius over the remaining 20%.
- The zone never drops below the configured final radius and stops moving once every contraction is complete.

The same schedule powers the settings summary, the lobby schedule warning, the map circles, the in-field zone chip/panel, and the unit tests in `apps/web/src/lib/zone.test.ts`. If the schedule would run past the end of the round, the host sees a warning before deploying.

### Demo console

The vertical **DEMO** tab on the right edge opens prototype controls in development builds only:

- Jump to any screen
- Trigger pings, start the round, force a winner, reset all mock data
- Reveal every runner PIN for testing
- Simulate the runner's compass heading
- Toggle night ops / daylight

## Prototype behavior and limitations

- **No backend.** Players, pings, tags, timers, zones, and results live in memory and reset on reload. Theme and other preferences persist in `localStorage` under `manhunt-prefs`.
- **Mock location and sensors.** All positions and compass headings are static or simulated; no browser geolocation or device orientation APIs are used.
- **No rooms or realtime.** The join code is a UI prop. Invite QR codes point at the mock join route.
- **Map tiles require network access.** Leaflet renders OpenStreetMap tiles with a CSS filter for the dark theme.
- **Tags are simulated.** A hunter enters the runner's private PIN. In a real game, PINs must be private per player and validated by the server.
- **Teams are host-controlled.** Only the host can assign hunters and runners or randomize teams; player-facing screens never expose a side picker.
- **Demo console is dev-only.** It is gated behind `import.meta.env.DEV` and is absent from production builds.
- **Not production-ready.** Expect placeholder accessibility, no analytics, no error reporting, and mock fallbacks when `/results` is opened directly.

## Project structure

```text
apps/web/
  src/
    components/   brand, game HUD, zone HUD, layout, UI primitives
    lib/          types, geo math, mock positions, zone schedule, utilities
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
