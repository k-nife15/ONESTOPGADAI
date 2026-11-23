import React from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STLE } from "@/lib/formatters";
import { TaksiranClient } from "@/components/penaksir/taksiran-client";
import { RoleGate } from "@/components/shared/role-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TaksiranPage({
  searchParams,
}: {
  searchParams: Promise<{ cif?: string }>;
}) {
  const { cif: targetCif } = await searchParams;

  const [nasabahs, existingSbrRows, pendingConfirm, stleConfig] = await Promise.all([
    prisma.nasabah.findMany({
      select: {
        cif: true,
        nama: true,
        nik: true,
        hp: true,
        alamat: true,
        noRek: true,
        noKontrak: true,
        transaksi: {
          select: {
            sbr: true,
            status: true,
            marhunBih: true,
            totalTaksiran: true,
            tanggalAkad: true,
            barang: {
              select: {
                jenis: true,
                karat: true,
                jumlah: true,
                beratKotor: true,
                beratBersih: true,
                nilaiTaksiran: true,
                keterangan: true,
              },
            },
          },
        },
      },
      orderBy: { nama: "asc" },
    }),
    prisma.transaksiRahn.findMany({
      select: { sbr: true },
    }),
    prisma.transaksiRahn.findMany({
      where: { status: "Disetujui Pemutus" },
      select: {
        sbr: true,
        nama: true,
        totalTaksiran: true,
        marhunBih: true,
        ujroh: true,
        biayaAdmin: true,
        nominalBersih: true,
        tanggalJatuhTempo: true,
        catatan: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.systemConfig.findUnique({ where: { key: "STLE_PER_GRAM" } }),
  ]);

  const existingSbrSet = new Set(existingSbrRows.map((row) => row.sbr));
  let nextSbrNum = 5220;
  for (const row of existingSbrRows) {
    if (/^\d{7}$/.test(row.sbr)) {
      const n = parseInt(row.sbr, 10);
      if (n < 9000 && n >= nextSbrNum) {
        nextSbrNum = n + 1;
      }
    }
  }
  while (existingSbrSet.has(String(nextSbrNum).padStart(7, "0"))) {
    nextSbrNum += 1;
  }
  const initialSbr = String(nextSbrNum).padStart(7, "0");
  const initialStle = stleConfig ? Number(stleConfig.value) || DEFAULT_STLE : DEFAULT_STLE;

  return (
    <RoleGate allowedRoles={["PENAKSIR", "ADMIN_IT"]} pageTitle="Input Taksiran & Gadai">
      <TaksiranClient
        initialNasabahs={nasabahs}
        initialCif={targetCif}
        initialSbr={initialSbr}
        initialPendingConfirm={pendingConfirm}
        initialStle={initialStle}
      />
    </RoleGate>
  );
}
