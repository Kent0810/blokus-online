import { describe, expect, it } from 'vitest';
import {
  applyMove,
  calculateNextTurn,
  flipPiece,
  hasAnyLegalMove,
  initializeGame,
  rotatePiece,
  validateMove
} from '../gameEngine';
import type { GameMove, Player } from '../types';

const createPlayers = (): Player[] => [
  { id: 'p1', name: 'Alice', color: 'blue', remainingPieces: [], score: 0, connected: true, isBot: false },
  { id: 'p2', name: 'Bob', color: 'yellow', remainingPieces: [], score: 0, connected: true, isBot: false }
];

describe('gameEngine', () => {
  it('rotates pieces 0, 90, 180, and 270 degrees', () => {
    const l4: [number, number][] = [[0, 0], [1, 0], [2, 0], [2, 1]];
    expect(rotatePiece(l4, 0)).toEqual([[0, 0], [1, 0], [2, 0], [2, 1]]);
    expect(rotatePiece(l4, 1)).toEqual([[0, 0], [0, 1], [0, 2], [1, 0]]);
    expect(rotatePiece(l4, 2)).toEqual([[0, 0], [0, 1], [1, 1], [2, 1]]);
    expect(rotatePiece(l4, 3)).toEqual([[0, 2], [1, 0], [1, 1], [1, 2]]);
  });

  it('flips pieces horizontally and normalizes them', () => {
    const piece: [number, number][] = [[0, 1], [1, 0], [1, 1]];
    expect(flipPiece(piece)).toEqual([[0, 0], [1, 0], [1, 1]]);
  });

  it('validates moves including corner, overlap, edge touch, and bounds checks', () => {
    let state = initializeGame(createPlayers(), 60);
    const validMove: GameMove = { playerId: 'p1', pieceId: 'I1', rotation: 0, flipped: false, row: 0, col: 0 };
    expect(validateMove(validMove, state)).toEqual({ valid: true });

    state = applyMove(validMove, state);
    state = { ...state, currentPlayerIndex: 1 };
    expect(validateMove({ playerId: 'p2', pieceId: 'I1', rotation: 0, flipped: false, row: 0, col: 0 }, state)).toEqual({
      valid: false,
      error: 'Move overlaps an existing piece.'
    });

    state = applyMove({ playerId: 'p2', pieceId: 'I1', rotation: 0, flipped: false, row: 0, col: 19 }, state);
    state = { ...state, currentPlayerIndex: 0 };
    expect(validateMove({ playerId: 'p1', pieceId: 'I2', rotation: 0, flipped: false, row: 0, col: 1 }, state)).toEqual({
      valid: false,
      error: 'Pieces of the same color cannot touch edge-to-edge.'
    });
    expect(validateMove({ playerId: 'p1', pieceId: 'I2', rotation: 0, flipped: false, row: -1, col: 0 }, state)).toEqual({
      valid: false,
      error: 'Move is out of bounds.'
    });
    expect(validateMove({ playerId: 'p1', pieceId: 'I2', rotation: 0, flipped: false, row: 2, col: 2 }, state)).toEqual({
      valid: false,
      error: 'Move must touch one of your existing pieces corner-to-corner.'
    });
  });

  it('applies moves immutably and updates score and pieces', () => {
    const state = initializeGame(createPlayers(), 60);
    const next = applyMove({ playerId: 'p1', pieceId: 'I1', rotation: 0, flipped: false, row: 0, col: 0 }, state);
    expect(state.board[0][0]).toBeNull();
    expect(next.board[0][0]).toBe('blue');
    expect(next.players[0].score).toBe(1);
    expect(next.players[0].remainingPieces).not.toContain('I1');
    expect(next.moves).toHaveLength(1);
  });

  it('skips players with no legal moves and finishes the game when everyone is blocked', () => {
    const state = initializeGame(createPlayers(), 60);
    const blockedBoard = state.board.map((row) => row.map(() => 'red'));
    blockedBoard[0][0] = null;
    blockedBoard[0][19] = null;
    const blockedState = {
      ...state,
      board: blockedBoard,
      players: state.players.map((player) => ({ ...player, remainingPieces: ['I1'] }))
    };
    const next = calculateNextTurn(blockedState);
    expect(next.status).toBe('finished');
    expect(Array.isArray(next.skippedPlayers) ? next.skippedPlayers.sort() : []).toEqual(['p1', 'p2']);
  });

  it('detects when a player has any legal move', () => {
    const state = initializeGame(createPlayers(), 60);
    expect(hasAnyLegalMove(state.players[0], state)).toBe(true);

    const impossibleBoard = state.board.map((row) => row.map(() => 'yellow'));
    impossibleBoard[0][0] = null;
    const impossibleState = {
      ...state,
      board: impossibleBoard,
      players: [
        { ...state.players[0], remainingPieces: ['I1'] },
        { ...state.players[1], remainingPieces: ['I1'] }
      ]
    };
    expect(hasAnyLegalMove(impossibleState.players[0], impossibleState)).toBe(false);
  });
});
