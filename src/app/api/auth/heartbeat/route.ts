import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, offline } = body as { username?: string; offline?: boolean };
    const cleanUsername = String(username || "").trim().toLowerCase();

    if (!cleanUsername) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await prisma.user.updateMany({
      where: { username: cleanUsername },
      data: { lastSeenAt: offline ? null : new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
