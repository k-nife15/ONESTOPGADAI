import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sbr, dokumen, user, role } = body;

    if (!sbr || !dokumen) {
      return NextResponse.json(
        { success: false, error: "Nomor SBR dan jenis dokumen wajib diisi." },
        { status: 400 }
      );
    }

    const tx = await prisma.transaksiRahn.findUnique({
      where: { sbr },
    });

    if (!tx) {
      return NextResponse.json(
        { success: false, error: `Transaksi ${sbr} tidak ditemukan.` },
        { status: 404 }
      );
    }

    if (tx.status !== "Siap Cetak" && tx.status !== "Tercetak") {
      return NextResponse.json(
        {
          success: false,
          error: `Dokumen hanya dapat dicetak jika berstatus Siap Cetak atau Tercetak (status saat ini: ${tx.status}).`,
        },
        { status: 400 }
      );
    }

    const isReprint = tx.status === "Tercetak";
    if (isReprint && role !== "BACK_OFFICE" && role !== "ADMIN_IT") {
      return NextResponse.json(
        {
          success: false,
          error: "Cetak ulang dokumen hanya diizinkan untuk Back Office atau Admin IT.",
        },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (db) => {
      const nextTx = isReprint
        ? tx
        : await db.transaksiRahn.update({
            where: { sbr },
            data: { status: "Tercetak" },
          });

      // Jika transaksi ini menggantikan akad lama (Topup / Perpanjangan / Tebus Sebagian / Turun Plafon),
      // tutup akad lama menjadi Lunas saat akad baru resmi dicetak.
      if (!isReprint && tx.akadAsal) {
        const oldTx = await db.transaksiRahn.findUnique({
          where: { sbr: tx.akadAsal },
        });
        if (oldTx && oldTx.status !== "Lunas" && oldTx.status !== "Dibatalkan") {
          await db.transaksiRahn.update({
            where: { sbr: tx.akadAsal },
            data: { status: "Lunas" },
          });
          await db.auditLog.create({
            data: {
              user: user || "Petugas Loket",
              role: role || "BACK_OFFICE",
              action: "Pelunasan Akad Asal",
              refId: tx.akadAsal,
              notes: `Akad ${tx.akadAsal} otomatis ditutup menjadi Lunas karena digantikan oleh akad baru ${sbr} (${tx.keteranganGadai}).`,
            },
          });
        }
      }

      await db.auditLog.create({
        data: {
          user: user || "Petugas Loket",
          role: role || "PENAKSIR",
          action: isReprint ? "Cetak Ulang Dokumen" : "Cetak Dokumen Resmi",
          refId: sbr,
          notes: `${isReprint ? "Cetak ulang" : "Cetak perdana"} dokumen ${dokumen} untuk berkas ${sbr}.`,
        },
      });

      return nextTx;
    });

    return NextResponse.json({ success: true, data: updated, isReprint });
  } catch (error) {
    console.error("Gagal memproses cetak dokumen:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat mencatat cetak dokumen." },
      { status: 500 }
    );
  }
}
