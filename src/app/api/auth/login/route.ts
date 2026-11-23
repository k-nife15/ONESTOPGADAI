import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, branch } = body;

    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json(
        { success: false, error: "Username / NIP dan Kata Sandi wajib diisi." },
        { status: 400 }
      );
    }

    let dbUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!dbUser) {
      const demoIdMap: Record<string, string> = {
        "19940812.ahmad": "u-penaksir",
        "19780410.arifin": "u-pemutus",
        "19961120.rina": "u-backoffice",
        "19900215.slamet": "u-admin",
      };
      const fallbackId = demoIdMap[cleanUsername];
      if (fallbackId) {
        dbUser = await prisma.user.findUnique({ where: { id: fallbackId } });
      }
    }

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: `Akun dengan username "@${cleanUsername}" tidak ditemukan.` },
        { status: 401 }
      );
    }

    if (!dbUser.active) {
      return NextResponse.json(
        { success: false, error: "Akun Anda berstatus Nonaktif. Hubungi Admin IT untuk aktivasi." },
        { status: 403 }
      );
    }

    // Kompatibel mundur untuk akun lama sebelum kolom passwordHash diisi (default: syariah2026)
    const isPasswordValid = dbUser.passwordHash
      ? verifyPassword(cleanPassword, dbUser.passwordHash)
      : cleanPassword === "syariah2026";

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Kata sandi yang Anda masukkan salah." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role,
        branch: branch || dbUser.branch,
      },
    });
  } catch (error) {
    console.error("Gagal memproses login:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat login." },
      { status: 500 }
    );
  }
}
