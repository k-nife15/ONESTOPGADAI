import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatNoWaLocal } from "@/lib/formatters";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    const nasabahs = await prisma.nasabah.findMany({
      where: q
        ? {
            OR: [
              { nama: { contains: q } },
              { nik: { contains: q } },
              { cif: { contains: q } },
            ],
          }
        : undefined,
      include: {
        transaksi: {
          select: {
            sbr: true,
            status: true,
            marhunBih: true,
            totalTaksiran: true,
            tanggalAkad: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: nasabahs });
  } catch (error) {
    console.error("Gagal mengambil nasabah:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data nasabah" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, nik, hp, alamat, noRek } = body;
    const normalizedHp = formatNoWaLocal(hp);

    if (!nama || !nik || !normalizedHp || !alamat) {
      return NextResponse.json(
        { success: false, error: "Nama, No. KTP (NIK), No. HP, dan Alamat wajib diisi." },
        { status: 400 }
      );
    }

    // Cek apakah NIK sudah terdaftar
    const existing = await prisma.nasabah.findUnique({
      where: { nik },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `NIK ${nik} sudah terdaftar atas nama ${existing.nama} (${existing.cif}).` },
        { status: 400 }
      );
    }

    // Generate No. CIF resmi 8 Digit unik (contoh: 01010388)
    const existingRows = await prisma.nasabah.findMany({ select: { cif: true } });
    const existingCifSet = new Set(existingRows.map((r) => r.cif));
    let seqNum = existingRows.length + 393;
    let newCif = `0101${String(seqNum).padStart(4, "0")}`;
    while (existingCifSet.has(newCif)) {
      seqNum += 1;
      newCif = `0101${String(seqNum).padStart(4, "0")}`;
    }
    // Generate No. Kontrak permanen 10 Digit CBS (contoh: 4420101123)
    const newNoKontrak = `4420101${String(seqNum - 265).padStart(3, "0")}`;

    const created = await prisma.$transaction(async (db) => {
      const newNasabah = await db.nasabah.create({
        data: {
          cif: newCif,
          nik,
          nama,
          hp: normalizedHp,
          alamat,
          noRek: noRek || null,
          noKontrak: newNoKontrak,
        },
      });

      await db.auditLog.create({
        data: {
          user: body.user || "Petugas Loket",
          role: "PENAKSIR",
          action: "Tambah Nasabah CIF",
          notes: `Pendaftaran nasabah baru ${nama} (CIF: ${newCif}, No. Kontrak: ${newNoKontrak}).`,
        },
      });

      return newNasabah;
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Gagal simpan nasabah:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat menyimpan nasabah." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { cif, nama, hp, alamat, noRek } = body;
    const normalizedHp = formatNoWaLocal(hp);

    if (!cif) {
      return NextResponse.json(
        { success: false, error: "No. CIF wajib disertakan untuk pembaruan." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (db) => {
      const updatedNasabah = await db.nasabah.update({
        where: { cif },
        data: {
          nama,
          hp: normalizedHp,
          alamat,
          noRek: noRek || null,
        },
      });

      if (normalizedHp) {
        await db.transaksiRahn.updateMany({
          where: { cif },
          data: { hp: normalizedHp },
        });
      }

      await db.auditLog.create({
        data: {
          user: body.user || "Petugas Loket",
          role: "PENAKSIR",
          action: "Perbarui Data Nasabah",
          notes: `Pembaruan data profil nasabah ${updatedNasabah.nama} (CIF: ${cif}).`,
        },
      });

      return updatedNasabah;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Gagal update nasabah:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui data nasabah." },
      { status: 500 }
    );
  }
}
