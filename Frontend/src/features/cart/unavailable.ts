import type { MenuItem } from '@/features/menu/schema';
import type { CartLine } from './cartReducer';

// WHY: an item missing from a fresh menu was deleted, which the order service rejects like a sold-out item.
export function findUnavailableLines(
  lines: readonly CartLine[],
  menu: readonly MenuItem[],
): CartLine[] {
  const byId = new Map(menu.map((item) => [item.id, item]));
  return lines.filter((line) => byId.get(line.menuItemId)?.available !== true);
}
