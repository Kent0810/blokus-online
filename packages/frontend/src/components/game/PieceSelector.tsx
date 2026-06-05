import React, { useCallback } from 'react';
import { getTransformedCells } from '@blockus/shared';
import { useGameUIStore } from '../../store/gameUIStore';

interface PieceSelectorProps {
  remainingPieces: string[];
  usedPieces: string[];
  playerColor: string;
  disabled: boolean;
  compact?: boolean;
}

const colorFill: Record<string, string> = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  red: '#EF4444',
  green: '#22C55E',
};

function PieceMini({
  pieceId,
  color,
  used,
  selected,
  onClick,
}: {
  pieceId: string;
  color: string;
  used: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const { rotation, flipped } = useGameUIStore();
  const cells = selected
    ? getTransformedCells(pieceId, rotation, flipped)
    : getTransformedCells(pieceId, 0, false);

  const rows = Math.max(...cells.map(([r]) => r)) + 1;
  const cols = Math.max(...cells.map(([, c]) => c)) + 1;
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));

  const MINI_SIZE = 7;
  const PAD = 2;
  const svgW = cols * MINI_SIZE + PAD * 2;
  const svgH = rows * MINI_SIZE + PAD * 2;

  return (
    <button
      onClick={onClick}
      disabled={used}
      title={pieceId}
      className={`
        piece-card p-1.5 rounded-lg transition-all duration-150
        ${used ? 'used opacity-20 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-2'}
        ${selected ? 'selected bg-surface-2 ring-2 ring-white/60 shadow-lg' : ''}
      `}
    >
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="block">
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) =>
            cellSet.has(`${r},${c}`) ? (
              <rect
                key={`${r},${c}`}
                x={PAD + c * MINI_SIZE}
                y={PAD + r * MINI_SIZE}
                width={MINI_SIZE - 1}
                height={MINI_SIZE - 1}
                fill={colorFill[color] ?? '#888'}
                rx={1}
              />
            ) : null,
          ),
        )}
      </svg>
    </button>
  );
}

export const PieceSelector = React.memo(function PieceSelector({
  remainingPieces,
  usedPieces,
  playerColor,
  disabled,
  compact = false,
}: PieceSelectorProps) {
  const { selectedPieceId, selectPiece, rotate, flip } = useGameUIStore();

  const allPieces = [...remainingPieces, ...usedPieces].sort();

  const handleSelect = useCallback(
    (id: string) => {
      if (!disabled) selectPiece(id);
    },
    [disabled, selectPiece],
  );

  const rotateBtn = (
    <button
      onClick={rotate}
      disabled={!selectedPieceId || disabled}
      className={`flex items-center justify-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-surface-2 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all duration-150 ${compact ? 'w-10 h-10 shrink-0' : 'flex-1 py-2'}`}
      title="Rotate (R)"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
          clipRule="evenodd"
        />
      </svg>
      {!compact && <span>Rotate (R)</span>}
    </button>
  );

  const flipBtn = (
    <button
      onClick={flip}
      disabled={!selectedPieceId || disabled}
      className={`flex items-center justify-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-surface-2 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all duration-150 ${compact ? 'w-10 h-10 shrink-0' : 'flex-1 py-2'}`}
      title="Flip (F)"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
      </svg>
      {!compact && <span>Flip (F)</span>}
    </button>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2 h-full">
        {rotateBtn}
        <div className="flex-1 overflow-x-auto flex gap-1 py-1" style={{ scrollbarWidth: 'none' }}>
          {allPieces.map((id) => (
            <PieceMini
              key={id}
              pieceId={id}
              color={playerColor}
              used={usedPieces.includes(id)}
              selected={selectedPieceId === id}
              onClick={() => handleSelect(id)}
            />
          ))}
        </div>
        {flipBtn}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Your Pieces
        </h3>
        <span className="text-xs text-slate-500">
          {remainingPieces.length} / {allPieces.length}
        </span>
      </div>

      <div className="flex gap-2">
        {rotateBtn}
        {flipBtn}
      </div>

      {/* Piece grid */}
      <div className="grid grid-cols-5 gap-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
        {allPieces.map((id) => (
          <PieceMini
            key={id}
            pieceId={id}
            color={playerColor}
            used={usedPieces.includes(id)}
            selected={selectedPieceId === id}
            onClick={() => handleSelect(id)}
          />
        ))}
      </div>
    </div>
  );
});
