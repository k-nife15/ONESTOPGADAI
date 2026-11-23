"use client";

import React from "react";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import type { HitcepResult } from "@/lib/hitcep";

interface HitcepSummaryPanelProps {
  step: number;
  noSbrManual: string;
  nasabahNama?: string;
  nasabahCif?: string;
  nasabahNik?: string;
  nasabahHp?: string;
  totalBeratBersih: number;
  pinjamanDimohon: number;
  hitcep: HitcepResult;
}

export function HitcepSummaryPanel({
  step,
  noSbrManual,
  nasabahNama,
  nasabahCif,
  nasabahNik,
  nasabahHp,
  totalBeratBersih,
  pinjamanDimohon,
  hitcep,
}: HitcepSummaryPanelProps) {
  return (
    <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs p-6 sticky top-24 space-y-4">
      <div className="flex items-center justify-between border-b border-[#E1E5E2] pb-3">
        <span className="text-xs font-bold text-[#1B2420] uppercase tracking-wider">
          {step === 1 ? "Identitas Nasabah Terpilih" : "Ringkasan Lembar HITCEP"}
        </span>
        <span className="text-[10px] font-bold text-[#0B5D3B] bg-[#E6F2EC] px-2 py-0.5 rounded-full">
          Standar Rahn
        </span>
      </div>

      {/* Nomor SBR & Nasabah */}
      <div className="p-3.5 rounded-xl bg-[#F6F7F5] text-xs space-y-1.5">
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">No. SBR:</span>
          <span className="font-extrabold text-[#1B2420] num">{noSbrManual}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">Nasabah:</span>
          <span className="font-bold text-[#1B2420] text-right">{nasabahNama || "Belum dipilih"}</span>
        </div>
        {nasabahCif && (
          <div className="flex justify-between gap-2">
            <span className="text-[#5F6B65]">CIF:</span>
            <span className="font-mono font-semibold text-[#0B5D3B]">{nasabahCif}</span>
          </div>
        )}
        {nasabahNik && (
          <div className="flex justify-between gap-2">
            <span className="text-[#5F6B65]">NIK:</span>
            <span className="font-mono text-[#1B2420]">{nasabahNik}</span>
          </div>
        )}
        {nasabahHp && (
          <div className="flex justify-between gap-2">
            <span className="text-[#5F6B65]">No. HP / WA:</span>
            <span className="font-mono text-[#1B2420]">{nasabahHp}</span>
          </div>
        )}
      </div>

      {step === 1 ? (
        <div className="p-4 rounded-xl border border-dashed border-[#E1E5E2] bg-[#FBFDFC] text-xs text-[#5F6B65] leading-relaxed">
          Kalkulasi taksiran emas dan rincian HITCEP akan muncul setelah Anda masuk ke{" "}
          <b className="text-[#1B2420]">Langkah 2 (Taksiran Emas)</b> dan{" "}
          <b className="text-[#1B2420]">Langkah 3 (Kalkulasi HITCEP)</b>.
        </div>
      ) : (
        <>
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

          {step === 3 && (
            <>
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
                  {fmtRp(Math.max(0, pinjamanDimohon - hitcep.biayaAdmin))}
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
