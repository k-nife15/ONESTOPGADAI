import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding data One Stop Gadai Emas Syariah...");

  // 1. Bersihkan tabel
  await prisma.marhunItem.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.transaksiRahn.deleteMany({});
  await prisma.nasabah.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Seeding Users (4 Peran)
  const defaultPassHash = hashPassword("syariah2026");
  const users = [
    {
      id: "u-penaksir",
      username: "ahmad.taksir",
      name: "Ahmad Hidayat",
      passwordHash: defaultPassHash,
      role: "PENAKSIR",
      branch: "Kantor Pusat Ponorogo",
      active: true,
    },
    {
      id: "u-pemutus",
      username: "arifin.pemutus",
      name: "Drs. H. M. Arifin, M.M.",
      passwordHash: defaultPassHash,
      role: "PEMUTUS",
      branch: "Kantor Pusat Ponorogo",
      active: true,
    },
    {
      id: "u-backoffice",
      username: "rina.bo",
      name: "Rina Wulandari",
      passwordHash: defaultPassHash,
      role: "BACK_OFFICE",
      branch: "Kantor Pusat Ponorogo",
      active: true,
    },
    {
      id: "u-admin",
      username: "slamet.it",
      name: "Slamet Widodo",
      passwordHash: defaultPassHash,
      role: "ADMIN_IT",
      branch: "Kantor Pusat Ponorogo",
      active: true,
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`✓ ${users.length} Users seeded.`);

  // 3. Seeding Nasabah (Format resmi: CIF 8 digit, No Kontrak permanen 10 digit)
  const nasabahs = [
    {
      cif: "01010388",
      nik: "3573011205850001",
      nama: "Budi Santoso",
      hp: "0812-3456-7890",
      alamat: "Jl. Gajah Mada No.12, Ponorogo",
      noRek: "0034-556-7788",
      noKontrak: "4420101123",
      pekerjaan: "Wiraswasta",
    },
    {
      cif: "01010389",
      nik: "3573014407900002",
      nama: "Siti Aminah",
      hp: "0813-1111-2222",
      alamat: "Jl. Urip Sumoharjo No.8, Ponorogo",
      noRek: "0034-556-9102",
      noKontrak: "4420101124",
      pekerjaan: "PNS",
    },
    {
      cif: "01010390",
      nik: "3573010101700003",
      nama: "H. Sugeng Riyanto",
      hp: "0821-3333-4444",
      alamat: "Jl. HOS Cokroaminoto No.45, Ponorogo",
      noRek: "0034-556-3315",
      noKontrak: "4420101125",
      pekerjaan: "Pedagang Emas",
    },
    {
      cif: "01010391",
      nik: "3573015509920004",
      nama: "Dewi Lestari",
      hp: "0857-5555-6666",
      alamat: "Jl. Trunojoyo No.21, Ponorogo",
      noRek: "0034-556-6640",
      noKontrak: "4420101126",
      pekerjaan: "Ibu Rumah Tangga",
    },
    {
      cif: "01010392",
      nik: "3573010912850013",
      nama: "Ratna Kumala",
      hp: "0856-7777-8888",
      alamat: "Jl. Suropati No.7, Ponorogo",
      noRek: "0034-556-8899",
      noKontrak: "4420101127",
      pekerjaan: "Dokter",
    },
  ];

  for (const n of nasabahs) {
    await prisma.nasabah.create({ data: n });
  }
  console.log(`✓ ${nasabahs.length} Nasabah seeded.`);

  // 4. Seeding Transaksi Rahn & Marhun Items (SBR 7 digit, Akad resmi MMS/RAHN, SBG 11 digit)
  const transaksis = [
    {
      sbr: "0005215",
      cif: "01010390",
      nik: "3573010101700003",
      nama: "H. Sugeng Riyanto",
      hp: "0821-3333-4444",
      alamat: "Jl. HOS Cokroaminoto No.45, Ponorogo",
      noRek: "0034-556-3315",
      totalBeratKotor: 23.0,
      totalBeratBersih: 22.5,
      totalTaksiran: 17200000,
      marhunBih: 15000000,
      ujroh: 600000,
      biayaAdmin: 75000,
      nominalBersih: 14925000,
      tanggalAkad: "10 Okt 2026",
      tanggalJatuhTempo: "07 Jan 2027",
      keteranganGadai: "Baru",
      kantor: "Kantor Pusat Ponorogo",
      petugasPenaksir: "Rina Wulandari",
      pemutusTtd: "Drs. H. M. Arifin, M.M.",
      pemutusWaktu: "10 Okt 2026 10:15",
      noAkad: "001/MMS/RAHN/X/2026",
      noSbg: "26092856186",
      noKontrak: "4420101125",
      status: "Siap Cetak",
      catatan: "Gadai jangka 90 hari, perhiasan warisan keluarga.",
      barang: [
        {
          jenis: "Kalung Emas",
          karat: "22K",
          jumlah: 1,
          beratKotor: 23.0,
          beratBersih: 22.5,
          nilaiTaksiran: 17200000,
          keterangan: "Model rantai medan mulus",
        },
      ],
    },
    {
      sbr: "0005216",
      cif: "01010389",
      nik: "3573014407900002",
      nama: "Siti Aminah",
      hp: "0813-1111-2222",
      alamat: "Jl. Urip Sumoharjo No.8, Ponorogo",
      noRek: "0034-556-9102",
      totalBeratKotor: 8.5,
      totalBeratBersih: 8.15,
      totalTaksiran: 6000000,
      marhunBih: 5200000,
      ujroh: 210000,
      biayaAdmin: 26000,
      nominalBersih: 5174000,
      tanggalAkad: "11 Okt 2026",
      tanggalJatuhTempo: "08 Jan 2027",
      keteranganGadai: "Topup",
      kantor: "Kantor Pusat Ponorogo",
      petugasPenaksir: "Ahmad Hidayat",
      pemutusTtd: "Drs. H. M. Arifin, M.M.",
      pemutusWaktu: "11 Okt 2026 10:00",
      noAkad: "002/MMS/RAHN/X/2026",
      noSbg: "26092856187",
      noKontrak: "4420101124",
      status: "Tercetak",
      catatan: "Topup penambahan dana modal usaha warung.",
      barang: [
        {
          jenis: "Gelang Emas",
          karat: "22K",
          jumlah: 1,
          beratKotor: 8.5,
          beratBersih: 8.15,
          nilaiTaksiran: 6000000,
          keterangan: "Gelang keroncong polos",
        },
      ],
    },
    {
      sbr: "0005217",
      cif: "01010388",
      nik: "3573011205850001",
      nama: "Budi Santoso",
      hp: "0812-3456-7890",
      alamat: "Jl. Gajah Mada No.12, Ponorogo",
      noRek: "0034-556-7788",
      noKontrak: "4420101123",
      totalBeratKotor: 12.8,
      totalBeratBersih: 12.4,
      totalTaksiran: 10000000,
      marhunBih: 8750000,
      ujroh: 350000,
      biayaAdmin: 43750,
      nominalBersih: 8706250,
      tanggalAkad: "12 Okt 2026",
      tanggalJatuhTempo: "09 Jan 2027",
      keteranganGadai: "Baru",
      kantor: "Kantor Pusat Ponorogo",
      petugasPenaksir: "Ahmad Hidayat",
      status: "Menunggu Pemutus",
      catatan: "Menunggu otorisasi plafon > Rp 5.000.000",
      barang: [
        {
          jenis: "Cincin Emas",
          karat: "22K",
          jumlah: 2,
          beratKotor: 12.8,
          beratBersih: 12.4,
          nilaiTaksiran: 10000000,
          keterangan: "Cincin permata zirkon (dikurangi berat permata 0.4g)",
        },
      ],
    },
    {
      sbr: "0005218",
      cif: "01010392",
      nik: "3573010912850013",
      nama: "Ratna Kumala",
      hp: "0856-7777-8888",
      alamat: "Jl. Suropati No.7, Ponorogo",
      noRek: "0034-556-8899",
      noKontrak: "4420101127",
      totalBeratKotor: 8.4,
      totalBeratBersih: 8.15,
      totalTaksiran: 7500000,
      marhunBih: 6300000,
      ujroh: 250000,
      biayaAdmin: 31500,
      nominalBersih: 6268500,
      tanggalAkad: "11 Okt 2026",
      tanggalJatuhTempo: "08 Jan 2027",
      keteranganGadai: "Baru",
      kantor: "Kantor Pusat Ponorogo",
      petugasPenaksir: "Ahmad Hidayat",
      pemutusTtd: "Drs. H. M. Arifin, M.M.",
      pemutusWaktu: "11 Okt 2026 11:30",
      noAkad: "003/MMS/RAHN/X/2026",
      noSbg: "26092856188",
      status: "Disetujui Pemutus",
      catatan: "Telah disetujui, menunggu nasabah datang ke loket untuk konfirmasi.",
      barang: [
        {
          jenis: "Gelang Emas",
          karat: "21K",
          jumlah: 1,
          beratKotor: 8.4,
          beratBersih: 8.15,
          nilaiTaksiran: 7500000,
          keterangan: "Gelang rantai ukir",
        },
      ],
    },
  ];

  for (const t of transaksis) {
    const { barang, ...txData } = t;
    const createdTx = await prisma.transaksiRahn.create({
      data: txData,
    });

    for (const b of barang) {
      await prisma.marhunItem.create({
        data: {
          ...b,
          sbr: createdTx.sbr,
        },
      });
    }
  }
  console.log(`✓ ${transaksis.length} Transaksi Rahn & Barang seeded.`);

  // 5. Seeding Audit Log
  const logs = [
    {
      user: "rina.bo",
      role: "BACK_OFFICE",
      action: "Registrasi Legalitas",
      refId: "0005215",
      notes: "Penerbitan No. Akad 001/MMS/RAHN/X/2026 dan No. SBG 26092856186",
    },
    {
      user: "arifin.pemutus",
      role: "PEMUTUS",
      action: "Otorisasi Disetujui",
      refId: "0005218",
      notes: "Persetujuan plafon pembiayaan Rp 6.300.000 atas barang 8.15g 21K",
    },
    {
      user: "ahmad.taksir",
      role: "PENAKSIR",
      action: "Buat Transaksi",
      refId: "0005217",
      notes: "Taksiran emas fisik 12.4g, permohonan pinjaman Rp 8.750.000",
    },
    {
      user: "ahmad.taksir",
      role: "PENAKSIR",
      action: "Cetak Dokumen",
      refId: "0005216",
      notes: "Cetak pertama SBR fisik & stiker kantong emas ber-QR",
    },
  ];

  for (const l of logs) {
    await prisma.auditLog.create({ data: l });
  }
  console.log(`✓ ${logs.length} Audit Log seeded.`);

  console.log("Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
