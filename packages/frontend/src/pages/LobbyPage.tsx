import { Button } from '../components/ui/Button';
import { PlayerSlot } from '../components/lobby/PlayerSlot';
import { RoomCode } from '../components/lobby/RoomCode';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppStore } from '../store/appStore';
import { emit } from '../socket';

export function LobbyPage() {
  const { room, players, playerId, roomId, roomCode } = useAppStore();

  if (!room || !roomId || !roomCode) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-blue-500" />
      </div>
    );
  }

  const isReady = room.readyPlayerIds.includes(playerId);
  const allReady = players.length === room.maxPlayers && players.every((p) => room.readyPlayerIds.includes(p.id));
  const slots = Array.from({ length: room.maxPlayers });

  function handleReady() {
    emit.playerReady({ roomId: roomId! });
  }

  function handleLeave() {
    emit.leaveRoom({ roomId: roomId! });
    useAppStore.getState().reset();
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Game Lobby</h1>
          <p className="text-slate-400 mt-1">{room.maxPlayers}-Player Game</p>
        </div>

        {/* Room code */}
        <div className="bg-surface rounded-2xl p-6 border border-slate-700/50 mb-4 flex items-center justify-center">
          <RoomCode code={roomCode} />
        </div>

        {/* Player slots */}
        <div className="bg-surface rounded-2xl p-6 border border-slate-700/50 mb-4">
          <div className="flex flex-col gap-3">
            {slots.map((_, i) => (
              <PlayerSlot
                key={i}
                player={players[i]}
                index={i}
                isReady={players[i] ? room.readyPlayerIds.includes(players[i].id) : false}
                isYou={players[i]?.id === playerId}
              />
            ))}
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex flex-col gap-3">
          {allReady ? (
            <div className="text-center text-green-400 font-semibold animate-pulse-fast">
              All ready! Starting game...
            </div>
          ) : (
            <p className="text-center text-slate-500 text-sm">
              {players.length} / {room.maxPlayers} players joined
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleLeave} className="flex-1">
              Leave
            </Button>
            <Button
              onClick={handleReady}
              disabled={isReady}
              className="flex-1"
              variant={isReady ? 'secondary' : 'primary'}
            >
              {isReady ? '✓ Ready!' : 'Ready Up'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
