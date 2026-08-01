"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { findMenuItem } from "@/lib/menu-data";

export type CartLine = { menuItemId: string; quantity: number };

type CartContextValue = {
  items: CartLine[];
  addItem: (menuItemId: string) => void;
  removeItem: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  totalCents: number;
  totalCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ember-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore malformed storage
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = (menuItemId: string) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menuItemId ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...prev, { menuItemId, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: string) => {
    setItems((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  };

  const setQuantity = (menuItemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) =>
      prev.map((line) => (line.menuItemId === menuItemId ? { ...line, quantity } : line))
    );
  };

  const clear = () => setItems([]);

  const { totalCents, totalCount } = useMemo(() => {
    return items.reduce(
      (acc, line) => {
        const menuItem = findMenuItem(line.menuItemId);
        if (!menuItem) return acc;
        return {
          totalCents: acc.totalCents + menuItem.priceCents * line.quantity,
          totalCount: acc.totalCount + line.quantity,
        };
      },
      { totalCents: 0, totalCount: 0 }
    );
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQuantity, clear, totalCents, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
