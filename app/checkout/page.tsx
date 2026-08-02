"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";
import { useCart } from "@/components/CartContext";
import { findMenuItem, formatPrice } from "@/lib/menu-data";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalCents, clear } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !contact.trim() || !pickupTime.trim()) {
      setError("Please fill in your name, contact, and pickup time.");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          contact,
          pickupTime,
          items: items.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Something went wrong, please try again." }));
        setError(body.error ?? "Something went wrong, please try again.");
        setSubmitting(false);
        return;
      }

      const { id } = await res.json();
      clear();
      router.push(`/order-confirmation/${id}`);
    } catch {
      setError("Something went wrong, please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Nav variant="menu" />
      <main id="checkout-content">
        <section className="section">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">Checkout</p>
              <h1 className="display">
                Confirm your
                <br />
                <em>order.</em>
              </h1>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="lead">
              Your cart is empty. <a href="/menu">Return to the menu</a> to add something first.
            </p>
          ) : (
            <div className="checkout-grid">
              <div>
                <ul className="cart-drawer-list">
                  {items.map((line) => {
                    const menuItem = findMenuItem(line.menuItemId);
                    if (!menuItem) return null;
                    return (
                      <li key={line.menuItemId} className="checkout-summary-row">
                        <span>
                          {menuItem.name} × {line.quantity}
                        </span>
                        <span>{formatPrice(menuItem.priceCents * line.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="cart-drawer-total">Total: {formatPrice(totalCents)}</div>
              </div>

              <form className="checkout-form" onSubmit={handleSubmit}>
                <label>
                  Name
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </label>
                <label>
                  Email or phone
                  <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} />
                </label>
                <label>
                  Pickup time
                  <input
                    type="text"
                    placeholder="e.g. 10:30am"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  />
                </label>
                {error && <p className="checkout-error">{error}</p>}
                <button type="submit" className="cta" disabled={submitting}>
                  {submitting ? "Placing order…" : "Place order"}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
