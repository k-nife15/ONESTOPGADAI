import React from "react";
import { prisma } from "@/lib/prisma";
import { PemutusClient } from "@/components/pemutus/pemutus-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PemutusPage() {
  const transaksis = await prisma.transaksiRahn.findMany({
    where: {
      status: { not: "Draft" },
    },
    include: {
      barang: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <RoleGate allowedRoles={["PEMUTUS", "ADMIN_IT"]} pageTitle="Konfirmasi Pemutus">
      <PemutusClient initialTransaksis={transaksis} />
    </RoleGate>
  );
}
