"use client";

import { useState } from "react";
import AuthButton from "@/components/AuthButton";

export default function MobileNav({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="nav-burger"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <div className="cart-drawer-overlay" role="dialog" aria-label="Navigation" onClick={() => setOpen(false)}>
          <div className="cart-drawer nav-drawer" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cart-drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
              ×
            </button>
            <nav className="nav-drawer-links" aria-label="Mobile navigation">
              {links.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="nav-drawer-actions">
              <AuthButton />
              <a className="cta" href="/menu" onClick={() => setOpen(false)}>
                Order ahead
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
