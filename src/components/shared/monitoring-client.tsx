"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import {
  Search,
  ArrowRight,
  Send,
  Trash2,
  XCircle,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export interface MonitoringTransaksiItem {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  noRek?: string | null;
  noKontrak?: string | null;
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
  status: string;
  catatan?: string | null;
  batalAlasan?: string | null;
  barang: {
    id: string;
    jenis: string;
    karat: string;
    beratKotor: number;
    beratBersih: number;
    nilaiTaksiran: number;
    sbr: string;
    jumlah: number;
    keterangan: string | null;
  }[];
}

export function MonitoringClient({ initialTransaksi }: { initialTransaksi: MonitoringTransaksiItem[] }) {
  const { user } = useAuth();
  const [transaksiList, setTransaksiList] = useState(initialTransaksi);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [confirmModalTx, setConfirmModalTx] = useState<MonitoringTransaksiItem | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: "DELETE_DRAFT" | "SUBMIT_DRAFT" | "CANCEL_SUBMISSION";
    sbr: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("Nasabah batal menggadaikan barang di loket");
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [loadingSbr, setLoadingSbr] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ekspor CSV Laporan Monitoring
  const exportMonitoringCsv = () => {
    const headers = ["No SBR", "CIF", "Nama Nasabah", "NIK", "No HP", "Total Taksiran", "Marhun Bih", "Tanggal Akad", "Status"];
    const rows = filtered.map((t) => [
      t.sbr,
      t.cif || "-",
      `"${t.nama}"`,
      `'${t.nik}`,
      t.hp,
      t.totalTaksiran,
      t.marhunBih,
      t.tanggalAkad,
      t.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Monitoring_Rahn_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-fetch data terbaru dari backend agar selalu sinkron realtime
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/transaksi");
      const data = await res.json();
      if (data.success && data.data) {
        setTransaksiList(data.data);
      }
    } catch (err) {
      console.error("Gagal refresh data monitoring:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initFetch() {
      try {
        const res = await fetch("/api/transaksi");
        const data = await res.json();
        if (data.success && data.data && isMounted) {
          setTransaksiList(data.data);
        }
      } catch (err) {
        console.error("Gagal load transaksi:", err);
      }
    }
    initFetch();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshNotif = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("osg:refresh-notifications"));
    }
  };

  // Eksekusi Aksi Draft & Pembatalan Loket
  const handleExecuteActionModal = async () => {
    if (!actionModal) return;
    const { type, sbr } = actionModal;
    setLoadingSbr(sbr);
    setActionFeedback(null);

    try {
      if (type === "DELETE_DRAFT") {
        const res = await fetch(
          `/api/transaksi?sbr=${encodeURIComponent(sbr)}&user=${encodeURIComponent(user?.name || "Ahmad Hidayat")}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (!data.success) {
          setActionFeedback({ type: "error", msg: data.error || "Gagal menghapus draft." });
          return;
        }
        setTransaksiList((prev) => prev.filter((t) => t.sbr !== sbr));
        setActionFeedback({ type: "success", msg: `Draft ${sbr} berhasil dihapus permanen.` });
        setActionModal(null);
        refreshNotif();
      } else if (type === "SUBMIT_DRAFT") {
        const res = await fetch("/api/transaksi", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sbr,
            action: "SUBMIT_DRAFT",
            user: user?.name || "Ahmad Hidayat",
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setActionFeedback({ type: "error", msg: data.error || "Gagal mengajukan draft." });
          return;
        }
        setTransaksiList((prev) =>
          prev.map((t) => (t.sbr === sbr ? { ...t, status: "Menunggu Pemutus" } : t))
        );
        setActionFeedback({ type: "success", msg: `Draft ${sbr} berhasil dikirim ke antrean Pemutus.` });
        setActionModal(null);
        refreshNotif();
      } else if (type === "CANCEL_SUBMISSION") {
        const reason = cancelReason.trim();
        if (!reason) {
          setActionFeedback({ type: "error", msg: "Alasan pembatalan wajib diisi." });
          return;
        }
        const res = await fetch("/api/transaksi", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sbr,
            action: "CANCEL_SUBMISSION",
            user: user?.name || "Ahmad Hidayat",
            alasan: reason,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setActionFeedback({ type: "error", msg: data.error || "Gagal membatalkan pengajuan." });
          return;
        }
        setTransaksiList((prev) =>
          prev.map((t) => (t.sbr === sbr ? { ...t, status: "Dibatalkan", batalAlasan: reason } : t))
        );
        setActionFeedback({ type: "success", msg: `Pengajuan ${sbr} berhasil ditarik/dibatalkan.` });
        setActionModal(null);
        refreshNotif();
      }
    } catch {
      setActionFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setLoadingSbr(null);
    }
  };

  // Aksi 4: Konfirmasi Persetujuan Nasabah di Loket (Disetujui Pemutus -> Menunggu Back Office / Dibatalkan)
  const handleConfirmNasabah = async (sbr: string, setuju: boolean) => {
    const action = setuju ? "CONFIRM_NASABAH" : "CANCEL_NASABAH";
    setLoadingSbr(sbr);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/transaksi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr,
          action,
          user: user?.name || "Ahmad Hidayat",
          alasan: setuju ? undefined : "Nasabah menolak nominal taksiran/ketentuan pemutus di loket.",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setActionFeedback({ type: "error", msg: data.error || "Gagal memproses konfirmasi nasabah." });
        return;
      }
      setTransaksiList((prev) =>
        prev.map((t) =>
          t.sbr === sbr
            ? {
                ...t,
                status: setuju ? "Menunggu Back Office" : "Dibatalkan",
              }
            : t
        )
      );
      setConfirmModalTx(null);
      setActionFeedback({
        type: "success",
        msg: setuju
          ? `Nasabah menyetujui ${sbr}. Berkas diteruskan ke Back Office.`
          : `Transaksi ${sbr} dibatalkan atas permintaan nasabah.`,
      });
      refreshNotif();
    } catch {
      setActionFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setLoadingSbr(null);
    }
  };

  const filtered = transaksiList.filter((t) => {
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchSearch =
      searchQuery === "" ||
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sbr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.cif && t.cif.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <AppShell>
      {/* MODAL KONFIRMASI AKSI DRAFT / PEMBATALAN LOKET */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    actionModal.type === "SUBMIT_DRAFT"
                      ? "bg-[#E6F2EC] text-[#0B5D3B]"
                      : "bg-[#FDECEA] text-[#C62828]"
                  }`}
                >
                  {actionModal.type === "SUBMIT_DRAFT" ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1B2420]">
                    {actionModal.type === "DELETE_DRAFT"
                      ? "Hapus Draft Transaksi"
                      : actionModal.type === "SUBMIT_DRAFT"
                      ? "Ajukan Draft ke Pemutus"
                      : "Batalkan Pengajuan Loket"}
                  </h3>
                  <p className="text-xs text-[#5F6B65] mt-0.5">
                    Nomor SBR: <b className="font-mono text-[#1B2420]">{actionModal.sbr}</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5F6B65] mt-3 leading-relaxed">
              {actionModal.type === "DELETE_DRAFT"
                ? "Draft ini akan dihapus permanen dari daftar transaksi."
                : actionModal.type === "SUBMIT_DRAFT"
                ? "Berkas draft akan diteruskan ke antrean otorisasi Pemutus."
                : "Tuliskan alasan penarikan/pembatalan berkas sebelum diputus:"}
            </p>

            {actionModal.type === "CANCEL_SUBMISSION" && (
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-3 w-full p-2.5 rounded-xl border border-[#E1E5E2] text-xs text-[#1B2420] focus:outline-none focus:border-[#C62828]"
              />
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="h-9 px-4 rounded-xl border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loadingSbr === actionModal.sbr}
                onClick={handleExecuteActionModal}
                className={`h-9 px-4 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                  actionModal.type === "SUBMIT_DRAFT"
                    ? "bg-[#0B5D3B] hover:bg-[#084530]"
                    : "bg-[#C62828] hover:bg-[#A81F1F]"
                }`}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMBACAAN PUTUSAN PEMUTUS KE NASABAH */}
      {confirmModalTx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E1E5E2]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B5D3B]">
                  Konfirmasi Putusan ke Nasabah
                </span>
                <h3 className="text-base font-extrabold text-[#1B2420] mt-0.5">
                  {confirmModalTx.nama} · <span className="font-mono text-[#084530]">{confirmModalTx.sbr}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalTx(null)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 p-4 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5F6B65]">Total Taksiran Emas:</span>
                <span className="font-bold text-[#1B2420] num">{fmtRp(confirmModalTx.totalTaksiran)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B65]">Uang Pinjaman Disetujui (UP):</span>
                <span className="font-extrabold text-[#0B5D3B] num text-sm">{fmtRp(confirmModalTx.marhunBih)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B65]">Ujroh 4 Bulan (120 Hari):</span>
                <span className="font-bold text-[#1B2420] num">{fmtRp(confirmModalTx.ujroh)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B65]">Biaya Administrasi:</span>
                <span className="font-bold text-[#1B2420] num">{fmtRp(confirmModalTx.biayaAdmin)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E1E5E2]">
                <span className="font-bold text-[#084530]">Nominal Bersih Diterima Nasabah:</span>
                <span className="font-extrabold text-[#084530] num text-sm">{fmtRp(confirmModalTx.nominalBersih)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B65]">Tanggal Jatuh Tempo:</span>
                <span className="font-bold text-[#1B2420]">{confirmModalTx.tanggalJatuhTempo}</span>
              </div>
            </div>

            {confirmModalTx.catatan && (
              <div className="mb-4 p-3 rounded-xl bg-[#E6F2EC]/60 border border-[#0B5D3B]/20 text-xs text-[#084530]">
                <b>Catatan Pemutus:</b> {confirmModalTx.catatan}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                disabled={loadingSbr === confirmModalTx.sbr}
                onClick={() => handleConfirmNasabah(confirmModalTx.sbr, false)}
                className="h-10 px-4 rounded-xl border border-[#C62828] text-[#C62828] hover:bg-[#FDECEA] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Nasabah Tolak / Batal
              </button>
              <button
                type="button"
                disabled={loadingSbr === confirmModalTx.sbr}
                onClick={() => handleConfirmNasabah(confirmModalTx.sbr, true)}
                className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Nasabah Setuju → Teruskan ke Back Office
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1B2420] tracking-tight">
            Monitoring Transaksi &amp; Status Akad
          </h2>
          <p className="text-sm text-[#5F6B65] mt-1">
            Pelacakan status berkas rahn — dari pengajuan loket, persetujuan pemutus, hingga siap cetak.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            className="h-9 px-3.5 rounded-xl border border-[#E1E5E2] bg-white hover:bg-[#F6F7F5] text-xs font-bold text-[#1B2420] inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Muat Ulang Transaksi"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0B5D3B] ${isRefreshing ? "animate-spin" : ""}`} />
            Segarkan
          </button>
          <Link
            href="/taksiran"
            className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            + Input Transaksi Baru
          </Link>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="mt-6 flex flex-col gap-3 bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#5F6B65] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SBR / CIF / Nama Nasabah..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#E1E5E2] text-xs bg-white focus:outline-none focus:border-[#0B5D3B]"
            />
          </div>

          <button
            type="button"
            onClick={exportMonitoringCsv}
            className="h-10 px-3.5 rounded-xl border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#E6F2EC] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Ekspor laporan antrean ke Excel"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" /> Ekspor Excel
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E1E5E2]/70 text-xs">
          {["ALL", "Draft", "Menunggu Pemutus", "Disetujui Pemutus", "Menunggu Back Office", "Siap Cetak", "Tercetak"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === st
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] hover:text-[#1B2420] border border-[#E1E5E2]"
              }`}
            >
              {st === "ALL" ? "Semua Status" : st}
            </button>
          ))}
        </div>
      </div>

      {/* TABEL MONITORING */}
      {actionFeedback && (
        <div
          className={`mt-4 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold border ${
            actionFeedback.type === "success"
              ? "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/30"
              : "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#0B5D3B] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#C62828] shrink-0" />
            )}
            <span>{actionFeedback.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="hover:opacity-75 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F6F7F5] border-b border-[#E1E5E2] text-[11px] font-bold uppercase text-[#5F6B65] tracking-wider">
                <th className="py-3 px-6">No. SBR</th>
                <th className="py-3 px-4">Nama Nasabah</th>
                <th className="py-3 px-4">Barang &amp; Berat</th>
                <th className="py-3 px-4 text-right">Nilai Taksiran</th>
                <th className="py-3 px-4 text-right">Marhun Bih</th>
                <th className="py-3 px-4">Tgl Akad</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5E2]">
              {filtered.map((t) => (
                <tr key={t.sbr} className="hover:bg-[#E6F2EC]/40 transition-colors">
                  <td className="py-3.5 px-6 font-bold text-[#1B2420] num">{t.sbr}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#1B2420]">{t.nama}</p>
                    <p className="text-[11px] text-[#5F6B65] num">{t.cif || "Nasabah Baru"}</p>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#1B2420]">
                    {t.barang?.length || 1} item · {fmtBerat(t.totalBeratBersih)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-[#1B2420] num">
                    {fmtRp(t.totalTaksiran)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-[#0B5D3B] num">
                    {fmtRp(t.marhunBih)}
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6B65]">{t.tanggalAkad}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        t.status === "Draft"
                          ? "bg-[#ECEFED] text-[#5F6B65]"
                          : t.status === "Menunggu Pemutus"
                          ? "bg-[#FBF3D6] text-[#7A6110]"
                          : t.status === "Disetujui Pemutus"
                          ? "bg-[#E6F2EC] text-[#084530]"
                          : t.status === "Dibatalkan"
                          ? "bg-[#FDECEA] text-[#C62828]"
                          : "bg-[#E0F2F1] text-[#00695C]"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Opsi Khusus Status Draft (Penaksir / Admin IT) */}
                      {t.status === "Draft" && (user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (
                        <>
                          <button
                            type="button"
                            disabled={loadingSbr === t.sbr}
                            onClick={() => setActionModal({ type: "SUBMIT_DRAFT", sbr: t.sbr })}
                            title="Kirim Draft ke Pemutus"
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" /> Ajukan
                          </button>
                          <button
                            type="button"
                            disabled={loadingSbr === t.sbr}
                            onClick={() => setActionModal({ type: "DELETE_DRAFT", sbr: t.sbr })}
                            title="Hapus Draft"
                            className="p-1.5 rounded-lg border border-[#E1E5E2] hover:bg-[#FDECEA] text-[#C62828] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Opsi Batalkan jika masih di Pemutus (Penaksir / Admin IT) */}
                      {t.status === "Menunggu Pemutus" && (user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (
                        <button
                          type="button"
                          disabled={loadingSbr === t.sbr}
                          onClick={() => setActionModal({ type: "CANCEL_SUBMISSION", sbr: t.sbr })}
                          title="Tarik / Batalkan Pengajuan Loket"
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#C62828] text-[#C62828] hover:bg-[#FDECEA] font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" /> Batal
                        </button>
                      )}

                      {/* Opsi Konfirmasi Nasabah setelah Disetujui Pemutus */}
                      {t.status === "Disetujui Pemutus" && (user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (
                        <button
                          type="button"
                          disabled={loadingSbr === t.sbr}
                          onClick={() => setConfirmModalTx(t)}
                          title="Bacakan Putusan & Konfirmasi Persetujuan Nasabah"
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Konfirmasi Nasabah
                        </button>
                      )}

                      {/* Tombol Cetak Dokumen jika Siap Cetak */}
                      {(t.status === "Siap Cetak" || t.status === "Tercetak") && (
                        <Link
                          href={`/cetak?sbr=${encodeURIComponent(t.sbr)}`}
                          title="Cetak SBR & Nota"
                          className="p-1.5 rounded-lg border border-[#E1E5E2] hover:bg-[#E6F2EC] text-[#0B5D3B] transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {/* Tombol Buka / Detail */}
                      <Link
                        href={
                          t.status === "Siap Cetak" || t.status === "Tercetak"
                            ? `/cetak?sbr=${encodeURIComponent(t.sbr)}`
                            : t.status === "Menunggu Pemutus"
                            ? "/pemutus"
                            : t.status === "Menunggu Back Office"
                            ? "/backoffice"
                            : "/dashboard"
                        }
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#0B5D3B] hover:text-white font-bold text-[11px] transition-colors"
                      >
                        Buka
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5F6B65]">
                    Tidak ada transaksi yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
