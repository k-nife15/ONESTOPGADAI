import React from "react";
import { prisma } from "@/lib/prisma";
import { MonitoringClient } from "@/components/shared/monitoring-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MonitoringPage() {
  const transaksis = await prisma.transaksiRahn.findMany({
    include: {
      barang: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <MonitoringClient initialTransaksi={transaksis} />;
}
