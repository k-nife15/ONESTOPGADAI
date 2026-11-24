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

    const isPreSignPrint = tx.status === "Disetujui Pemutus";
    if (!isPreSignPrint && tx.status !== "Siap Cetak" && tx.status !== "Tercetak") {
      return NextResponse.json(
        {
          success: false,
          error: `Dokumen hanya dapat dicetak jika berstatus Disetujui Pemutus, Siap Cetak, atau Tercetak (status saat ini: ${tx.status}).`,
        },
        { status: 400 }
      );
    }

    const isReprint = tx.status === "Tercetak";

    const updated = await prisma.$transaction(async (db) => {
      const nextTx =
        isReprint || isPreSignPrint
          ? tx
          : await db.transaksiRahn.update({
              where: { sbr },
              data: { status: "Tercetak" },
            });

      // Jika transaksi ini menggantikan akad lama (Topup / Perpanjangan / Tebus Sebagian / Turun Plafon),
      // tutup akad lama menjadi Lunas saat akad baru resmi dicetak.
      if (!isReprint && !isPreSignPrint && tx.akadAsal) {
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
          action: isPreSignPrint
            ? "Cetak SBR (Pra-TTD Nasabah)"
            : isReprint
            ? "Cetak Ulang Dokumen"
            : "Cetak Dokumen Resmi",
          refId: sbr,
          notes: `${
            isPreSignPrint
              ? "Cetak SBR untuk ditandatangani nasabah"
              : isReprint
              ? "Cetak ulang"
              : "Cetak perdana"
          } dokumen ${dokumen} untuk berkas ${sbr}.`,
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
