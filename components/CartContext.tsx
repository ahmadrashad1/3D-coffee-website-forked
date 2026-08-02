"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type CartLine = { menuItemId: string; quantity: number };

type CartPayload = { items: CartLine[]; totalCents: number; totalCount: number };

type CartContextValue = {
  items: CartLine[];
  addItem: (menuItemId: string) => Promise<void>;
  removeItem: (menuItemId: string) => Promise<void>;
  setQuantity: (menuItemId: string, quantity: number) => Promise<void>;
  clear: () => void;
  totalCents: number;
  totalCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  userKey,
  initialCart,
  children,
}: {
  userKey: string | number;
  initialCart: CartPayload;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartPayload>(initialCart);
  const [seededFor, setSeededFor] = useState(userKey);

  if (seededFor !== userKey) {
    setSeededFor(userKey);
    setCart(initialCart);
  }

  const addItem = async (menuItemId: string) => {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuItemId }),
    });
    if (res.ok) {
      setCart(await res.json());
    }
  };

  const removeItem = async (menuItemId: string) => {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(menuItemId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCart(await res.json());
    }
  };

  const setQuantity = async (menuItemId: string, quantity: number) => {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(menuItemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) {
      setCart(await res.json());
    }
  };

  const clear = () => setCart({ items: [], totalCents: 0, totalCount: 0 });

  return (
    <CartContext.Provider
      value={{
        items: cart.items,
        addItem,
        removeItem,
        setQuantity,
        clear,
        totalCents: cart.totalCents,
        totalCount: cart.totalCount,
      }}
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
