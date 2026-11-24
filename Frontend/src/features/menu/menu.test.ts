import { describe, expect, it } from 'vitest';
import { groupByCategory } from './groupByCategory';
import { pickHighlights } from './highlights';
import type { MenuItem } from './schema';

function item(id: string, category: string, available = true): MenuItem {
  return { id, outletId: 'OUT-01', name: id, description: null, price: 10000, category, available };
}

describe('groupByCategory', () => {
  it('keeps categories in order of first appearance', () => {
    const groups = groupByCategory([item('a', 'Mie'), item('b', 'Dimsum'), item('c', 'Mie')]);
    expect(groups.map((group) => group.name)).toEqual(['Mie', 'Dimsum']);
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['a', 'c']);
  });
});

describe('pickHighlights', () => {
  it('takes one available dish per category in turn', () => {
    const groups = groupByCategory([
      item('mie1', 'Mie'),
      item('mie2', 'Mie'),
      item('dim1', 'Dimsum'),
      item('dim2', 'Dimsum'),
      item('min1', 'Minuman'),
      item('min2', 'Minuman'),
    ]);
    expect(pickHighlights(groups).map((entry) => entry.id)).toEqual([
      'mie1',
      'dim1',
      'min1',
      'mie2',
      'dim2',
    ]);
  });

  it('skips sold-out dishes and stops when none are left', () => {
    const groups = groupByCategory([item('a', 'Mie', false), item('b', 'Dimsum')]);
    expect(pickHighlights(groups).map((entry) => entry.id)).toEqual(['b']);
  });
});
