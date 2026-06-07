import { AVATARS } from '../../constants/avatars';
import { GeneratedAvatar } from './GeneratedAvatar';

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  size?: 'sm' | 'md';
  cols?: 5 | 10;
  fullWidth?: boolean;
}

export function AvatarPicker({
  value,
  onChange,
  size = 'md',
  cols = 5,
  fullWidth = false,
}: AvatarPickerProps) {
  const cellPx = size === 'sm' ? 32 : 40;
  const gridCols = cols === 10 ? 'grid-cols-10' : 'grid-cols-5';

  if (fullWidth) {
    return (
      <div className="grid grid-cols-10 gap-1.5 w-full">
        {AVATARS.map((seed) => {
          const selected = value === seed;
          return (
            <button
              key={seed}
              type="button"
              onClick={() => onChange(seed)}
              aria-pressed={selected}
              aria-label={seed}
              className={`aspect-square rounded-xl p-0 overflow-hidden transition-all duration-150 w-full
                ${
                  selected
                    ? 'ring-2 ring-accent scale-105 shadow-sm shadow-accent/20'
                    : 'ring-1 ring-white/[0.06] hover:ring-accent/50 hover:scale-105 active:scale-95'
                }`}
            >
              <GeneratedAvatar seed={seed} size={40} className="rounded-none w-full h-full" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} gap-1.5`}>
      {AVATARS.map((seed) => {
        const selected = value === seed;
        return (
          <button
            key={seed}
            type="button"
            onClick={() => onChange(seed)}
            aria-pressed={selected}
            aria-label={seed}
            className={`rounded-xl p-0 overflow-hidden transition-all duration-150
              ${
                selected
                  ? 'ring-2 ring-accent scale-105 shadow-sm shadow-accent/20'
                  : 'ring-1 ring-white/[0.06] hover:ring-accent/50 hover:scale-105 active:scale-95'
              }`}
            style={{ width: cellPx, height: cellPx }}
          >
            <GeneratedAvatar seed={seed} size={cellPx} className="rounded-none" />
          </button>
        );
      })}
    </div>
  );
}
