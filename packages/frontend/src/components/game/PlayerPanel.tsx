import type { Player } from '@blockus/shared';
import { GeneratedAvatar } from '../ui/GeneratedAvatar';

const colorDot: Record<string, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
};

const colorRing: Record<string, string> = {
  blue: 'ring-blue-500',
  yellow: 'ring-yellow-500',
  red: 'ring-red-500',
  green: 'ring-green-500',
};

// Color-tinted active background — the board game equivalent of "it's your turn"
const colorActiveBg: Record<string, string> = {
  blue: 'bg-blue-950/60',
  yellow: 'bg-yellow-950/60',
  red: 'bg-red-950/60',
  green: 'bg-green-950/60',
};

// "You" badge uses the player's own color, not a hardcoded blue
const colorYouBadge: Record<string, string> = {
  blue: 'text-blue-300 bg-blue-900/40',
  yellow: 'text-yellow-300 bg-yellow-900/40',
  red: 'text-red-300 bg-red-900/40',
  green: 'text-green-300 bg-green-900/40',
};

interface PlayerPanelProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId: string;
  skippedPlayers: string[];
  avatarMap?: Record<string, string>;
}

export function PlayerPanel({
  players,
  currentPlayerIndex,
  myPlayerId,
  skippedPlayers,
  avatarMap = {},
}: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-[#7b94b9] uppercase tracking-wider mb-1">
        Players
      </h3>
      {players.map((player, idx) => {
        const isActive = idx === currentPlayerIndex;
        const isMe = player.id === myPlayerId;
        const isSkipped = skippedPlayers.includes(player.id);
        const activeBg = colorActiveBg[player.color] ?? 'bg-surface-2';

        return (
          <div
            key={player.id}
            className={`p-3 rounded-xl transition-all duration-300 border ${
              isActive
                ? `${activeBg} ring-2 ${colorRing[player.color]} border-transparent turn-flash`
                : 'bg-surface border-white/[0.04]'
            } ${isSkipped ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {avatarMap[player.id] ? (
                <GeneratedAvatar seed={avatarMap[player.id]} size={20} className="rounded-md" />
              ) : (
                <div className={`w-3 h-3 rounded-full shrink-0 ${colorDot[player.color]}`} />
              )}
              <span className="text-sm font-semibold text-[#eef2ff] truncate flex-1">
                {player.name}
              </span>
              {isMe && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colorYouBadge[player.color]}`}
                >
                  You
                </span>
              )}
              {!player.connected && (
                <span className="text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-full">
                  away
                </span>
              )}
              {isSkipped && (
                <span className="text-[10px] text-[#7b94b9] bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                  done
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-xl font-bold ${isActive ? 'text-[#eef2ff] score-bump' : 'text-slate-300'}`}
              >
                {player.score}
              </span>
              <span className="text-xs text-[#7b94b9]">{player.remainingPieces.length} left</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
