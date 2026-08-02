import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { findMenuItem } from "@/lib/menu-data";
import { getCartPayload } from "@/lib/cart";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const menuItemId =
    body && typeof body === "object" ? (body as Record<string, unknown>).menuItemId : undefined;

  if (typeof menuItemId !== "string" || !findMenuItem(menuItemId)) {
    return NextResponse.json({ error: "Unknown menu item" }, { status: 400 });
  }

  const existing = await prisma.cartItem.findUnique({
    where: { userId_menuItemId: { userId: user.id, menuItemId } },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + 1 },
    });
  } else {
    await prisma.cartItem.create({
      data: { userId: user.id, menuItemId, quantity: 1 },
    });
  }

  return NextResponse.json(await getCartPayload(user.id), { status: 200 });
}
