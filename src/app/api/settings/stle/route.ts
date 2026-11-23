import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STLE } from "@/lib/formatters";

const STLE_KEY = "STLE_PER_GRAM";

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: STLE_KEY },
    });
    const stle = config ? Number(config.value) || DEFAULT_STLE : DEFAULT_STLE;
    return NextResponse.json({
      success: true,
      stle,
      updatedBy: config?.updatedBy || "Sistem",
      updatedAt: config?.updatedAt || null,
    });
  } catch (error) {
    console.error("Gagal mengambil STLE:", error);
    return NextResponse.json({ success: true, stle: DEFAULT_STLE });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { stle, actor } = body;
    const numericStle = Math.round(Number(stle));

    if (!Number.isFinite(numericStle) || numericStle < 100_000) {
      return NextResponse.json(
        { success: false, error: "Nilai STLE harus berupa angka minimal Rp 100.000 / gram." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (db) => {
      const cfg = await db.systemConfig.upsert({
        where: { key: STLE_KEY },
        update: {
          value: String(numericStle),
          updatedBy: actor || "Admin IT",
        },
        create: {
          key: STLE_KEY,
          value: String(numericStle),
          updatedBy: actor || "Admin IT",
        },
      });

      await db.auditLog.create({
        data: {
          user: actor || "Admin IT",
          role: "ADMIN_IT",
          action: "Ubah STLE Kantor",
          notes: `Super Admin memperbarui STLE resmi kantor menjadi Rp ${numericStle.toLocaleString("id-ID")} / gram.`,
        },
      });

      return cfg;
    });

    return NextResponse.json({
      success: true,
      stle: Number(updated.value),
      updatedBy: updated.updatedBy,
    });
  } catch (error) {
    console.error("Gagal memperbarui STLE:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat menyimpan STLE." },
      { status: 500 }
    );
  }
}
