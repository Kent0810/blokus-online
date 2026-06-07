import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

const cache = new Map<string, string>();

function getAvatarUri(seed: string, size: number): string {
  const key = `${seed}@${size}`;
  if (!cache.has(key)) {
    cache.set(key, createAvatar(pixelArt, { seed, size }).toDataUri());
  }
  return cache.get(key)!;
}

interface GeneratedAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function GeneratedAvatar({ seed, size = 40, className = '' }: GeneratedAvatarProps) {
  return (
    <img
      src={getAvatarUri(seed, size)}
      width={size}
      height={size}
      alt={seed}
      className={`rounded-lg select-none shrink-0 ${className}`}
      draggable={false}
    />
  );
}
