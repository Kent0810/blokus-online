import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { GeneratedAvatar } from '../components/ui/GeneratedAvatar';
import { useAppStore } from '../store/appStore';
import { AVATARS } from '../constants/avatars';

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

// Default avatar per player slot so each player starts distinct
const SLOT_DEFAULTS = [AVATARS[0], AVATARS[1], AVATARS[2], AVATARS[3]] as string[];

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'At least 2 characters';
  if (!NAME_PATTERN.test(trimmed)) return "Letters, numbers, spaces, _ - ' only";
  return null;
}

export function LocalSetupPage() {
  const { setupLocalGame, setPhase, playerName, playerAvatar } = useAppStore();
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(() => {
    const defaults = DEFAULT_NAMES.slice();
    if (playerName.trim()) defaults[0] = playerName.trim();
    return defaults;
  });
  const [avatars, setAvatars] = useState(() => {
    const defaults = SLOT_DEFAULTS.slice();
    if (playerAvatar) defaults[0] = playerAvatar;
    return defaults;
  });
  const [touched, setTouched] = useState([false, false, false, false]);
  const [turnLimit, setTurnLimit] = useState(0);
  const [openPickerIndex, setOpenPickerIndex] = useState<number | null>(null);

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
    setTouched([true, true, true, true]);
    if (!canStart) return;
    setupLocalGame(
      activeNames.map((n) => n.trim()),
      avatars.slice(0, playerCount),
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

  function handleAvatarChange(playerIndex: number, avatar: string) {
    const updated = [...avatars];
    updated[playerIndex] = avatar;
    setAvatars(updated);
    setOpenPickerIndex(null);
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#eef2ff]">Local Game</h1>
          <p className="text-[#7b94b9] mt-1">Hot-seat multiplayer on this device</p>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-white/[0.06] flex flex-col gap-6">
          {/* Player count */}
          <div>
            <label className="block text-sm font-medium text-[#7b94b9] mb-3">
              Number of players
            </label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] ${
                    playerCount === n
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-surface-2 text-slate-300 hover:text-white'
                  }`}
                >
                  {n} Players
                </button>
              ))}
            </div>
          </div>

          {/* Player names + avatars */}
          <div>
            <label className="block text-sm font-medium text-[#7b94b9] mb-3">Player setup</label>
            <div className="flex flex-col gap-2">
              {Array.from({ length: playerCount }, (_, i) => {
                const hasError = touched[i] && fieldErrors[i];
                const pickerOpen = openPickerIndex === i;
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      {/* Avatar button — click to expand picker */}
                      <button
                        type="button"
                        onClick={() => setOpenPickerIndex(pickerOpen ? null : i)}
                        title="Choose avatar"
                        className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 transition-all active:scale-95 relative ${
                          pickerOpen
                            ? 'ring-2 ring-accent'
                            : 'ring-1 ring-white/[0.06] hover:ring-accent/50'
                        }`}
                      >
                        <GeneratedAvatar seed={avatars[i]} size={48} className="rounded-none" />
                        <span
                          className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ${COLOR_DOT[COLORS[i]]} ring-1 ring-surface`}
                        />
                      </button>

                      <input
                        type="text"
                        value={names[i]}
                        onChange={(e) => handleNameChange(i, e.target.value)}
                        onBlur={() => handleBlur(i)}
                        placeholder={DEFAULT_NAMES[i]}
                        maxLength={NAME_MAX}
                        className={`flex-1 bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-2 ${
                          hasError
                            ? 'ring-2 ring-red-500 focus:ring-red-500 text-[#eef2ff]'
                            : `focus:ring-accent/60 ${COLOR_LABELS[COLORS[i]]}`
                        } font-medium`}
                      />
                      <span className="text-xs text-[#7b94b9]/50 w-9 text-right shrink-0">
                        {names[i].length}/{NAME_MAX}
                      </span>
                    </div>

                    {/* Inline avatar picker */}
                    {pickerOpen && (
                      <div className="mt-2 ml-14 animate-fade-in">
                        <AvatarPicker
                          value={avatars[i]}
                          onChange={(av) => handleAvatarChange(i, av)}
                          size="md"
                        />
                      </div>
                    )}

                    {hasError && (
                      <p className="text-red-400 text-xs mt-1 ml-12">{fieldErrors[i]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Turn timer */}
          <div>
            <label className="block text-sm font-medium text-[#7b94b9] mb-2">
              Turn timer:{' '}
              <span className="text-[#eef2ff]">
                {turnLimit === 0 ? 'Unlimited' : `${turnLimit}s`}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={180}
              step={15}
              value={turnLimit}
              onChange={(e) => setTurnLimit(Number(e.target.value))}
              className="w-full accent-[#4361ee]"
            />
            <div className="flex justify-between text-xs text-[#7b94b9]/60 mt-1">
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
