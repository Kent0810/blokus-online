import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getTransformedCells, hasAnyLegalMove, PIECE_IDS } from '@blockus/shared';
import { audioManager } from '../audio/audioManager';

const COLOR_BG: Record<string, string> = {
  blue: 'bg-blue-600',
  yellow: 'bg-yellow-500',
  red: 'bg-red-600',
  green: 'bg-green-600',
};

const MINI_SIZE = 10;
const MINI_PAD = 3;

function PiecePreview({
  pieceId,
  rotation,
  flipped,
  color,
}: {
  pieceId: string;
  rotation: 0 | 1 | 2 | 3;
  flipped: boolean;
  color: string;
}) {
  const colorFill: Record<string, string> = {
    blue: '#3B82F6',
    yellow: '#EAB308',
    red: '#EF4444',
    green: '#22C55E',
  };
  const cells = getTransformedCells(pieceId, rotation, flipped);
  const rows = Math.max(...cells.map(([r]) => r)) + 1;
  const cols = Math.max(...cells.map(([, c]) => c)) + 1;
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const svgW = cols * MINI_SIZE + MINI_PAD * 2;
  const svgH = rows * MINI_SIZE + MINI_PAD * 2;
  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) =>
          cellSet.has(`${r},${c}`) ? (
            <rect
              key={`${r},${c}`}
              x={MINI_PAD + c * MINI_SIZE}
              y={MINI_PAD + r * MINI_SIZE}
              width={MINI_SIZE - 1}
              height={MINI_SIZE - 1}
              fill={colorFill[color] ?? '#888'}
              rx={1.5}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function GamePage() {
  const {
    gameState,
    playerId,
    roomId,
    rankings,
    phase,
    reset,
    gameMode,
    gameVariant,
    applyLocalMove,
    skipLocalChaosTurn,
    localRematch,
    chatMessages,
    addChatMessage,
    playerAvatarMap,
  } = useAppStore();
  const {
    selectedPieceId,
    rotation,
    flipped,
    rotate,
    flip,
    selectPiece,
    selectWithTransform,
    resetTransform,
  } = useGameUIStore();

  // Local handoff state
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffVariant, setHandoffVariant] = useState<'next_player' | 'teams_place'>(
    'next_player',
  );

  // Teams 2v2 sub-phase state
  const [teamsSubPhase, setTeamsSubPhase] = useState<'pick' | 'place'>('pick');
  const [teamsPickedState, setTeamsPickedState] = useState<{
    pieceId: string;
    rotation: 0 | 1 | 2 | 3;
    flipped: boolean;
  } | null>(null);

  const [mobilePlayersOpen, setMobilePlayersOpen] = useState(false);
  const [boardMaxWidth, setBoardMaxWidth] = useState<number | undefined>(() =>
    window.innerWidth < 640 ? window.innerWidth - 16 : undefined,
  );

  const isLocal = gameMode === 'local';
  const isTeams = gameVariant === 'teams';
  const isChaos = gameVariant === 'chaos';

  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const myPlayer = isLocal ? currentPlayer : gameState?.players.find((p) => p.id === playerId);
  const isMyTurn = isLocal ? true : currentPlayer?.id === playerId;

  // Teams: teammate is the diagonal partner (index + 2) % 4
  const teammateIndex =
    isTeams && gameState ? (gameState.currentPlayerIndex + 2) % gameState.players.length : -1;
  const teammatePl =
    isTeams && gameState && teammateIndex >= 0 ? gameState.players[teammateIndex] : null;

  // Chaos: pieces dealt this turn
  const dealtPieces = gameState?.dealtPieces ?? [];

  // Piece selector filtering
  const selectorRemaining =
    isTeams && teamsSubPhase === 'place' && teamsPickedState
      ? [teamsPickedState.pieceId]
      : isChaos
        ? dealtPieces
        : (myPlayer?.remainingPieces ?? []);

  const usedPieces = myPlayer
    ? PIECE_IDS.filter((id) => !myPlayer.remainingPieces.includes(id))
    : [];

  // Chaos: check if any dealt piece has a legal move (so we know when Skip is valid)
  const chaosCanPass = useMemo(() => {
    if (!isChaos || !myPlayer || !gameState || dealtPieces.length === 0) return false;
    const phantom = { ...myPlayer, remainingPieces: dealtPieces };
    const phantomState = {
      ...gameState,
      variant: 'standard' as const,
      players: gameState.players.map((p) => (p.id === phantom.id ? phantom : p)),
    };
    return !hasAnyLegalMove(phantom, phantomState);
  }, [isChaos, myPlayer, gameState, dealtPieces]);

  const previewPlayerId = myPlayer?.id ?? '';
  const preview = useHoverPreview(showHandoff ? null : gameState, previewPlayerId);

  const skippedPlayers = Array.isArray(gameState?.skippedPlayers)
    ? (gameState.skippedPlayers as string[])
    : gameState?.skippedPlayers
      ? Array.from(gameState.skippedPlayers as Set<string>)
      : [];

  // Sound: game start fanfare
  useEffect(() => {
    audioManager.playSound('gameStart');
  }, []);

  // Sound: chime when it becomes my turn
  const prevCurrentIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const idx = gameState?.currentPlayerIndex ?? null;
    if (
      idx !== null &&
      idx !== prevCurrentIndexRef.current &&
      !isLocal &&
      currentPlayer?.id === playerId
    ) {
      audioManager.playSound('turnStart');
    }
    prevCurrentIndexRef.current = idx;
  }, [gameState?.currentPlayerIndex, currentPlayer?.id, playerId, isLocal]);

  // Sound: game over
  const gameEndFiredRef = useRef(false);
  useEffect(() => {
    if (phase === 'game_over' && !gameEndFiredRef.current) {
      gameEndFiredRef.current = true;
      audioManager.playSound('gameEnd');
    }
    if (phase !== 'game_over') {
      gameEndFiredRef.current = false;
    }
  }, [phase]);

  // Sound: invalid move (error banner)
  const { error } = useAppStore();
  useEffect(() => {
    if (error) audioManager.playSound('invalid');
  }, [error]);

  // Reset teams sub-phase when turn advances
  const prevTurnRef = useRef<number | null>(null);
  useEffect(() => {
    const turn = gameState?.turnNumber ?? null;
    if (turn !== null && turn !== prevTurnRef.current && isTeams) {
      setTeamsSubPhase('pick');
      setTeamsPickedState(null);
    }
    prevTurnRef.current = turn;
  }, [gameState?.turnNumber, isTeams]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (showHandoff) return;
      if (isTeams && teamsSubPhase === 'place') return; // locked during place
      if (e.key === 'r' || e.key === 'R') rotate();
      if (e.key === 'f' || e.key === 'F') flip();
      if (e.key === 'Escape') selectPiece(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotate, flip, selectPiece, showHandoff, isTeams, teamsSubPhase]);

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
      // Teams pick phase: clicking board does nothing — player uses Confirm Pick button
      if (isTeams && teamsSubPhase === 'pick') return;
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
          audioManager.playSound('place');
          resetTransform();
          if (isTeams) {
            setTeamsSubPhase('pick');
            setTeamsPickedState(null);
          }
          const nextState = useAppStore.getState().gameState;
          if (nextState && nextState.status !== 'finished') {
            setHandoffVariant('next_player');
            setShowHandoff(true);
          }
        }
      } else {
        audioManager.playSound('place');
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
      isTeams,
      teamsSubPhase,
      applyLocalMove,
      resetTransform,
      roomId,
    ],
  );

  function handleTeamsConfirmPick() {
    if (!selectedPieceId) return;
    setTeamsPickedState({ pieceId: selectedPieceId, rotation, flipped });
    setHandoffVariant('teams_place');
    setShowHandoff(true);
  }

  function handleHandoffContinue() {
    if (handoffVariant === 'teams_place' && teamsPickedState) {
      setTeamsSubPhase('place');
      selectWithTransform(
        teamsPickedState.pieceId,
        teamsPickedState.rotation,
        teamsPickedState.flipped,
      );
    } else {
      resetTransform();
    }
    setHandoffVariant('next_player');
    setShowHandoff(false);
  }

  function handleRematch() {
    if (isLocal) {
      localRematch();
      setShowHandoff(false);
      setTeamsSubPhase('pick');
      setTeamsPickedState(null);
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

  const nextPlayer = isLocal && gameState ? gameState.players[gameState.currentPlayerIndex] : null;
  const isFirstMove = myPlayer ? myPlayer.remainingPieces.length === 21 : false;

  // Board disabled logic — pick/place sub-phase only applies in local hot-seat mode
  const boardDisabled =
    (isLocal && isTeams && teamsSubPhase === 'pick') ||
    !isMyTurn ||
    !selectedPieceId ||
    showHandoff;

  // Show corner markers for any player who hasn't placed their first piece yet
  const activePlayers = gameState.players
    .filter((p) => p.remainingPieces.length === 21)
    .map((p) => p.color);

  const variantLabel =
    gameVariant === 'teams' ? 'Teams 2v2' : gameVariant === 'chaos' ? 'Chaos' : 'Local';

  const boardEl = (
    <Board
      board={gameState.board}
      startingCorners={gameState.startingCorners}
      powerUpCells={gameState.powerUpCells ?? []}
      previewCells={
        showHandoff || (isLocal && isTeams && teamsSubPhase === 'pick')
          ? null
          : (preview?.cells ?? null)
      }
      previewValid={preview?.valid ?? false}
      previewColor={myPlayer?.color ?? 'blue'}
      activePlayers={activePlayers}
      onPlace={handlePlace}
      disabled={boardDisabled}
      maxWidth={boardMaxWidth}
    />
  );

  const pieceSelectorEl = (compact = false) =>
    myPlayer ? (
      <PieceSelector
        remainingPieces={selectorRemaining}
        usedPieces={isChaos || (isTeams && teamsSubPhase === 'place') ? [] : usedPieces}
        playerColor={myPlayer.color}
        disabled={
          !isMyTurn || showHandoff || (isTeams && teamsSubPhase === 'place') // locked during place phase
        }
        compact={compact}
      />
    ) : (
      <p className="text-slate-500 text-sm">Spectating</p>
    );

  return (
    <div className="min-h-screen bg-app flex flex-col overflow-hidden">
      {/* Handoff overlay (local mode only) */}
      {showHandoff && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-app/95 backdrop-blur-sm">
          <div className="animate-bounce-in flex flex-col items-center gap-6 text-center p-8">
            {handoffVariant === 'teams_place' && teamsPickedState && currentPlayer && teammatePl ? (
              <>
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl ${COLOR_BG[currentPlayer.color]} flex items-center justify-center text-2xl font-black text-white shadow-lg`}
                  >
                    {currentPlayer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-slate-300 text-2xl">→</div>
                  <div
                    className={`w-14 h-14 rounded-xl ${COLOR_BG[teammatePl.color]} flex items-center justify-center text-2xl font-black text-white shadow-lg`}
                  >
                    {teammatePl.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
                    Teams — Place phase
                  </p>
                  <h2 className="text-2xl font-black text-white">
                    {currentPlayer.name} picked a piece
                  </h2>
                  <p className="text-slate-400 mt-1">
                    Hand device to {teammatePl.name} to place it
                  </p>
                </div>
                <div className="bg-surface rounded-xl p-4 flex flex-col items-center gap-2">
                  <PiecePreview
                    pieceId={teamsPickedState.pieceId}
                    rotation={teamsPickedState.rotation}
                    flipped={teamsPickedState.flipped}
                    color={currentPlayer.color}
                  />
                  <p className="text-xs text-[#7b94b9]">{teamsPickedState.pieceId}</p>
                </div>
              </>
            ) : (
              nextPlayer && (
                <>
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
                </>
              )
            )}
            <button
              onClick={handleHandoffContinue}
              className="bg-accent hover:bg-accent-hover text-white font-bold px-10 py-4 rounded-xl text-lg transition-all shadow-lg shadow-accent/20 mt-2"
            >
              I'm ready →
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-surface border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'].map((c, i) => (
            <div key={i} className={`${c} rounded-sm w-3 h-3 sm:w-4 sm:h-4`} />
          ))}
          <span className="text-white font-bold sm:ml-1 text-sm sm:text-base">Blockus</span>
          {isLocal && (
            <span className="ml-1 sm:ml-2 text-xs text-purple-400 bg-purple-900/30 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
              {variantLabel}
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
        <aside className="w-52 shrink-0 bg-surface border-r border-white/[0.06] p-4 overflow-y-auto flex flex-col gap-3">
          {/* Chaos: dealt hand label */}
          {isChaos && isMyTurn && !showHandoff && (
            <div className="bg-purple-900/30 border border-purple-700/40 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider mb-0.5">
                Chaos — Dealt hand
              </p>
              <p className="text-xs text-[#7b94b9]">Play 1 of these {dealtPieces.length} pieces</p>
            </div>
          )}
          {/* Teams: pick/place label */}
          {isTeams && isMyTurn && !showHandoff && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider mb-0.5">
                Teams — {teamsSubPhase === 'pick' ? 'Pick phase' : 'Place phase'}
              </p>
              <p className="text-xs text-[#7b94b9]">
                {teamsSubPhase === 'pick'
                  ? `${currentPlayer?.name}: choose a piece for ${teammatePl?.name} to place`
                  : `${teammatePl?.name}: place the chosen piece`}
              </p>
            </div>
          )}
          {pieceSelectorEl(false)}
          {/* Teams confirm pick button — local only */}
          {isLocal && isTeams && teamsSubPhase === 'pick' && isMyTurn && !showHandoff && (
            <button
              onClick={handleTeamsConfirmPick}
              disabled={!selectedPieceId}
              className="mt-auto w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
            >
              Confirm pick →
            </button>
          )}
          {/* Chaos pass button */}
          {isChaos && chaosCanPass && isMyTurn && !showHandoff && (
            <button
              onClick={() => {
                skipLocalChaosTurn();
                resetTransform();
                const nextState = useAppStore.getState().gameState;
                if (nextState && nextState.status !== 'finished') {
                  setHandoffVariant('next_player');
                  setShowHandoff(true);
                }
              }}
              className="mt-auto w-full py-2.5 rounded-lg bg-surface-2 hover:bg-white/[0.08] text-[#7b94b9] hover:text-[#eef2ff] font-semibold text-sm transition-all border border-dashed border-white/[0.1]"
            >
              No moves — Skip hand
            </button>
          )}
        </aside>

        {/* Center: Board */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 gap-2 overflow-auto">
          {isFirstMove && !showHandoff && (
            <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-1.5 animate-fade-in">
              ★ First move: your piece must cover your corner marker on the board
            </div>
          )}
          {isLocal && isTeams && teamsSubPhase === 'pick' && !showHandoff && selectedPieceId && (
            <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-1.5 animate-fade-in">
              Choose orientation with R / F — then click Confirm pick
            </div>
          )}
          {boardEl}
        </main>

        {/* Right: Players + Chat */}
        <aside className="w-60 shrink-0 bg-surface border-l border-white/[0.06] p-4 overflow-y-auto flex flex-col">
          <PlayerPanel
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            myPlayerId={myPlayer?.id ?? playerId}
            skippedPlayers={skippedPlayers}
            avatarMap={playerAvatarMap}
          />
          <Chat
            messages={chatMessages}
            myPlayerId={myPlayer?.id ?? playerId}
            avatarMap={playerAvatarMap}
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
          {isChaos && isMyTurn && !showHandoff && (
            <div className="text-xs text-purple-300 bg-purple-900/20 border border-purple-700/30 rounded-lg px-3 py-1.5 text-center">
              Chaos: play 1 of {dealtPieces.length} dealt pieces
            </div>
          )}
          {isTeams && isMyTurn && !showHandoff && (
            <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-1.5 text-center">
              {teamsSubPhase === 'pick'
                ? `${currentPlayer?.name}: pick a piece`
                : `${teammatePl?.name}: place it`}
            </div>
          )}
          {boardEl}
        </div>

        {/* Compact piece strip */}
        <div className="bg-surface border-t border-white/[0.06] px-2 py-2 safe-bottom flex items-center gap-2">
          {myPlayer && !showHandoff ? (
            <>
              <div className="flex-1 overflow-hidden">{pieceSelectorEl(true)}</div>
              {isLocal && isTeams && teamsSubPhase === 'pick' && isMyTurn && (
                <button
                  onClick={handleTeamsConfirmPick}
                  disabled={!selectedPieceId}
                  className="shrink-0 h-10 px-3 rounded-lg bg-accent text-white text-xs font-bold disabled:opacity-30 transition-all"
                >
                  Pick →
                </button>
              )}
              {isChaos && chaosCanPass && isMyTurn && (
                <button
                  onClick={() => {
                    skipLocalChaosTurn();
                    resetTransform();
                    const nextState = useAppStore.getState().gameState;
                    if (nextState && nextState.status !== 'finished') {
                      setHandoffVariant('next_player');
                      setShowHandoff(true);
                    }
                  }}
                  className="shrink-0 h-10 px-3 rounded-lg bg-surface-2 text-[#7b94b9] text-xs font-medium border border-white/10 transition-all"
                >
                  Skip
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-10 w-full text-slate-500 text-sm">
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-surface sticky top-0">
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
                avatarMap={playerAvatarMap}
              />
              <Chat
                messages={chatMessages}
                myPlayerId={myPlayer?.id ?? playerId}
                avatarMap={playerAvatarMap}
                onSend={handleSendChat}
              />
              <button
                onClick={handleLeave}
                className="w-full text-xs text-[#7b94b9] hover:text-[#eef2ff] py-2 transition-colors border border-dashed border-white/10 hover:border-white/20 rounded-lg mt-2"
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
