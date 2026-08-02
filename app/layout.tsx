import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "EMBER Coffee",
  description:
    "EMBER is coffee for mornings already in motion—roasted with depth and made to travel.",
  metadataBase: new URL("https://ember.coffee"),
};

export const viewport: Viewport = {
  themeColor: "#171411",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <AuthProvider user={user ? { id: user.id, email: user.email } : null}>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
