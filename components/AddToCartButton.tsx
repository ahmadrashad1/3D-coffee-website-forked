"use client";

import { useAuth } from "@/components/AuthContext";
import { useCart } from "@/components/CartContext";

export default function AddToCartButton({ menuItemId }: { menuItemId: string }) {
  const { user, openLogin } = useAuth();
  const { addItem } = useCart();

  if (!user) {
    return (
      <button type="button" className="add-to-cart" onClick={openLogin}>
        Add to cart
      </button>
    );
  }

  return (
    <button type="button" className="add-to-cart" onClick={() => addItem(menuItemId)}>
      Add to cart
    </button>
  );
}
