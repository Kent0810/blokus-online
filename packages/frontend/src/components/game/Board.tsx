import React, { useCallback, useRef } from 'react';
import type { Board as BoardState, PlayerColor } from '@blockus/shared';
import { useGameUIStore } from '../../store/gameUIStore';

const colorBg: Record<string, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
};

const colorBgGhost: Record<string, string> = {
  blue: 'bg-blue-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
  green: 'bg-green-400',
};

const cornerDot: Record<string, string> = {
  blue: 'ring-blue-400',
  yellow: 'ring-yellow-400',
  red: 'ring-red-400',
  green: 'ring-green-400',
};

function computeCellSize(boardSize: number, maxWidth?: number): number {
  if (maxWidth) return Math.max(14, Math.floor((maxWidth - 4) / boardSize));
  if (boardSize <= 14) return 32;
  if (boardSize <= 21) return 28;
  return 26;
}

interface BoardProps {
  board: BoardState;
  startingCorners: Partial<Record<PlayerColor, [number, number]>>;
  powerUpCells: [number, number][];
  previewCells: [number, number][] | null;
  previewValid: boolean;
  previewColor: string;
  activePlayers: string[];
  onPlace: (row: number, col: number) => void;
  disabled: boolean;
  maxWidth?: number;
}

interface CellProps {
  row: number;
  col: number;
  color: string | null;
  blocked: boolean;
  isGhost: boolean;
  isGhostValid: boolean;
  ghostColor: string;
  cornerColor: string | null;
  hasPowerUp: boolean;
  size: number;
  onMouseEnter: (row: number, col: number) => void;
  onMouseLeave: () => void;
  onClick: (row: number, col: number) => void;
}

const Cell = React.memo(function Cell({
  row,
  col,
  color,
  blocked,
  isGhost,
  isGhostValid,
  ghostColor,
  cornerColor,
  hasPowerUp,
  size,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: CellProps) {
  if (blocked) {
    return <div style={{ width: size, height: size }} className="pointer-events-none shrink-0" />;
  }

  let bg = 'bg-board-bg hover:bg-slate-700';
  let extra = '';

  if (color) {
    bg = colorBg[color] ?? 'bg-gray-500';
    extra = 'placed shadow-sm';
  } else if (isGhost) {
    if (isGhostValid) {
      bg = colorBgGhost[ghostColor] ?? 'bg-gray-400';
      extra = 'ghost-valid';
    } else {
      bg = 'bg-red-900';
      extra = 'ghost-invalid opacity-60';
    }
  }

  return (
    <div
      className={`board-cell relative border border-board-line cursor-pointer shrink-0 ${bg} ${extra}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => onMouseEnter(row, col)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(row, col)}
    >
      {hasPowerUp && !color && !isGhost && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-amber-400 leading-none animate-pulse select-none"
            style={{ fontSize: size * 0.45 }}
          >
            ★
          </span>
        </div>
      )}
      {cornerColor && !color && !isGhost && !hasPowerUp && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-2 h-2 rounded-full ring-2 ${cornerDot[cornerColor]} ring-offset-1 ring-offset-transparent`}
          />
        </div>
      )}
    </div>
  );
});

export const Board = React.memo(function Board({
  board,
  startingCorners,
  powerUpCells,
  previewCells,
  previewValid,
  previewColor,
  activePlayers,
  onPlace,
  disabled,
  maxWidth,
}: BoardProps) {
  const { setHoverCell, selectedPieceId } = useGameUIStore();
  const boardSize = board.length;
  const size = computeCellSize(boardSize, maxWidth);

  const previewSet = useRef<Set<string>>(new Set());
  if (previewCells) {
    previewSet.current = new Set(previewCells.map(([r, c]) => `${r},${c}`));
  } else {
    previewSet.current = new Set();
  }

  const cornerMap = useRef<Map<string, string>>(new Map());
  cornerMap.current = new Map(
    (Object.entries(startingCorners) as [string, [number, number]][])
      .filter(([color]) => activePlayers.includes(color))
      .map(([color, [r, c]]) => [`${r},${c}`, color]),
  );

  const powerUpSet = useRef<Set<string>>(new Set());
  powerUpSet.current = new Set(powerUpCells.map(([r, c]) => `${r},${c}`));

  // Square boards have no blocked cells; shaped boards use transparent blocked cells for visual outline.
  const isShaped =
    board[0]?.[0] === 'blocked' || board[boardSize - 1]?.[boardSize - 1] === 'blocked';

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (selectedPieceId && !disabled) setHoverCell([row, col]);
    },
    [selectedPieceId, disabled, setHoverCell],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, [setHoverCell]);

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (!disabled) onPlace(row, col);
    },
    [disabled, onPlace],
  );

  return (
    <div
      className={`game-board inline-block shadow-2xl ${isShaped ? '' : 'border-2 border-slate-600 rounded-sm'}`}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: boardSize }, (_, row) => (
        <div key={row} className="flex">
          {Array.from({ length: boardSize }, (_, col) => {
            const key = `${row},${col}`;
            const cellVal = board[row]?.[col];
            const blocked = cellVal === 'blocked';
            const color = blocked || cellVal === null ? null : cellVal;
            const isGhost = !blocked && previewSet.current.has(key);
            const cornerColor = cornerMap.current.get(key) ?? null;
            const hasPowerUp = !blocked && powerUpSet.current.has(key);
            return (
              <Cell
                key={key}
                row={row}
                col={col}
                color={color}
                blocked={blocked}
                isGhost={isGhost}
                isGhostValid={previewValid}
                ghostColor={previewColor}
                cornerColor={cornerColor}
                hasPowerUp={hasPowerUp}
                size={size}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
});
