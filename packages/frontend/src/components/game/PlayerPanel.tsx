import type { Player } from '@blockus/shared';

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

interface PlayerPanelProps {
  players: Player[];
  currentPlayerIndex: number;
  myPlayerId: string;
  skippedPlayers: string[];
}

export function PlayerPanel({
  players,
  currentPlayerIndex,
  myPlayerId,
  skippedPlayers,
}: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Players
      </h3>
      {players.map((player, idx) => {
        const isActive = idx === currentPlayerIndex;
        const isMe = player.id === myPlayerId;
        const isSkipped = skippedPlayers.includes(player.id);

        return (
          <div
            key={player.id}
            className={`p-3 rounded-xl transition-all duration-300 ${
              isActive ? `bg-surface-2 ring-2 ${colorRing[player.color]} turn-flash` : 'bg-surface'
            } ${isSkipped ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full shrink-0 ${colorDot[player.color]}`} />
              <span className="text-sm font-semibold text-white truncate flex-1">
                {player.name}
              </span>
              {isMe && <span className="text-xs text-blue-400 font-medium">You</span>}
              {!player.connected && <span className="text-xs text-red-400">●</span>}
              {isSkipped && <span className="text-xs text-slate-500">Done</span>}
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-xl font-bold ${isActive ? 'text-white score-bump' : 'text-slate-300'}`}
              >
                {player.score}
              </span>
              <span className="text-xs text-slate-500">
                {player.remainingPieces.length} pieces left
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
