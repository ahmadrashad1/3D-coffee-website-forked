"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import CartDrawer from "@/components/CartDrawer";

export default function CartButton() {
  const { totalCount } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="cart-button"
        aria-label={`Open cart, ${totalCount} item${totalCount === 1 ? "" : "s"}`}
        onClick={() => setOpen(true)}
      >
        Cart
        {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
