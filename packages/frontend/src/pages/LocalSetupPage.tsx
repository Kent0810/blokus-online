import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';

const COLORS = ['blue', 'yellow', 'red', 'green'] as const;
const COLOR_LABELS: Record<string, string> = {
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  green: 'text-green-400',
};
const COLOR_DOT: Record<string, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
};
const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
const NAME_MAX = 20;
const NAME_PATTERN = /^[a-zA-Z0-9 '_\-]+$/;

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'At least 2 characters';
  if (!NAME_PATTERN.test(trimmed)) return "Letters, numbers, spaces, _ - ' only";
  return null;
}

export function LocalSetupPage() {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(DEFAULT_NAMES.slice());
  const [touched, setTouched] = useState([false, false, false, false]);
  const [turnLimit, setTurnLimit] = useState(0); // 0 = unlimited
  const { setupLocalGame, setPhase } = useAppStore();

  const activeNames = names.slice(0, playerCount);
  const errors = activeNames.map(validateName);
  const duplicates = activeNames.map((n, i) =>
    activeNames.some((other, j) => j !== i && other.trim().toLowerCase() === n.trim().toLowerCase())
      ? 'Names must be unique'
      : null,
  );
  const fieldErrors = errors.map((e, i) => e ?? duplicates[i]);
  const canStart = fieldErrors.every((e) => e === null);

  function handleStart() {
    // Touch all fields to show any remaining errors
    setTouched([true, true, true, true]);
    if (!canStart) return;
    setupLocalGame(
      activeNames.map((n) => n.trim()),
      turnLimit || 9999,
    );
  }

  function handleNameChange(i: number, value: string) {
    const next = [...names];
    next[i] = value;
    setNames(next);
  }

  function handleBlur(i: number) {
    const next = [...touched];
    next[i] = true;
    setTouched(next);
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">🎮</p>
          <h1 className="text-3xl font-black text-white">Local Game</h1>
          <p className="text-slate-400 mt-1">Hot-seat multiplayer on this device</p>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-slate-700/50 flex flex-col gap-6">
          {/* Player count */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Number of Players
            </label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    playerCount === n
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-surface-2 text-slate-300 hover:text-white'
                  }`}
                >
                  {n} Players
                </button>
              ))}
            </div>
          </div>

          {/* Player names */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">Player Names</label>
            <div className="flex flex-col gap-3">
              {Array.from({ length: playerCount }, (_, i) => {
                const hasError = touched[i] && fieldErrors[i];
                return (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${COLOR_DOT[COLORS[i]]}`} />
                      <input
                        type="text"
                        value={names[i]}
                        onChange={(e) => handleNameChange(i, e.target.value)}
                        onBlur={() => handleBlur(i)}
                        placeholder={DEFAULT_NAMES[i]}
                        maxLength={NAME_MAX}
                        className={`flex-1 bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-2 ${
                          hasError
                            ? 'ring-2 ring-red-500 focus:ring-red-500'
                            : 'focus:ring-blue-500'
                        } ${COLOR_LABELS[COLORS[i]]} font-medium`}
                      />
                      <span className="text-xs text-slate-600 w-10 text-right shrink-0">
                        {names[i].length}/{NAME_MAX}
                      </span>
                    </div>
                    {hasError && <p className="text-red-400 text-xs mt-1 ml-6">{fieldErrors[i]}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Turn timer */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Turn timer:{' '}
              <span className="text-white">{turnLimit === 0 ? 'Unlimited' : `${turnLimit}s`}</span>
            </label>
            <input
              type="range"
              min={0}
              max={180}
              step={15}
              value={turnLimit}
              onChange={(e) => setTurnLimit(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Unlimited</span>
              <span>3 min</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setPhase('landing')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleStart}
              className="flex-1"
              disabled={touched.slice(0, playerCount).some(Boolean) && !canStart}
            >
              Start Game
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
