"use client";

import React from "react";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import { tentukanWewenangPemutus } from "@/lib/hitcep";
import type { TransaksiCetakData } from "./sbr-template";

export function CetakHitcepView({ currentTx }: { currentTx: TransaksiCetakData }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start border-b border-[#E1E5E2] pb-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mitra-syariah.png"
            alt="Bank Mitra Syariah"
            className="h-9 w-auto mb-1.5 object-contain"
          />
          <h3 className="text-base font-extrabold text-[#084530]">LEMBAR KERJA PENAKSIRAN EMAS (HITCEP)</h3>
          <p className="text-xs text-[#5F6B65]">
            Perhitungan Standar Taksiran Logam Emas &amp; Matriks Kewenangan · Akad: <b>{currentTx.keteranganGadai}</b>
          </p>
          <p className="text-[11px] text-[#5F6B65] mt-0.5">
            Tgl Akad: <b>{currentTx.tanggalAkad}</b> · Jatuh Tempo: <b>{currentTx.tanggalJatuhTempo}</b>
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-xs bg-[#E6F2EC] px-3 py-1 rounded text-[#084530]">
            {currentTx.sbr}
          </span>
          <p className="text-[10px] text-[#5F6B65] mt-1">
            Nasabah: <b>{currentTx.nama}</b> ({currentTx.cif || "-"})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-[#E1E5E2] bg-[#F6F7F5]">
          <p className="text-[10px] text-[#5F6B65]">Total Taksiran (NT)</p>
          <p className="text-sm font-extrabold text-[#0B5D3B] num">{fmtRp(currentTx.totalTaksiran)}</p>
        </div>
        <div className="p-3 rounded-lg border border-[#E1E5E2] bg-[#F6F7F5]">
          <p className="text-[10px] text-[#5F6B65]">UP Maks (94% FTV)</p>
          <p className="text-sm font-extrabold num">{fmtRp(Math.round(currentTx.totalTaksiran * 0.94))}</p>
        </div>
        <div className="p-3 rounded-lg border border-[#0B5D3B]/30 bg-[#E6F2EC]">
          <p className="text-[10px] text-[#084530]">UP Disetujui</p>
          <p className="text-sm font-extrabold text-[#084530] num">{fmtRp(currentTx.marhunBih)}</p>
        </div>
        <div className="p-3 rounded-lg border border-[#C9A227]/40 bg-[#FBF3D6]/70">
          <p className="text-[10px] text-[#7A6110]">Wewenang Pemutus</p>
          <p className="text-sm font-extrabold text-[#7A6110]">
            {tentukanWewenangPemutus(currentTx.marhunBih)}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse border border-[#E1E5E2] text-xs">
        <thead>
          <tr className="bg-[#E6F2EC] text-[#084530] font-bold text-left">
            <th className="p-2 border border-[#E1E5E2]">Barang Jaminan</th>
            <th className="p-2 border border-[#E1E5E2]">Karat</th>
            <th className="p-2 border border-[#E1E5E2] text-right">Qty</th>
            <th className="p-2 border border-[#E1E5E2] text-right">Berat Kotor</th>
            <th className="p-2 border border-[#E1E5E2] text-right">Berat Bersih</th>
            <th className="p-2 border border-[#E1E5E2] text-right">Nilai Taksiran</th>
          </tr>
        </thead>
        <tbody>
          {currentTx.barang.map((b, idx) => (
            <tr key={b.id || idx}>
              <td className="p-2 border border-[#E1E5E2] font-semibold">{b.jenis}</td>
              <td className="p-2 border border-[#E1E5E2] font-bold text-[#C9A227]">{b.karat}</td>
              <td className="p-2 border border-[#E1E5E2] text-right num">{b.jumlah || 1}</td>
              <td className="p-2 border border-[#E1E5E2] text-right num">{fmtBerat(b.beratKotor)}</td>
              <td className="p-2 border border-[#E1E5E2] text-right num font-bold">{fmtBerat(b.beratBersih)}</td>
              <td className="p-2 border border-[#E1E5E2] text-right num font-bold text-[#0B5D3B]">
                {fmtRp(b.nilaiTaksiran)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 border border-[#E1E5E2] rounded-xl overflow-hidden">
          <div className="bg-[#084530] text-white px-3 py-2 text-[11px] font-bold">
            RINGKASAN KONSOLIDASI HITCEP (16 PARAMETER)
          </div>
          <table className="w-full text-[11px] border-collapse">
            <tbody className="divide-y divide-[#E1E5E2]">
              {[
                ["1. Nama Nasabah", currentTx.nama],
                [
                  "2. Nama Barang",
                  currentTx.barang.map((b) => `${b.jumlah || 1} ${b.jenis}`).join(", ") || "-",
                ],
                [
                  "3. Kadar / Karatase",
                  currentTx.barang.map((b) => b.karat).join(", ") || "-",
                ],
                ["4. Berat Emas Bersih", fmtBerat(currentTx.totalBeratBersih)],
                ["5. Tanggal Mulai – JT", `${currentTx.tanggalAkad} s.d. ${currentTx.tanggalJatuhTempo}`],
                ["6. Nilai Taksiran (NT)", fmtRp(currentTx.totalTaksiran)],
                ["7. UP Maks (94% FTV)", fmtRp(Math.round(currentTx.totalTaksiran * 0.94))],
                ["8. Pembanding PPAP (85% NT)", fmtRp(Math.round(currentTx.totalTaksiran * 0.85))],
                ["9. UP Disetujui (Plafond)", fmtRp(currentTx.marhunBih)],
                [
                  "10. Status Limit UP Maks",
                  currentTx.marhunBih <= Math.round(currentTx.totalTaksiran * 0.94)
                    ? "BENAR (Sesuai Limit)"
                    : "MELEBIHI LIMIT",
                ],
                ["11. Ujroh Bulanan", fmtRp(Math.round(currentTx.ujroh / 4))],
                ["12. Ujroh 4 Bulan", fmtRp(currentTx.ujroh)],
                ["13. Biaya Admin", fmtRp(currentTx.biayaAdmin)],
                ["14. DP Ujroh", fmtRp(0)],
                ["15. Petugas Penaksir", currentTx.petugasPenaksir || "-"],
                [
                  "16. Total Plafond + Ujroh",
                  fmtRp(currentTx.marhunBih + currentTx.ujroh + currentTx.biayaAdmin),
                ],
              ].map(([label, value], i) => (
                <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-[#F6F7F5]/60"}>
                  <td className="py-1.5 px-3 text-[#5F6B65] font-medium w-[48%]">{label}</td>
                  <td className="py-1.5 px-3 font-bold text-[#1B2420] num text-right">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="border border-[#E1E5E2] rounded-xl overflow-hidden">
            <div className="bg-[#FBF3D6] text-[#7A6110] px-3 py-2 text-[11px] font-bold border-b border-[#C9A227]/30">
              BATAS WEWENANG PEMUTUS KOMITE
            </div>
            <table className="w-full text-[10px] border-collapse text-center">
              <thead>
                <tr className="bg-[#F6F7F5] text-[#5F6B65] border-b border-[#E1E5E2]">
                  <th className="p-2 text-left">Plafond</th>
                  <th className="p-1.5">Kabag Mkt</th>
                  <th className="p-1.5">Dir. Bisnis</th>
                  <th className="p-1.5">Dekom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5E2]">
                <tr className={currentTx.marhunBih <= 50_000_000 ? "bg-[#E6F2EC] font-bold text-[#084530]" : ""}>
                  <td className="p-2 text-left">500rb – 50jt</td>
                  <td className="p-1.5">&#10003;</td>
                  <td className="p-1.5">-</td>
                  <td className="p-1.5">-</td>
                </tr>
                <tr
                  className={
                    currentTx.marhunBih > 50_000_000 && currentTx.marhunBih <= 100_000_000
                      ? "bg-[#E6F2EC] font-bold text-[#084530]"
                      : ""
                  }
                >
                  <td className="p-2 text-left">&gt; 50jt – 100jt</td>
                  <td className="p-1.5">&#10003;</td>
                  <td className="p-1.5">&#10003;</td>
                  <td className="p-1.5">-</td>
                </tr>
                <tr className={currentTx.marhunBih > 100_000_000 ? "bg-[#E6F2EC] font-bold text-[#084530]" : ""}>
                  <td className="p-2 text-left">&gt; 100jt – 250jt</td>
                  <td className="p-1.5">&#10003;</td>
                  <td className="p-1.5">&#10003;</td>
                  <td className="p-1.5">&#10003;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl border border-[#E1E5E2] bg-[#F6F7F5] text-[11px] space-y-1">
            <p className="text-[#5F6B65]">Selisih Risiko PPAP (UP Maks − 85% NT):</p>
            <p className="text-sm font-extrabold text-[#0B5D3B] num">
              {fmtRp(Math.round(currentTx.totalTaksiran * 0.94) - Math.round(currentTx.totalTaksiran * 0.85))}
            </p>
            <p className="text-[10px] text-[#5F6B65]">
              Wewenang Aktif: <b className="text-[#084530]">{tentukanWewenangPemutus(currentTx.marhunBih)}</b>
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
        <div>
          <p className="text-[10px] text-[#5F6B65] mb-12">Petugas Penaksir</p>
          <p className="font-bold border-t border-[#1B2420] pt-1 max-w-[220px] mx-auto">
            {currentTx.petugasPenaksir}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#5F6B65] mb-12">
            Pejabat Pemutus ({tentukanWewenangPemutus(currentTx.marhunBih)})
          </p>
          <p className="font-bold border-t border-[#1B2420] pt-1 max-w-[220px] mx-auto">
            {currentTx.pemutusTtd || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
