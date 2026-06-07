import { create } from 'zustand';
import type { ChatMessage, GameState, GameMove, Player, Room } from '@blockus/shared';
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
  setupLocalGame: (playerNames: string[], avatars: string[], turnTimeLimit: number) => void;
  applyLocalMove: (move: GameMove) => boolean;
  localRematch: () => void;
  resetToLanding: () => void;
  reset: () => void;
}

const initialState = {
  phase: 'landing' as AppPhase,
  gameMode: 'online' as GameMode,
  playerName: localStorage.getItem('blockus_name') ?? '',
  playerId: '',
  playerAvatar: (() => {
    const stored = localStorage.getItem('blockus_avatar');
    return stored && (AVATARS as readonly string[]).includes(stored) ? stored : DEFAULT_AVATAR;
  })(),
  playerAvatarMap: {} as Record<string, string>,
  roomId: null,
  roomCode: null,
  room: null,
  players: [],
  gameState: null,
  rankings: null,
  connectionState: 'disconnected' as const,
  error: null,
  chatMessages: [] as ChatMessage[],
};

const COLORS = ['blue', 'yellow', 'red', 'green'] as const;

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

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

  setGameState: (gameState) => set({ gameState, phase: 'game' }),

  setGameEnd: (gameState, rankings) => set({ gameState, rankings, phase: 'game_over' }),

  setConnectionState: (connectionState) => set({ connectionState }),

  setError: (error) => set({ error }),

  addChatMessage: (message) => set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  setupLocalGame: (playerNames, avatars, turnTimeLimit) => {
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
    const gameState = initializeGame(players, turnTimeLimit);
    set({
      gameMode: 'local',
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
        const rankings = [...scored.players]
          .sort((a, b) => b.score - a.score)
          .map((player, i) => ({ player, score: player.score, rank: i + 1 }));
        set({ gameState: scored, rankings, phase: 'game_over' });
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

  localRematch: () => {
    const { players, playerAvatarMap } = get();
    if (!players.length) return;
    get().setupLocalGame(
      players.map((p) => p.name),
      players.map((p) => playerAvatarMap[p.id] ?? DEFAULT_AVATAR),
      0,
    );
  },

  resetToLanding: () => set({ ...initialState }),

  reset: () => set({ ...initialState }),
}));
