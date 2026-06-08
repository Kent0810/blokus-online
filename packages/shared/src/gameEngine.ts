import { PIECE_IDS, PIECE_SHAPES } from './pieces';
import type {
  Board,
  CellState,
  GameMove,
  GameState,
  GameVariant,
  Player,
  PlayerColor,
  TeamId,
} from './types';

const EDGE_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

const CORNER_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

function generatePowerUps(
  board: Board,
  startingCorners: Partial<Record<PlayerColor, [number, number]>>,
  count: number,
): [number, number][] {
  const boardSize = board.length;
  const cornerCoords = Object.values(startingCorners) as [number, number][];
  const cornerSet = new Set(cornerCoords.map(([r, c]) => `${r},${c}`));
  const candidates: [number, number][] = [];

  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === 'blocked') continue;
      if (cornerSet.has(`${r},${c}`)) continue;
      // Must be at least 5 steps (Manhattan) from any starting corner
      if (cornerCoords.some(([cr, cc]) => Math.abs(r - cr) + Math.abs(c - cc) < 5)) continue;
      candidates.push([r, c]);
    }
  }

  // Fisher-Yates shuffle then take first `count`
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}

const normalizeCells = (cells: [number, number][]): [number, number][] => {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells
    .map(([row, col]) => [row - minRow, col - minCol] as [number, number])
    .sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB);
};

const getSkippedPlayersSet = (gameState: GameState): Set<string> =>
  new Set(
    Array.isArray(gameState.skippedPlayers)
      ? gameState.skippedPlayers
      : Array.from(gameState.skippedPlayers),
  );

function getBoardConfig(players: Player[]): {
  boardSize: number;
  startingCorners: Partial<Record<PlayerColor, [number, number]>>;
  buildCell: (row: number, col: number) => CellState;
} {
  const n = players.length;

  if (n === 2) {
    // 14×14 square — players start at opposite diagonal corners
    const corners: [number, number][] = [
      [0, 0],
      [13, 13],
    ];
    return {
      boardSize: 14,
      startingCorners: Object.fromEntries(players.map((p, i) => [p.color, corners[i]])) as Partial<
        Record<PlayerColor, [number, number]>
      >,
      buildCell: () => null,
    };
  }

  if (n === 3) {
    // 25×25 pointy-top hexagon.
    // Active cells satisfy all four diagonal constraints (half = 12):
    //   col - 2*row <= 12   (top-right edge)
    //   col + 2*row <= 60   (bottom-right edge)
    //   2*row - col <= 36   (bottom-left edge)
    //   col + 2*row >= 12   (top-left edge)
    // Vertices: top (0,12), top-right (6,24), bottom-right (18,24),
    //           bottom (24,12), bottom-left (18,0), top-left (6,0)
    // Player starting corners (every-other vertex, equidistant):
    //   blue → (0,12) top, yellow → (18,24) bottom-right, red → (18,0) bottom-left
    const corners: [number, number][] = [
      [0, 12],
      [18, 24],
      [18, 0],
    ];
    return {
      boardSize: 25,
      startingCorners: Object.fromEntries(players.map((p, i) => [p.color, corners[i]])) as Partial<
        Record<PlayerColor, [number, number]>
      >,
      buildCell: (row, col) =>
        col - 2 * row > 12 || col + 2 * row > 60 || 2 * row - col > 36 || col + 2 * row < 12
          ? 'blocked'
          : null,
    };
  }

  // 4 players — standard 20×20 square
  const corners: [number, number][] = [
    [0, 0],
    [0, 19],
    [19, 19],
    [19, 0],
  ];
  return {
    boardSize: 20,
    startingCorners: Object.fromEntries(players.map((p, i) => [p.color, corners[i]])) as Partial<
      Record<PlayerColor, [number, number]>
    >,
    buildCell: () => null,
  };
}

function dealChaosHand(player: Player): string[] {
  const remaining = [...player.remainingPieces];
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return remaining.slice(0, Math.min(3, remaining.length));
}

function buildTeams(players: Player[]): Record<string, TeamId> {
  return Object.fromEntries(players.map((p, i) => [p.id, (i % 2 === 0 ? 'A' : 'B') as TeamId]));
}

export function rotatePiece(cells: [number, number][], times: number): [number, number][] {
  const normalizedTimes = ((times % 4) + 4) % 4;
  let transformed = [...cells];
  for (let index = 0; index < normalizedTimes; index += 1) {
    transformed = transformed.map(([row, col]) => [col, -row] as [number, number]);
    transformed = normalizeCells(transformed);
  }
  return normalizeCells(transformed);
}

export function flipPiece(cells: [number, number][]): [number, number][] {
  const maxCol = Math.max(...cells.map(([, col]) => col));
  return normalizeCells(cells.map(([row, col]) => [row, maxCol - col] as [number, number]));
}

export function getTransformedCells(
  pieceId: string,
  rotation: 0 | 1 | 2 | 3,
  flipped: boolean,
): [number, number][] {
  const piece = PIECE_SHAPES[pieceId];
  if (!piece) {
    throw new Error(`Unknown piece: ${pieceId}`);
  }

  const flippedCells = flipped ? flipPiece(piece) : normalizeCells(piece);
  return rotatePiece(flippedCells, rotation);
}

export function getAbsoluteCells(
  cells: [number, number][],
  row: number,
  col: number,
): [number, number][] {
  return cells.map(([cellRow, cellCol]) => [cellRow + row, cellCol + col]);
}

export function isWithinBounds(cells: [number, number][], boardSize: number): boolean {
  return cells.every(([row, col]) => row >= 0 && row < boardSize && col >= 0 && col < boardSize);
}

export function hasOverlap(cells: [number, number][], board: Board): boolean {
  return cells.some(([row, col]) => board[row]?.[col] !== null);
}

export function hasEdgeTouch(cells: [number, number][], board: Board, color: PlayerColor): boolean {
  return cells.some(([row, col]) =>
    EDGE_DIRECTIONS.some(
      ([rowDelta, colDelta]) => board[row + rowDelta]?.[col + colDelta] === color,
    ),
  );
}

export function hasCornerTouch(
  cells: [number, number][],
  board: Board,
  color: PlayerColor,
): boolean {
  return cells.some(([row, col]) =>
    CORNER_DIRECTIONS.some(
      ([rowDelta, colDelta]) => board[row + rowDelta]?.[col + colDelta] === color,
    ),
  );
}

export function coversStartingCorner(
  cells: [number, number][],
  color: PlayerColor,
  startingCorners: Partial<Record<PlayerColor, [number, number]>>,
): boolean {
  const corner = startingCorners[color];
  if (!corner) return false;
  return cells.some(([row, col]) => row === corner[0] && col === corner[1]);
}

export function isFirstMove(player: Player): boolean {
  return player.remainingPieces.length === PIECE_IDS.length;
}

export function validateMove(
  move: GameMove,
  gameState: GameState,
): { valid: boolean; error?: string } {
  if (gameState.status !== 'in_progress') {
    return { valid: false, error: 'Game is not in progress.' };
  }

  const player = gameState.players.find((entry) => entry.id === move.playerId);
  if (!player) {
    return { valid: false, error: 'Player not found.' };
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer?.id !== move.playerId) {
    return { valid: false, error: 'It is not your turn.' };
  }

  if (!player.remainingPieces.includes(move.pieceId)) {
    return { valid: false, error: 'Piece has already been used.' };
  }

  // Chaos: may only use one of the three dealt pieces
  if (gameState.variant === 'chaos' && gameState.dealtPieces) {
    if (!gameState.dealtPieces.includes(move.pieceId)) {
      return { valid: false, error: 'You must play one of your dealt pieces.' };
    }
  }

  const transformedCells = getTransformedCells(move.pieceId, move.rotation, move.flipped);
  const absoluteCells = getAbsoluteCells(transformedCells, move.row, move.col);
  const boardSize = gameState.board.length;

  if (!isWithinBounds(absoluteCells, boardSize)) {
    return { valid: false, error: 'Move is out of bounds.' };
  }

  // hasOverlap also catches 'blocked' cells since they are !== null
  if (hasOverlap(absoluteCells, gameState.board)) {
    return { valid: false, error: 'Move overlaps an existing piece.' };
  }

  if (hasEdgeTouch(absoluteCells, gameState.board, player.color)) {
    return { valid: false, error: 'Pieces of the same color cannot touch edge-to-edge.' };
  }

  if (isFirstMove(player)) {
    if (!coversStartingCorner(absoluteCells, player.color, gameState.startingCorners)) {
      return { valid: false, error: 'First move must cover the starting corner.' };
    }
  } else if (!hasCornerTouch(absoluteCells, gameState.board, player.color)) {
    return { valid: false, error: 'Move must touch one of your existing pieces corner-to-corner.' };
  }

  return { valid: true };
}

export function applyMove(move: GameMove, gameState: GameState): GameState {
  const validation = validateMove(move, gameState);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid move.');
  }

  const player = gameState.players.find((entry) => entry.id === move.playerId);
  if (!player) {
    throw new Error('Player not found.');
  }

  const transformedCells = getTransformedCells(move.pieceId, move.rotation, move.flipped);
  const absoluteCells = getAbsoluteCells(transformedCells, move.row, move.col);
  const board = cloneBoard(gameState.board);
  for (const [row, col] of absoluteCells) {
    board[row][col] = player.color;
  }

  const activePowerUps = gameState.powerUpCells ?? [];
  const collectedPowerUps = absoluteCells.filter(([r, c]) =>
    activePowerUps.some(([pr, pc]) => pr === r && pc === c),
  );
  const bonusPoints = collectedPowerUps.length * 3;
  const remainingPowerUps = activePowerUps.filter(
    ([pr, pc]) => !collectedPowerUps.some(([r, c]) => r === pr && c === pc),
  );

  const updatedPlayers = gameState.players.map((entry) => {
    if (entry.id !== player.id) {
      return entry;
    }

    const remainingPieces = entry.remainingPieces.filter((pieceId) => pieceId !== move.pieceId);
    return {
      ...entry,
      remainingPieces,
      score: entry.score + absoluteCells.length + bonusPoints,
    };
  });

  const skippedPlayers = getSkippedPlayersSet(gameState);
  skippedPlayers.delete(player.id);

  return {
    ...gameState,
    board,
    players: updatedPlayers,
    moves: [...gameState.moves, move],
    turnNumber: gameState.turnNumber + 1,
    turnTimeRemaining: gameState.turnTimeLimit,
    skippedPlayers: Array.from(skippedPlayers),
    powerUpCells: remainingPowerUps,
  };
}

export function hasAnyLegalMove(player: Player, gameState: GameState): boolean {
  if (gameState.status === 'finished') {
    return false;
  }

  const boardSize = gameState.board.length;
  for (const pieceId of [...player.remainingPieces].sort(
    (left, right) => PIECE_SHAPES[right].length - PIECE_SHAPES[left].length,
  )) {
    for (const flipped of [false, true] as const) {
      for (const rotation of [0, 1, 2, 3] as const) {
        const cells = getTransformedCells(pieceId, rotation, flipped);
        const maxRow = Math.max(...cells.map(([row]) => row));
        const maxCol = Math.max(...cells.map(([, col]) => col));

        for (let row = 0; row <= boardSize - maxRow - 1; row += 1) {
          for (let col = 0; col <= boardSize - maxCol - 1; col += 1) {
            const result = validateMove(
              {
                playerId: player.id,
                pieceId,
                rotation,
                flipped,
                row,
                col,
              },
              {
                ...gameState,
                // Strip chaos dealt-piece restriction for legal-move checks
                variant: gameState.variant === 'chaos' ? 'standard' : gameState.variant,
                currentPlayerIndex: gameState.players.findIndex((entry) => entry.id === player.id),
              },
            );
            if (result.valid) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

export function calculateScores(gameState: GameState): GameState {
  const players = gameState.players.map((player) => ({
    ...player,
    score: PIECE_IDS.reduce((score, pieceId) => {
      const used = !player.remainingPieces.includes(pieceId);
      return used ? score + PIECE_SHAPES[pieceId].length : score;
    }, 0),
  }));

  const winners = [...players]
    .sort((left, right) => right.score - left.score)
    .map((player) => player.id);

  return {
    ...gameState,
    players,
    winners,
  };
}

export function calculateNextTurn(gameState: GameState): GameState {
  const skippedPlayers = getSkippedPlayersSet(gameState);
  const playerCount = gameState.players.length;

  for (let offset = 1; offset <= playerCount; offset += 1) {
    const nextIndex = (gameState.currentPlayerIndex + offset) % playerCount;
    const nextPlayer = gameState.players[nextIndex];

    if (hasAnyLegalMove(nextPlayer, { ...gameState, currentPlayerIndex: nextIndex })) {
      skippedPlayers.delete(nextPlayer.id);
      return {
        ...gameState,
        currentPlayerIndex: nextIndex,
        turnTimeRemaining: gameState.turnTimeLimit,
        skippedPlayers: Array.from(skippedPlayers),
        dealtPieces:
          gameState.variant === 'chaos' ? dealChaosHand(nextPlayer) : gameState.dealtPieces,
      };
    }

    skippedPlayers.add(nextPlayer.id);
  }

  const scoredState = calculateScores({
    ...gameState,
    status: 'finished',
    skippedPlayers: Array.from(skippedPlayers),
  });

  return scoredState;
}

export function initializeGame(
  players: Player[],
  turnTimeLimit: number,
  variant: GameVariant = 'standard',
): GameState {
  const { boardSize, startingCorners, buildCell } = getBoardConfig(players);

  const board: Board = Array.from({ length: boardSize }, (_, row) =>
    Array.from({ length: boardSize }, (_, col) => buildCell(row, col)),
  );

  const powerUpCount = players.length === 2 ? 4 : 6;
  const powerUpCells = generatePowerUps(board, startingCorners, powerUpCount);

  const initialPlayers = players.map((player) => ({
    ...player,
    remainingPieces: [...PIECE_IDS],
    score: 0,
    connected: player.connected ?? true,
    isBot: player.isBot ?? false,
  }));

  return {
    board,
    players: initialPlayers,
    currentPlayerIndex: 0,
    turnNumber: 1,
    status: 'in_progress',
    turnTimeLimit,
    turnTimeRemaining: turnTimeLimit,
    moves: [],
    winners: [],
    skippedPlayers: [],
    startingCorners,
    powerUpCells,
    variant,
    teams: variant === 'teams' ? buildTeams(initialPlayers) : undefined,
    dealtPieces: variant === 'chaos' ? dealChaosHand(initialPlayers[0]) : undefined,
  };
}

export { PIECE_IDS, PIECE_SHAPES };
