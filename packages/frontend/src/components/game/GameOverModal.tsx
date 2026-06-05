import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Player } from '@blockus/shared';

const MEDALS = ['🥇', '🥈', '🥉', ''];

const colorStyle: Record<string, string> = {
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  green: 'text-green-400',
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
      <div className="text-center mb-6">
        <p className="text-5xl mb-3">🏆</p>
        <h2 className="text-2xl font-bold text-white">Game Over!</h2>
        {winner && (
          <p className={`text-lg font-semibold mt-1 ${colorStyle[winner.player.color]}`}>
            {winner.player.name} wins with {winner.score} pts
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {rankings.map((entry, i) => (
          <div
            key={entry.player.id}
            className={`rank-item flex items-center gap-4 p-3 rounded-xl ${
              entry.player.id === myPlayerId ? 'bg-surface-2 ring-1 ring-white/20' : 'bg-surface'
            }`}
          >
            <span className="text-2xl w-8 text-center">{MEDALS[i] ?? ''}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {entry.player.name}
                {entry.player.id === myPlayerId && (
                  <span className="ml-2 text-xs text-blue-400 font-normal">(You)</span>
                )}
              </p>
              <p className={`text-xs capitalize ${colorStyle[entry.player.color]}`}>
                {entry.player.color}
              </p>
            </div>
            <span className="text-xl font-bold text-white shrink-0">{entry.score}</span>
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
