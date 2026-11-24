import { describe, expect, it } from 'vitest';
import { ORDER_LIMITS } from '@/constants/order';
import {
  EMPTY_CART,
  canAddToCart,
  cartCount,
  cartReducer,
  cartTotal,
  type CartLine,
} from './cartReducer';

const mie = { id: 'm1', name: 'Mie Suit', price: 25000 };
const dimsum = { id: 'm2', name: 'Siomay', price: 12000 };

describe('cartReducer', () => {
  it('adds a new line and increases the quantity of an existing one', () => {
    const once = cartReducer(EMPTY_CART, { type: 'add', item: mie });
    const twice = cartReducer(once, { type: 'add', item: mie });
    expect(once).toEqual([{ menuItemId: 'm1', name: 'Mie Suit', unitPrice: 25000, quantity: 1 }]);
    expect(twice[0]?.quantity).toBe(2);
  });

  it('removes a line when its quantity drops below one', () => {
    const lines = cartReducer(EMPTY_CART, { type: 'add', item: mie });
    expect(cartReducer(lines, { type: 'decrement', menuItemId: 'm1' })).toEqual([]);
  });

  it('caps one line at the maximum quantity', () => {
    const full: readonly CartLine[] = [
      { menuItemId: 'm1', name: 'Mie Suit', unitPrice: 25000, quantity: ORDER_LIMITS.maxQuantity },
    ];
    expect(canAddToCart(full, 'm1')).toBe(false);
    expect(cartReducer(full, { type: 'increment', menuItemId: 'm1' })[0]?.quantity).toBe(
      ORDER_LIMITS.maxQuantity,
    );
  });

  it('refuses a new line once the line limit is reached', () => {
    const lines: CartLine[] = Array.from({ length: ORDER_LIMITS.maxLines }, (_, index) => ({
      menuItemId: `m${index}`,
      name: `Dish ${index}`,
      unitPrice: 1000,
      quantity: 1,
    }));
    expect(canAddToCart(lines, 'new-item')).toBe(false);
    expect(cartReducer(lines, { type: 'add', item: { id: 'new-item', name: 'X', price: 1 } })).toBe(
      lines,
    );
  });

  it('removes several lines and clears the cart', () => {
    const lines = [mie, dimsum].reduce(
      (state, item) => cartReducer(state, { type: 'add', item }),
      EMPTY_CART,
    );
    expect(cartReducer(lines, { type: 'removeMany', menuItemIds: ['m1'] })).toHaveLength(1);
    expect(cartReducer(lines, { type: 'clear' })).toEqual([]);
  });

  it('computes count and total across lines', () => {
    const lines = [mie, mie, dimsum].reduce(
      (state, item) => cartReducer(state, { type: 'add', item }),
      EMPTY_CART,
    );
    expect(cartCount(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(25000 * 2 + 12000);
  });
});
