import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const buildKey = (item) =>
  JSON.stringify({
    productId: item.productId,
    size: item.size || '',
    color: item.color || '',
    customization: item.customization || {},
  });

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = [...get().items];
        const key = buildKey(item);
        const existing = items.find((cartItem) => buildKey(cartItem) === key);

        if (existing) {
          existing.quantity += item.quantity || 1;
        } else {
          items.push({
            ...item,
            quantity: item.quantity || 1,
          });
        }

        set({ items });
      },

      updateItemQuantity: (index, quantity) => {
        const items = [...get().items];
        if (!items[index]) return;

        items[index].quantity = Math.max(quantity, 1);
        set({ items });
      },

      removeItem: (index) => {
        const items = get().items.filter((_, idx) => idx !== index);
        set({ items });
      },

      clearCart: () => set({ items: [] }),

      subtotal: () =>
        get().items.reduce((sum, item) => {
          const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);
          return sum + lineTotal;
        }, 0),
    }),
    {
      name: 'cart_items',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
