"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import AuthModal from "@/components/AuthModal";

export type AuthUser = { id: number; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  openLogin: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AuthContext.Provider value={{ user, openLogin: () => setModalOpen(true) }}>
      {children}
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
