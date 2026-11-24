"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { DoubleConfirmModal } from "@/components/shared/double-confirm-modal";
import { useAuth } from "@/lib/auth-context";
import {
  fmtRp,
  fmtBerat,
  generateNoAkad,
  generateNoSbg,
  generateNoKontrakPermanen,
} from "@/lib/formatters";
import {
  FileCheck2,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
  AlertTriangle,
} from "lucide-react";

interface TransaksiBO {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  noRek: string | null;
  totalBeratBersih: number;
  totalTaksiran: number;
  marhunBih: number;
  ujroh: number;
  biayaAdmin: number;
  nominalBersih: number;
  tanggalAkad: string;
  tanggalJatuhTempo: string;
  keteranganGadai: string;
  kantor: string;
  petugasPenaksir: string;
  pemutusTtd: string | null;
  noAkad: string | null;
  noSbg: string | null;
  noKontrak: string | null;
  status: string;
  catatan: string | null;
  barang: {
    id: string;
    jenis: string;
    karat: string;
    jumlah?: number;
    beratKotor?: number;
    beratBersih: number;
    nilaiTaksiran: number;
    keterangan?: string | null;
  }[];
}

function buildBODefaults(t?: TransaksiBO) {
  if (!t) return { noAkad: "", noSbg: "", noKontrak: "" };
  const numPart = parseInt(t.sbr.replace(/\D/g, "").slice(-3), 10) || 1;
  const now = new Date();
  return {
    noAkad: t.noAkad || generateNoAkad(numPart, now),
    noSbg: t.noSbg || generateNoSbg(numPart, now),
    noKontrak: t.noKontrak || generateNoKontrakPermanen(t.cif || t.sbr),
  };
}

export function BackOfficeClient({
  initialTransaksis,
}: {
  initialTransaksis: TransaksiBO[];
}) {
  const { user } = useAuth();
  const [transaksis, setTransaksis] = useState<TransaksiBO[]>(initialTransaksis);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Antrean" | "Aktif" | "Semua">("Antrean");

  const firstSelectable =
    initialTransaksis.find((t) => t.status === "Menunggu Back Office") || initialTransaksis[0];
  const initialDefaults = buildBODefaults(firstSelectable);

  const [selectedSbr, setSelectedSbr] = useState<string>(firstSelectable?.sbr || "");
  const [noAkad, setNoAkad] = useState(initialDefaults.noAkad);
  const [noSbg, setNoSbg] = useState(initialDefaults.noSbg);
  const [noKontrak, setNoKontrak] = useState(initialDefaults.noKontrak);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [lifecycleModal, setLifecycleModal] = useState<{
    action: "SETTLE" | "AUCTION" | "CANCEL";
    title: string;
    desc: string;
  } | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [confirmRegisterOpen, setConfirmRegisterOpen] = useState(false);

  const filtered = transaksis.filter((t) => {
    const matchesStatus =
      statusFilter === "Semua"
        ? true
        : statusFilter === "Antrean"
        ? t.status === "Menunggu Back Office"
        : t.status === "Siap Cetak" || t.status === "Tercetak";
    const matchesQuery =
      searchQuery === "" ||
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sbr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.cif && t.cif.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesQuery;
  });

  const activeTx = filtered.find((t) => t.sbr === selectedSbr) || filtered[0];

  const handleSelect = (t: TransaksiBO) => {
    setSelectedSbr(t.sbr);
    const defaults = buildBODefaults(t);
    setNoAkad(defaults.noAkad);
    setNoSbg(defaults.noSbg);
    setNoKontrak(defaults.noKontrak);
    setToast(null);
  };

  const handleRegister = async () => {
    if (!activeTx) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      const res = await fetch("/api/backoffice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr: activeTx.sbr,
          noAkad,
          noSbg,
          noKontrak,
          user: user?.name || "Rina Wahyuni",
          catatan: notes,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setToast({ type: "error", msg: data.error || "Gagal mendaftarkan legalitas." });
        setIsSubmitting(false);
        return;
      }

      setToast({
        type: "success",
        msg: `Legalitas berkas ${activeTx.sbr} berhasil disimpan dan nomor dikirim ke Penaksir!`,
      });

      const updatedList = transaksis.map((t) =>
        t.sbr === activeTx.sbr
          ? {
              ...t,
              status: "Siap Cetak",
              noAkad: data.data?.noAkad || noAkad,
              noSbg: data.data?.noSbg || noSbg,
              noKontrak: data.data?.noKontrak || noKontrak,
            }
          : t
      );
      setTransaksis(updatedList);
      const nextQueued = updatedList.find((t) => t.status === "Menunggu Back Office");
      if (nextQueued) {
        const nextDefaults = buildBODefaults(nextQueued);
        setSelectedSbr(nextQueued.sbr);
        setNoAkad(nextDefaults.noAkad);
        setNoSbg(nextDefaults.noSbg);
        setNoKontrak(nextDefaults.noKontrak);
        setNotes("");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
    } catch {
      setToast({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLifecycleAction = async () => {
    if (!activeTx || !lifecycleModal) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      const res = await fetch("/api/backoffice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr: activeTx.sbr,
          action: lifecycleModal.action,
          user: user?.name || "Rina Wahyuni",
          alasan: lifecycleReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast({ type: "error", msg: data.error || "Gagal memperbarui status transaksi." });
        return;
      }

      const nextStatus =
        lifecycleModal.action === "SETTLE"
          ? "Lunas"
          : lifecycleModal.action === "AUCTION"
          ? "Lelang"
          : "Dibatalkan";

      setTransaksis((prev) =>
        prev.map((t) => (t.sbr === activeTx.sbr ? { ...t, status: nextStatus } : t))
      );
      setToast({
        type: "success",
        msg: `Transaksi ${activeTx.sbr} berhasil diperbarui menjadi ${nextStatus}.`,
      });
      setLifecycleModal(null);
      setLifecycleReason("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
    } catch {
      setToast({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const readyForBOCount = transaksis.filter((t) => t.status === "Menunggu Back Office").length;

  return (
    <AppShell>
      {activeTx && (
        <DoubleConfirmModal
          open={confirmRegisterOpen}
          title="Periksa Seluruh Data Sebelum Terbit Legalitas"
          subtitle="Nomor Akad, SBG & Kontrak akan diterbitkan, dikirim ke Penaksir untuk dicatat di SBR, dan notifikasi WA dikirim ke nasabah."
          sections={[
            {
              title: "Data Nasabah & Kontak WA",
              items: [
                { label: "No. SBR", value: activeTx.sbr },
                { label: "CIF", value: activeTx.cif || "-" },
                { label: "Nama Nasabah", value: activeTx.nama },
                { label: "NIK", value: activeTx.nik },
                { label: "No. HP / WA Tujuan", value: activeTx.hp, highlight: true },
                { label: "Alamat", value: activeTx.alamat },
              ],
            },
            {
              title: "Nomor Legalitas & Pembiayaan",
              items: [
                { label: "No. Akad", value: noAkad || "-" },
                { label: "No. SBG", value: noSbg || "-" },
                { label: "No. Kontrak / CBS", value: noKontrak || "-" },
                { label: "Total Taksiran", value: fmtRp(activeTx.totalTaksiran) },
                { label: "Marhun Bih", value: fmtRp(activeTx.marhunBih), highlight: true },
                { label: "Nominal Bersih", value: fmtRp(activeTx.nominalBersih) },
                { label: "Tanggal Akad – Jatuh Tempo", value: `${activeTx.tanggalAkad} s.d. ${activeTx.tanggalJatuhTempo}` },
                { label: "Catatan Back Office", value: notes.trim() || "-" },
              ],
            },
          ]}
          checkboxLabel="Saya pastikan seluruh data nasabah, nomor Akad, SBG, dan CBS/Kontrak sudah benar sebelum diterbitkan."
          confirmLabel="Ya, Terbitkan Legalitas"
          submitting={isSubmitting}
          onClose={() => setConfirmRegisterOpen(false)}
          onConfirm={async () => {
            setConfirmRegisterOpen(false);
            await handleRegister();
          }}
        />
      )}
      {lifecycleModal && activeTx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF8E1] text-[#B7791F] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1B2420]">
                    {lifecycleModal.title}
                  </h3>
                  <p className="text-xs text-[#5F6B65] mt-0.5">
                    SBR <b className="font-mono text-[#1B2420]">{activeTx.sbr}</b> · {activeTx.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLifecycleModal(null)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5F6B65] mt-3 leading-relaxed">
              {lifecycleModal.desc}
            </p>
            {(lifecycleModal.action === "CANCEL" || lifecycleModal.action === "AUCTION") && (
              <textarea
                rows={2}
                value={lifecycleReason}
                onChange={(e) => setLifecycleReason(e.target.value)}
                placeholder="Catatan / alasan (opsional)..."
                className="mt-3 w-full p-2.5 rounded-xl border border-[#E1E5E2] text-xs text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLifecycleModal(null)}
                className="h-9 px-4 rounded-xl border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleLifecycleAction}
                className={`h-9 px-4 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                  lifecycleModal.action === "SETTLE"
                    ? "bg-[#0B5D3B] hover:bg-[#084530]"
                    : lifecycleModal.action === "AUCTION"
                    ? "bg-[#B7791F] hover:bg-[#996317]"
                    : "bg-[#C62828] hover:bg-[#A81F1F]"
                }`}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[#1B2420]">
                Registrasi Legalitas &amp; Administrasi Back Office
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F2EC] text-[#084530] border border-[#0B5D3B]/20">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
                {readyForBOCount} Berkas Menunggu Back Office
              </span>
            </div>
            <p className="text-xs text-[#5F6B65] mt-1.5">
              Penerbitan Nomor Akad resmi, Nomor Surat Bukti Gadai (SBG), dan Nomor Kontrak Core Banking sebelum pencairan kasir.
            </p>
          </div>

          <Link
            href="/rekap"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E1E5E2] bg-white hover:bg-[#F6F7F5] text-xs font-bold text-[#1B2420] transition-colors"
          >
            <Building2 className="w-4 h-4 text-[#0B5D3B]" /> Rekap Buku Besar Gadai
          </Link>
        </div>

        {/* Feedback Alert */}
        {toast && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold border ${
              toast.type === "success"
                ? "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/30"
                : "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#0B5D3B]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#C62828]" />
              )}
              <span>{toast.msg}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="hover:underline font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 2-Column Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Kolom Kiri: Antrean Berkas */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs space-y-3">
              <div className="grid grid-cols-3 gap-1.5 bg-[#F6F7F5] p-1 rounded-xl border border-[#E1E5E2] text-[11px] font-bold">
                {(
                  [
                    { key: "Antrean", label: `Antrean (${readyForBOCount})` },
                    { key: "Aktif", label: "Siap/Cetak" },
                    { key: "Semua", label: "Semua" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`h-7 rounded-lg transition-colors cursor-pointer ${
                      statusFilter === tab.key
                        ? "bg-white text-[#084530] shadow-xs"
                        : "text-[#5F6B65] hover:text-[#1B2420]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6B65]" />
                <input
                  type="text"
                  placeholder="Cari SBR atau Nama Nasabah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E1E5E2] bg-white text-xs text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {filtered.map((t) => {
                  const isSelected = activeTx?.sbr === t.sbr;
                  return (
                    <div
                      key={t.sbr}
                      onClick={() => handleSelect(t)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#E6F2EC]/40 border-[#0B5D3B] shadow-xs ring-2 ring-[#0B5D3B]/20"
                          : "bg-white border-[#E1E5E2] hover:border-[#0B5D3B]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs text-[#084530] font-mono">
                          {t.sbr}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === "Menunggu Back Office"
                              ? "bg-[#E6F2EC] text-[#084530]"
                              : t.status === "Siap Cetak" || t.status === "Tercetak"
                              ? "bg-[#E0F2F1] text-[#00695C]"
                              : "bg-[#F6F7F5] text-[#5F6B65]"
                          }`}
                        >
                          {t.status === "Siap Cetak" ? "Catat Nomor SBR" : t.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#1B2420]">{t.nama}</p>
                      <p className="text-xs text-[#5F6B65]">
                        Pinjaman: <b className="text-[#0B5D3B] num">{fmtRp(t.marhunBih)}</b> · {t.barang.length} item
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Kolom Kanan: Form Legalitas & Pendaftaran */}
          <div className="lg:col-span-7 bg-white p-6 lg:p-8 rounded-2xl border border-[#E1E5E2] shadow-xs space-y-6">
            {activeTx ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-[#E1E5E2]">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#1B2420]">
                      {activeTx.nama}
                    </h2>
                    <p className="text-xs text-[#5F6B65]">
                      Nomor SBR: <b>{activeTx.sbr}</b> · Disetujui oleh: {activeTx.pemutusTtd || "Arifin Nugroho, SE"}
                    </p>
                  </div>
                  {(activeTx.status === "Siap Cetak" || activeTx.status === "Tercetak") && (
                    <Link
                      href={`/cetak?sbr=${encodeURIComponent(activeTx.sbr)}`}
                      className="px-4 py-2 rounded-xl bg-[#0B5D3B] text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Dokumen
                    </Link>
                  )}
                </div>

                {/* Detail Lengkap Identitas Nasabah & Berkas */}
                <div className="p-4 rounded-2xl bg-[#F6F7F5] border border-[#E1E5E2] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E1E5E2] pb-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#084530]">
                      Detail Identitas Nasabah &amp; Asal Berkas
                    </p>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E1E5E2] text-[10px] font-bold text-[#084530]">
                      {activeTx.kantor}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">No. CIF:</span>
                      <span className="font-mono font-bold text-[#084530]">{activeTx.cif || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">NIK (KTP):</span>
                      <span className="font-mono font-bold text-[#1B2420]">{activeTx.nik}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">No. HP / WA:</span>
                      <span className="font-mono font-bold text-[#0B5D3B]">{activeTx.hp}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">No. Rekening:</span>
                      <span className="font-mono font-semibold text-[#1B2420]">{activeTx.noRek || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">Jenis Gadai:</span>
                      <span className="font-bold text-[#1B2420]">{activeTx.keteranganGadai}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">Penaksir:</span>
                      <span className="font-semibold text-[#1B2420]">{activeTx.petugasPenaksir}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">Tanggal Akad:</span>
                      <span className="font-semibold text-[#1B2420]">{activeTx.tanggalAkad}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5F6B65]">Total Taksiran:</span>
                      <span className="font-bold text-[#1B2420] num">{fmtRp(activeTx.totalTaksiran)}</span>
                    </div>
                    <div className="sm:col-span-2 flex justify-between gap-3 pt-1 border-t border-[#E1E5E2]/70">
                      <span className="text-[#5F6B65] shrink-0">Alamat:</span>
                      <span className="font-semibold text-[#1B2420] text-right">{activeTx.alamat}</span>
                    </div>
                  </div>
                </div>

                {/* Rincian Barang Jaminan (Marhun) */}
                <div className="rounded-xl border border-[#E1E5E2] overflow-hidden">
                  <div className="px-3.5 py-2 bg-[#F6F7F5] border-b border-[#E1E5E2] flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#084530]">
                      Rincian Barang Jaminan ({activeTx.barang.length} Item · {fmtBerat(activeTx.totalBeratBersih)})
                    </span>
                    <span className="text-[11px] font-bold text-[#5F6B65] num">
                      Ujroh 4 Bln: <b className="text-[#1B2420]">{fmtRp(activeTx.ujroh)}</b>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-[#E6F2EC]/60 text-[#084530] font-bold">
                        <tr>
                          <th className="px-3 py-2">Barang</th>
                          <th className="px-2 py-2">Karat</th>
                          <th className="px-2 py-2 text-right">Qty</th>
                          <th className="px-2 py-2 text-right">Kotor</th>
                          <th className="px-2 py-2 text-right">Bersih</th>
                          <th className="px-3 py-2 text-right">Taksiran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E5E2]">
                        {activeTx.barang.map((b, idx) => (
                          <tr key={b.id || idx}>
                            <td className="px-3 py-2 font-semibold text-[#1B2420]">{b.jenis}</td>
                            <td className="px-2 py-2 font-bold text-[#C9A227]">{b.karat}</td>
                            <td className="px-2 py-2 text-right num">{b.jumlah || 1}</td>
                            <td className="px-2 py-2 text-right num">
                              {b.beratKotor !== undefined ? fmtBerat(b.beratKotor) : "-"}
                            </td>
                            <td className="px-2 py-2 text-right num font-bold">{fmtBerat(b.beratBersih)}</td>
                            <td className="px-3 py-2 text-right num font-bold text-[#0B5D3B]">
                              {fmtRp(b.nilaiTaksiran)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ringkasan Finansial & Catatan Penaksir/Pemutus */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Pinjaman (UP)</p>
                      <p className="text-xs font-extrabold text-[#0B5D3B] num mt-0.5">{fmtRp(activeTx.marhunBih)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Biaya Admin</p>
                      <p className="text-xs font-extrabold text-[#1B2420] num mt-0.5">{fmtRp(activeTx.biayaAdmin)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#E6F2EC] border border-[#0B5D3B]/20">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#084530]">Bersih Pencairan</p>
                      <p className="text-xs font-extrabold text-[#084530] num mt-0.5">{fmtRp(activeTx.nominalBersih)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Jatuh Tempo</p>
                      <p className="text-xs font-extrabold text-[#1B2420] mt-0.5">{activeTx.tanggalJatuhTempo}</p>
                    </div>
                  </div>
                  {activeTx.catatan && (
                    <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] text-xs text-[#5F6B65]">
                      <span className="font-bold text-[#1B2420]">Catatan Penaksir / Pemutus: </span>
                      {activeTx.catatan}
                    </div>
                  )}
                </div>

                {/* Form Input Legalitas */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#1B2420] mb-1">
                      Nomor Akad Resmi Perbankan Syariah (AKD) *
                    </label>
                    <input
                      type="text"
                      disabled={activeTx.status !== "Menunggu Back Office"}
                      value={noAkad}
                      onChange={(e) => setNoAkad(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg border border-[#E1E5E2] font-mono text-xs font-bold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5] disabled:text-[#5F6B65]"
                      placeholder="001/MMS/RAHN/X/2026"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2420] mb-1">
                      Nomor Surat Bukti Gadai (SBG) *
                    </label>
                    <input
                      type="text"
                      disabled={activeTx.status !== "Menunggu Back Office"}
                      value={noSbg}
                      onChange={(e) => setNoSbg(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg border border-[#E1E5E2] font-mono text-xs font-bold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5] disabled:text-[#5F6B65]"
                      placeholder="26092856186"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2420] mb-1">
                      Nomor Kontrak Nasabah Permanen (CBS) *
                    </label>
                    <input
                      type="text"
                      disabled={activeTx.status !== "Menunggu Back Office"}
                      value={noKontrak}
                      onChange={(e) => setNoKontrak(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg border border-[#E1E5E2] font-mono text-xs font-bold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5] disabled:text-[#5F6B65]"
                      placeholder="4420101123"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B2420] mb-1">
                      Catatan Legalitas / Instruksi Kasir
                    </label>
                    <textarea
                      rows={2}
                      disabled={activeTx.status !== "Menunggu Back Office"}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 rounded-lg border border-[#E1E5E2] text-xs text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5] disabled:text-[#5F6B65]"
                      placeholder="Contoh: Dokumen lengkap, pencairan tunai di kasir loket 2."
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting || activeTx.status !== "Menunggu Back Office"}
                    onClick={() => setConfirmRegisterOpen(true)}
                    className="w-full h-12 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FileCheck2 className="w-4 h-4 stroke-[2.3]" />
                    {activeTx.status === "Menunggu Back Office"
                      ? "Simpan Legalitas & Kirim Nomor ke Penaksir"
                      : `Status Saat Ini: ${activeTx.status}`}
                  </button>

                  {(activeTx.status === "Siap Cetak" || activeTx.status === "Tercetak") && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          setLifecycleModal({
                            action: "SETTLE",
                            title: "Pelunasan Penuh (Tebus Akad)",
                            desc: "Tandai akad ini sebagai Lunas setelah nasabah menyelesaikan pembayaran pokok + ujroh di kasir.",
                          })
                        }
                        className="h-10 rounded-xl border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#E6F2EC] text-xs font-bold cursor-pointer"
                      >
                        Tandai Lunas
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          setLifecycleModal({
                            action: "AUCTION",
                            title: "Eksekusi Lelang Agunan",
                            desc: "Tandai akad ini sebagai Lelang karena melewati jatuh tempo dan tidak diperpanjang/dilunasi.",
                          })
                        }
                        className="h-10 rounded-xl border border-[#B7791F] text-[#B7791F] hover:bg-[#FFF8E1] text-xs font-bold cursor-pointer"
                      >
                        Tandai Lelang
                      </button>
                    </div>
                  )}

                  {(activeTx.status === "Menunggu Back Office" || activeTx.status === "Siap Cetak") && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        setLifecycleModal({
                          action: "CANCEL",
                          title: "Batalkan Berkas di Back Office",
                          desc: "Batalkan berkas karena kesalahan administrasi atau pembatalan pencairan sebelum akad tercetak.",
                        })
                      }
                      className="w-full h-9 rounded-xl border border-[#C62828]/50 text-[#C62828] hover:bg-[#FDECEA] text-xs font-bold cursor-pointer"
                    >
                      Batalkan Berkas
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-[#5F6B65] py-12">
                Pilih berkas untuk memulai registrasi legalitas.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
