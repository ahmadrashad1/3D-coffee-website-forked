import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthContext";
import { getCurrentUser } from "@/lib/auth";
import { getCartPayload } from "@/lib/cart";

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
  const initialCart = user
    ? await getCartPayload(user.id)
    : { items: [], totalCents: 0, totalCount: 0 };

  return (
    <html lang="en">
      <body>
        <AuthProvider user={user ? { id: user.id, email: user.email } : null}>
          <CartProvider userKey={user?.id ?? "anonymous"} initialCart={initialCart}>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
