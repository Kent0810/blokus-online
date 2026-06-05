import { create } from 'zustand';

interface GameUIStore {
  selectedPieceId: string | null;
  rotation: 0 | 1 | 2 | 3;
  flipped: boolean;
  hoverCell: [number, number] | null;

  selectPiece: (id: string | null) => void;
  rotate: () => void;
  flip: () => void;
  setHoverCell: (cell: [number, number] | null) => void;
  resetTransform: () => void;
}

export const useGameUIStore = create<GameUIStore>((set) => ({
  selectedPieceId: null,
  rotation: 0,
  flipped: false,
  hoverCell: null,

  selectPiece: (id) =>
    set((state) => ({
      selectedPieceId: state.selectedPieceId === id ? null : id,
      rotation: 0,
      flipped: false,
    })),

  rotate: () =>
    set((state) => ({
      rotation: (((state.rotation + 1) % 4) as 0 | 1 | 2 | 3),
    })),

  flip: () => set((state) => ({ flipped: !state.flipped })),

  setHoverCell: (cell) => set({ hoverCell: cell }),

  resetTransform: () => set({ selectedPieceId: null, rotation: 0, flipped: false, hoverCell: null }),
}));
