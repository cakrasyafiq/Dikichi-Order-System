import { useCallback, useMemo, useReducer } from 'react';
import {
  EMPTY_CART,
  canAddToCart,
  cartCount,
  cartReducer,
  cartTotal,
  type CartItemInput,
} from './cartReducer';

export function useCart() {
  const [lines, dispatch] = useReducer(cartReducer, EMPTY_CART);

  const add = useCallback((item: CartItemInput) => dispatch({ type: 'add', item }), []);
  const increment = useCallback(
    (menuItemId: string) => dispatch({ type: 'increment', menuItemId }),
    [],
  );
  const decrement = useCallback(
    (menuItemId: string) => dispatch({ type: 'decrement', menuItemId }),
    [],
  );
  const removeMany = useCallback(
    (menuItemIds: readonly string[]) => dispatch({ type: 'removeMany', menuItemIds }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  return useMemo(
    () => ({
      lines,
      count: cartCount(lines),
      total: cartTotal(lines),
      add,
      increment,
      decrement,
      removeMany,
      clear,
      canAdd: (menuItemId: string) => canAddToCart(lines, menuItemId),
      quantityOf: (menuItemId: string) =>
        lines.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0,
    }),
    [lines, add, increment, decrement, removeMany, clear],
  );
}

export type CartApi = ReturnType<typeof useCart>;
