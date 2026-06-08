import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { GeneratedAvatar } from '../components/ui/GeneratedAvatar';
import { useAppStore } from '../store/appStore';
import { connectSocket, emit } from '../socket';
import type { GameVariant } from '@blockus/shared';

type Mode = 'none' | 'quick2' | 'quick3' | 'quick4' | 'create' | 'join';

// Actual tetromino shapes rendered as background decoration
const BG_PIECES = [
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ] as [number, number][],
    color: '#3b82f6',
    opacity: 0.11,
    style: { top: '7%', left: '4%' },
    blockSize: 22,
  },
  {
    cells: [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ] as [number, number][],
    color: '#eab308',
    opacity: 0.09,
    style: { top: '14%', right: '5%' },
    blockSize: 20,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ] as [number, number][],
    color: '#ef4444',
    opacity: 0.1,
    style: { bottom: '18%', left: '5%' },
    blockSize: 20,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ] as [number, number][],
    color: '#22c55e',
    opacity: 0.08,
    style: { bottom: '25%', right: '4%' },
    blockSize: 18,
  },
  {
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ] as [number, number][],
    color: '#818cf8',
    opacity: 0.05,
    style: { top: '48%', left: '47%' },
    blockSize: 24,
  },
] as const;

function BgPiece({ cells, color, opacity, style, blockSize }: (typeof BG_PIECES)[number]) {
  const gap = 3;
  const maxRow = Math.max(...cells.map(([r]) => r));
  const maxCol = Math.max(...cells.map(([, c]) => c));
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        width: (maxCol + 1) * (blockSize + gap),
        height: (maxRow + 1) * (blockSize + gap),
        opacity,
        ...style,
      }}
    >
      {cells.map(([r, c], i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            backgroundColor: color,
            width: blockSize,
            height: blockSize,
            top: r * (blockSize + gap),
            left: c * (blockSize + gap),
          }}
        />
      ))}
    </div>
  );
}

// Player color dots for each game mode
const MODE_COLORS: Record<2 | 3 | 4, string[]> = {
  2: ['bg-blue-500', 'bg-yellow-500'],
  3: ['bg-blue-500', 'bg-yellow-500', 'bg-red-500'],
  4: ['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'],
};

export function LandingPage() {
  const { setPlayer, setPhase, playerName, setPlayerName, playerAvatar, setAvatar } = useAppStore();
  const [mode, setMode] = useState<Mode>('none');
  const [joinCode, setJoinCode] = useState('');
  const [turnLimit, setTurnLimit] = useState(60);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [createVariant, setCreateVariant] = useState<GameVariant>('standard');

  useEffect(() => {
    if (createVariant === 'teams') setPlayerCount(4);
  }, [createVariant]);

  const canSubmit = playerName.trim().length >= 2;

  function handleAvatarChange(avatar: string) {
    if (!playerName.trim() || playerName === playerAvatar) {
      setPlayerName(avatar);
    }
    setAvatar(avatar);
  }

  function connect(trimmedName: string) {
    connectSocket(trimmedName);
    setPlayer(trimmedName, '');
  }

  function handleQuickMatch(count: 2 | 3 | 4) {
    if (!canSubmit) return;
    connect(playerName.trim());
    emit.joinQueue({ name: playerName.trim(), maxPlayers: count });
    setPhase('matchmaking');
  }

  function handleCreate() {
    if (!canSubmit) return;
    connect(playerName.trim());
    emit.createRoom({
      name: playerName.trim(),
      maxPlayers: playerCount,
      turnTimeLimit: turnLimit,
      variant: createVariant,
    });
  }

  function handleJoin() {
    if (!canSubmit || joinCode.length < 4) return;
    connect(playerName.trim());
    emit.joinRoom({ name: playerName.trim(), code: joinCode.toUpperCase() });
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background — scattered tetromino shapes, not generic blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {BG_PIECES.map((piece, i) => (
          <BgPiece key={i} {...piece} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            {/* 2×2 block grid: four player colors as a game piece */}
            <div className="grid grid-cols-2 gap-1.5">
              {(['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'] as const).map(
                (c, i) => (
                  <div key={i} className={`${c} rounded-sm w-6 h-6`} />
                ),
              )}
            </div>
          </div>
          <h1 className="text-5xl font-black text-[#eef2ff] tracking-tight">Blockus</h1>
          <p className="text-[#7b94b9] mt-2 text-sm">
            Place tiles corner to corner. Claim the most board.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface rounded-2xl p-6 shadow-2xl shadow-black/40 border border-white/[0.06]">
          {/* Name + avatar */}
          <div className="mb-5 flex flex-col gap-3">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full bg-surface-2 text-[#eef2ff] placeholder-[#7b94b9] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-accent/60 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mode === 'none') setMode('quick2');
              }}
            />
            {/* Avatar: portrait + name above, full-width 10-col picker below */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-accent/40 shadow-lg shadow-accent/10 shrink-0">
                  <GeneratedAvatar seed={playerAvatar} size={56} className="rounded-none" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#7b94b9] uppercase tracking-wider mb-0.5">
                    Avatar
                  </p>
                  <p className="text-sm font-bold text-[#eef2ff] truncate">{playerAvatar}</p>
                </div>
              </div>
              <AvatarPicker value={playerAvatar} onChange={handleAvatarChange} fullWidth />
            </div>
          </div>

          {mode === 'none' && (
            <div className="flex flex-col gap-3">
              {/* Quick match — each button shows its player colors */}
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    disabled={!canSubmit}
                    onClick={() => handleQuickMatch(count)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl bg-surface-2 hover:bg-white/[0.08] text-[#eef2ff] font-semibold text-sm transition-all disabled:opacity-35 active:scale-[0.97] border border-white/[0.05] hover:border-accent/30"
                  >
                    <div className="flex gap-1 flex-wrap justify-center">
                      {MODE_COLORS[count].map((c, i) => (
                        <div key={i} className={`${c} rounded-sm w-3 h-3`} />
                      ))}
                    </div>
                    <span>{count}P</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={!canSubmit}
                  onClick={() => setMode('create')}
                >
                  Create Room
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={!canSubmit}
                  onClick={() => setMode('join')}
                >
                  Join with Code
                </Button>
              </div>

              <button
                onClick={() => setPhase('local_setup')}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-[#7b94b9] hover:text-[#eef2ff] hover:bg-surface-2 transition-all border border-dashed border-white/[0.08] hover:border-white/20"
              >
                Local / Offline Game (same device)
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Game mode */}
              <div>
                <label className="block text-sm font-medium text-[#7b94b9] mb-2">Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { key: 'standard', label: 'Standard', desc: 'Classic' },
                      { key: 'chaos', label: 'Chaos', desc: '3 random/turn' },
                      { key: 'teams', label: 'Teams 2v2', desc: 'Pick & place' },
                    ] as { key: GameVariant; label: string; desc: string }[]
                  ).map(({ key, label, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCreateVariant(key)}
                      className={`flex flex-col items-center py-2.5 px-1 rounded-lg text-center transition-all active:scale-[0.97] ${
                        createVariant === key
                          ? 'bg-accent/20 ring-1 ring-accent text-[#eef2ff]'
                          : 'bg-surface-2 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-[10px] text-[#7b94b9] mt-0.5">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Players — hidden when teams forces 4 */}
              {createVariant !== 'teams' && (
                <div>
                  <label className="block text-sm font-medium text-[#7b94b9] mb-2">Players</label>
                  <div className="flex gap-2">
                    {([2, 3, 4] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setPlayerCount(n)}
                        className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] ${
                          playerCount === n
                            ? 'bg-accent text-white shadow-lg shadow-accent/20'
                            : 'bg-surface-2 text-slate-300 hover:text-white'
                        }`}
                      >
                        {n}P
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {createVariant === 'teams' && (
                <p className="text-xs text-[#7b94b9] -mt-1">Teams always runs 4 players.</p>
              )}
              <div>
                <label className="block text-sm font-medium text-[#7b94b9] mb-2">
                  Turn timer: {turnLimit}s
                </label>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={15}
                  value={turnLimit}
                  onChange={(e) => setTurnLimit(Number(e.target.value))}
                  className="w-full accent-[#4361ee]"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('none')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={!canSubmit} className="flex-1">
                  Create Room
                </Button>
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-[#7b94b9] mb-2">Room code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-surface-2 text-[#eef2ff] placeholder-[#7b94b9] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-accent/60 transition-all font-mono text-xl tracking-widest text-center"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('none')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={!canSubmit || joinCode.length < 4}
                  className="flex-1"
                >
                  Join Room
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[#7b94b9]/50 text-xs mt-5">
          2–4 players · Online & local multiplayer · Created by Kenny
        </p>
      </div>
    </div>
  );
}
