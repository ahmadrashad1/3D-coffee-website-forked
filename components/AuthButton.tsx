"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";

export default function AuthButton() {
  const { user, openLogin } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    setLoggingOut(false);
  }

  if (user) {
    return (
      <div className="auth-button">
        <span className="auth-email">{user.email}</span>
        <button type="button" className="auth-logout" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "…" : "Log out"}
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="auth-login" onClick={openLogin}>
      Log in
    </button>
  );
}
