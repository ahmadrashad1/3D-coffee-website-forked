"use client";

import { useCart } from "@/components/CartContext";

export default function AddToCartButton({ menuItemId }: { menuItemId: string }) {
  const { addItem } = useCart();
  return (
    <button type="button" className="add-to-cart" onClick={() => addItem(menuItemId)}>
      Add to cart
    </button>
  );
}
