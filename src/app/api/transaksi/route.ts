import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface MarhunInput {
  jenis: string;
  karat: number | string;
  jumlah?: number;
  beratKotor: number;
  beratBersih: number;
  nilaiTaksiran: number;
  keterangan?: string;
  kondisi?: string;
}

export async function GET() {
  try {
    const transaksis = await prisma.transaksiRahn.findMany({
      include: { barang: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: transaksis });
  } catch (error) {
    console.error("Gagal mengambil transaksi:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data transaksi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sbr,
      cif,
      nama,
      nik,
      hp,
      alamat,
      noRek,
      noKontrak,
      barang,
      marhunBih,
      ujroh,
      biayaAdmin,
      nominalBersih,
      tanggalAkad,
      tanggalJatuhTempo,
      keteranganGadai,
      petugasPenaksir,
      catatan,
      status,
      akadAsal,
    } = body;

    if (!sbr || !nama || !nik || !Array.isArray(barang) || barang.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nomor SBR, Identitas Nasabah, dan Minimal 1 Barang Emas wajib diisi." },
        { status: 400 }
      );
    }

    const allowedStatuses = ["Draft", "Menunggu Pemutus"];
    const targetStatus = status || "Menunggu Pemutus";
    if (!allowedStatuses.includes(targetStatus)) {
      return NextResponse.json(
        { success: false, error: "Status awal pengajuan hanya boleh Draft atau Menunggu Pemutus." },
        { status: 400 }
      );
    }

    if (typeof marhunBih !== "number" || !Number.isFinite(marhunBih) || marhunBih <= 0) {
      return NextResponse.json(
        { success: false, error: "Uang Pinjaman (Marhun Bih) harus lebih besar dari Rp 0." },
        { status: 400 }
      );
    }

    for (const b of barang as MarhunInput[]) {
      const karatNum = typeof b.karat === "number" ? b.karat : parseInt(String(b.karat).replace(/\D/g, ""), 10);
      if (!b.jenis || !String(b.jenis).trim()) {
        return NextResponse.json(
          { success: false, error: "Jenis barang jaminan tidak boleh kosong." },
          { status: 400 }
        );
      }
      if (!karatNum || karatNum < 1 || karatNum > 24) {
        return NextResponse.json(
          { success: false, error: `Kadar karat pada "${b.jenis}" harus antara 1 sampai 24 Karat.` },
          { status: 400 }
        );
      }
      if (!b.beratBersih || b.beratBersih <= 0 || b.beratBersih > b.beratKotor) {
        return NextResponse.json(
          { success: false, error: `Berat bersih pada "${b.jenis}" harus > 0 dan tidak boleh melebihi berat kotor.` },
          { status: 400 }
        );
      }
    }

    // Cek duplikasi nomor SBR
    const existing = await prisma.transaksiRahn.findUnique({
      where: { sbr },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Nomor SBR ${sbr} sudah pernah digunakan sebelumnya. Silakan gunakan nomor unik lain.` },
        { status: 400 }
      );
    }

    // Hitung total berat & taksiran
    const totalBeratKotor = barang.reduce((s: number, b: MarhunInput) => s + (b.beratKotor || 0), 0);
    const totalBeratBersih = barang.reduce((s: number, b: MarhunInput) => s + (b.beratBersih || 0), 0);
    const totalTaksiran = barang.reduce((s: number, b: MarhunInput) => s + (b.nilaiTaksiran || 0), 0);

    const createdTx = await prisma.$transaction(async (tx) => {
      const created = await tx.transaksiRahn.create({
        data: {
          sbr,
          cif: cif || null,
          nama,
          nik,
          hp,
          alamat,
          noRek: noRek || null,
          noKontrak: noKontrak || null,
          totalBeratKotor,
          totalBeratBersih,
          totalTaksiran,
          marhunBih,
          ujroh: ujroh || 0,
          biayaAdmin: biayaAdmin || 0,
          nominalBersih: nominalBersih ?? Math.max(0, marhunBih - (biayaAdmin || 0)),
          tanggalAkad,
          tanggalJatuhTempo,
          keteranganGadai: keteranganGadai || "Baru",
          akadAsal: akadAsal || null,
          kantor: "Kantor Pusat Ponorogo",
          petugasPenaksir: petugasPenaksir || "Ahmad Hidayat",
          status: targetStatus,
          catatan: catatan || null,
        },
      });

      for (const b of barang as MarhunInput[]) {
        await tx.marhunItem.create({
          data: {
            sbr: created.sbr,
            jenis: b.jenis,
            karat: typeof b.karat === "number" ? `${b.karat}K` : String(b.karat),
            jumlah: b.jumlah || 1,
            beratKotor: b.beratKotor,
            beratBersih: b.beratBersih,
            nilaiTaksiran: b.nilaiTaksiran,
            keterangan: b.keterangan || b.kondisi || null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          user: petugasPenaksir || "Ahmad Hidayat",
          role: "PENAKSIR",
          action: "Pengajuan Transaksi",
          refId: created.sbr,
          notes: `Pengajuan gadai baru ${created.sbr} sebesar ${fmtRpNumber(marhunBih)} atas nasabah ${nama}`,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: createdTx });
  } catch (error) {
    console.error("Gagal menyimpan transaksi:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat menyimpan transaksi." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sbr = searchParams.get("sbr");
    const user = searchParams.get("user") || "Ahmad Hidayat";

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

    // Hanya Draft yang dapat dihapus secara permanen
    if (tx.status !== "Draft") {
      return NextResponse.json(
        { success: false, error: "Hanya transaksi berstatus Draft yang dapat dihapus." },
        { status: 400 }
      );
    }

    await prisma.transaksiRahn.delete({
      where: { sbr },
    });

    await prisma.auditLog.create({
      data: {
        user,
        role: "PENAKSIR",
        action: "Hapus Draft Transaksi",
        refId: sbr,
        notes: `Draft transaksi ${sbr} berhasil dihapus oleh penaksir.`,
      },
    });

    return NextResponse.json({ success: true, message: `Draft ${sbr} berhasil dihapus.` });
  } catch (error) {
    console.error("Gagal menghapus draft:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus draft transaksi." },
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
        { success: false, error: "SBR dan Aksi wajib disertakan." },
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

    // Aksi 1: Tarik pengajuan (Menunggu Pemutus -> Dibatalkan oleh Penaksir)
    if (action === "CANCEL_SUBMISSION") {
      if (tx.status !== "Menunggu Pemutus") {
        return NextResponse.json(
          { success: false, error: "Hanya berkas berstatus Menunggu Pemutus yang dapat ditarik/dibatalkan penaksir." },
          { status: 400 }
        );
      }

      const updated = await prisma.transaksiRahn.update({
        where: { sbr },
        data: {
          status: "Dibatalkan",
          batalAlasan: alasan || "Dibatalkan oleh Penaksir di loket (Nasabah batal)",
        },
      });

      await prisma.auditLog.create({
        data: {
          user: user || "Ahmad Hidayat",
          role: "PENAKSIR",
          action: "Tarik Pengajuan Transaksi",
          refId: sbr,
          notes: `Pengajuan ${sbr} ditarik/dibatalkan sebelum diputus. Alasan: ${alasan || "Nasabah batal"}`,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // Aksi 2: Submit Draft ke Pemutus (Draft -> Menunggu Pemutus)
    if (action === "SUBMIT_DRAFT") {
      if (tx.status !== "Draft") {
        return NextResponse.json(
          { success: false, error: "Hanya berkas berstatus Draft yang dapat diajukan ke Pemutus." },
          { status: 400 }
        );
      }

      const updated = await prisma.transaksiRahn.update({
        where: { sbr },
        data: {
          status: "Menunggu Pemutus",
        },
      });

      await prisma.auditLog.create({
        data: {
          user: user || "Ahmad Hidayat",
          role: "PENAKSIR",
          action: "Kirim Draft ke Pemutus",
          refId: sbr,
          notes: `Draft ${sbr} diteruskan ke antrean otorisasi Pemutus.`,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // Aksi 3: Konfirmasi Persetujuan Nasabah di Loket (Disetujui Pemutus -> Menunggu Back Office)
    if (action === "CONFIRM_NASABAH") {
      if (tx.status !== "Disetujui Pemutus") {
        return NextResponse.json(
          {
            success: false,
            error: "Hanya berkas berstatus Disetujui Pemutus yang dapat dikonfirmasi ke nasabah.",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (db) => {
        const updatedTx = await db.transaksiRahn.update({
          where: { sbr },
          data: {
            status: "Menunggu Back Office",
          },
        });

        await db.auditLog.create({
          data: {
            user: user || "Ahmad Hidayat",
            role: "PENAKSIR",
            action: "Persetujuan Nasabah di Loket",
            refId: sbr,
            notes: `Nasabah ${tx.nama} menyetujui hasil putusan Pemutus untuk ${sbr}. Berkas diteruskan ke antrean Back Office.`,
          },
        });

        return updatedTx;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // Aksi 4: Nasabah Menolak / Batal Setelah Putusan Pemutus (Disetujui Pemutus -> Dibatalkan)
    if (action === "CANCEL_NASABAH") {
      if (tx.status !== "Disetujui Pemutus") {
        return NextResponse.json(
          {
            success: false,
            error: "Hanya berkas berstatus Disetujui Pemutus yang dapat dibatalkan melalui konfirmasi nasabah.",
          },
          { status: 400 }
        );
      }

      const reason = alasan || "Nasabah menolak nominal taksiran/ketentuan pemutus di loket.";
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
            user: user || "Ahmad Hidayat",
            role: "PENAKSIR",
            action: "Penolakan Nasabah di Loket",
            refId: sbr,
            notes: `Nasabah ${tx.nama} menolak putusan untuk ${sbr}. Alasan: ${reason}`,
          },
        });

        return updatedTx;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: "Aksi PATCH tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Gagal update status transaksi:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server saat memperbarui transaksi." },
      { status: 500 }
    );
  }
}

function fmtRpNumber(n: number) {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}
