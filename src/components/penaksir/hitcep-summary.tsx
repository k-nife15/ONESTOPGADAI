"use client";

import React from "react";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import type { HitcepResult } from "@/lib/hitcep";

interface HitcepSummaryPanelProps {
  noSbrManual: string;
  nasabahNama?: string;
  totalBeratBersih: number;
  pinjamanDimohon: number;
  hitcep: HitcepResult;
}

export function HitcepSummaryPanel({
  noSbrManual,
  nasabahNama,
  totalBeratBersih,
  pinjamanDimohon,
  hitcep,
}: HitcepSummaryPanelProps) {
  return (
    <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs p-6 sticky top-24 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E1E5E2] pb-3">
        <span className="text-xs font-bold text-[#1B2420] uppercase tracking-wider">
          Ringkasan Lembar HITCEP
        </span>
        <span className="text-[10px] font-bold text-[#0B5D3B] bg-[#E6F2EC] px-2 py-0.5 rounded-full">
          Standar Rahn
        </span>
      </div>

      {/* Nomor SBR & Nasabah */}
      <div className="p-3.5 rounded-xl bg-[#F6F7F5] text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-[#5F6B65]">No. SBR:</span>
          <span className="font-extrabold text-[#1B2420] num">{noSbrManual}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#5F6B65]">Nasabah:</span>
          <span className="font-bold text-[#1B2420]">{nasabahNama || "-"}</span>
        </div>
      </div>

      {/* Rincian Berat & Taksiran (Rumus 1 & 2) */}
      <div className="space-y-2 text-xs border-b border-[#E1E5E2] pb-3">
        <div className="flex justify-between">
          <span className="text-[#5F6B65]">Total Berat Bersih:</span>
          <span className="font-bold text-[#1B2420] num">{fmtBerat(totalBeratBersih)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#5F6B65]">Total Taksiran (NT):</span>
          <span className="font-bold text-[#1B2420] num">{fmtRp(hitcep.totalTaksiran)}</span>
        </div>
        <div className="flex justify-between text-[#0B5D3B]">
          <span className="font-semibold">UP Maksimal (94%):</span>
          <span className="font-extrabold num">{fmtRp(hitcep.upMaks)}</span>
        </div>
      </div>

      {/* Rincian Pembiayaan & Ujroh Berjenjang (Rumus 3) */}
      <div className="space-y-2 text-xs border-b border-[#E1E5E2] pb-3">
        <div className="flex justify-between">
          <span className="font-bold text-[#1B2420]">UP Disetujui:</span>
          <span className="font-extrabold text-[#0B5D3B] num text-sm">
            {fmtRp(pinjamanDimohon)}
          </span>
        </div>
        <div className="flex justify-between text-[#5F6B65]">
          <span>Ujroh Bulanan (Tiering):</span>
          <span className="num font-semibold">{fmtRp(hitcep.ujrohBulanan)}</span>
        </div>
        <div className="flex justify-between text-[#5F6B65]">
          <span>Ujroh 4 Bulan (120 hari):</span>
          <span className="num font-semibold">{fmtRp(hitcep.ujroh4Bulan)}</span>
        </div>
        <div className="flex justify-between text-[#5F6B65]">
          <span>Biaya Administrasi:</span>
          <span className="num font-semibold">{fmtRp(hitcep.biayaAdmin)}</span>
        </div>
      </div>

      {/* TOTAL KEWAJIBAN PELUNASAN (RUMUS 4) */}
      <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] text-xs">
        <span className="text-[#5F6B65] block font-bold">
          Total Kewajiban Pelunasan (UP + Ujroh + Admin)
        </span>
        <p className="text-xl font-extrabold num text-[#1B2420] tracking-tight mt-0.5">
          {fmtRp(hitcep.totalKewajiban)}
        </p>
      </div>

      {/* Nominal Bersih Pencairan Diterima Nasabah di Loket */}
      <div className="p-3.5 rounded-xl bg-[#084530] text-white">
        <span className="text-[11px] text-[#FBF3D6]/80 block font-medium">
          Nominal Bersih Pencairan (UP - Admin)
        </span>
        <p className="text-2xl font-extrabold num text-white tracking-tight mt-1">
          {fmtRp(pinjamanDimohon - hitcep.biayaAdmin)}
        </p>
      </div>
    </div>
  );
}
