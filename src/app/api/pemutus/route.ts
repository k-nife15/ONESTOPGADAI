import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sbr,
      action, // "APPROVE" | "REJECT"
      catatan,
      user,
      batalAlasan,
    } = body;

    if (!sbr || !action) {
      return NextResponse.json(
        { success: false, error: "Nomor SBR dan Aksi wajib diisi." },
        { status: 400 }
      );
    }

    const tx = await prisma.transaksiRahn.findUnique({
      where: { sbr },
    });

    if (!tx) {
      return NextResponse.json(
        { success: false, error: `Transaksi dengan nomor SBR ${sbr} tidak ditemukan.` },
        { status: 404 }
      );
    }

    if (tx.status !== "Menunggu Pemutus") {
      return NextResponse.json(
        {
          success: false,
          error: `Transaksi ${sbr} berstatus "${tx.status}" dan tidak dapat diproses oleh Pemutus.`,
        },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      const now = new Date();
      const finalCatatan = catatan?.trim() ? catatan.trim() : tx.catatan;

      const updated = await prisma.$transaction(async (db) => {
        const updatedTx = await db.transaksiRahn.update({
          where: { sbr },
          data: {
            status: "Disetujui Pemutus",
            pemutusTtd: user || "Arifin Nugroho, SE",
            pemutusWaktu: now.toISOString(),
            catatan: finalCatatan,
          },
        });

        await db.auditLog.create({
          data: {
            user: user || "Arifin Nugroho, SE",
            role: "PEMUTUS",
            action: "Otorisasi Disetujui",
            refId: sbr,
            notes: `Persetujuan pembiayaan rahn ${sbr} senilai Rp ${Math.round(tx.marhunBih).toLocaleString("id-ID")}. Berkas dikembalikan ke Penaksir untuk konfirmasi nasabah.${catatan ? " Catatan: " + catatan : ""}`,
          },
        });

        return updatedTx;
      });

      return NextResponse.json({ success: true, data: updated });
    } else if (action === "REJECT") {
      const reason = (batalAlasan || catatan || "").trim();
      if (!reason) {
        return NextResponse.json(
          { success: false, error: "Alasan penolakan atau pengembalian ke penaksir wajib diisi." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (db) => {
        const updatedTx = await db.transaksiRahn.update({
          where: { sbr },
          data: {
            status: "Dibatalkan",
            batalAlasan: reason,
          },
        });

        await db.auditLog.create({
          data: {
            user: user || "Arifin Nugroho, SE",
            role: "PEMUTUS",
            action: "Otorisasi Ditolak",
            refId: sbr,
            notes: `Penolakan berkas rahn ${sbr}. Alasan: ${reason}`,
          },
        });

        return updatedTx;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Gagal memproses otorisasi pemutus:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat memproses otorisasi." },
      { status: 500 }
    );
  }
}
