"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { DoubleConfirmModal } from "@/components/shared/double-confirm-modal";
import { useAuth } from "@/lib/auth-context";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import { tentukanWewenangPemutus } from "@/lib/hitcep";
import {
  CheckCircle2,
  Clock,
  Search,
  Scale,
  Check,
  ShieldCheck,
  FileText,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";

interface MarhunItemData {
  id: string;
  jenis: string;
  karat: string;
  beratKotor: number;
  beratBersih: number;
  nilaiTaksiran: number;
  jumlah: number;
  keterangan: string | null;
}

interface TransaksiPending {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  noRek: string | null;
  totalBeratKotor: number;
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
  batalAlasan: string | null;
  barang: MarhunItemData[];
}

export function PemutusClient({
  initialTransaksis,
}: {
  initialTransaksis: TransaksiPending[];
}) {
  const { user } = useAuth();
  const [transaksis, setTransaksis] = useState<TransaksiPending[]>(initialTransaksis);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Menunggu" | "Disetujui" | "Semua">("Menunggu");

  const firstSelectable =
    initialTransaksis.find((t) => t.status === "Menunggu Pemutus") || initialTransaksis[0];

  const [selectedSbr, setSelectedSbr] = useState<string>(firstSelectable?.sbr || "");
  const [catatanPemutus, setCatatanPemutus] = useState(
    "Fisik perhiasan dan kadar karat telah diverifikasi. Plafon disetujui sesuai rekomendasi penaksir."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("Nilai taksiran melebihi toleransi berat bersih");

  const filtered = transaksis.filter((t) => {
    const matchesStatus =
      statusFilter === "Semua"
        ? true
        : statusFilter === "Menunggu"
        ? t.status === "Menunggu Pemutus"
        : t.status !== "Menunggu Pemutus";
    const matchesQuery =
      searchQuery === "" ||
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sbr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.cif && t.cif.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesQuery;
  });

  const activeTx = filtered.find((t) => t.sbr === selectedSbr) || filtered[0];

  const handleSelectTx = (tx: TransaksiPending) => {
    setSelectedSbr(tx.sbr);
    setFeedback(null);
  };

  const handleApprove = async () => {
    if (!activeTx) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/pemutus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr: activeTx.sbr,
          action: "APPROVE",
          user: user?.name || "Arifin Nugroho, SE",
          catatan: catatanPemutus,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal menyetujui berkas." });
        setIsSubmitting(false);
        return;
      }

      setFeedback({
        type: "success",
        msg: `Transaksi ${activeTx.sbr} (${activeTx.nama}) disetujui & dikembalikan ke loket Penaksir untuk konfirmasi nasabah.`,
      });

      const updatedList = transaksis.map((t) =>
        t.sbr === activeTx.sbr
          ? {
              ...t,
              status: "Disetujui Pemutus",
              pemutusTtd: user?.name || "Arifin Nugroho, SE",
              catatan: data.data?.catatan || catatanPemutus,
            }
          : t
      );
      setTransaksis(updatedList);
      const nextQueued = updatedList.find((t) => t.status === "Menunggu Pemutus");
      if (nextQueued) {
        setSelectedSbr(nextQueued.sbr);
        setCatatanPemutus(
          "Fisik perhiasan dan kadar karat telah diverifikasi. Plafon disetujui sesuai rekomendasi penaksir."
        );
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeTx) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setFeedback({ type: "error", msg: "Alasan penolakan wajib diisi." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pemutus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr: activeTx.sbr,
          action: "REJECT",
          user: user?.name || "Arifin Nugroho, SE",
          batalAlasan: reason,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal menolak berkas." });
        setIsSubmitting(false);
        return;
      }

      setRejectModalOpen(false);
      setFeedback({
        type: "success",
        msg: `Transaksi ${activeTx.sbr} telah ditolak/dikembalikan ke penaksir.`,
      });

      const updatedList = transaksis.map((t) =>
        t.sbr === activeTx.sbr ? { ...t, status: "Dibatalkan", batalAlasan: reason } : t
      );
      setTransaksis(updatedList);
      const nextQueued = updatedList.find((t) => t.status === "Menunggu Pemutus");
      if (nextQueued) {
        setSelectedSbr(nextQueued.sbr);
        setCatatanPemutus(
          "Fisik perhiasan dan kadar karat telah diverifikasi. Plafon disetujui sesuai rekomendasi penaksir."
        );
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
    } catch {
      setFeedback({ type: "error", msg: "Gagal memproses penolakan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = transaksis.filter((t) => t.status === "Menunggu Pemutus").length;
  const totalNilaiTaksiranPending = transaksis
    .filter((t) => t.status === "Menunggu Pemutus")
    .reduce((s, t) => s + (t.totalTaksiran || 0), 0);

  return (
    <AppShell>
      {/* MODAL VERIFIKASI 2 KALI SEBELUM SETUJUI AKAD */}
      {activeTx && (
        <DoubleConfirmModal
          open={approveModalOpen}
          title="Periksa Seluruh Data Sebelum Disetujui"
          subtitle="Persetujuan ini akan mengembalikan berkas ke loket Penaksir untuk konfirmasi nasabah."
          sections={[
            {
              title: "Data Nasabah & Berkas",
              items: [
                { label: "No. SBR", value: activeTx.sbr },
                { label: "CIF", value: activeTx.cif || "-" },
                { label: "Nama Nasabah", value: activeTx.nama },
                { label: "NIK", value: activeTx.nik },
                { label: "No. HP / WA", value: activeTx.hp },
                { label: "Jenis Gadai", value: activeTx.keteranganGadai },
                { label: "Petugas Penaksir", value: activeTx.petugasPenaksir },
              ],
            },
            {
              title: `Barang Jaminan (${activeTx.barang.length} Item)`,
              items: activeTx.barang.map((b, idx) => ({
                label: `${idx + 1}. ${b.jenis} (${b.karat} · ${b.jumlah || 1}x)`,
                value: `Kotor ${fmtBerat(b.beratKotor)} / Bersih ${fmtBerat(b.beratBersih)} · ${fmtRp(b.nilaiTaksiran)}`,
              })),
            },
            {
              title: "Rincian Pembiayaan & Keputusan",
              items: [
                { label: "Total Taksiran", value: fmtRp(activeTx.totalTaksiran) },
                { label: "Uang Pinjaman (Marhun Bih)", value: fmtRp(activeTx.marhunBih), highlight: true },
                { label: "Ujroh", value: fmtRp(activeTx.ujroh) },
                { label: "Tanggal Akad – Jatuh Tempo", value: `${activeTx.tanggalAkad} s.d. ${activeTx.tanggalJatuhTempo}` },
                { label: "Catatan Pemutus", value: catatanPemutus.trim() || "-" },
              ],
            },
          ]}
          checkboxLabel="Saya pastikan seluruh data nasabah, agunan, dan plafon pinjaman sudah benar untuk disetujui."
          confirmLabel="Ya, Setujui Akad"
          submitting={isSubmitting}
          onClose={() => setApproveModalOpen(false)}
          onConfirm={async () => {
            setApproveModalOpen(false);
            await handleApprove();
          }}
        />
      )}

      {/* MODAL PENOLAKAN / PENGEMBALIAN BERKAS */}
      {rejectModalOpen && activeTx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDECEA] text-[#C62828] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1B2420]">
                    Tolak / Kembalikan Berkas
                  </h3>
                  <p className="text-xs text-[#5F6B65] mt-0.5">
                    SBR <b className="font-mono text-[#1B2420]">{activeTx.sbr}</b> · {activeTx.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <label className="block text-xs font-bold text-[#1B2420]">
                Alasan Penolakan / Catatan Perbaikan
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Nilai taksiran melebihi toleransi berat bersih",
                  "FTV melebihi batas kewenangan 94%",
                  "Dokumen identitas nasabah belum lengkap",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                      rejectReason === preset
                        ? "bg-[#FDECEA] text-[#C62828] border-[#C62828]/40"
                        : "bg-[#F6F7F5] text-[#5F6B65] border-[#E1E5E2] hover:bg-white"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan atau instruksi perbaikan untuk penaksir..."
                className="w-full p-2.5 rounded-xl border border-[#E1E5E2] text-xs text-[#1B2420] focus:outline-none focus:border-[#C62828]"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="h-9 px-4 rounded-xl bg-[#C62828] hover:bg-[#A81F1F] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[#1B2420]">
                Konfirmasi Pemutus &amp; Otorisasi Berkas
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FBF3D6] text-[#7A6110] border border-[#C9A227]/30">
                <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-pulse" />
                Antrean Aktif: {pendingCount} Berkas Menunggu
              </span>
            </div>
            <p className="text-xs text-[#5F6B65] mt-1.5">
              Verifikasi kepatuhan syariah, validasi taksiran marhun, dan penerbitan nomor registrasi resmi akad gadai emas (SBR &amp; Core Banking).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#F6F7F5] px-4 py-2.5 rounded-xl border border-[#E1E5E2] shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Total Taksiran Menunggu</p>
              <p className="text-sm font-extrabold text-[#0B5D3B] num">{fmtRp(totalNilaiTaksiranPending)}</p>
            </div>
            <div className="h-7 w-px bg-[#E1E5E2]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Wewenang Berkas Aktif</p>
              <p className="text-xs font-bold text-[#C9A227]">
                {activeTx ? tentukanWewenangPemutus(activeTx.marhunBih) : "Belum Dipilih"}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold border ${
              feedback.type === "success"
                ? "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/30"
                : "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#0B5D3B]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#C62828]" />
              )}
              <span>{feedback.msg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="hover:underline font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Kolom Kiri: Antrean Verifikasi (4 Kolom) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#1B2420] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0B5D3B]" /> Daftar Pengajuan ({filtered.length})
                </span>
                <span className="text-[11px] text-[#5F6B65]">Urutan: Terlama</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-[#F6F7F5] p-1 rounded-xl border border-[#E1E5E2] text-[11px] font-bold">
                {(
                  [
                    { key: "Menunggu", label: `Antrean (${pendingCount})` },
                    { key: "Disetujui", label: "Riwayat" },
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
                  placeholder="Cari SBR, Nama Nasabah..."
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
                    onClick={() => handleSelectTx(t)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-[#E6F2EC]/40 border-[#0B5D3B] shadow-xs ring-2 ring-[#0B5D3B]/20"
                        : "bg-white border-[#E1E5E2] hover:border-[#0B5D3B]/40"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0B5D3B] text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs text-[#084530] font-mono">
                        {t.sbr}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === "Menunggu Pemutus"
                            ? "bg-[#FBF3D6] text-[#7A6110]"
                            : t.status === "Disetujui Pemutus"
                            ? "bg-[#E6F2EC] text-[#084530]"
                            : "bg-[#ECEFED] text-[#5F6B65]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#1B2420]">{t.nama}</p>
                    <p className="text-[11px] text-[#5F6B65] mt-0.5">
                      {t.cif || "CIF-New"} · {t.barang.length} item ({fmtBerat(t.totalBeratBersih)})
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-[#E1E5E2] flex items-center justify-between">
                      <span className="text-[11px] text-[#5F6B65]">Nilai Pinjaman:</span>
                      <span className="font-extrabold text-xs text-[#0B5D3B] num">
                        {fmtRp(t.marhunBih)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kolom Kanan: Detail Berkas & Otorisasi Pemutus (8 Kolom) */}
          <div className="lg:col-span-8 bg-white p-6 lg:p-8 rounded-2xl border border-[#E1E5E2] shadow-xs space-y-6">
            {activeTx ? (
              <>
                {/* Header Berkas Terpilih */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E1E5E2]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-[#1B2420]">
                        Otorisasi: {activeTx.nama}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#F6F7F5] border border-[#E1E5E2] text-[#084530]">
                        {activeTx.sbr}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F6B65] mt-0.5">
                      Petugas Penaksir: <b>{activeTx.petugasPenaksir}</b> · Lokasi: {activeTx.kantor}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-[#FBF3D6] border border-[#C9A227]/40 text-[11px] font-bold text-[#7A6110]">
                      Wewenang: {tentukanWewenangPemutus(activeTx.marhunBih)}
                    </span>
                    <Link
                      href={`/cetak?sbr=${encodeURIComponent(activeTx.sbr)}`}
                      className="px-3.5 py-1.5 rounded-lg border border-[#E1E5E2] text-xs font-semibold text-[#5F6B65] hover:bg-[#F6F7F5] flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Pratinjau SBR
                    </Link>
                  </div>
                </div>

                {/* Peringatan Risiko & Catatan Penaksir */}
                {(() => {
                  const ftvPct =
                    activeTx.totalTaksiran > 0
                      ? (activeTx.marhunBih / activeTx.totalTaksiran) * 100
                      : 0;
                  const hasLowRatio = activeTx.barang.some(
                    (b) => b.beratKotor > 0 && b.beratBersih < b.beratKotor * 0.8
                  );
                  if (ftvPct <= 94 && !hasLowRatio && !activeTx.catatan) return null;
                  return (
                    <div className="space-y-2">
                      {(ftvPct > 94 || hasLowRatio) && (
                        <div className="p-3.5 rounded-xl bg-[#FFF8E1] border border-[#B7791F]/30 text-xs text-[#7A6110] flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            {ftvPct > 94 && (
                              <p className="font-bold">
                                Pinjaman melebihi batas standar 94% FTV ({ftvPct.toFixed(1)}%). Memerlukan otorisasi khusus pemutus.
                              </p>
                            )}
                            {hasLowRatio && (
                              <p className="font-bold">
                                Terdapat item dengan berat bersih &lt; 80% dari berat kotor. Wajib verifikasi fisik permata/kotoran.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {activeTx.catatan && (
                        <div className="p-3 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] text-xs text-[#5F6B65]">
                          <span className="font-bold text-[#1B2420]">Catatan Penaksir: </span>
                          {activeTx.catatan}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ringkasan Evaluasi FTV & Taksiran */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Total Taksiran (HPS)</p>
                    <p className="text-sm font-extrabold text-[#1B2420] num mt-0.5">{fmtRp(activeTx.totalTaksiran)}</p>
                    <p className="text-[10px] text-[#5F6B65] mt-0.5">{fmtBerat(activeTx.totalBeratBersih)} bersih</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#E6F2EC] border border-[#0B5D3B]/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#084530]">Pinjaman Dimohon</p>
                    <p className="text-sm font-extrabold text-[#0B5D3B] num mt-0.5">{fmtRp(activeTx.marhunBih)}</p>
                    <p className="text-[10px] text-[#084530] font-bold mt-0.5">
                      FTV: {activeTx.totalTaksiran > 0 ? Math.round((activeTx.marhunBih / activeTx.totalTaksiran) * 100) : 0}% (Batas 94%)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Biaya Titipan (Ujroh)</p>
                    <p className="text-sm font-extrabold text-[#1B2420] num mt-0.5">{fmtRp(activeTx.ujroh)}</p>
                    <p className="text-[10px] text-[#5F6B65] mt-0.5">Jangka 120 Hari</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Nominal Bersih Diterima</p>
                    <p className="text-sm font-extrabold text-[#1B2420] num mt-0.5">{fmtRp(activeTx.nominalBersih)}</p>
                    <p className="text-[10px] text-[#5F6B65] mt-0.5">Potong Admin {fmtRp(activeTx.biayaAdmin)}</p>
                  </div>
                </div>

                {/* Tabel Barang Jaminan Fisik */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1B2420] mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#C9A227]" /> Verifikasi Fisik Emas (Marhun)
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-[#E1E5E2]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#E6F2EC] text-[#084530] font-bold">
                        <tr>
                          <th className="p-2.5">Item Barang</th>
                          <th className="p-2.5">Karat</th>
                          <th className="p-2.5 text-right">Berat Kotor</th>
                          <th className="p-2.5 text-right">Berat Bersih</th>
                          <th className="p-2.5 text-right">Nilai Taksiran</th>
                          <th className="p-2.5">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E5E2]">
                        {activeTx.barang.map((b) => (
                          <tr key={b.id} className="hover:bg-[#F6F7F5]">
                            <td className="p-2.5 font-bold text-[#1B2420]">{b.jenis}</td>
                            <td className="p-2.5 font-extrabold text-[#C9A227]">{b.karat}</td>
                            <td className="p-2.5 text-right num text-[#5F6B65]">{fmtBerat(b.beratKotor)}</td>
                            <td className="p-2.5 text-right num font-bold text-[#1B2420]">{fmtBerat(b.beratBersih)}</td>
                            <td className="p-2.5 text-right num font-extrabold text-[#0B5D3B]">{fmtRp(b.nilaiTaksiran)}</td>
                            <td className="p-2.5 text-[#5F6B65]">{b.keterangan || "Fisik baik"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Form Otorisasi & TTD Digital Pemutus */}
                <div className="p-5 rounded-2xl bg-[#F6F7F5] border border-[#E1E5E2] space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#084530]">
                      Keputusan &amp; Tanda Tangan Digital Pemutus
                    </p>
                    <span className="text-[11px] font-semibold text-[#5F6B65]">
                      Pejabat: <b className="text-[#1B2420]">{user?.name || "Arifin Nugroho, SE"}</b>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1B2420] mb-1">
                      Catatan Keputusan Pemutus
                    </label>
                    <textarea
                      rows={2}
                      disabled={activeTx.status !== "Menunggu Pemutus"}
                      value={catatanPemutus}
                      onChange={(e) => setCatatanPemutus(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#E1E5E2] bg-white text-xs text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#ECEFED] disabled:text-[#5F6B65]"
                    />
                  </div>
                  <p className="text-[11px] text-[#5F6B65]">
                    Setelah disetujui, berkas dikembalikan ke loket Penaksir untuk dibacakan dan dikonfirmasi ke nasabah sebelum masuk ke Back Office.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting || activeTx.status !== "Menunggu Pemutus"}
                    onClick={() => setRejectModalOpen(true)}
                    className="w-full sm:w-auto h-11 px-5 rounded-xl border border-[#C62828] text-[#C62828] font-bold text-xs hover:bg-[#FDECEA] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Tolak / Kembalikan ke Penaksir
                  </button>

                  <div className="w-full sm:w-auto flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting || activeTx.status !== "Menunggu Pemutus"}
                      onClick={() => setApproveModalOpen(true)}
                      className="w-full sm:w-auto h-11 px-7 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.3]" />
                      {activeTx.status === "Menunggu Pemutus"
                        ? "Konfirmasi & Setujui Akad"
                        : activeTx.status}
                    </button>
                  </div>
                </div>

                {/* Sharia Statement */}
                <div className="p-3.5 rounded-xl bg-[#E6F2EC]/60 border border-[#0B5D3B]/20 text-[11px] text-[#084530] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#0B5D3B] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <b>Kepatuhan Otorisasi Syariah:</b> Persetujuan pemutus mengikat keabsahan akad <i>Qardh wal Ijarah</i> sesuai Fatwa DSN-MUI No. 25/DSN-MUI/III/2002. Ujroh dihitung dari biaya pemeliharaan tempat titipan emas, bukan dari persentase uang pinjaman (bebas riba).
                  </p>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-[#5F6B65]">
                Pilih transaksi dari daftar di sebelah kiri untuk melihat rincian dan melakukan otorisasi.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
