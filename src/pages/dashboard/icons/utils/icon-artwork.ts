import { resolveStorageImageUrl } from '@/utils/shop-variant-image';

/** Admin + product APIs may send the SVG on `icon` or `image` (same file). */
export function iconArtworkSrc(item: {
  icon?: string | null;
  image?: string | null;
} | null | undefined): string | null {
  if (!item) return null;
  const resolved = resolveStorageImageUrl(item.icon || item.image || null);
  if (!resolved) return null;
  // Relative storage paths must not sit under `/api`.
  return resolved.replace(/\/api\/storage\//, '/storage/');
}
