#!/usr/bin/env bash
# start-tunnel.sh — starts backend, frontend, and exposes via localhost.run (SSH tunnel, no splash page)

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting Blockus..."

# Kill any previous instances on these ports
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Build shared package first
echo "▶ Building shared package..."
cd "$ROOT"
npm run build --workspace @blockus/shared --silent

# Start backend
echo "▶ Starting backend on :3001..."
cd "$ROOT/packages/backend"
npx tsx src/index.ts &
BACKEND_PID=$!

# Wait for backend to be ready
for i in {1..20}; do
  curl -sf http://localhost:3001/health > /dev/null 2>&1 && break
  sleep 1
done
echo "✓ Backend ready"

# Start frontend
echo "▶ Starting frontend on :5173..."
cd "$ROOT/packages/frontend"
npx vite &
FRONTEND_PID=$!

# Wait for Vite to be ready
for i in {1..20}; do
  curl -sf http://localhost:5173 > /dev/null 2>&1 && break
  sleep 1
done
echo "✓ Frontend ready"

# Start SSH tunnel via localhost.run — no account, no splash page, WebSocket supported
TUNNEL_LOG=$(mktemp)
echo "▶ Opening tunnel via localhost.run..."
ssh -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -R 80:localhost:5173 \
    nokey@localhost.run 2>&1 | tee "$TUNNEL_LOG" &
SSH_PID=$!

# Extract the public URL from SSH output
PUBLIC_URL=""
for i in {1..30}; do
  PUBLIC_URL=$(grep -oE 'https://[a-zA-Z0-9._-]+\.localhost\.run' "$TUNNEL_LOG" 2>/dev/null | tail -1)
  [ -n "$PUBLIC_URL" ] && break
  sleep 1
done

if [ -z "$PUBLIC_URL" ]; then
  PUBLIC_URL="(see output above — look for localhost.run URL)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                 Blockus is LIVE 🎮                       ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Local:  http://localhost:5173                           ║"
printf "║  Public: %-48s  ║\n" "$PUBLIC_URL"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Share the Public URL with friends — no sign-in needed!  ║"
echo "║  URL changes each session (note it before sharing)       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop everything."

cleanup() {
  echo ""
  echo "Stopping..."
  kill $BACKEND_PID $FRONTEND_PID $SSH_PID 2>/dev/null
  rm -f "$TUNNEL_LOG"
  exit 0
}
trap cleanup INT TERM

wait $SSH_PID
