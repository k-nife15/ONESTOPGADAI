"use client";

import React, { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

export interface DoubleConfirmDetailItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface DoubleConfirmSection {
  title: string;
  items: DoubleConfirmDetailItem[];
}

interface DoubleConfirmModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  details?: DoubleConfirmDetailItem[];
  sections?: DoubleConfirmSection[];
  checkboxLabel?: string;
  confirmLabel?: string;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Modal/kartu verifikasi dua langkah yang menampilkan seluruh rincian data
 * + centang pernyataan sebelum berkas dikirim ke role berikutnya.
 */
export function DoubleConfirmModal({
  open,
  title,
  subtitle,
  details = [],
  sections,
  checkboxLabel = "Saya pastikan seluruh data di atas sudah benar dan siap dikirim ke tahap berikutnya.",
  confirmLabel = "Ya, Kirim Sekarang",
  submitting = false,
  onClose,
  onConfirm,
}: DoubleConfirmModalProps) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (submitting) return;
    setChecked(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!checked || submitting) return;
    setChecked(false);
    onConfirm();
  };

  const normalizedSections: DoubleConfirmSection[] =
    sections && sections.length > 0
      ? sections
      : details.length > 0
      ? [{ title: "Ringkasan Data", items: details }]
      : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E1E5E2] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E1E5E2] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F2EC] text-[#0B5D3B] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1B2420]">{title}</h3>
              {subtitle && (
                <p className="text-xs text-[#5F6B65] mt-0.5 leading-relaxed">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {normalizedSections.map((section) => (
            <div
              key={section.title}
              className="rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] overflow-hidden"
            >
              <div className="px-3.5 py-2 bg-[#ECEFED]/70 border-b border-[#E1E5E2]">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#084530]">
                  {section.title}
                </p>
              </div>
              <div className="divide-y divide-[#E1E5E2]">
                {section.items.map((item, idx) => (
                  <div
                    key={`${section.title}-${item.label}-${idx}`}
                    className="px-3.5 py-2 flex items-start justify-between gap-4 text-xs"
                  >
                    <span className="text-[#5F6B65] shrink-0">{item.label}</span>
                    <span
                      className={
                        item.highlight
                          ? "font-extrabold text-[#0B5D3B] num text-right break-words"
                          : "font-bold text-[#1B2420] text-right break-words"
                      }
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#0B5D3B]/30 bg-[#E6F2EC]/40 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#0B5D3B] rounded cursor-pointer shrink-0"
            />
            <span className="text-xs text-[#1B2420] leading-relaxed font-semibold">
              {checkboxLabel}
            </span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-[#E1E5E2] bg-[#FBFDFC] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className="h-9 px-4 rounded-lg border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer disabled:opacity-50"
          >
            Periksa Ulang
          </button>
          <button
            type="button"
            disabled={!checked || submitting}
            onClick={handleConfirm}
            className="h-9 px-4 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
          >
            {submitting ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
