import { create } from 'zustand';

export interface CartItem {
  productId: string;
  productName: string;
  unitName: string;
  batchId?: string;
  batchCode?: string;
  expiryDate?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, batchId?: string) => void;
  updateQuantity: (productId: string, quantity: number, batchId?: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === item.productId && i.batchId === item.batchId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },
  removeItem: (productId, batchId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.batchId === batchId)
      ),
    }));
  },
  updateQuantity: (productId, quantity, batchId) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.batchId === batchId ? { ...i, quantity } : i
      ),
    }));
  },
  clearCart: () => set({ items: [] }),
  getTotalAmount: () => {
    return get().items.reduce(
      (total, item) => total + item.quantity * item.unitPrice - item.discount,
      0
    );
  },
}));
