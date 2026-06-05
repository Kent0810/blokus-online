export type PlayerColor = 'blue' | 'yellow' | 'red' | 'green';
export type CellState = PlayerColor | 'blocked' | null;
export type Board = CellState[][];

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  remainingPieces: string[];
  score: number;
  connected: boolean;
  isBot: boolean;
}

export interface GameMove {
  playerId: string;
  pieceId: string;
  rotation: 0 | 1 | 2 | 3;
  flipped: boolean;
  row: number;
  col: number;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished';
export type RoomStatus = 'lobby' | 'in_game' | 'finished';

export interface GameState {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  status: GameStatus;
  turnTimeLimit: number;
  turnTimeRemaining: number;
  moves: GameMove[];
  winners: string[];
  skippedPlayers: Set<string> | string[];
  startingCorners: Partial<Record<PlayerColor, [number, number]>>;
  powerUpCells: [number, number][];
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: 2 | 3 | 4;
  isPublic: boolean;
  gameState: GameState | null;
  playerIds: string[];
  readyPlayerIds: string[];
  createdAt: number;
}

export interface JoinQueuePayload {
  name: string;
  mode: 2 | 3 | 4;
}
export interface CreateRoomPayload {
  name: string;
  maxPlayers: 2 | 3 | 4;
  turnTimeLimit: number;
}
export interface JoinRoomPayload {
  name: string;
  code: string;
}
export interface PlayerReadyPayload {
  roomId: string;
}
export interface SubmitMovePayload {
  roomId: string;
  move: GameMove;
}
export interface RematchVotePayload {
  roomId: string;
}
export interface LeaveRoomPayload {
  roomId: string;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;
  text: string;
  timestamp: number;
}
export interface ChatPayload {
  roomId: string;
  text: string;
}
export interface ChatUpdatePayload {
  message: ChatMessage;
}

export interface MatchFoundPayload {
  roomId: string;
  code: string;
  playerId: string;
}
export interface RoomUpdatePayload {
  room: Omit<Room, 'gameState'>;
  players: Player[];
}
export interface GameStartPayload {
  gameState: GameState;
}
export interface GameUpdatePayload {
  gameState: GameState;
}
export interface TimerTickPayload {
  timeRemaining: number;
}
export interface GameEndPayload {
  gameState: GameState;
  rankings: Array<{ player: Player; score: number; rank: number }>;
}
export interface ErrorPayload {
  message: string;
  code: string;
}
