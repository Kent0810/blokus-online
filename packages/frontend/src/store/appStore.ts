import { create } from 'zustand';
import type { ChatMessage, GameState, GameMove, GameVariant, Player, Room } from '@blockus/shared';
import {
  applyMove,
  calculateNextTurn,
  calculateScores,
  initializeGame,
  PIECE_IDS,
} from '@blockus/shared';
import type { GameEndPayload } from '@blockus/shared';
import { DEFAULT_AVATAR, AVATARS } from '../constants/avatars';

export type AppPhase = 'landing' | 'local_setup' | 'matchmaking' | 'lobby' | 'game' | 'game_over';
export type GameMode = 'online' | 'local';

interface AppStore {
  phase: AppPhase;
  gameMode: GameMode;
  gameVariant: GameVariant;
  playerName: string;
  playerId: string;
  playerAvatar: string;
  playerAvatarMap: Record<string, string>;
  roomId: string | null;
  roomCode: string | null;
  room: Omit<Room, 'gameState'> | null;
  players: Player[];
  gameState: GameState | null;
  rankings: GameEndPayload['rankings'] | null;
  connectionState: 'connected' | 'disconnected' | 'reconnecting';
  error: string | null;
  chatMessages: ChatMessage[];

  setPhase: (phase: AppPhase) => void;
  setPlayer: (name: string, id: string) => void;
  setPlayerName: (name: string) => void;
  setAvatar: (avatar: string) => void;
  setMatchFound: (roomId: string, code: string, playerId: string) => void;
  setRoom: (room: Omit<Room, 'gameState'>, players: Player[]) => void;
  setGameState: (gameState: GameState) => void;
  setGameEnd: (gameState: GameState, rankings: GameEndPayload['rankings']) => void;
  setConnectionState: (state: 'connected' | 'disconnected' | 'reconnecting') => void;
  setError: (error: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  setupLocalGame: (
    playerNames: string[],
    avatars: string[],
    turnTimeLimit: number,
    variant?: GameVariant,
  ) => void;
  applyLocalMove: (move: GameMove) => boolean;
  skipLocalChaosTurn: () => void;
  localRematch: () => void;
  resetToLanding: () => void;
  reset: () => void;
}

function makeInitialState() {
  const storedAvatar = localStorage.getItem('blockus_avatar');
  return {
    phase: 'landing' as AppPhase,
    gameMode: 'online' as GameMode,
    gameVariant: 'standard' as GameVariant,
    playerName: localStorage.getItem('blockus_name') ?? '',
    playerId: '',
    playerAvatar:
      storedAvatar && (AVATARS as readonly string[]).includes(storedAvatar)
        ? storedAvatar
        : DEFAULT_AVATAR,
    playerAvatarMap: {} as Record<string, string>,
    roomId: null as string | null,
    roomCode: null as string | null,
    room: null as Omit<Room, 'gameState'> | null,
    players: [] as Player[],
    gameState: null as GameState | null,
    rankings: null as GameEndPayload['rankings'] | null,
    connectionState: 'disconnected' as const,
    error: null as string | null,
    chatMessages: [] as ChatMessage[],
  };
}

const COLORS = ['blue', 'yellow', 'red', 'green'] as const;

function finishGame(state: GameState): {
  gameState: GameState;
  rankings: GameEndPayload['rankings'];
  phase: AppPhase;
} {
  const rankings = [...state.players]
    .sort((a, b) => b.score - a.score)
    .map((player, i) => ({ player, score: player.score, rank: i + 1 }));
  return { gameState: state, rankings, phase: 'game_over' };
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...makeInitialState(),

  setPhase: (phase) => set({ phase }),

  setPlayer: (name, id) => {
    if (name) localStorage.setItem('blockus_name', name);
    set({ playerName: name, playerId: id });
  },

  setPlayerName: (name) => {
    localStorage.setItem('blockus_name', name);
    set({ playerName: name });
  },

  setAvatar: (avatar) => {
    localStorage.setItem('blockus_avatar', avatar);
    set((state) => ({
      playerAvatar: avatar,
      playerAvatarMap: state.playerId
        ? { ...state.playerAvatarMap, [state.playerId]: avatar }
        : state.playerAvatarMap,
    }));
  },

  setMatchFound: (roomId, code, playerId) =>
    set((state) => ({
      roomId,
      roomCode: code,
      phase: 'lobby',
      playerId,
      playerAvatarMap: { ...state.playerAvatarMap, [playerId]: state.playerAvatar },
    })),

  setRoom: (room, players) =>
    set({
      room,
      players,
      roomId: room.id,
      roomCode: room.code,
    }),

  setGameState: (gameState) =>
    set({ gameState, phase: 'game', gameVariant: gameState.variant ?? 'standard' }),

  setGameEnd: (gameState, rankings) =>
    set({ gameState, rankings, phase: 'game_over', gameVariant: gameState.variant ?? 'standard' }),

  setConnectionState: (connectionState) => set({ connectionState }),

  setError: (error) => set({ error }),

  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  setupLocalGame: (playerNames, avatars, turnTimeLimit, variant = 'standard') => {
    const players: Player[] = playerNames.map((name, i) => ({
      id: `local-${i}`,
      name,
      color: COLORS[i],
      remainingPieces: [...PIECE_IDS],
      score: 0,
      connected: true,
      isBot: false,
    }));
    const avatarMap = Object.fromEntries(
      players.map((p, i) => [p.id, avatars[i] ?? DEFAULT_AVATAR]),
    );
    const gameState = initializeGame(players, turnTimeLimit, variant);
    set({
      gameMode: 'local',
      gameVariant: variant,
      players,
      gameState,
      phase: 'game',
      rankings: null,
      playerAvatarMap: avatarMap,
    });
  },

  applyLocalMove: (move) => {
    const { gameState } = get();
    if (!gameState) return false;
    try {
      const afterMove = applyMove(move, gameState);
      const afterTurn = calculateNextTurn(afterMove);
      if (afterTurn.status === 'finished') {
        const scored = calculateScores(afterTurn);
        set(finishGame(scored));
      } else {
        set({ gameState: afterTurn });
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid move';
      set({ error: msg });
      setTimeout(() => set({ error: null }), 3000);
      return false;
    }
  },

  skipLocalChaosTurn: () => {
    const { gameState } = get();
    if (!gameState) return;
    const next = calculateNextTurn(gameState);
    if (next.status === 'finished') {
      set(finishGame(next));
    } else {
      set({ gameState: next });
    }
  },

  localRematch: () => {
    const { players, playerAvatarMap, gameVariant } = get();
    if (!players.length) return;
    get().setupLocalGame(
      players.map((p) => p.name),
      players.map((p) => playerAvatarMap[p.id] ?? DEFAULT_AVATAR),
      0,
      gameVariant,
    );
  },

  resetToLanding: () => set(makeInitialState()),

  reset: () => set(makeInitialState()),
}));
