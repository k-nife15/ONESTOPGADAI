"use client";

import React from "react";
import { fmtRp } from "@/lib/formatters";
import { CheckCircle2, X } from "lucide-react";
import type { PendingConfirmTx } from "./types";

interface ConfirmNasabahModalProps {
  tx: PendingConfirmTx;
  confirming: boolean;
  onClose: () => void;
  onConfirm: (sbr: string, setuju: boolean) => void;
}

export function ConfirmNasabahModal({
  tx,
  confirming,
  onClose,
  onConfirm,
}: ConfirmNasabahModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E1E5E2]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B5D3B]">
              Putusan Pemutus — Bacakan ke Nasabah
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
            <span className="font-bold text-[#084530]">Nominal Bersih Diterima:</span>
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
            disabled={confirming}
            onClick={() => onConfirm(tx.sbr, false)}
            className="h-10 px-4 rounded-xl border border-[#C62828] text-[#C62828] hover:bg-[#FDECEA] text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Nasabah Tolak / Batal
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={() => onConfirm(tx.sbr, true)}
            className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Nasabah Setuju → Ke Back Office
          </button>
        </div>
      </div>
    </div>
  );
}
