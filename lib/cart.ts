import { prisma } from "@/lib/prisma";
import { findMenuItem } from "@/lib/menu-data";

export async function getCartPayload(userId: number) {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const items = cartItems.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
  }));

  const { totalCents, totalCount } = items.reduce(
    (acc, line) => {
      const menuItem = findMenuItem(line.menuItemId);
      if (!menuItem) return acc;
      return {
        totalCents: acc.totalCents + menuItem.priceCents * line.quantity,
        totalCount: acc.totalCount + line.quantity,
      };
    },
    { totalCents: 0, totalCount: 0 }
  );

  return { items, totalCents, totalCount };
}
