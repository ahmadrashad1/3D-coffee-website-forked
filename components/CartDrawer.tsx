"use client";

import { useCart } from "@/components/CartContext";
import { findMenuItem, formatPrice } from "@/lib/menu-data";

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, setQuantity, removeItem, totalCents } = useCart();

  if (!open) return null;

  return (
    <div className="cart-drawer-overlay" role="dialog" aria-label="Cart" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Close cart">
          ×
        </button>
        <h2>Your cart</h2>
        {items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <ul className="cart-drawer-list">
              {items.map((line) => {
                const menuItem = findMenuItem(line.menuItemId);
                if (!menuItem) return null;
                return (
                  <li key={line.menuItemId} className="cart-drawer-row">
                    <span>{menuItem.name}</span>
                    <div className="cart-drawer-qty">
                      <button type="button" onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}>
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <span>{formatPrice(menuItem.priceCents * line.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.menuItemId)}
                      aria-label={`Remove ${menuItem.name}`}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="cart-drawer-total">Total: {formatPrice(totalCents)}</div>
            <a className="cta" href="/checkout">
              Checkout
            </a>
          </>
        )}
      </div>
    </div>
  );
}
