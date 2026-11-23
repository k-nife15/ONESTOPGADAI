import React from "react";
import { prisma } from "@/lib/prisma";
import { CetakClient } from "@/components/backoffice/cetak-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CetakPage({
  searchParams,
}: {
  searchParams: Promise<{ sbr?: string }>;
}) {
  const { sbr: targetSbr } = await searchParams;

  const transaksis = await prisma.transaksiRahn.findMany({
    where: targetSbr
      ? {
          OR: [
            { status: { in: ["Siap Cetak", "Tercetak", "Lunas"] } },
            { sbr: targetSbr },
          ],
        }
      : {
          status: { in: ["Siap Cetak", "Tercetak", "Lunas"] },
        },
    include: {
      barang: true,
      nasabah: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <CetakClient transaksis={transaksis} defaultSbr={targetSbr} />;
}
