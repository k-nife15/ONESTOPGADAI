"use client";

import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { fmtRp } from "@/lib/formatters";
import type { MonitoringTransaksiItem } from "./monitoring-client";

export function CatatNomorModal({
  tx,
  readyNumbers,
  loadingSbr,
  onSelectTx,
  onClose,
  onMarkRecorded,
}: {
  tx: MonitoringTransaksiItem | null;
  readyNumbers: MonitoringTransaksiItem[];
  loadingSbr: string | null;
  onSelectTx: (tx: MonitoringTransaksiItem) => void;
  onClose: () => void;
  onMarkRecorded: (sbr: string) => void;
}) {
  if (!tx) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2] space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E1E5E2]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B5D3B]">
              Nomor Legalitas dari Back Office
            </span>
            <h3 className="text-base font-extrabold text-[#1B2420] mt-0.5">
              {tx.nama} · <span className="font-mono text-[#084530]">{tx.sbr}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {readyNumbers.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {readyNumbers.map((item) => (
              <button
                key={item.sbr}
                type="button"
                onClick={() => onSelectTx(item)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  tx.sbr === item.sbr
                    ? "bg-[#0B5D3B] text-white border-[#0B5D3B]"
                    : "bg-[#F6F7F5] text-[#5F6B65] border-[#E1E5E2] hover:text-[#1B2420]"
                }`}
              >
                {item.sbr} · {item.nama}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-[#5F6B65]">
          Salin nomor berikut secara manual ke kertas SBR fisik milik nasabah:
        </p>

        <div className="rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] divide-y divide-[#E1E5E2]">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[#5F6B65] font-semibold">No. Akad</span>
            <span className="text-sm font-mono font-extrabold text-[#084530]">{tx.noAkad || "-"}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[#5F6B65] font-semibold">No. SBG</span>
            <span className="text-sm font-mono font-extrabold text-[#084530]">{tx.noSbg || "-"}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[#5F6B65] font-semibold">No. Kontrak</span>
            <span className="text-sm font-mono font-extrabold text-[#084530]">{tx.noKontrak || "-"}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={loadingSbr === tx.sbr}
            onClick={() => onMarkRecorded(tx.sbr)}
            className="h-9 px-4 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loadingSbr === tx.sbr ? "Menyimpan..." : "Sudah Dicatat di SBR"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmNasabahMonitoringModal({
  tx,
  loadingSbr,
  onClose,
  onConfirm,
}: {
  tx: MonitoringTransaksiItem | null;
  loadingSbr: string | null;
  onClose: () => void;
  onConfirm: (sbr: string, setuju: boolean) => void;
}) {
  if (!tx) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E1E5E2]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B5D3B]">
              SBR Sudah Dicetak &amp; Ditandatangani Nasabah
            </span>
            <h3 className="text-base font-extrabold text-[#1B2420] mt-0.5">
              {tx.nama} · <span className="font-mono text-[#084530]">{tx.sbr}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 p-4 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#5F6B65]">Total Taksiran Emas:</span>
            <span className="font-bold text-[#1B2420] num">{fmtRp(tx.totalTaksiran)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5F6B65]">Uang Pinjaman Disetujui (UP):</span>
            <span className="font-extrabold text-[#0B5D3B] num text-sm">{fmtRp(tx.marhunBih)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5F6B65]">Ujroh 4 Bulan (120 Hari):</span>
            <span className="font-bold text-[#1B2420] num">{fmtRp(tx.ujroh)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5F6B65]">Biaya Administrasi:</span>
            <span className="font-bold text-[#1B2420] num">{fmtRp(tx.biayaAdmin)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#E1E5E2]">
            <span className="font-bold text-[#084530]">Nominal Bersih Diterima Nasabah:</span>
            <span className="font-extrabold text-[#084530] num text-sm">{fmtRp(tx.nominalBersih)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5F6B65]">Tanggal Jatuh Tempo:</span>
            <span className="font-bold text-[#1B2420]">{tx.tanggalJatuhTempo}</span>
          </div>
        </div>

        {tx.catatan && (
          <div className="mb-4 p-3 rounded-xl bg-[#E6F2EC]/60 border border-[#0B5D3B]/20 text-xs text-[#084530]">
            <b>Catatan Pemutus:</b> {tx.catatan}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            disabled={loadingSbr === tx.sbr}
            onClick={() => onConfirm(tx.sbr, false)}
            className="h-10 px-4 rounded-xl border border-[#C62828] text-[#C62828] hover:bg-[#FDECEA] text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Nasabah Tolak / Batal
          </button>
          <button
            type="button"
            disabled={loadingSbr === tx.sbr}
            onClick={() => onConfirm(tx.sbr, true)}
            className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Sudah TTD → Teruskan ke Back Office
          </button>
        </div>
      </div>
    </div>
  );
}
