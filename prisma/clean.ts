import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Membersihkan data transaksi & nasabah (menyisakan akun petugas)...");
  await prisma.marhunItem.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.transaksiRahn.deleteMany({});
  await prisma.nasabah.deleteMany({});
  console.log("✓ Database bersih! Hanya menyisakan 4 akun petugas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
