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
  const {
    gameState,
    playerId,
    roomId,
    rankings,
    phase,
    reset,
    gameMode,
    applyLocalMove,
    localRematch,
    chatMessages,
    addChatMessage,
  } = useAppStore();
  const { selectedPieceId, rotation, flipped, rotate, flip, selectPiece, resetTransform } =
    useGameUIStore();
  const [showHandoff, setShowHandoff] = useState(false);
  const [mobilePlayersOpen, setMobilePlayersOpen] = useState(false);
  const [boardMaxWidth, setBoardMaxWidth] = useState<number | undefined>(() =>
    window.innerWidth < 640 ? window.innerWidth - 16 : undefined,
  );

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

  // Track viewport width for responsive board sizing
  useEffect(() => {
    function update() {
      setBoardMaxWidth(window.innerWidth < 640 ? window.innerWidth - 16 : undefined);
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handlePlace = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || !selectedPieceId || !gameState || showHandoff) return;
      const move = {
        playerId: myPlayer!.id,
        pieceId: selectedPieceId,
        rotation,
        flipped,
        row,
        col,
      };
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
    [
      isMyTurn,
      selectedPieceId,
      gameState,
      showHandoff,
      myPlayer,
      rotation,
      flipped,
      isLocal,
      applyLocalMove,
      resetTransform,
      roomId,
    ],
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

  const nextPlayer = isLocal && gameState ? gameState.players[gameState.currentPlayerIndex] : null;

  const isFirstMove = myPlayer ? myPlayer.remainingPieces.length === 21 : false;

  // Show corner markers for any player who hasn't placed their first piece yet
  const activePlayers = gameState.players
    .filter((p) => p.remainingPieces.length === 21)
    .map((p) => p.color);

  const boardEl = (
    <Board
      board={gameState.board}
      startingCorners={gameState.startingCorners}
      powerUpCells={gameState.powerUpCells ?? []}
      previewCells={showHandoff ? null : (preview?.cells ?? null)}
      previewValid={preview?.valid ?? false}
      previewColor={myPlayer?.color ?? 'blue'}
      activePlayers={activePlayers}
      onPlace={handlePlace}
      disabled={!isMyTurn || !selectedPieceId || showHandoff}
      maxWidth={boardMaxWidth}
    />
  );

  return (
    <div className="min-h-screen bg-app flex flex-col overflow-hidden">
      {/* Handoff overlay (local mode only) */}
      {showHandoff && nextPlayer && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-app/95 backdrop-blur-sm">
          <div className="animate-bounce-in flex flex-col items-center gap-6 text-center p-8">
            <div
              className={`w-20 h-20 rounded-2xl ${COLOR_BG[nextPlayer.color]} flex items-center justify-center text-4xl font-black text-white shadow-2xl`}
            >
              {nextPlayer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">
                Next up
              </p>
              <h2 className="text-3xl font-black text-white">{nextPlayer.name}</h2>
              <p className="text-slate-400 mt-1 capitalize">
                {nextPlayer.color} · {nextPlayer.score} pts
              </p>
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
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-surface border-b border-slate-700/50">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'].map((c, i) => (
            <div key={i} className={`${c} rounded-sm w-3 h-3 sm:w-4 sm:h-4`} />
          ))}
          <span className="text-white font-bold sm:ml-1 text-sm sm:text-base">Blockus</span>
          {isLocal && (
            <span className="ml-1 sm:ml-2 text-xs text-purple-400 bg-purple-900/30 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
              Local
            </span>
          )}
        </div>

        <div className="flex-1 max-w-[120px] sm:max-w-xs mx-2 sm:mx-8">
          <TurnTimer
            timeRemaining={gameState.turnTimeRemaining}
            timeLimit={gameState.turnTimeLimit}
            isMyTurn={!showHandoff}
          />
        </div>

        <div className="text-xs sm:text-sm text-slate-400 text-right">
          <span className="hidden sm:inline">Turn {gameState.turnNumber} · </span>
          <span className="text-white font-semibold truncate max-w-[80px] sm:max-w-none inline-block align-bottom">
            {currentPlayer?.name}
          </span>
        </div>
      </div>

      {/* Desktop layout (≥640px) */}
      <div className="hidden sm:flex flex-1 overflow-hidden">
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
          {isFirstMove && !showHandoff && (
            <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-1.5 animate-fade-in">
              ★ First move: your piece must cover your corner marker on the board
            </div>
          )}
          {boardEl}
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

      {/* Mobile layout (<640px) */}
      <div className="flex sm:hidden flex-1 flex-col overflow-hidden relative">
        {/* Board area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 overflow-auto px-2 py-2">
          {isFirstMove && !showHandoff && (
            <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-1.5 animate-fade-in text-center">
              ★ First move: cover your corner
            </div>
          )}
          {boardEl}
        </div>

        {/* Compact piece strip */}
        <div className="bg-surface border-t border-slate-700/50 px-2 py-2 h-14 safe-bottom">
          {myPlayer && !showHandoff ? (
            <PieceSelector
              remainingPieces={myPlayer.remainingPieces}
              usedPieces={usedPieces}
              playerColor={myPlayer.color}
              disabled={!isMyTurn || showHandoff}
              compact
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              {showHandoff ? 'Waiting for handoff…' : 'Spectating'}
            </div>
          )}
        </div>

        {/* Players floating button */}
        {!mobilePlayersOpen && (
          <button
            onClick={() => setMobilePlayersOpen(true)}
            className="absolute bottom-16 right-3 w-11 h-11 bg-surface-2 border border-slate-600 rounded-full shadow-lg flex items-center justify-center text-lg z-10"
            aria-label="Players & Chat"
          >
            👥
          </button>
        )}

        {/* Players & Chat overlay */}
        {mobilePlayersOpen && (
          <div className="absolute inset-0 bg-app/98 z-20 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-surface sticky top-0">
              <h3 className="text-white font-bold text-sm">Players & Chat</h3>
              <button
                onClick={() => setMobilePlayersOpen(false)}
                className="text-slate-400 hover:text-white text-xl leading-none px-1"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-4 p-4 flex-1">
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
              <button
                onClick={handleLeave}
                className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 transition-colors border border-dashed border-slate-700 rounded-lg mt-2"
              >
                Leave game
              </button>
            </div>
          </div>
        )}
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
