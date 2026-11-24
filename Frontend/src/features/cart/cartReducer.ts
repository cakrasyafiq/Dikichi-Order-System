import { ORDER_LIMITS } from '@/constants/order';

export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type CartItemInput = { id: string; name: string; price: number };

export type CartAction =
  | { type: 'add'; item: CartItemInput }
  | { type: 'increment'; menuItemId: string }
  | { type: 'decrement'; menuItemId: string }
  | { type: 'remove'; menuItemId: string }
  | { type: 'removeMany'; menuItemIds: readonly string[] }
  | { type: 'clear' };

export const EMPTY_CART: readonly CartLine[] = [];

export function canAddToCart(lines: readonly CartLine[], menuItemId: string): boolean {
  const existing = lines.find((line) => line.menuItemId === menuItemId);
  if (existing) return existing.quantity < ORDER_LIMITS.maxQuantity;
  return lines.length < ORDER_LIMITS.maxLines;
}

export function cartReducer(lines: readonly CartLine[], action: CartAction): readonly CartLine[] {
  switch (action.type) {
    case 'add':
      return addItem(lines, action.item);
    case 'increment':
      return changeQuantity(lines, action.menuItemId, 1);
    case 'decrement':
      return changeQuantity(lines, action.menuItemId, -1);
    case 'remove':
      return lines.filter((line) => line.menuItemId !== action.menuItemId);
    case 'removeMany':
      return lines.filter((line) => !action.menuItemIds.includes(line.menuItemId));
    case 'clear':
      return EMPTY_CART;
  }
}

function addItem(lines: readonly CartLine[], item: CartItemInput): readonly CartLine[] {
  if (!canAddToCart(lines, item.id)) return lines;
  if (lines.some((line) => line.menuItemId === item.id)) {
    return changeQuantity(lines, item.id, 1);
  }
  return [...lines, { menuItemId: item.id, name: item.name, unitPrice: item.price, quantity: 1 }];
}

function changeQuantity(
  lines: readonly CartLine[],
  menuItemId: string,
  delta: number,
): readonly CartLine[] {
  return lines.flatMap((line) => {
    if (line.menuItemId !== menuItemId) return [line];
    const quantity = Math.min(line.quantity + delta, ORDER_LIMITS.maxQuantity);
    return quantity < 1 ? [] : [{ ...line, quantity }];
  });
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}
