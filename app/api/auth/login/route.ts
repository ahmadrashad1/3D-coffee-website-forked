import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({ id: user.id, email: user.email }, { status: 200 });
}
