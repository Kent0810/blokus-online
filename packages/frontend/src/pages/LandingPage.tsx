import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';
import { connectSocket, emit } from '../socket';

type Mode = 'none' | 'quick2' | 'quick3' | 'quick4' | 'create' | 'join';

export function LandingPage() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('none');
  const [joinCode, setJoinCode] = useState('');
  const [turnLimit, setTurnLimit] = useState(60);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const { setPlayer, setPhase } = useAppStore();

  const canSubmit = name.trim().length >= 2;

  function connect(playerName: string) {
    connectSocket(playerName);
    setPlayer(playerName, '');
  }

  function handleQuickMatch(count: 2 | 3 | 4) {
    if (!canSubmit) return;
    connect(name.trim());
    emit.joinQueue({ name: name.trim(), mode: count });
    setPhase('matchmaking');
  }

  function handleCreate() {
    if (!canSubmit) return;
    connect(name.trim());
    emit.createRoom({ name: name.trim(), mode: playerCount, turnTimeLimit: turnLimit });
  }

  function handleJoin() {
    if (!canSubmit || joinCode.length < 4) return;
    connect(name.trim());
    emit.joinRoom({ name: name.trim(), code: joinCode.toUpperCase() });
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6">
      {/* Decorative background blocks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { color: 'bg-blue-600/10', size: 120, top: '10%', left: '5%' },
          { color: 'bg-yellow-500/10', size: 80, top: '20%', right: '8%' },
          { color: 'bg-red-500/10', size: 100, bottom: '15%', left: '10%' },
          { color: 'bg-green-500/10', size: 60, bottom: '25%', right: '12%' },
          { color: 'bg-blue-400/5', size: 200, top: '50%', left: '50%' },
        ].map((b, i) => (
          <div
            key={i}
            className={`absolute rounded-2xl ${b.color}`}
            style={{
              width: b.size,
              height: b.size,
              top: b.top,
              left: b.left,
              right: (b as { right?: string }).right,
              bottom: (b as { bottom?: string }).bottom,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'].map((c, i) => (
              <div
                key={i}
                className={`${c} rounded-md`}
                style={{ width: 18 + i * 4, height: 18 + i * 4 }}
              />
            ))}
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">Blockus</h1>
          <p className="text-slate-400 mt-2">Multiplayer strategy tile game</p>
        </div>

        {/* Name input (always visible) */}
        <div className="bg-surface rounded-2xl p-6 shadow-xl border border-slate-700/50">
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-400 mb-2">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              maxLength={20}
              className="w-full bg-surface-2 text-white placeholder-slate-500 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mode === 'none') setMode('quick2');
              }}
            />
          </div>

          {mode === 'none' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <Button disabled={!canSubmit} onClick={() => handleQuickMatch(2)}>
                  Quick 2P
                </Button>
                <Button disabled={!canSubmit} onClick={() => handleQuickMatch(3)}>
                  Quick 3P
                </Button>
                <Button disabled={!canSubmit} onClick={() => handleQuickMatch(4)}>
                  Quick 4P
                </Button>
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
                className="w-full py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-surface-2 transition-all border border-dashed border-slate-600 hover:border-slate-500"
              >
                🎮 Local / Offline Game (same device)
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Players</label>
                <div className="flex gap-2">
                  {([2, 3, 4] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPlayerCount(n)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        playerCount === n
                          ? 'bg-blue-600 text-white'
                          : 'bg-surface-2 text-slate-300 hover:text-white'
                      }`}
                    >
                      {n} Players
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Turn timer: {turnLimit}s
                </label>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={15}
                  value={turnLimit}
                  onChange={(e) => setTurnLimit(Number(e.target.value))}
                  className="w-full accent-blue-500"
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
                <label className="block text-sm font-medium text-slate-400 mb-2">Room code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="w-full bg-surface-2 text-white placeholder-slate-500 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-xl tracking-widest text-center"
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

        <p className="text-center text-slate-600 text-xs mt-6">
          2–4 players · Turn-based · Online multiplayer - Created by Kenny
        </p>
      </div>
    </div>
  );
}
