import { useMemo } from 'react';
import { getTransformedCells, getAbsoluteCells, validateMove } from '@blockus/shared';
import type { GameState } from '@blockus/shared';
import { useGameUIStore } from '../store/gameUIStore';

export function usePieceTransform() {
  const { selectedPieceId, rotation, flipped } = useGameUIStore();

  const transformedCells = useMemo(() => {
    if (!selectedPieceId) return null;
    return getTransformedCells(selectedPieceId, rotation, flipped);
  }, [selectedPieceId, rotation, flipped]);

  return { transformedCells };
}

export function useHoverPreview(gameState: GameState | null, playerId: string) {
  const { selectedPieceId, rotation, flipped, hoverCell } = useGameUIStore();

  const preview = useMemo(() => {
    if (!gameState || !selectedPieceId || !hoverCell) return null;

    const cells = getTransformedCells(selectedPieceId, rotation, flipped);
    const absolute = getAbsoluteCells(cells, hoverCell[0], hoverCell[1]);

    const result = validateMove(
      {
        playerId,
        pieceId: selectedPieceId,
        rotation,
        flipped,
        row: hoverCell[0],
        col: hoverCell[1],
      },
      gameState,
    );

    return { cells: absolute, valid: result.valid };
  }, [gameState, selectedPieceId, rotation, flipped, hoverCell, playerId]);

  return preview;
}
