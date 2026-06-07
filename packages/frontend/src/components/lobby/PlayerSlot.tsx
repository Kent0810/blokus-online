import type { Player } from '@blockus/shared';
import { GeneratedAvatar } from '../ui/GeneratedAvatar';

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-600 border-blue-400',
  yellow: 'bg-yellow-500 border-yellow-300',
  red: 'bg-red-600 border-red-400',
  green: 'bg-green-600 border-green-400',
};

const colorYouBadge: Record<string, string> = {
  blue: 'text-blue-300 bg-blue-900/40',
  yellow: 'text-yellow-300 bg-yellow-900/40',
  red: 'text-red-300 bg-red-900/40',
  green: 'text-green-300 bg-green-900/40',
};

interface PlayerSlotProps {
  player?: Player;
  index: number;
  isReady?: boolean;
  isYou?: boolean;
  avatar?: string;
}

const COLORS = ['blue', 'yellow', 'red', 'green'] as const;
const CORNER_LABELS = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];

export function PlayerSlot({ player, index, isReady, isYou, avatar }: PlayerSlotProps) {
  const color = COLORS[index];
  const colorClass = colorClasses[color];

  if (!player) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-dashed border-white/10">
        <div className={`w-10 h-10 rounded-lg border-2 ${colorClass} opacity-30`} />
        <div>
          <p className="text-slate-500 text-sm font-medium">Waiting for player...</p>
          <p className="text-slate-600 text-xs">{CORNER_LABELS[index]} corner</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl bg-surface border transition-all duration-300 ${
        isReady ? 'border-green-500/60 shadow-sm shadow-green-900/20' : 'border-white/[0.06]'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg border-2 ${colorClass} flex items-center justify-center font-bold text-white text-lg overflow-hidden`}
      >
        {avatar ? (
          <GeneratedAvatar seed={avatar} size={40} className="rounded-none" />
        ) : (
          player.name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white truncate">{player.name}</p>
          {isYou && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colorYouBadge[color]}`}
            >
              You
            </span>
          )}
          {player.isBot && (
            <span className="text-xs text-purple-400 font-medium bg-purple-900/30 px-2 py-0.5 rounded-full">
              Bot
            </span>
          )}
        </div>
        <p className="text-slate-500 text-xs capitalize">
          {color} · {CORNER_LABELS[index]}
        </p>
      </div>
      <div className="shrink-0">
        {isReady ? (
          <span className="text-green-400 text-sm font-semibold flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Ready
          </span>
        ) : (
          <span className="text-slate-500 text-sm">Not ready</span>
        )}
      </div>
    </div>
  );
}
