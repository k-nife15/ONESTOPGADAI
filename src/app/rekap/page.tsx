import React from "react";
import { prisma } from "@/lib/prisma";
import { RekapClient } from "@/components/shared/rekap-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RekapPage() {
  const transaksis = await prisma.transaksiRahn.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <RoleGate
      allowedRoles={["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"]}
      pageTitle="Rekap Buku Besar Gadai"
    >
      <RekapClient transaksis={transaksis} />
    </RoleGate>
  );
}
