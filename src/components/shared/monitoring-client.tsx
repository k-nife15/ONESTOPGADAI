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
import { CatatNomorModal, ConfirmNasabahMonitoringModal } from "./monitoring-modals";

export interface MonitoringTransaksiItem {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  noRek?: string | null;
  noKontrak?: string | null;
  noAkad?: string | null;
  noSbg?: string | null;
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

const COMPLETED_STATUSES = new Set(["Tercetak", "Lunas", "Lelang", "Dibatalkan"]);

export function MonitoringClient({ initialTransaksi }: { initialTransaksi: MonitoringTransaksiItem[] }) {
  const { user } = useAuth();
  const [transaksiList, setTransaksiList] = useState(initialTransaksi);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [confirmModalTx, setConfirmModalTx] = useState<MonitoringTransaksiItem | null>(null);
  const [catatNomorTx, setCatatNomorTx] = useState<MonitoringTransaksiItem | null>(null);
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

  const handleMarkSbrRecorded = async (sbr: string) => {
    setLoadingSbr(sbr);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/transaksi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr,
          action: "MARK_SBR_RECORDED",
          user: user?.name || "Ahmad Hidayat",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setActionFeedback({ type: "error", msg: data.error || "Gagal memperbarui status SBR." });
        return;
      }
      const updatedList = transaksiList.map((t) =>
        t.sbr === sbr ? { ...t, status: "Tercetak" } : t
      );
      setTransaksiList(updatedList);
      const nextReady = updatedList.find(
        (t) =>
          t.status === "Siap Cetak" &&
          (t.noAkad || t.noSbg || t.noKontrak) &&
          (user?.role === "PENAKSIR"
            ? t.kantor === user.branch && t.petugasPenaksir === user.name
            : true)
      );
      setCatatNomorTx(nextReady || null);
      setActionFeedback({
        type: "success",
        msg: `Nomor legalitas berkas ${sbr} ditandai sudah dicatat di SBR (status: Tercetak).`,
      });
      refreshNotif();
    } catch {
      setActionFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setLoadingSbr(null);
    }
  };

  const filtered = transaksiList.filter((t) => {
    const matchPenaksirScope =
      user?.role === "PENAKSIR"
        ? t.kantor === user.branch && t.petugasPenaksir === user.name
        : true;
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchSearch =
      searchQuery === "" ||
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sbr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.cif && t.cif.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchPenaksirScope && matchStatus && matchSearch;
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
      <ConfirmNasabahMonitoringModal
        tx={confirmModalTx}
        loadingSbr={loadingSbr}
        onClose={() => setConfirmModalTx(null)}
        onConfirm={handleConfirmNasabah}
      />

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
              {st === "ALL" ? "Semua Status" : st === "Siap Cetak" ? "Catat Nomor SBR" : st}
            </button>
          ))}
        </div>
      </div>

      {/* KARTU TUGAS PRIORITAS: NOMOR LEGALITAS BARU DARI BACK OFFICE */}
      {(user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (() => {
        const readyNumbers = transaksiList.filter(
          (t) => t.status === "Siap Cetak" && (t.noAkad || t.noSbg || t.noKontrak)
        );
        if (readyNumbers.length === 0) return null;
        return (
          <div className="mt-5 rounded-2xl bg-[#FFFBEB] border-2 border-[#C9A227] p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C9A227] text-white text-[10px] font-extrabold tracking-wide uppercase">
                  Perlu Dicatat ke SBR
                </span>
                <p className="text-xs font-extrabold text-[#1B2420]">
                  {readyNumbers.length} berkas sudah diterbitkan nomor legalitas oleh Back Office
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatatNomorTx(readyNumbers[0])}
                className="h-8 px-3.5 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold cursor-pointer shrink-0"
              >
                Buka Semua ({readyNumbers.length})
              </button>
            </div>

            <div className="divide-y divide-[#C9A227]/25 rounded-xl bg-white/90 border border-[#C9A227]/35 overflow-hidden">
              {readyNumbers.map((item) => (
                <div
                  key={item.sbr}
                  className="px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-[#1B2420]">{item.nama}</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#E6F2EC] text-[#084530] font-mono text-[11px] font-bold">
                        SBR: {item.sbr}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#5F6B65]">
                      <span>
                        Akad: <b className="text-[#1B2420]">{item.noAkad || "-"}</b>
                      </span>
                      <span>
                        SBG: <b className="text-[#1B2420]">{item.noSbg || "-"}</b>
                      </span>
                      <span>
                        Kontrak: <b className="text-[#1B2420]">{item.noKontrak || "-"}</b>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCatatNomorTx(item)}
                    className="h-8 px-3 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Catat ke SBR
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* CARD MODAL KHUSUS: CATAT NOMOR LEGALITAS KE KERTAS SBR */}
      <CatatNomorModal
        tx={catatNomorTx}
        readyNumbers={transaksiList.filter(
          (t) => t.status === "Siap Cetak" && (t.noAkad || t.noSbg || t.noKontrak)
        )}
        loadingSbr={loadingSbr}
        onSelectTx={setCatatNomorTx}
        onClose={() => setCatatNomorTx(null)}
        onMarkRecorded={handleMarkSbrRecorded}
      />

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

      {(() => {
        const inProgressList = filtered.filter((t) => !COMPLETED_STATUSES.has(t.status));
        const completedList = filtered.filter((t) => COMPLETED_STATUSES.has(t.status));
        const showInProgress = filterStatus === "ALL" || !COMPLETED_STATUSES.has(filterStatus);
        const showCompleted = filterStatus === "ALL" || COMPLETED_STATUSES.has(filterStatus);

        const renderMonitoringSection = (
          title: string,
          subtitle: string,
          badgeClass: string,
          items: MonitoringTransaksiItem[],
          emptyMessage: string
        ) => (
          <div className="mt-6 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E1E5E2] bg-[#F6F7F5]/70 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-[#1B2420]">{title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold num ${badgeClass}`}>
                    {items.length} berkas
                  </span>
                </div>
                <p className="text-[11px] text-[#5F6B65] mt-0.5">{subtitle}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F6F7F5] border-b border-[#E1E5E2] text-[11px] font-bold uppercase text-[#5F6B65] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4">No. SBR</th>
                    <th className="py-3 px-3">Nama Nasabah</th>
                    <th className="py-3 px-3">Barang &amp; Berat</th>
                    <th className="py-3 px-3 text-right">Nilai Taksiran</th>
                    <th className="py-3 px-3 text-right">Marhun Bih</th>
                    <th className="py-3 px-3">Tgl Akad</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E5E2]">
                  {items.map((t) => (
                    <tr
                      key={t.sbr}
                      className={`transition-colors ${
                        t.status === "Siap Cetak"
                          ? "bg-[#FFFBEB]/70 hover:bg-[#FEF3C7]/60"
                          : "hover:bg-[#E6F2EC]/40"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[#1B2420] num whitespace-nowrap">
                        <p>{t.sbr}</p>
                        {t.noAkad && (
                          <p className="text-[10px] font-mono font-semibold text-[#084530] mt-0.5">
                            {t.noAkad}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 min-w-[140px]">
                        <p className="font-bold text-[#1B2420] truncate max-w-[180px]">{t.nama}</p>
                        <p className="text-[11px] text-[#5F6B65] num">{t.cif || "Nasabah Baru"}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#1B2420] whitespace-nowrap">
                        {t.barang?.length || 1} item · {fmtBerat(t.totalBeratBersih)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[#1B2420] num whitespace-nowrap">
                        {fmtRp(t.totalTaksiran)}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-[#0B5D3B] num whitespace-nowrap">
                        {fmtRp(t.marhunBih)}
                      </td>
                      <td className="py-3 px-3 text-[#5F6B65] whitespace-nowrap">{t.tanggalAkad}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
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
                          {t.status === "Siap Cetak" ? "Catat Nomor SBR" : t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
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

                          {/* Opsi Cetak SBR & Kirim ke Back Office setelah Disetujui Pemutus */}
                          {t.status === "Disetujui Pemutus" && (user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (
                            <>
                              <Link
                                href={`/cetak?sbr=${encodeURIComponent(t.sbr)}`}
                                title="Cetak SBR untuk ditandatangani nasabah"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#E6F2EC] font-bold text-[11px] transition-colors"
                              >
                                <Printer className="w-3 h-3" /> Cetak SBR
                              </Link>
                              <button
                                type="button"
                                disabled={loadingSbr === t.sbr}
                                onClick={() => setConfirmModalTx(t)}
                                title="SBR sudah ditandatangani nasabah, kirim ke Back Office"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Sudah TTD → Ke BO
                              </button>
                            </>
                          )}

                          {/* Opsi Catat Nomor SBR setelah Back Office terbitkan No. Akad/SBG/Kontrak */}
                          {t.status === "Siap Cetak" && (user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (
                            <button
                              type="button"
                              onClick={() => setCatatNomorTx(t)}
                              title="Lihat & catat No. Akad, SBG, Kontrak ke kertas SBR"
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Catat Nomor
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

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#5F6B65]">
                        {emptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <>
            {showInProgress &&
              renderMonitoringSection(
                "Masih Proses (Antrean Berjalan)",
                "Berkas yang sedang berjalan di loket, pemutus, back office, atau menunggu catat nomor SBR.",
                "bg-[#FBF3D6] text-[#7A6110]",
                inProgressList,
                "Tidak ada transaksi yang masih dalam proses."
              )}

            {showCompleted &&
              renderMonitoringSection(
                "Sudah Selesai",
                "Berkas yang telah selesai seluruh alur (Tercetak / Lunas / Dibatalkan).",
                "bg-[#E6F2EC] text-[#084530]",
                completedList,
                "Belum ada transaksi yang selesai."
              )}
          </>
        );
      })()}
    </AppShell>
  );
}
