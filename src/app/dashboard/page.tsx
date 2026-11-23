import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/shared/dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const transaksiList = await prisma.transaksiRahn.findMany({
    include: { barang: true },
    orderBy: { createdAt: "desc" },
  });

  return <DashboardClient initialTransaksi={transaksiList} />;
}
