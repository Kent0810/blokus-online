import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Player } from '@blockus/shared';

const RANK_LABELS = ['1st', '2nd', '3rd', '4th'];

const colorBg: Record<string, string> = {
  blue: 'bg-blue-600',
  yellow: 'bg-yellow-500',
  red: 'bg-red-600',
  green: 'bg-green-600',
};

const colorText: Record<string, string> = {
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  green: 'text-green-400',
};

const colorRankText: Record<string, string> = {
  blue: 'text-blue-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  green: 'text-green-500',
};

interface Ranking {
  player: Player;
  score: number;
  rank: number;
}

interface GameOverModalProps {
  open: boolean;
  rankings: Ranking[];
  myPlayerId: string;
  onRematch: () => void;
  onLeave: () => void;
}

export function GameOverModal({
  open,
  rankings,
  myPlayerId,
  onRematch,
  onLeave,
}: GameOverModalProps) {
  const winner = rankings[0];

  return (
    <Modal open={open} className="w-full max-w-md p-8">
      {/* Winner banner — uses the winner's player color */}
      <div className="text-center mb-6">
        {winner && (
          <>
            <div
              className={`w-14 h-14 rounded-2xl ${colorBg[winner.player.color]} flex items-center justify-center text-2xl font-black text-white mx-auto mb-3 shadow-lg`}
            >
              {winner.player.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold text-[#eef2ff]">Game Over</h2>
            <p className={`text-base font-semibold mt-1 ${colorText[winner.player.color]}`}>
              {winner.player.name} wins with {winner.score} pts
            </p>
          </>
        )}
        {!winner && <h2 className="text-2xl font-bold text-[#eef2ff]">Game Over</h2>}
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {rankings.map((entry, i) => (
          <div
            key={entry.player.id}
            className={`rank-item flex items-center gap-3 p-3 rounded-xl border transition-none ${
              entry.player.id === myPlayerId
                ? 'bg-surface-2 border-white/10'
                : 'bg-surface border-transparent'
            }`}
          >
            <span
              className={`text-sm font-bold w-8 text-center shrink-0 ${colorRankText[entry.player.color]}`}
            >
              {RANK_LABELS[i] ?? `${i + 1}th`}
            </span>
            <div className={`w-2 h-2 rounded-full shrink-0 ${colorBg[entry.player.color]}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#eef2ff] truncate text-sm">
                {entry.player.name}
                {entry.player.id === myPlayerId && (
                  <span
                    className={`ml-1.5 text-[10px] font-semibold ${colorText[entry.player.color]}`}
                  >
                    (You)
                  </span>
                )}
              </p>
            </div>
            <span className="text-lg font-bold text-[#eef2ff] shrink-0">{entry.score}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onLeave}>
          Leave
        </Button>
        <Button variant="primary" className="flex-1" onClick={onRematch}>
          Play Again
        </Button>
      </div>
    </Modal>
  );
}
