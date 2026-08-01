import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";

export const metadata: Metadata = {
  title: "EMBER Coffee",
  description:
    "EMBER is coffee for mornings already in motion—roasted with depth and made to travel.",
  metadataBase: new URL("https://ember.coffee"),
};

export const viewport: Viewport = {
  themeColor: "#171411",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
