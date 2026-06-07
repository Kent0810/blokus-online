export const AVATARS = [
  'Fox',
  'Frog',
  'Lion',
  'Wolf',
  'Raccoon',
  'Parrot',
  'Octo',
  'Shark',
  'Bear',
  'Eagle',
  'Sprite',
  'Robot',
  'Teddy',
  'Unicorn',
  'Drake',
  'Tiger',
  'Owl',
  'Dolphin',
  'Bat',
  'Storm',
] as const;

export type Avatar = (typeof AVATARS)[number];
export const DEFAULT_AVATAR = AVATARS[0];
