import type { GameMove, GameState, Player } from '@blockus/shared';
import {
  applyMove,
  calculateNextTurn,
  calculateScores,
  initializeGame,
  PIECE_IDS,
} from '@blockus/shared';
import type { Server } from 'socket.io';
import { logger } from './logger';

export class GameSession {
  private gameState: GameState;
  private roomId: string;
  private io: Server;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  private socketToPlayer: Map<string, Player> = new Map();
  private socketToPlayerId: Map<string, string>;

  constructor(
    players: Player[],
    socketToPlayerId: Map<string, string>,
    turnTimeLimit: number,
    roomId: string,
    io: Server,
  ) {
    this.roomId = roomId;
    this.io = io;
    this.socketToPlayerId = socketToPlayerId;
    // Build socketId → Player map
    const playerById = new Map(players.map((p) => [p.id, p]));
    for (const [socketId, playerId] of socketToPlayerId) {
      const player = playerById.get(playerId);
      if (player) this.socketToPlayer.set(socketId, player);
    }
    this.gameState = initializeGame(players, turnTimeLimit);
  }

  start() {
    this.io.to(this.roomId).emit('game_start', { gameState: this.serialize() });
    this.startTimer();
    logger.info(`Game started in room ${this.roomId}`);
  }

  getState(): GameState {
    return this.gameState;
  }

  submitMove(socketId: string, move: GameMove): GameState {
    if (this.destroyed) throw new Error('Game is over.');

    const player = this.socketToPlayer.get(socketId);
    if (!player) throw new Error('You are not in this game.');

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (currentPlayer?.id !== player.id) throw new Error('It is not your turn.');

    // Ensure the move has the right playerId
    const validatedMove: GameMove = { ...move, playerId: player.id };

    const afterMove = applyMove(validatedMove, this.gameState);
    const afterTurn = calculateNextTurn(afterMove);

    if (afterTurn.status === 'finished') {
      this.stopTimer();
      this.gameState = calculateScores(afterTurn);
      const rankings = [...this.gameState.players]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ player: p, score: p.score, rank: i + 1 }));
      this.io.to(this.roomId).emit('game_end', {
        gameState: this.serialize(),
        rankings,
      });
      this.destroyed = true;
    } else {
      this.gameState = afterTurn;
      this.io.to(this.roomId).emit('game_update', { gameState: this.serialize() });
      this.resetTimer();
    }

    return this.gameState;
  }

  playerDisconnected(playerId: string) {
    this.gameState = {
      ...this.gameState,
      players: this.gameState.players.map((p) =>
        p.id === playerId ? { ...p, connected: false } : p,
      ),
    };
    this.io.to(this.roomId).emit('game_update', { gameState: this.serialize() });
  }

  playerReconnected(playerId: string) {
    this.gameState = {
      ...this.gameState,
      players: this.gameState.players.map((p) =>
        p.id === playerId ? { ...p, connected: true } : p,
      ),
    };
    this.io.to(this.roomId).emit('game_update', { gameState: this.serialize() });
  }

  private startTimer() {
    const limit = this.gameState.turnTimeLimit;
    if (limit >= 9999) return; // unlimited

    this.timerInterval = setInterval(() => {
      if (this.destroyed) {
        this.stopTimer();
        return;
      }

      this.gameState = {
        ...this.gameState,
        turnTimeRemaining: Math.max(0, this.gameState.turnTimeRemaining - 1),
      };

      this.io.to(this.roomId).emit('timer_tick', {
        timeRemaining: this.gameState.turnTimeRemaining,
      });

      if (this.gameState.turnTimeRemaining <= 0) {
        this.handleTimeout();
      }
    }, 1000);
  }

  private resetTimer() {
    this.stopTimer();
    this.startTimer();
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private handleTimeout() {
    logger.info(`Turn timed out in room ${this.roomId}`);
    const afterTurn = calculateNextTurn(this.gameState);

    if (afterTurn.status === 'finished') {
      this.stopTimer();
      this.gameState = calculateScores(afterTurn);
      const rankings = [...this.gameState.players]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ player: p, score: p.score, rank: i + 1 }));
      this.io.to(this.roomId).emit('game_end', {
        gameState: this.serialize(),
        rankings,
      });
      this.destroyed = true;
    } else {
      this.gameState = afterTurn;
      this.io.to(this.roomId).emit('game_update', { gameState: this.serialize() });
      this.resetTimer();
    }
  }

  // Serialize skippedPlayers as array for JSON transport
  private serialize(): GameState {
    return {
      ...this.gameState,
      skippedPlayers: Array.isArray(this.gameState.skippedPlayers)
        ? this.gameState.skippedPlayers
        : Array.from(this.gameState.skippedPlayers),
    };
  }

  destroy() {
    this.stopTimer();
    this.destroyed = true;
  }

  isDestroyed() {
    return this.destroyed;
  }

  // Rebuild a new session with same players for rematch
  static forRematch(
    session: GameSession,
    turnTimeLimit: number,
    io: Server,
  ): GameSession {
    const players = session.gameState.players.map((p) => ({
      ...p,
      remainingPieces: [...PIECE_IDS],
      score: 0,
    }));
    return new GameSession(
      players,
      session.socketToPlayerId,
      turnTimeLimit,
      session.roomId,
      io,
    );
  }
}
