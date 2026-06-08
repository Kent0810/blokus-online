import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { GeneratedAvatar } from '../components/ui/GeneratedAvatar';
import { useAppStore } from '../store/appStore';
import { AVATARS } from '../constants/avatars';
import type { GameVariant } from '@blockus/shared';

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

const SLOT_DEFAULTS = [AVATARS[0], AVATARS[1], AVATARS[2], AVATARS[3]] as string[];

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'At least 2 characters';
  if (!NAME_PATTERN.test(trimmed)) return "Letters, numbers, spaces, _ - ' only";
  return null;
}

// In teams mode, display as [P1, P3 (Team A), P2, P4 (Team B)] so teams are visually grouped
const TEAMS_DISPLAY_ORDER = [0, 2, 1, 3];

function ModeIcon({ variant }: { variant: GameVariant }) {
  if (variant === 'standard') {
    return (
      <div className="grid grid-cols-2 gap-[3px]">
        <div className="w-5 h-5 bg-blue-500 rounded-[3px]" />
        <div className="w-5 h-5 bg-yellow-500 rounded-[3px]" />
        <div className="w-5 h-5 bg-red-500 rounded-[3px]" />
        <div className="w-5 h-5 bg-green-500 rounded-[3px]" />
      </div>
    );
  }
  if (variant === 'teams') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-[3px]">
          <div className="w-4 h-4 bg-blue-500 rounded-[3px]" />
          <div className="w-4 h-4 bg-red-500 rounded-[3px]" />
        </div>
        <span className="text-[9px] font-black text-[#7b94b9] leading-none">vs</span>
        <div className="flex flex-col gap-[3px]">
          <div className="w-4 h-4 bg-yellow-500 rounded-[3px]" />
          <div className="w-4 h-4 bg-green-500 rounded-[3px]" />
        </div>
      </div>
    );
  }
  // Chaos: three tiles in a scattered fan
  return (
    <div className="relative w-11 h-9">
      <div
        className="absolute w-5 h-5 bg-blue-500 rounded-[3px] opacity-90"
        style={{ top: 0, left: 0, transform: 'rotate(-12deg)' }}
      />
      <div
        className="absolute w-5 h-5 bg-yellow-500 rounded-[3px]"
        style={{ top: 6, left: 11, transform: 'rotate(2deg)' }}
      />
      <div
        className="absolute w-5 h-5 bg-red-500 rounded-[3px] opacity-90"
        style={{ top: 2, right: 0, transform: 'rotate(14deg)' }}
      />
    </div>
  );
}

const VARIANT_META: Record<GameVariant, { label: string; desc: string }> = {
  standard: { label: 'Standard', desc: 'Classic Blokus — all pieces, all moves' },
  teams: { label: 'Teams 2v2', desc: 'One picks, one places · 4 players only' },
  chaos: { label: 'Chaos', desc: '3 random pieces dealt each turn' },
};

export function LocalSetupPage() {
  const { setupLocalGame, setPhase, playerName, playerAvatar } = useAppStore();
  const [variant, setVariant] = useState<GameVariant>('standard');
  const [playerCount, setPlayerCount] = useState(2);

  useEffect(() => {
    if (variant === 'teams') setPlayerCount(4);
  }, [variant]);

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
      variant,
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

  // In teams mode, display order groups Team A and Team B
  const displayOrder =
    variant === 'teams'
      ? TEAMS_DISPLAY_ORDER.slice(0, 4)
      : Array.from({ length: playerCount }, (_, i) => i);

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#eef2ff]">Local Game</h1>
          <p className="text-[#7b94b9] mt-1">Hot-seat multiplayer on this device</p>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-white/[0.06] flex flex-col gap-6">
          {/* ── Game mode ─────────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-medium text-[#7b94b9] mb-3">Game mode</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(VARIANT_META) as GameVariant[]).map((key) => {
                const { label, desc } = VARIANT_META[key];
                const selected = variant === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVariant(key)}
                    className={`
                      relative flex flex-col items-center gap-2.5 rounded-xl p-3 pt-4 text-center
                      transition-all duration-150 active:scale-[0.97]
                      ${
                        selected
                          ? 'bg-accent/[0.12] ring-2 ring-accent shadow-[0_0_16px_-4px_rgba(67,97,238,0.35)]'
                          : 'bg-surface-2 ring-1 ring-white/[0.06] hover:ring-white/20 hover:bg-white/[0.05]'
                      }
                    `}
                  >
                    {/* Selected check */}
                    {selected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4l2.5 2.5L9 1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}

                    {/* Icon */}
                    <div className="flex items-center justify-center h-10">
                      <ModeIcon variant={key} />
                    </div>

                    {/* Label */}
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight ${selected ? 'text-[#eef2ff]' : 'text-slate-300'}`}
                      >
                        {label}
                      </p>
                      <p className="text-[10px] text-[#7b94b9] mt-0.5 leading-tight">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Player count (hidden for teams — always 4) ──────────── */}
          {variant !== 'teams' && (
            <div>
              <p className="text-sm font-medium text-[#7b94b9] mb-3">Players</p>
              <div className="flex gap-2">
                {([2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlayerCount(n)}
                    className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] ${
                      playerCount === n
                        ? 'bg-accent text-white shadow-lg shadow-accent/20'
                        : 'bg-surface-2 text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {n}P
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Player setup ────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-medium text-[#7b94b9] mb-3">Player setup</p>
            <div className="flex flex-col gap-2">
              {displayOrder.map((dataIdx, displayPos) => {
                const hasError = touched[dataIdx] && fieldErrors[dataIdx];
                const pickerOpen = openPickerIndex === dataIdx;

                // Team A header: first item in grouped display (position 0)
                // Team B header: first item of second team (position 2)
                const showTeamAHeader = variant === 'teams' && displayPos === 0;
                const showTeamBHeader = variant === 'teams' && displayPos === 2;

                return (
                  <div key={dataIdx}>
                    {showTeamAHeader && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-[2px]">
                          <div className="w-2 h-2 bg-blue-500 rounded-[2px]" />
                          <div className="w-2 h-2 bg-red-500 rounded-[2px]" />
                        </div>
                        <span className="text-[11px] font-bold text-blue-400">Team A</span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                    )}
                    {showTeamBHeader && (
                      <div className="flex items-center gap-2 mt-3 mb-2">
                        <div className="flex gap-[2px]">
                          <div className="w-2 h-2 bg-yellow-500 rounded-[2px]" />
                          <div className="w-2 h-2 bg-green-500 rounded-[2px]" />
                        </div>
                        <span className="text-[11px] font-bold text-yellow-400">Team B</span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Avatar button */}
                      <button
                        type="button"
                        onClick={() => setOpenPickerIndex(pickerOpen ? null : dataIdx)}
                        title="Choose avatar"
                        className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 transition-all active:scale-95 relative ${
                          pickerOpen
                            ? 'ring-2 ring-accent'
                            : 'ring-1 ring-white/[0.06] hover:ring-accent/50'
                        }`}
                      >
                        <GeneratedAvatar
                          seed={avatars[dataIdx]}
                          size={48}
                          className="rounded-none"
                        />
                        <span
                          className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ${COLOR_DOT[COLORS[dataIdx]]} ring-1 ring-surface`}
                        />
                      </button>

                      <input
                        type="text"
                        value={names[dataIdx]}
                        onChange={(e) => handleNameChange(dataIdx, e.target.value)}
                        onBlur={() => handleBlur(dataIdx)}
                        placeholder={DEFAULT_NAMES[dataIdx]}
                        maxLength={NAME_MAX}
                        className={`flex-1 bg-surface-2 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-2 ${
                          hasError
                            ? 'ring-2 ring-red-500 focus:ring-red-500 text-[#eef2ff]'
                            : `focus:ring-accent/60 ${COLOR_LABELS[COLORS[dataIdx]]}`
                        } font-medium`}
                      />

                      <span className="text-xs text-[#7b94b9]/40 w-9 text-right shrink-0 tabular-nums">
                        {names[dataIdx].length}/{NAME_MAX}
                      </span>
                    </div>

                    {/* Inline avatar picker */}
                    {pickerOpen && (
                      <div className="mt-2 ml-14 animate-fade-in">
                        <AvatarPicker
                          value={avatars[dataIdx]}
                          onChange={(av) => handleAvatarChange(dataIdx, av)}
                          size="md"
                        />
                      </div>
                    )}

                    {hasError && (
                      <p className="text-red-400 text-xs mt-1 ml-14">{fieldErrors[dataIdx]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Turn timer ──────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-medium text-[#7b94b9] mb-2">
              Turn timer:{' '}
              <span className="text-[#eef2ff] font-semibold">
                {turnLimit === 0 ? 'Unlimited' : `${turnLimit}s`}
              </span>
            </p>
            <input
              type="range"
              min={0}
              max={180}
              step={15}
              value={turnLimit}
              onChange={(e) => setTurnLimit(Number(e.target.value))}
              className="w-full accent-[#4361ee]"
            />
            <div className="flex justify-between text-xs text-[#7b94b9]/50 mt-1">
              <span>Unlimited</span>
              <span>3 min</span>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
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
