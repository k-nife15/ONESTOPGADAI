import React from "react";
import { prisma } from "@/lib/prisma";
import { NasabahClient } from "@/components/shared/nasabah-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NasabahPage() {
  const nasabahs = await prisma.nasabah.findMany({
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

  return <NasabahClient initialNasabah={nasabahs} />;
}
