import type { CartItem, CartSnapshot } from '../../types';

export type CartState = CartSnapshot;

export type CartAction =
  | { type: 'cart/hydrate'; state: CartState }
  | { type: 'cart/add'; item: Omit<CartItem, 'qty'>; qty?: number }
  | { type: 'cart/remove'; productId: string; variantId?: string }
  | { type: 'cart/setQty'; productId: string; variantId?: string; qty: number }
  | { type: 'cart/clear' }
  | { type: 'cart/setPromoCode'; promoCode?: string }
  | { type: 'cart/updateHold'; productId: string; variantId?: string; holdId?: string; holdExpiresAt?: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled cart action: ${JSON.stringify(value)}`);
}

function keyOf(item: { productId: string; variantId?: string }) {
  return `${item.productId}::${item.variantId ?? ''}`;
}

export const initialCartState: CartState = { items: [] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'cart/hydrate': {
      return action.state;
    }
    case 'cart/add': {
      const qty = Math.max(1, Math.floor(action.qty ?? 1));
      const k = keyOf(action.item);
      const existing = state.items.find((i) => keyOf(i) === k);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) => (keyOf(i) === k ? { ...i, qty: i.qty + qty } : i)),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.item, qty }],
      };
    }
    case 'cart/remove': {
      const k = `${action.productId}::${action.variantId ?? ''}`;
      return {
        ...state,
        items: state.items.filter((i) => keyOf(i) !== k),
      };
    }
    case 'cart/setQty': {
      const nextQty = Math.max(0, Math.floor(action.qty));
      const k = `${action.productId}::${action.variantId ?? ''}`;
      if (nextQty === 0) {
        return {
          ...state,
          items: state.items.filter((i) => keyOf(i) !== k),
        };
      }
      return {
        ...state,
        items: state.items.map((i) => (keyOf(i) === k ? { ...i, qty: nextQty } : i)),
      };
    }
    case 'cart/clear': {
      return { items: [], promoCode: undefined };
    }
    case 'cart/setPromoCode': {
      return { ...state, promoCode: action.promoCode || undefined };
    }
    case 'cart/updateHold': {
      const k = `${action.productId}::${action.variantId ?? ''}`;
      return {
        ...state,
        items: state.items.map((i) =>
          keyOf(i) === k ? { ...i, holdId: action.holdId, holdExpiresAt: action.holdExpiresAt } : i
        ),
      };
    }
    default: {
      return assertNever(action);
    }
  }
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((acc, i) => acc + i.qty, 0);
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
}
