interface TurnTimerProps {
  timeRemaining: number;
  timeLimit: number;
  isMyTurn: boolean;
}

export function TurnTimer({ timeRemaining, timeLimit, isMyTurn }: TurnTimerProps) {
  const pct = Math.max(0, Math.min(100, (timeRemaining / timeLimit) * 100));
  const isUrgent = timeRemaining <= 10;

  const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`flex items-center gap-3 ${isMyTurn ? 'opacity-100' : 'opacity-50'}`}>
      <span
        className={`text-sm font-mono font-bold w-8 text-right shrink-0 ${
          isUrgent && isMyTurn ? 'text-red-400 timer-urgent' : 'text-slate-300'
        }`}
      >
        {timeRemaining}s
      </span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor} ${isUrgent && isMyTurn ? 'shadow-sm shadow-red-500/50' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
