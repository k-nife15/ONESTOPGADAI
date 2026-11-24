import React from "react";
import { prisma } from "@/lib/prisma";
import { RekapClient } from "@/components/shared/rekap-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REKAP_BOOKED_STATUSES = ["Siap Cetak", "Tercetak", "Lunas", "Lelang"];

export default async function RekapPage() {
  const transaksis = await prisma.transaksiRahn.findMany({
    where: {
      status: { in: REKAP_BOOKED_STATUSES },
      AND: [
        { noAkad: { not: null } },
        { noAkad: { not: "" } },
        { noSbg: { not: null } },
        { noSbg: { not: "" } },
        { noKontrak: { not: null } },
        { noKontrak: { not: "" } },
      ],
    },
    include: { barang: true },
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
