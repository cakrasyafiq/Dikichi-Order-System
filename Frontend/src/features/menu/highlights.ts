import type { MenuCategory } from './groupByCategory';
import type { MenuItem } from './schema';

export const HIGHLIGHT_COUNT = 5;

// WHY: the backend has no popularity data, so highlights are one available dish per category in turn.
export function pickHighlights(
  categories: readonly MenuCategory[],
  count: number = HIGHLIGHT_COUNT,
): MenuItem[] {
  const queues = categories.map((category) => category.items.filter((item) => item.available));
  const picked: MenuItem[] = [];

  for (let round = 0; picked.length < count; round += 1) {
    let addedInRound = false;
    for (const queue of queues) {
      const item = queue[round];
      if (!item || picked.length >= count) continue;
      picked.push(item);
      addedInRound = true;
    }
    if (!addedInRound) break;
  }
  return picked;
}
