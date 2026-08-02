import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCartPayload } from "@/lib/cart";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ menuItemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { menuItemId } = await params;
  const body = await request.json().catch(() => null);
  const quantity =
    body && typeof body === "object" ? (body as Record<string, unknown>).quantity : undefined;

  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: "quantity must be an integer" }, { status: 400 });
  }

  if (quantity < 1) {
    await prisma.cartItem.deleteMany({ where: { userId: user.id, menuItemId } });
  } else {
    await prisma.cartItem.updateMany({
      where: { userId: user.id, menuItemId },
      data: { quantity },
    });
  }

  return NextResponse.json(await getCartPayload(user.id), { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ menuItemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { menuItemId } = await params;

  await prisma.cartItem.deleteMany({ where: { userId: user.id, menuItemId } });

  return NextResponse.json(await getCartPayload(user.id), { status: 200 });
}
