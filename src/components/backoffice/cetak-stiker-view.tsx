"use client";

import React from "react";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import { buildQrSvgData } from "@/lib/qr";
import type { TransaksiCetakData } from "./sbr-template";

export function CetakStikerView({ currentTx }: { currentTx: TransaksiCetakData }) {
  const barangRingkas = currentTx.barang.length
    ? currentTx.barang
        .map((b) => `${b.jenis} ${b.karat} (${b.jumlah || 1}x), ${fmtBerat(b.beratBersih)}`)
        .join("; ")
    : "-";
  const qrPayload = [
    `NASABAH: ${currentTx.nama}`,
    `CIF: ${currentTx.cif || "-"} | NIK: ${currentTx.nik}`,
    `SBR: ${currentTx.sbr} | AKAD: ${currentTx.noAkad || "-"}`,
    `PINJAMAN: ${fmtRp(currentTx.marhunBih)}`,
    `TEMPO: ${currentTx.tanggalJatuhTempo}`,
    `BARANG: ${barangRingkas}`,
  ].join("\n");
  const qr = buildQrSvgData(qrPayload);

  return (
    <div className="max-w-md mx-auto p-6 border-2 border-dashed border-[#0B5D3B] rounded-2xl bg-white space-y-4 print:border print:rounded-lg">
      <div className="flex flex-col items-center text-center border-b border-[#E1E5E2] pb-4 space-y-2.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#084530]">
          STIKER KANTONG MARHUN
        </span>
        <div className="w-40 h-40 border border-[#E1E5E2] rounded-xl p-2 bg-white shadow-2xs">
          <svg
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            className="w-full h-full"
            aria-label={`QR Code ${currentTx.sbr}`}
          >
            <rect width={qr.size} height={qr.size} fill="#ffffff" />
            <path d={qr.path} fill="#000000" />
          </svg>
        </div>
        <div>
          <p className="text-base font-extrabold text-[#1B2420]">{currentTx.nama}</p>
          <p className="text-[11px] font-mono font-bold text-[#0B5D3B]">
            CIF: {currentTx.cif || "-"} · SBR: {currentTx.sbr}
          </p>
          <p className="text-[11px] font-mono text-[#5F6B65]">NIK: {currentTx.nik}</p>
          <p className="text-[11px] font-mono text-[#5F6B65]">No. Kontrak: {currentTx.noKontrak || "-"}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">No. Akad</span>
          <span className="font-mono font-bold text-[#1B2420]">{currentTx.noAkad || "-"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">UP / Plafond</span>
          <span className="font-extrabold text-[#0B5D3B] num">{fmtRp(currentTx.marhunBih)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">Ujroh 4 Bulan</span>
          <span className="font-bold text-[#1B2420] num">{fmtRp(currentTx.ujroh)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">Mulai – Jatuh Tempo</span>
          <span className="font-semibold text-[#1B2420] text-right">
            {currentTx.tanggalAkad} – <b className="text-[#C62828]">{currentTx.tanggalJatuhTempo}</b>
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">Kantor</span>
          <span className="font-semibold text-[#1B2420] text-right">{currentTx.kantor}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#5F6B65]">Keterangan</span>
          <span className="font-bold uppercase text-[#084530]">{currentTx.keteranganGadai || "BARU"}</span>
        </div>
        <div className="pt-1.5 border-t border-[#E1E5E2]">
          <span className="text-[#5F6B65] block text-[11px] mb-0.5">
            Rincian Barang ({fmtBerat(currentTx.totalBeratBersih)}):
          </span>
          <ul className="space-y-0.5 text-[11px] font-semibold text-[#1B2420]">
            {currentTx.barang.length > 0 ? (
              currentTx.barang.map((b, i) => (
                <li key={b.id || i}>
                  {i + 1}. {b.jumlah || 1} {b.jenis}, {b.karat}, {fmtBerat(b.beratBersih)}
                </li>
              ))
            ) : (
              <li>{barangRingkas}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
