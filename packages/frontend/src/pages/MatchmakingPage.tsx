import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';
import { emit } from '../socket';

export function MatchmakingPage() {
  const { playerName, setPhase } = useAppStore();

  function handleCancel() {
    emit.leaveQueue();
    setPhase('landing');
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        {/* Animated rings */}
        <div className="relative flex items-center justify-center w-40 h-40">
          <div className="matchmaking-ring absolute w-20 h-20 border-4 border-blue-500/60 rounded-full" />
          <div className="matchmaking-ring absolute w-20 h-20 border-4 border-yellow-500/60 rounded-full" />
          <div className="matchmaking-ring absolute w-20 h-20 border-4 border-red-500/60 rounded-full" />
          {/* Inner icon */}
          <div className="relative z-10 bg-surface rounded-full w-16 h-16 flex items-center justify-center border-2 border-slate-600">
            <div className="grid grid-cols-2 gap-0.5">
              {['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'].map((c, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Finding a match...</h2>
          <p className="text-slate-400 mt-1">
            Hey <span className="text-white font-semibold">{playerName}</span>, looking for opponents
          </p>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-fast" />
          Searching
        </div>

        <Button variant="ghost" onClick={handleCancel} size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
