import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMenuItem } from "@/lib/menu-data";

type OrderLine = { menuItemId: unknown; quantity: unknown };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { customerName, contact, pickupTime, items } = body as Record<string, unknown>;

  if (
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof contact !== "string" ||
    !contact.trim() ||
    typeof pickupTime !== "string" ||
    !pickupTime.trim()
  ) {
    return NextResponse.json(
      { error: "customerName, contact, and pickupTime are required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }

  const lines: { menuItemId: string; name: string; priceCents: number; quantity: number }[] = [];

  for (const raw of items as OrderLine[]) {
    const { menuItemId, quantity } = raw ?? {};

    if (typeof menuItemId !== "string" || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: `Invalid line item: ${JSON.stringify(raw)}` },
        { status: 400 }
      );
    }

    const menuItem = findMenuItem(menuItemId);
    if (!menuItem) {
      return NextResponse.json({ error: `Unknown menu item: ${menuItemId}` }, { status: 400 });
    }

    lines.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      priceCents: menuItem.priceCents,
      quantity,
    });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);

  const order = await prisma.order.create({
    data: {
      customerName: customerName.trim(),
      contact: contact.trim(),
      pickupTime: pickupTime.trim(),
      totalCents,
      items: { create: lines },
    },
  });

  return NextResponse.json({ id: order.id, totalCents: order.totalCents }, { status: 201 });
}
