"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { fmtRp } from "@/lib/formatters";
import {
  Users,
  Search,
  FileSpreadsheet,
  Phone,
  MapPin,
  CreditCard,
  History,
  FilePlus2,
  X,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface TransaksiMini {
  sbr: string;
  status: string;
  marhunBih: number;
  totalTaksiran: number;
  tanggalAkad: string;
}

interface NasabahWithTrx {
  cif: string;
  nik: string;
  nama: string;
  hp: string;
  alamat: string;
  noRek: string | null;
  transaksi: TransaksiMini[];
}

interface WaCheckState {
  status: "idle" | "checking" | "verified" | "invalid" | "error";
  checkedPhone?: string;
  message?: string;
}

export function NasabahClient({ initialNasabah }: { initialNasabah: NasabahWithTrx[] }) {
  const { user } = useAuth();
  const [nasabahList, setNasabahList] = useState<NasabahWithTrx[]>(initialNasabah);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNasabah, setSelectedNasabah] = useState<NasabahWithTrx | null>(
    initialNasabah.length > 0 ? initialNasabah[0] : null
  );

  // State Modal Tambah/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialHp, setInitialHp] = useState("");
  const [waCheck, setWaCheck] = useState<WaCheckState>({ status: "idle" });

  // Form State
  const [formData, setFormData] = useState({
    cif: "",
    nama: "",
    nik: "",
    hp: "",
    alamat: "",
    noRek: "",
  });

  const canEditNasabah = user.role === "PENAKSIR" || user.role === "ADMIN_IT";

  const filteredList = nasabahList.filter(
    (n) =>
      searchQuery === "" ||
      n.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.nik.includes(searchQuery) ||
      n.cif.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.alamat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditModal = (n: NasabahWithTrx) => {
    setIsEditMode(true);
    setFormError("");
    setInitialHp(n.hp || "");
    setWaCheck({ status: "idle" });
    setFormData({
      cif: n.cif,
      nama: n.nama,
      nik: n.nik,
      hp: n.hp,
      alamat: n.alamat,
      noRek: n.noRek || "",
    });
    setIsModalOpen(true);
  };

  const trimmedHp = formData.hp.trim();
  const requiresWaVerification =
    !isEditMode || initialHp.trim() === "" || trimmedHp !== initialHp.trim();
  const isWaVerifiedForCurrentHp =
    waCheck.status === "verified" && waCheck.checkedPhone === trimmedHp;
  const canSubmitForm = !isSaving && (!requiresWaVerification || isWaVerifiedForCurrentHp);

  const handleVerifyWa = async () => {
    const phone = formData.hp.trim();
    if (!phone) {
      setWaCheck({ status: "invalid", message: "Isi nomor WhatsApp terlebih dahulu." });
      return;
    }

    setWaCheck({ status: "checking", checkedPhone: phone });
    setFormError("");
    try {
      const res = await fetch("/api/wa/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setWaCheck({
          status: "error",
          checkedPhone: phone,
          message: data.error || "Gagal memverifikasi nomor ke gateway WhatsApp.",
        });
        return;
      }

      if (data.registered) {
        setWaCheck({
          status: "verified",
          checkedPhone: phone,
          message: data.message || "Nomor terdaftar di WhatsApp.",
        });
      } else {
        setWaCheck({
          status: "invalid",
          checkedPhone: phone,
          message: data.message || "Nomor tidak terdaftar di WhatsApp.",
        });
      }
    } catch {
      setWaCheck({
        status: "error",
        checkedPhone: phone,
        message: "Koneksi gagal saat mengecek nomor WhatsApp.",
      });
    }
  };

  const handleSaveNasabah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresWaVerification && !isWaVerifiedForCurrentHp) {
      setFormError("Silakan klik tombol Verifikasi WA dan pastikan nomor terdaftar di WhatsApp sebelum menyimpan.");
      return;
    }
    setFormError("");
    setIsSaving(true);

    try {
      const endpoint = "/api/nasabah";
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!result.success) {
        setFormError(result.error || "Gagal menyimpan data.");
        setIsSaving(false);
        return;
      }

      // Perbarui list lokal
      if (isEditMode) {
        const updated = nasabahList.map((n) =>
          n.cif === formData.cif ? { ...n, ...formData } : n
        );
        setNasabahList(updated);
        if (selectedNasabah?.cif === formData.cif) {
          setSelectedNasabah({ ...selectedNasabah, ...formData });
        }
      } else {
        const created: NasabahWithTrx = {
          ...result.data,
          transaksi: [],
        };
        setNasabahList([created, ...nasabahList]);
        setSelectedNasabah(created);
      }

      setIsModalOpen(false);
    } catch {
      setFormError("Koneksi gagal atau terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportCsv = () => {
    const headers = ["No CIF", "NIK", "Nama Lengkap", "No HP", "Alamat", "No Rekening"];
    const rows = nasabahList.map((n) => [
      n.cif,
      `'${n.nik}`,
      `"${n.nama}"`,
      n.hp,
      `"${n.alamat}"`,
      n.noRek || "-",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_CIF_Nasabah_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1B2420] tracking-tight">
            Master Data Nasabah (CIF)
          </h2>
          <p className="text-sm text-[#5F6B65] mt-1">
            Direktori nasabah rahn — data identitas resmi, riwayat akad, dan plafon pinjaman.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEditNasabah && (
            <button
              type="button"
              onClick={exportCsv}
              className="h-9 px-3.5 rounded-xl border border-[#E1E5E2] bg-white hover:bg-[#F6F7F5] text-xs font-bold text-[#1B2420] inline-flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0B5D3B]" />
              Ekspor CSV
            </button>
          )}
        </div>
      </div>

      {/* FILTER & PENCARIAN (Sesuai Figma P-03) */}
      <div className="mt-6 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5F6B65] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. CIF, No. KTP, atau nama nasabah..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E1E5E2] bg-white text-sm text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="h-11 px-4 rounded-xl border border-[#E1E5E2] bg-white text-xs font-bold text-[#5F6B65] inline-flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4 text-[#0B5D3B]" />
            Total: <b className="text-[#1B2420] num">{nasabahList.length}</b> Nasabah
          </span>
        </div>
      </div>

      {/* DUA KOLOM: TABEL NASABAH (KIRI 8 KOLOM) & DETAIL SLIDE-OVER (KANAN 4 KOLOM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* TABEL MASTER CIF */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs overflow-hidden">
          <div className="p-4 px-6 border-b border-[#E1E5E2] flex items-center justify-between bg-[#F6F7F5]/50">
            <h3 className="text-sm font-bold text-[#1B2420]">Daftar Nasabah Rahn</h3>
            <span className="text-xs font-semibold text-[#5F6B65]">
              Menampilkan {filteredList.length} hasil
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F7F5] border-b border-[#E1E5E2] text-[11px] font-bold uppercase text-[#5F6B65] tracking-wider">
                  <th className="py-3 px-5">No. CIF</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">No. KTP</th>
                  <th className="py-3 px-4">No. HP</th>
                  <th className="py-3 px-4">Alamat</th>
                  <th className="py-3 px-4 text-center">Akad</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5E2] text-xs">
                {filteredList.map((n) => {
                  const isSelected = selectedNasabah?.cif === n.cif;
                  return (
                    <tr
                      key={n.cif}
                      onClick={() => setSelectedNasabah(n)}
                      className={`hover:bg-[#E6F2EC]/40 transition-colors cursor-pointer ${
                        isSelected ? "bg-[#E6F2EC]/70 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3.5 px-5 font-bold text-[#0B5D3B] num">
                        {n.cif}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1B2420]">
                        {n.nama}
                      </td>
                      <td className="py-3.5 px-4 text-[#5F6B65] num">
                        {n.nik.slice(0, 6)}••••••{n.nik.slice(-4)}
                      </td>
                      <td className="py-3.5 px-4 text-[#5F6B65] num">
                        {n.hp}
                      </td>
                      <td className="py-3.5 px-4 text-[#5F6B65] max-w-[160px] truncate" title={n.alamat}>
                        {n.alamat}
                      </td>
                      <td className="py-3.5 px-4 text-center num font-bold text-[#1B2420]">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F6F7F5] text-[11px]">
                          {n.transaksi.length}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedNasabah(n)}
                          className="h-7 px-2.5 rounded-lg border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#0B5D3B] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Lihat
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#5F6B65]">
                      Tidak ada nasabah yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL PANEL SLIDE-OVER KANAN (Sesuai Figma P-03) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs p-6 sticky top-24">
          {selectedNasabah ? (
            <div className="space-y-5">
              {/* Header Kartu Nasabah */}
              <div className="flex items-start justify-between border-b border-[#E1E5E2] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#084530] text-[#C9A227] flex items-center justify-center font-extrabold text-base shadow-sm">
                    {selectedNasabah.nama
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#1B2420] text-base leading-tight">
                      {selectedNasabah.nama}
                    </h4>
                    <p className="text-xs text-[#0B5D3B] font-bold num mt-0.5">
                      {selectedNasabah.cif}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedNasabah)}
                  className="p-1.5 rounded-lg border border-[#E1E5E2] hover:bg-[#F6F7F5] text-[#5F6B65] hover:text-[#0B5D3B] cursor-pointer"
                  title="Ubah data nasabah"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Status KYC Badge & Risk Profile / Kolektibilitas */}
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F3E5] border border-[#2E7D32]/20 text-xs font-bold text-[#2E7D32]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>KYC Terverifikasi (KTP Sesuai Dukcapil)</span>
                </div>

                {(() => {
                  const hasActive = selectedNasabah.transaksi.some((t) =>
                    [
                      "Menunggu Pemutus",
                      "Disetujui Pemutus",
                      "Menunggu Back Office",
                      "Siap Cetak",
                      "Tercetak",
                    ].includes(t.status)
                  );
                  const hasCanceled = selectedNasabah.transaksi.some((t) => t.status === "Dibatalkan");
                  const countTrx = selectedNasabah.transaksi.length;

                  let badgeBg = "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/20";
                  let badgeText = "PROFIL: LANCAR / SELESAI";
                  if (hasActive) {
                    badgeBg = "bg-[#FFF8E1] text-[#B7791F] border-[#B7791F]/30";
                    badgeText = "PROFIL: AKTIF BERJALAN";
                  } else if (hasCanceled) {
                    badgeBg = "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30";
                    badgeText = "PROFIL: DALAM PENGAWASAN";
                  } else if (countTrx === 0) {
                    badgeBg = "bg-[#F6F7F5] text-[#5F6B65] border-[#E1E5E2]";
                    badgeText = "PROFIL: NASABAH BARU";
                  }

                  return (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold ${badgeBg}`}>
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      <span>{badgeText}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Data Diri Rinci */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 text-[#5F6B65]">
                  <CreditCard className="w-3.5 h-3.5 text-[#0B5D3B] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[#1B2420] font-bold">No. KTP (NIK)</span>
                    <span className="num">{selectedNasabah.nik}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-[#5F6B65]">
                  <Phone className="w-3.5 h-3.5 text-[#0B5D3B] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[#1B2420] font-bold">Nomor Handphone</span>
                    <span className="num">{selectedNasabah.hp}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-[#5F6B65]">
                  <MapPin className="w-3.5 h-3.5 text-[#0B5D3B] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[#1B2420] font-bold">Alamat Domisili</span>
                    <span>{selectedNasabah.alamat}</span>
                  </div>
                </div>
              </div>

              {/* Rekening Bank */}
              <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] text-xs">
                <span className="font-bold text-[#5F6B65] uppercase tracking-wider text-[10px]">
                  Rekening Pencairan Nasabah
                </span>
                <p className="font-bold text-[#1B2420] text-sm mt-1 num">
                  {selectedNasabah.noRek || "Belum Terdaftar"}
                </p>
                <p className="text-[11px] text-[#5F6B65] mt-0.5">
                  a.n. {selectedNasabah.nama}
                </p>
              </div>

              {/* Riwayat Akad Gadai */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B2420]">
                    <History className="w-3.5 h-3.5 text-[#0B5D3B]" />
                    <span>Riwayat Akad ({selectedNasabah.transaksi.length})</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedNasabah.transaksi.map((t) => (
                    <div
                      key={t.sbr}
                      className="p-2.5 rounded-xl border border-[#E1E5E2] hover:border-[#0B5D3B]/40 text-xs flex items-center justify-between bg-white"
                    >
                      <div>
                        <span className="font-bold text-[#1B2420] block num">{t.sbr}</span>
                        <span className="text-[11px] text-[#0B5D3B] font-extrabold num">
                          {fmtRp(t.marhunBih)}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F2EC] text-[#0B5D3B]">
                        {t.status}
                      </span>
                    </div>
                  ))}

                  {selectedNasabah.transaksi.length === 0 && (
                    <p className="text-xs text-[#5F6B65] italic py-2 text-center">
                      Belum memiliki riwayat transaksi gadai sebelumnya.
                    </p>
                  )}
                </div>
              </div>

              {/* Tombol Aksi Cepat: Buat Gadai untuk Nasabah Ini */}
              {canEditNasabah && (
                <Link
                  href={`/taksiran?cif=${encodeURIComponent(selectedNasabah.cif)}`}
                  className="w-full h-10 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01] transition-all"
                >
                  <FilePlus2 className="w-4 h-4" />
                  Buat Transaksi Gadai Baru
                </Link>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-[#5F6B65] text-xs">
              Pilih salah satu nasabah pada tabel di samping untuk melihat rincian lengkapnya.
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT NASABAH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E1E5E2] shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#E1E5E2] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1B2420]">
                  {isEditMode ? "Ubah Data Nasabah" : "Pendaftaran Nasabah Baru"}
                </h3>
                <p className="text-xs text-[#5F6B65] mt-0.5">
                  {isEditMode
                    ? `Perbarui informasi profil untuk ${formData.cif}`
                    : "Nomor CIF akan dibuat otomatis secara berurutan oleh sistem"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F6F7F5] hover:bg-[#E1E5E2] text-[#5F6B65] flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-[#FDECEA] border-l-4 border-[#C62828] text-xs font-medium text-[#C62828]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveNasabah} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">
                  Nama Lengkap Nasabah <span className="text-[#C62828]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: H. Sugeng Riyanto"
                  className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] text-xs focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1B2420] mb-1">
                    No. KTP (NIK 16 Digit) <span className="text-[#C62828]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditMode}
                    maxLength={16}
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/[^0-9]/g, "") })}
                    placeholder="3573010101700003"
                    className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] text-xs num focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1B2420] mb-1">
                    Nomor WhatsApp / HP <span className="text-[#C62828]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={formData.hp}
                      onChange={(e) => {
                        const nextHp = e.target.value;
                        setFormData({ ...formData, hp: nextHp });
                        if (waCheck.checkedPhone !== nextHp.trim()) {
                          setWaCheck({ status: "idle" });
                        }
                      }}
                      placeholder="0812-3456-7890"
                      className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-[#E1E5E2] text-xs num focus:outline-none focus:border-[#0B5D3B]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyWa}
                      disabled={waCheck.status === "checking" || !trimmedHp}
                      className="h-10 px-3 rounded-xl border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#E6F2EC] text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {waCheck.status === "checking" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Cek...
                        </>
                      ) : (
                        "Verifikasi WA"
                      )}
                    </button>
                  </div>

                  {waCheck.status === "verified" && (
                    <p className="mt-1.5 text-[11px] font-semibold text-[#0B5D3B] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{waCheck.message}</span>
                    </p>
                  )}
                  {(waCheck.status === "invalid" || waCheck.status === "error") && (
                    <p className="mt-1.5 text-[11px] font-semibold text-[#C62828] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{waCheck.message}</span>
                    </p>
                  )}
                  {requiresWaVerification && waCheck.status === "idle" && (
                    <p className="mt-1.5 text-[11px] text-[#7A6110] font-medium">
                      Wajib klik <b>Verifikasi WA</b> terlebih dahulu sebelum menyimpan.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1B2420] mb-1">
                  Alamat Domisili Sesuai KTP <span className="text-[#C62828]">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Jl. HOS Cokroaminoto No. 45, Ponorogo"
                  className="w-full p-2.5 rounded-xl border border-[#E1E5E2] text-xs focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1B2420] mb-1">
                  No. Rekening Bank (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.noRek}
                  onChange={(e) => setFormData({ ...formData, noRek: e.target.value })}
                  placeholder="0034-556-7788 (BRI/BSI)"
                  className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] text-xs num focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-[#E1E5E2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#E1E5E2] text-xs font-semibold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitForm}
                  className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Menyimpan..." : isEditMode ? "Simpan Perubahan" : "Terbitkan No. CIF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
