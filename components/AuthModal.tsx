"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Something went wrong, please try again." }));
        setError(body.error ?? "Something went wrong, please try again.");
        setSubmitting(false);
        return;
      }

      setEmail("");
      setPassword("");
      setSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError("Something went wrong, please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="cart-drawer-overlay"
      role="dialog"
      aria-label={mode === "login" ? "Log in" : "Sign up"}
      onClick={onClose}
    >
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {error && <p className="checkout-error">{error}</p>}
          <button type="submit" className="cta" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <button
          type="button"
          className="auth-modal-switch"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
