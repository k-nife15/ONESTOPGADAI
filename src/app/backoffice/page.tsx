import React from "react";
import { prisma } from "@/lib/prisma";
import { BackOfficeClient } from "@/components/backoffice/backoffice-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BackOfficePage() {
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
    <RoleGate allowedRoles={["BACK_OFFICE", "ADMIN_IT"]} pageTitle="Registrasi Back Office">
      <BackOfficeClient initialTransaksis={transaksis} />
    </RoleGate>
  );
}
