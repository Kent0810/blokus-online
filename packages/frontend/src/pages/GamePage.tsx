import { useCallback, useEffect, useState } from 'react';
import { Board } from '../components/game/Board';
import { Chat } from '../components/game/Chat';
import { PieceSelector } from '../components/game/PieceSelector';
import { PlayerPanel } from '../components/game/PlayerPanel';
import { TurnTimer } from '../components/game/TurnTimer';
import { GameOverModal } from '../components/game/GameOverModal';
import { useAppStore } from '../store/appStore';
import { useGameUIStore } from '../store/gameUIStore';
import { useHoverPreview } from '../hooks/usePieceTransform';
import { emit } from '../socket';
import { PIECE_IDS } from '@blockus/shared';

const COLOR_BG: Record<string, string> = {
  blue: 'bg-blue-600',
  yellow: 'bg-yellow-500',
  red: 'bg-red-600',
  green: 'bg-green-600',
};

export function GamePage() {
  const { gameState, playerId, roomId, rankings, phase, reset, gameMode, applyLocalMove, localRematch, chatMessages, addChatMessage } = useAppStore();
  const { selectedPieceId, rotation, flipped, rotate, flip, selectPiece, resetTransform } = useGameUIStore();
  const [showHandoff, setShowHandoff] = useState(false);

  const isLocal = gameMode === 'local';
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];

  // In local mode the active player is always "me"; in online mode match by playerId
  const myPlayer = isLocal ? currentPlayer : gameState?.players.find((p) => p.id === playerId);
  const isMyTurn = isLocal ? true : currentPlayer?.id === playerId;

  const previewPlayerId = myPlayer?.id ?? '';
  const preview = useHoverPreview(showHandoff ? null : gameState, previewPlayerId);

  const skippedPlayers = Array.isArray(gameState?.skippedPlayers)
    ? (gameState.skippedPlayers as string[])
    : gameState?.skippedPlayers
    ? Array.from(gameState.skippedPlayers as Set<string>)
    : [];

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (showHandoff) return;
      if (e.key === 'r' || e.key === 'R') rotate();
      if (e.key === 'f' || e.key === 'F') flip();
      if (e.key === 'Escape') selectPiece(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotate, flip, selectPiece, showHandoff]);

  const handlePlace = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || !selectedPieceId || !gameState || showHandoff) return;
      const move = { playerId: myPlayer!.id, pieceId: selectedPieceId, rotation, flipped, row, col };
      if (isLocal) {
        const success = applyLocalMove(move);
        if (success) {
          resetTransform();
          const nextState = useAppStore.getState().gameState;
          if (nextState && nextState.status !== 'finished') {
            setShowHandoff(true);
          }
        }
      } else {
        emit.submitMove({ roomId: roomId!, move });
        resetTransform();
      }
    },
    [isMyTurn, selectedPieceId, gameState, showHandoff, myPlayer, rotation, flipped, isLocal, applyLocalMove, resetTransform, roomId],
  );

  function handleHandoffContinue() {
    setShowHandoff(false);
    resetTransform();
  }

  function handleRematch() {
    if (isLocal) {
      localRematch();
      setShowHandoff(false);
    } else if (roomId) {
      emit.rematchVote({ roomId });
    }
  }

  function handleLeave() {
    if (!isLocal && roomId) emit.leaveRoom({ roomId });
    setShowHandoff(false);
    reset();
  }

  const handleSendChat = useCallback(
    (text: string) => {
      if (isLocal) {
        const player = currentPlayer;
        if (player) {
          addChatMessage({
            playerId: player.id,
            playerName: player.name,
            playerColor: player.color,
            text,
            timestamp: Date.now(),
          });
        }
      } else if (roomId) {
        emit.chat({ roomId, text });
      }
    },
    [isLocal, currentPlayer, addChatMessage, roomId],
  );

  if (!gameState) return null;

  const usedPieces = myPlayer
    ? PIECE_IDS.filter((id) => !myPlayer.remainingPieces.includes(id))
    : [];

  const nextPlayer = isLocal && gameState
    ? gameState.players[gameState.currentPlayerIndex]
    : null;

  const isFirstMove = myPlayer ? myPlayer.remainingPieces.length === 21 : false;

  // Show corner markers for any player who hasn't placed their first piece yet
  const activePlayers = gameState.players
    .filter((p) => p.remainingPieces.length === 21)
    .map((p) => p.color);

  return (
    <div className="min-h-screen bg-app flex flex-col overflow-hidden">
      {/* Handoff overlay (local mode only) */}
      {showHandoff && nextPlayer && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-app/95 backdrop-blur-sm">
          <div className="animate-bounce-in flex flex-col items-center gap-6 text-center p-8">
            <div className={`w-20 h-20 rounded-2xl ${COLOR_BG[nextPlayer.color]} flex items-center justify-center text-4xl font-black text-white shadow-2xl`}>
              {nextPlayer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">Next up</p>
              <h2 className="text-3xl font-black text-white">{nextPlayer.name}</h2>
              <p className="text-slate-400 mt-1 capitalize">{nextPlayer.color} · {nextPlayer.score} pts</p>
            </div>
            <p className="text-slate-500 text-sm">Hand the device to {nextPlayer.name}</p>
            <button
              onClick={handleHandoffContinue}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all shadow-lg shadow-blue-900/30 mt-2"
            >
              I'm ready →
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          {['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'].map((c, i) => (
            <div key={i} className={`${c} rounded-sm w-4 h-4`} />
          ))}
          <span className="text-white font-bold ml-1">Blockus</span>
          {isLocal && (
            <span className="ml-2 text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded-full font-medium">
              Local
            </span>
          )}
        </div>

        <div className="flex-1 max-w-xs mx-8">
          <TurnTimer
            timeRemaining={gameState.turnTimeRemaining}
            timeLimit={gameState.turnTimeLimit}
            isMyTurn={!showHandoff}
          />
        </div>

        <div className="text-sm text-slate-400">
          Turn {gameState.turnNumber} ·{' '}
          <span className="text-white font-semibold">{currentPlayer?.name}'s turn</span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Piece selector */}
        <aside className="w-52 shrink-0 bg-surface border-r border-slate-700/50 p-4 overflow-y-auto">
          {myPlayer ? (
            <PieceSelector
              remainingPieces={myPlayer.remainingPieces}
              usedPieces={usedPieces}
              playerColor={myPlayer.color}
              disabled={!isMyTurn || showHandoff}
            />
          ) : (
            <p className="text-slate-500 text-sm">Spectating</p>
          )}
        </aside>

        {/* Center: Board */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-2 overflow-auto">
          {/* First-move hint */}
          {isFirstMove && !showHandoff && (
            <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-1.5 animate-fade-in">
              ★ First move: your piece must cover your corner marker on the board
            </div>
          )}
          <Board
            board={gameState.board}
            startingCorners={gameState.startingCorners}
            powerUpCells={gameState.powerUpCells ?? []}
            previewCells={showHandoff ? null : preview?.cells ?? null}
            previewValid={preview?.valid ?? false}
            previewColor={myPlayer?.color ?? 'blue'}
            activePlayers={activePlayers}
            onPlace={handlePlace}
            disabled={!isMyTurn || !selectedPieceId || showHandoff}
          />
        </main>

        {/* Right: Players + Chat */}
        <aside className="w-60 shrink-0 bg-surface border-l border-slate-700/50 p-4 overflow-y-auto flex flex-col">
          <PlayerPanel
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            myPlayerId={myPlayer?.id ?? playerId}
            skippedPlayers={skippedPlayers}
          />
          <Chat
            messages={chatMessages}
            myPlayerId={myPlayer?.id ?? playerId}
            onSend={handleSendChat}
          />
          <div className="mt-4">
            <button
              onClick={handleLeave}
              className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors"
            >
              Leave game
            </button>
          </div>
        </aside>
      </div>

      {/* Game over */}
      <GameOverModal
        open={phase === 'game_over'}
        rankings={rankings ?? []}
        myPlayerId={myPlayer?.id ?? playerId}
        onRematch={handleRematch}
        onLeave={handleLeave}
      />
    </div>
  );
}
