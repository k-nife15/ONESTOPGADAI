import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateNoAkad,
  generateNoSbg,
  generateNoKontrakPermanen,
} from "@/lib/formatters";
import { notifyNasabahWa } from "@/lib/wa-notifier";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sbr,
      noAkad,
      noSbg,
      noKontrak,
      user,
      catatan,
    } = body;

    if (!sbr) {
      return NextResponse.json(
        { success: false, error: "Nomor SBR wajib disertakan." },
        { status: 400 }
      );
    }

    const tx = await prisma.transaksiRahn.findUnique({
      where: { sbr },
    });

    if (!tx) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (tx.status !== "Menunggu Back Office") {
      return NextResponse.json(
        {
          success: false,
          error: `Berkas ${sbr} berstatus "${tx.status}". Back Office hanya dapat meregistrasi berkas berstatus Menunggu Back Office.`,
        },
        { status: 400 }
      );
    }

    // Cari No Kontrak permanen nasabah
    let finalNoKontrak = noKontrak || tx.noKontrak;
    if (!finalNoKontrak && tx.cif) {
      const nasabah = await prisma.nasabah.findUnique({ where: { cif: tx.cif } });
      if (nasabah?.noKontrak) {
        finalNoKontrak = nasabah.noKontrak;
      }
    }
    if (!finalNoKontrak) {
      finalNoKontrak = generateNoKontrakPermanen(tx.cif || sbr);
    }

    const now = new Date();
    const seqNumber = parseInt(sbr.replace(/\D/g, "").slice(-3), 10) || 1;
    const finalNoAkad = noAkad || tx.noAkad || generateNoAkad(seqNumber, now);
    const finalNoSbg = noSbg || tx.noSbg || generateNoSbg(seqNumber, now);

    const updated = await prisma.$transaction(async (db) => {
      const updatedTx = await db.transaksiRahn.update({
        where: { sbr },
        data: {
          noAkad: finalNoAkad,
          noSbg: finalNoSbg,
          noKontrak: finalNoKontrak,
          status: "Siap Cetak",
          catatan: catatan ? `${tx.catatan ? tx.catatan + " | " : ""}${catatan}` : tx.catatan,
        },
      });

      await db.auditLog.create({
        data: {
          user: user || "Rina Wahyuni",
          role: "BACK_OFFICE",
          action: "Registrasi Legalitas",
          refId: sbr,
          notes: `Registrasi No. Akad ${finalNoAkad}, SBG ${finalNoSbg}, CBS ${finalNoKontrak}. Status diubah ke Siap Cetak.`,
        },
      });

      return updatedTx;
    });

    void notifyNasabahWa({
      event: "BACKOFFICE_REGISTERED",
      sbr: updated.sbr,
      nama: updated.nama,
      hp: updated.hp,
      marhunBih: updated.marhunBih,
      noAkad: updated.noAkad,
      noSbg: updated.noSbg,
      tanggalJatuhTempo: updated.tanggalJatuhTempo,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Gagal registrasi back office:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses registrasi legalitas." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { sbr, action, user, alasan } = body;

    if (!sbr || !action) {
      return NextResponse.json(
        { success: false, error: "Nomor SBR dan aksi wajib diisi." },
        { status: 400 }
      );
    }

    const tx = await prisma.transaksiRahn.findUnique({
      where: { sbr },
    });

    if (!tx) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (action === "SETTLE") {
      if (tx.status !== "Siap Cetak" && tx.status !== "Tercetak") {
        return NextResponse.json(
          { success: false, error: "Hanya akad aktif (Siap Cetak / Tercetak) yang dapat dilunasi." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (db) => {
        const updatedTx = await db.transaksiRahn.update({
          where: { sbr },
          data: { status: "Lunas" },
        });
        await db.auditLog.create({
          data: {
            user: user || "Rina Wahyuni",
            role: "BACK_OFFICE",
            action: "Pelunasan Gadai",
            refId: sbr,
            notes: `Pelunasan penuh akad ${sbr} (${tx.nama}). Marhun dikembalikan ke nasabah.`,
          },
        });
        return updatedTx;
      });

      void notifyNasabahWa({
        event: "TRANSAKSI_LUNAS",
        sbr: updated.sbr,
        nama: updated.nama,
        hp: updated.hp,
        noAkad: updated.noAkad,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "AUCTION") {
      if (tx.status !== "Siap Cetak" && tx.status !== "Tercetak") {
        return NextResponse.json(
          { success: false, error: "Hanya akad aktif (Siap Cetak / Tercetak) yang dapat diproses lelang." },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (db) => {
        const updatedTx = await db.transaksiRahn.update({
          where: { sbr },
          data: {
            status: "Lelang",
            batalAlasan: alasan || "Lelang agunan jatuh tempo",
          },
        });
        await db.auditLog.create({
          data: {
            user: user || "Rina Wahyuni",
            role: "BACK_OFFICE",
            action: "Eksekusi Lelang",
            refId: sbr,
            notes: `Akad ${sbr} (${tx.nama}) ditandai Lelang. Keterangan: ${alasan || "Jatuh tempo"}`,
          },
        });
        return updatedTx;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "CANCEL") {
      if (tx.status !== "Menunggu Back Office" && tx.status !== "Siap Cetak") {
        return NextResponse.json(
          { success: false, error: "Hanya berkas Menunggu Back Office atau Siap Cetak yang dapat dibatalkan Back Office." },
          { status: 400 }
        );
      }

      const reason = (alasan || "").trim() || "Dibatalkan oleh Back Office";
      const updated = await prisma.$transaction(async (db) => {
        const updatedTx = await db.transaksiRahn.update({
          where: { sbr },
          data: { status: "Dibatalkan", batalAlasan: reason },
        });
        await db.auditLog.create({
          data: {
            user: user || "Rina Wahyuni",
            role: "BACK_OFFICE",
            action: "Pembatalan Back Office",
            refId: sbr,
            notes: `Berkas ${sbr} dibatalkan Back Office. Alasan: ${reason}`,
          },
        });
        return updatedTx;
      });

      void notifyNasabahWa({
        event: "TRANSAKSI_REJECTED",
        sbr: updated.sbr,
        nama: updated.nama,
        hp: updated.hp,
        alasan: reason,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: "Aksi PATCH Back Office tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Gagal memproses aksi back office:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server pada Back Office." },
      { status: 500 }
    );
  }
}
