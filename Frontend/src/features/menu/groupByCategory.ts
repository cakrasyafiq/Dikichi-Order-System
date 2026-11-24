import type { MenuItem } from './schema';

export type MenuCategory = { name: string; items: MenuItem[] };

export function groupByCategory(items: readonly MenuItem[]): MenuCategory[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.category);
    if (bucket) bucket.push(item);
    else groups.set(item.category, [item]);
  }
  return [...groups].map(([name, list]) => ({ name, items: list }));
}
