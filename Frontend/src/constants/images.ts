const IMAGE_ORIGIN = 'https://images.unsplash.com';

export const PHOTO = {
  spicyNoodles: 'photo-1749409247614-ed616a5bf223',
  chiliNoodles: 'photo-1788620315393-9d16b482a1c9',
  blackBeanNoodles: 'photo-1744125021885-cdf3fad57d92',
  scallionNoodles: 'photo-1789990662414-f607ba6405f3',
  dumplings: 'photo-1762418967889-10abec43c325',
  shumai: 'photo-1653769342321-7e7a356e6dfc',
  crispyShrimp: 'photo-1766566959672-257837bc6c76',
  prawnToast: 'photo-1771573042740-bf0b3a481807',
  berrySoda: 'photo-1579954115545-a95591f28bfc',
  cocoa: 'photo-1559329187-79d04171a646',
} as const;

const NOODLES = [
  PHOTO.spicyNoodles,
  PHOTO.chiliNoodles,
  PHOTO.blackBeanNoodles,
  PHOTO.scallionNoodles,
];
const DIMSUM = [PHOTO.dumplings, PHOTO.shumai, PHOTO.crispyShrimp, PHOTO.prawnToast];
const DRINKS = [PHOTO.berrySoda, PHOTO.cocoa];

// WHY: the backend stores no photos, so the reference design's stock photos stand in per category.
const CATEGORY_POOLS: Readonly<Record<string, readonly string[]>> = {
  mie: NOODLES,
  dimsum: DIMSUM,
  minuman: DRINKS,
};
const FALLBACK_POOL = [...NOODLES, ...DIMSUM, ...DRINKS];

export function photoUrl(photoId: string, width: number): string {
  return `${IMAGE_ORIGIN}/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

function hashSeed(seed: string): number {
  return [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

export function menuImageUrl(category: string, seed: string, width: number): string {
  const pool = CATEGORY_POOLS[category.trim().toLowerCase()] ?? FALLBACK_POOL;
  const photoId = pool[hashSeed(seed) % pool.length] ?? PHOTO.spicyNoodles;
  return photoUrl(photoId, width);
}
