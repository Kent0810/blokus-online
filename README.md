# Blockus 🎮

A real-time multiplayer strategy tile game inspired by Blokus. Place your pieces, block your opponents, claim the board.

## Features

- **2–4 player online multiplayer** via WebSocket
- **Local / hot-seat mode** — multiple players on the same device
- **Private rooms** with invite codes
- **Matchmaking queue** for 2P and 4P public games
- **Turn timer** (configurable per room)
- **Full Blokus rules** — corner-touch only, first move covers your corner, piece rotation & flip
- **Reconnect support** — rejoin a game if you disconnect
- **Share via tunnel** — expose your local game to anyone without firewall config

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. Install dependencies

```bash
git clone <repo-url> blockus
cd blockus
npm install
```

### 2. Build shared package (required once)

```bash
npm run build --workspace @blockus/shared
```

### 3. Start the full app

```bash
npm run dev
```

This runs both the **backend** (`:3001`) and **frontend** (`:5173`) in parallel.

Open **http://localhost:5173** in your browser.

---

## Play Modes

### Local / Offline (same device)

1. Open http://localhost:5173
2. Click **"Local / Offline Game"**
3. Set player names (2–4 players) and optional turn timer
4. Pass the device between players each turn

### Online — over the internet (tunnel)

```bash
npm run ngrok
```

This starts the backend, frontend, and a public tunnel via **localhost.run** (SSH-based, no account, no splash page):

```
╔══════════════════════════════════════════════════════════╗
║                 Blockus is LIVE 🎮                       ║
╠══════════════════════════════════════════════════════════╣
║  Local:  http://localhost:5173                           ║
║  Public: https://abc123.localhost.run                    ║
╚══════════════════════════════════════════════════════════╝
```

Share the **Public URL** — anyone opens it directly, no sign-in or splash page required.

> **Note:** The URL changes each session. Copy it from the terminal before sharing. Requires outbound SSH (port 22) — works through most firewalls.

---

## Project Structure

```
blockus/
├── packages/
│   ├── shared/          # Game engine, types, piece definitions (used by both FE and BE)
│   │   └── src/
│   │       ├── types.ts
│   │       ├── pieces.ts
│   │       └── gameEngine.ts
│   │
│   ├── frontend/        # React + TypeScript + Vite + Tailwind
│   │   └── src/
│   │       ├── pages/         # LandingPage, GamePage, LocalSetupPage, ...
│   │       ├── components/    # Board, PieceSelector, PlayerPanel, ...
│   │       ├── store/         # Zustand state (appStore, gameUIStore)
│   │       └── hooks/         # useSocketEvents, usePieceTransform
│   │
│   └── backend/         # Node.js + TypeScript + Socket.IO + Express
│       └── src/
│           ├── index.ts         # HTTP + Socket.IO server
│           ├── RoomManager.ts   # Rooms, matchmaking, player tracking
│           ├── GameSession.ts   # Per-game state + turn timer
│           └── socketHandlers.ts
│
├── start-tunnel.sh      # One-command tunnel launcher
├── tsconfig.base.json
└── package.json         # npm workspaces root
```

---

## Individual Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start backend + frontend together |
| `npm run dev:backend` | Backend only (`:3001`) |
| `npm run dev:frontend` | Frontend only (`:5173`) |
| `npm run ngrok` | Start everything + public tunnel |
| `npm run build` | Build all packages |
| `npm run test` | Run unit tests |

---

## Environment Variables

Copy `.env.example` to `.env` in `packages/backend/` if you need to override defaults:

```bash
cp .env.example packages/backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origin |
| `NODE_ENV` | `development` | Environment |

---

## Game Rules

- Each player starts at their assigned corner (blue: top-left, yellow: top-right, red: bottom-right, green: bottom-left)
- **First move** must cover your starting corner
- Pieces of the **same color** may only touch **corner-to-corner** — never edge-to-edge
- Pieces cannot overlap
- A player is **skipped** if they have no legal moves
- Game ends when all players are blocked
- **Score** = total cells covered

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, TypeScript, Express, Socket.IO |
| Shared | Pure TypeScript game engine |
| Tunnel | localhost.run via SSH (no account required) |
