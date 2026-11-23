"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { fmtRp, fmtBerat, formatDateIndo } from "@/lib/formatters";
import {
  kalkulasiHitcep,
  hitungNtItem,
} from "@/lib/hitcep";
import { DEFAULT_STLE } from "@/lib/formatters";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Send,
  Save,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Calculator,
  Coins,
  Info,
  Check,
  X,
} from "lucide-react";
import type {
  NasabahOption,
  FormItemBarang,
  PendingConfirmTx,
  SuccessResultData,
} from "./types";
import { HitcepSummaryPanel } from "./hitcep-summary";
import { DoubleConfirmModal } from "@/components/shared/double-confirm-modal";
import { ConfirmNasabahModal } from "./confirm-nasabah-modal";

export function TaksiranClient({
  initialNasabahs,
  initialCif,
  initialSbr = "",
  initialPendingConfirm = [],
  initialStle = DEFAULT_STLE,
}: {
  initialNasabahs: NasabahOption[];
  initialCif?: string;
  initialSbr?: string;
  initialPendingConfirm?: PendingConfirmTx[];
  initialStle?: number;
}) {
  const router = useRouter();
  const { user } = useAuth();

  // Wizard Step: 1 = Data Nasabah, 2 = Barang Jaminan, 3 = Kalkulasi HITCEP & Akad
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmExceedStatus, setConfirmExceedStatus] = useState<"Draft" | "Menunggu Pemutus" | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<SuccessResultData | null>(null);
  const [pendingConfirmList, setPendingConfirmList] = useState<PendingConfirmTx[]>(initialPendingConfirm);
  const [activeConfirmTx, setActiveConfirmTx] = useState<PendingConfirmTx | null>(null);
  const [confirmingNasabah, setConfirmingNasabah] = useState(false);

  // STLE Resmi Kantor (Standar Taksiran Logam Emas Lokal / Gram)
  const [stlePrice] = useState<number>(initialStle);

  // STEP 1: DATA NASABAH & SBR MANUAL (Format 7 digit: 0005215)
  const [noSbrManual, setNoSbrManual] = useState(initialSbr);
  const [nasabahQuery, setNasabahQuery] = useState("");
  const matchedInitial = initialCif
    ? initialNasabahs.find((n) => n.cif === initialCif)
    : null;
  const [selectedNasabah, setSelectedNasabah] = useState<NasabahOption | null>(
    matchedInitial || null
  );

  // STEP 2: BARANG JAMINAN (AWAL KOSONG HINGGA DIISI PENAKSIR)
  const [items, setItems] = useState<FormItemBarang[]>([
    {
      id: "item-1",
      jenis: "",
      karat: 22,
      jumlah: 1,
      beratKotor: 0,
      beratBersih: 0,
      kondisi: "Baik",
      nilaiTaksiran: 0,
    },
  ]);

  // STEP 3: KALKULASI RESMI DENGAN HITCEP
  const [pinjamanDimohon, setPinjamanDimohon] = useState<number>(0);
  const [keteranganGadai, setKeteranganGadai] = useState<string>("Baru");
  const [selectedOldSbr, setSelectedOldSbr] = useState<string>("");
  const [catatanAkad, setCatatanAkad] = useState("");

  // Jalankan Mesin Kalkulasi HITCEP
  const hitcep = kalkulasiHitcep(
    items.map((it) => ({ karat: it.karat, berat: it.beratBersih })),
    pinjamanDimohon,
    stlePrice
  );

  const totalBeratBersih = items.reduce((s, it) => s + (it.beratBersih || 0), 0);

  // Tanggal Akad & Jatuh Tempo (120 hari standar Rahn)
  const today = new Date();
  const jatuhTempo = new Date();
  jatuhTempo.setDate(today.getDate() + 120);

  const tglAkadStr = formatDateIndo(today);
  const tglJatuhStr = formatDateIndo(jatuhTempo);

  const selectedOldTx =
    selectedOldSbr && selectedNasabah?.transaksi
      ? selectedNasabah.transaksi.find((t) => t.sbr === selectedOldSbr) || null
      : null;

  // Handle Copy Barang dari SBR Lama (Topup / Perpanjangan / Tebus Sebagian / Turun Plafon)
  const handleSelectOldSbr = (oldSbr: string, modeOverride?: string) => {
    const mode = modeOverride ?? keteranganGadai;
    setSelectedOldSbr(oldSbr);
    if (!oldSbr || !selectedNasabah?.transaksi) return;

    const matchedTx = selectedNasabah.transaksi.find((t) => t.sbr === oldSbr);
    if (matchedTx && matchedTx.barang && matchedTx.barang.length > 0) {
      const clonedItems: FormItemBarang[] = matchedTx.barang.map((b, idx) => {
        const karatNum = typeof b.karat === "string" ? parseInt(b.karat.replace(/\D/g, "")) || 22 : Number(b.karat);
        return {
          id: `item-clone-${Date.now()}-${idx}`,
          jenis: b.jenis,
          karat: karatNum,
          jumlah: b.jumlah || 1,
          beratKotor: b.beratKotor,
          beratBersih: b.beratBersih,
          kondisi: mode === "Tebus Sebagian" ? "Sisa Jaminan Tertinggal" : "Agunan Tersimpan di Khazanah",
          nilaiTaksiran: hitungNtItem(karatNum, b.beratBersih, stlePrice),
        };
      });

      setItems(clonedItems);
      const newTotalNt = clonedItems.reduce((s, it) => s + it.nilaiTaksiran, 0);

      if (mode === "Perpanjangan") {
        setPinjamanDimohon(matchedTx.marhunBih);
      } else if (mode === "Turun Plafon") {
        // Default turunkan 20% atau set ke 80% dari pinjaman lama
        setPinjamanDimohon(Math.round(matchedTx.marhunBih * 0.8));
      } else if (mode === "Topup") {
        // Plafon bisa dinaikkan ke 94% dari taksiran baru
        setPinjamanDimohon(Math.round(newTotalNt * 0.94));
      } else {
        setPinjamanDimohon(Math.round(newTotalNt * 0.94));
      }

      setCatatanAkad(`Referensi SBR Lama: ${oldSbr} (${mode} — Pinjaman Asal: ${fmtRp(matchedTx.marhunBih)})`);
    }
  };

  // Tambah Item Barang Jaminan
  const handleAddItem = () => {
    const newItem: FormItemBarang = {
      id: `item-${Date.now()}`,
      jenis: "",
      karat: 22,
      jumlah: 1,
      beratKotor: 0,
      beratBersih: 0,
      kondisi: "Baik",
      nilaiTaksiran: 0,
    };
    const next = [...items, newItem];
    setItems(next);
  };

  // Update Item Barang Jaminan
  const handleUpdateItem = (id: string, field: keyof FormItemBarang, value: string | number) => {
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, [field]: value };
      if (field === "karat" || field === "beratBersih") {
        next.nilaiTaksiran = hitungNtItem(
          field === "karat" ? Number(value) || 0 : next.karat,
          field === "beratBersih" ? Number(value) || 0 : next.beratBersih,
          stlePrice
        );
      }
      return next;
    });
    setItems(updated);
  };

  // Hapus Item Barang
  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) {
      setFormError("Minimal harus ada 1 item barang jaminan emas.");
      return;
    }
    setFormError(null);
    const next = items.filter((it) => it.id !== id);
    setItems(next);
  };

  // Validasi Step 1
  const validateStep1 = () => {
    if (!noSbrManual.trim()) {
      setFormError("Nomor SBR wajib diisi oleh penaksir.");
      return false;
    }
    if (!selectedNasabah) {
      setFormError("Silakan pilih nasabah terdaftar dari direktori CBS Pusat.");
      return false;
    }
    if (keteranganGadai !== "Baru" && !selectedOldSbr) {
      setFormError(`Untuk transaksi "${keteranganGadai}", silakan pilih Nomor SBR Lama milik nasabah terlebih dahulu.`);
      return false;
    }
    setFormError(null);
    return true;
  };

  // Validasi Step 2
  const validateStep2 = () => {
    if (items.length === 0) {
      setFormError("Masukkan minimal 1 barang jaminan.");
      return false;
    }
    for (const it of items) {
      if (!it.jenis.trim()) {
        setFormError("Nama/jenis perhiasan tidak boleh kosong.");
        return false;
      }
      if (!it.jumlah || it.jumlah < 1) {
        setFormError(`Jumlah unit pada "${it.jenis}" minimal 1 pcs.`);
        return false;
      }
      if (!it.karat || it.karat < 8 || it.karat > 24) {
        setFormError(`Kadar karat pada "${it.jenis}" harus antara 8 sampai 24 Karat.`);
        return false;
      }
      if (it.beratBersih <= 0) {
        setFormError(`Berat bersih untuk item "${it.jenis}" tidak boleh 0 gram.`);
        return false;
      }
      if (it.beratBersih > it.beratKotor) {
        setFormError(`Berat bersih tidak boleh melebihi berat kotor pada item "${it.jenis}".`);
        return false;
      }
    }
    setFormError(null);
    return true;
  };

  // Eksekusi Submit Transaksi ke Backend
  const executeSubmitTransaksi = async (status: "Draft" | "Menunggu Pemutus") => {
    setConfirmExceedStatus(null);
    setFormError(null);

    if (keteranganGadai === "Topup" && selectedOldTx && pinjamanDimohon <= selectedOldTx.marhunBih) {
      setFormError(
        `Pada mode Top-up, pinjaman baru harus lebih besar dari pokok SBR lama (${fmtRp(selectedOldTx.marhunBih)}).`
      );
      return;
    }
    if (keteranganGadai === "Turun Plafon" && selectedOldTx && pinjamanDimohon >= selectedOldTx.marhunBih) {
      setFormError(
        `Pada mode Turun Plafon, pinjaman baru harus lebih kecil dari pokok SBR lama (${fmtRp(selectedOldTx.marhunBih)}).`
      );
      return;
    }

    const hasLowWeightRatio = items.some(
      (it) => it.beratKotor > 0 && it.beratBersih < it.beratKotor * 0.8
    );
    const toleranceNote = hasLowWeightRatio
      ? " [PERHATIAN: Berat bersih < 80% berat kotor]"
      : "";
    const hitcepNote = `[HITCEP: Wewenang ${hitcep.wewenangPemutus}, Selisih PPAP ${fmtRp(
      hitcep.selisihPpap
    )}]${toleranceNote}`;

    setSubmitting(true);
    try {
      const payload = {
        sbr: noSbrManual.trim(),
        cif: selectedNasabah?.cif,
        nama: selectedNasabah?.nama,
        nik: selectedNasabah?.nik,
        hp: selectedNasabah?.hp,
        alamat: selectedNasabah?.alamat,
        noRek: selectedNasabah?.noRek,
        noKontrak: selectedNasabah?.noKontrak,
        barang: items,
        marhunBih: pinjamanDimohon,
        ujroh: hitcep.ujroh4Bulan,
        biayaAdmin: hitcep.biayaAdmin,
        nominalBersih: pinjamanDimohon - hitcep.biayaAdmin,
        tanggalAkad: tglAkadStr,
        tanggalJatuhTempo: tglJatuhStr,
        keteranganGadai,
        akadAsal: selectedOldSbr || null,
        kantor: user.branch,
        petugasPenaksir: user.name,
        catatan: catatanAkad ? `${catatanAkad} | ${hitcepNote}` : hitcepNote,
        status,
      };

      const res = await fetch("/api/transaksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!result.success) {
        setFormError(result.error || "Gagal menyimpan transaksi.");
        setSubmitting(false);
        return;
      }

      setSuccessResult({
        sbr: noSbrManual,
        nama: payload.nama || "",
        marhunBih: pinjamanDimohon,
        status,
        wewenang: hitcep.wewenangPemutus,
        kewajiban: hitcep.totalKewajiban,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
    } catch {
      setFormError("Terjadi kesalahan koneksi saat menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Validasi & Konfirmasi sebelum Submit
  const handleSubmitTransaksi = async (status: "Draft" | "Menunggu Pemutus") => {
    if (!validateStep1() || !validateStep2()) return;

    if (!pinjamanDimohon || pinjamanDimohon <= 0 || isNaN(pinjamanDimohon)) {
      setFormError("Uang Pinjaman Dimohon (Marhun Bih) harus lebih besar dari Rp 0.");
      return;
    }

    if (pinjamanDimohon <= hitcep.biayaAdmin) {
      setFormError(
        `Uang Pinjaman (${fmtRp(pinjamanDimohon)}) harus lebih besar dari Biaya Administrasi (${fmtRp(
          hitcep.biayaAdmin
        )}).`
      );
      return;
    }

    if (pinjamanDimohon > hitcep.upMaks) {
      setConfirmExceedStatus(status);
      return;
    }

    if (status === "Menunggu Pemutus") {
      setConfirmSubmitOpen(true);
      return;
    }

    await executeSubmitTransaksi(status);
  };

  // Konfirmasi Putusan Pemutus ke Nasabah langsung dari halaman Penaksir
  const handleConfirmNasabahFromTaksiran = async (sbr: string, setuju: boolean) => {
    setConfirmingNasabah(true);
    setFormError(null);
    try {
      const res = await fetch("/api/transaksi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr,
          action: setuju ? "CONFIRM_NASABAH" : "CANCEL_NASABAH",
          user: user?.name || "Ahmad Hidayat",
          alasan: setuju ? undefined : "Nasabah menolak nominal taksiran/ketentuan pemutus di loket.",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || "Gagal memproses konfirmasi nasabah.");
        return;
      }
      setPendingConfirmList((prev) => prev.filter((item) => item.sbr !== sbr));
      setActiveConfirmTx(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
      router.refresh();
    } catch {
      setFormError("Terjadi kesalahan jaringan saat konfirmasi nasabah.");
    } finally {
      setConfirmingNasabah(false);
    }
  };

  return (
    <AppShell>
      {/* MODAL PEMBACAAN PUTUSAN PEMUTUS KE NASABAH */}
      {activeConfirmTx && (
        <ConfirmNasabahModal
          tx={activeConfirmTx}
          confirming={confirmingNasabah}
          onClose={() => setActiveConfirmTx(null)}
          onConfirm={handleConfirmNasabahFromTaksiran}
        />
      )}

      {/* MODAL VERIFIKASI 2 KALI SEBELUM KIRIM KE PEMUTUS */}
      <DoubleConfirmModal
        open={confirmSubmitOpen}
        title="Periksa Seluruh Data Sebelum Diajukan"
        subtitle="Pastikan seluruh data nasabah, barang jaminan, dan kalkulasi HITCEP berikut sudah benar."
        sections={[
          {
            title: "Data Nasabah & Berkas",
            items: [
              { label: "No. SBR", value: noSbrManual },
              { label: "CIF", value: selectedNasabah?.cif || "-" },
              { label: "Nama Nasabah", value: selectedNasabah?.nama || "-" },
              { label: "NIK", value: selectedNasabah?.nik || "-" },
              { label: "No. HP / WA", value: selectedNasabah?.hp || "-" },
              { label: "Alamat", value: selectedNasabah?.alamat || "-" },
              { label: "Jenis Pengajuan", value: keteranganGadai },
            ],
          },
          {
            title: `Barang Jaminan (${items.length} Item)`,
            items: items.map((it, idx) => ({
              label: `${idx + 1}. ${it.jenis} (${it.karat}K · ${it.jumlah || 1}x)`,
              value: `Kotor ${it.beratKotor}g / Bersih ${it.beratBersih}g · ${fmtRp(it.nilaiTaksiran)}`,
            })),
          },
          {
            title: "Rincian Akad & HITCEP",
            items: [
              { label: "Total Taksiran", value: fmtRp(hitcep.totalTaksiran) },
              { label: "Uang Pinjaman (Marhun Bih)", value: fmtRp(pinjamanDimohon), highlight: true },
              { label: "Ujroh (4 Bulan)", value: fmtRp(hitcep.ujroh4Bulan) },
              { label: "Biaya Admin", value: fmtRp(hitcep.biayaAdmin) },
              {
                label: "Nominal Bersih Diterima",
                value: fmtRp(Math.max(0, pinjamanDimohon - hitcep.biayaAdmin)),
                highlight: true,
              },
              { label: "Tanggal Akad – Jatuh Tempo", value: `${tglAkadStr} s.d. ${tglJatuhStr}` },
              { label: "Tujuan Otorisasi", value: hitcep.wewenangPemutus },
              { label: "Catatan", value: catatanAkad.trim() || "-" },
            ],
          },
        ]}
        confirmLabel={`Ajukan ke ${hitcep.wewenangPemutus}`}
        submitting={submitting}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={async () => {
          setConfirmSubmitOpen(false);
          await executeSubmitTransaksi("Menunggu Pemutus");
        }}
      />

      {/* MODAL KONFIRMASI MELEBIHI UP MAKS 94% */}
      {confirmExceedStatus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF8E1] text-[#B7791F] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#1B2420]">
                  Pinjaman Melebihi UP Maks 94%
                </h3>
                <p className="text-xs text-[#5F6B65] mt-1 leading-relaxed">
                  Uang pinjaman dimohon (<b className="text-[#1B2420] num">{fmtRp(pinjamanDimohon)}</b>) melebihi batas maksimal 94% (<b className="text-[#0B5D3B] num">{fmtRp(hitcep.upMaks)}</b>). Berkas akan membutuhkan otorisasi khusus <b className="text-[#1B2420]">{hitcep.wewenangPemutus}</b>.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmExceedStatus(null)}
                className="h-9 px-4 rounded-xl border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeSubmitTransaksi(confirmExceedStatus)}
                className="h-9 px-4 rounded-xl bg-[#B7791F] hover:bg-[#996317] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Lanjutkan Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PAGE DENGAN BADGE HITCEP RESMI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-[#1B2420] tracking-tight">
              Input Transaksi &amp; Taksiran Emas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF3D6] text-[#7A6110] border border-[#C9A227]/40 flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              Model HITCEP Baku
            </span>
          </div>
          <p className="text-sm text-[#5F6B65] mt-1">
            Kalkulasi akurat sesuai rumus STLE, Plafon 94%, Ujroh Berjenjang, PPAP Risiko, dan Wewenang Pemutus.
          </p>
        </div>
      </div>

      {/* NON-BLOCKING SUCCESS NOTIFICATION CARD */}
      {successResult && (
        <div className="mt-5 p-5 rounded-2xl bg-[#E6F2EC] border border-[#0B5D3B]/30 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B5D3B] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-[#084530]">
                    Pengajuan Berhasil Disimpan ({successResult.status})
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-[#0B5D3B]/20 text-[11px] font-mono font-extrabold text-[#0B5D3B]">
                    SBR: {successResult.sbr}
                  </span>
                </div>
                <p className="text-xs text-[#1B2420]">
                  Nasabah <b>{successResult.nama}</b> · UP:{" "}
                  <b className="text-[#0B5D3B] num">{fmtRp(successResult.marhunBih)}</b> · Kewajiban 4 Bln:{" "}
                  <b className="num">{fmtRp(successResult.kewajiban)}</b> · Wewenang:{" "}
                  <b className="text-[#7A6110]">{successResult.wewenang}</b>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  router.refresh();
                  router.push("/monitoring");
                }}
                className="h-9 px-3.5 rounded-xl bg-[#0B5D3B] text-white text-xs font-bold hover:bg-[#084530] cursor-pointer shadow-xs"
              >
                Lihat di Monitoring
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  const nextNum = (parseInt(noSbrManual, 10) || 5690) + 1;
                  setNoSbrManual(String(nextNum).padStart(7, "0"));
                  router.refresh();
                  setStep(1);
                  setItems([
                    {
                      id: `item-${Date.now()}`,
                      jenis: "",
                      karat: 22,
                      jumlah: 1,
                      beratKotor: 0,
                      beratBersih: 0,
                      kondisi: "Baik",
                      nilaiTaksiran: 0,
                    },
                  ]);
                  setPinjamanDimohon(0);
                  setSelectedOldSbr("");
                  setKeteranganGadai("Baru");
                  setCatatanAkad("");
                  router.refresh();
                }}
                className="h-9 px-3.5 rounded-xl bg-white border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#F6F7F5] text-xs font-bold cursor-pointer"
              >
                Input Transaksi Lain
              </button>
              <button
                type="button"
                onClick={() => setSuccessResult(null)}
                aria-label="Tutup notifikasi"
                className="w-9 h-9 rounded-xl text-[#084530]/70 hover:text-[#084530] hover:bg-white/60 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTREAN PUTUSAN PEMUTUS SIAP DIBACAKAN KE NASABAH */}
      {pendingConfirmList.length > 0 && (
        <div className="mt-5 p-4 rounded-2xl bg-[#FBF3D6]/70 border border-[#C9A227]/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[#7A6110] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0B5D3B]" />
              Putusan Pemutus Siap Dibacakan ke Nasabah ({pendingConfirmList.length} Berkas)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingConfirmList.map((tx) => (
              <div
                key={tx.sbr}
                className="p-3 rounded-xl bg-white border border-[#C9A227]/30 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#1B2420] truncate">
                    <span className="font-mono text-[#084530]">{tx.sbr}</span> · {tx.nama}
                  </p>
                  <p className="text-[11px] text-[#5F6B65] num">
                    UP: <b className="text-[#0B5D3B]">{fmtRp(tx.marhunBih)}</b> · Bersih:{" "}
                    <b>{fmtRp(tx.nominalBersih)}</b>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveConfirmTx(tx)}
                  className="h-8 px-3 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Bacakan &amp; Konfirmasi
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WIZARD STEPPER BAR */}
      <div className="mt-6 bg-white rounded-2xl border border-[#E1E5E2] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Step 1 */}
          <div
            onClick={() => setStep(1)}
            className={`flex items-center gap-3 cursor-pointer ${
              step === 1 ? "opacity-100" : "opacity-60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 1
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] border border-[#E1E5E2]"
              }`}
            >
              1
            </div>
            <div>
              <p className="text-xs font-bold text-[#1B2420]">Data Nasabah</p>
              <p className="text-[11px] text-[#5F6B65]">No. SBR &amp; Identitas CIF</p>
            </div>
          </div>

          <div className="hidden sm:block w-12 h-0.5 bg-[#E1E5E2]" />

          {/* Step 2 */}
          <div
            onClick={() => {
              if (validateStep1()) setStep(2);
            }}
            className={`flex items-center gap-3 cursor-pointer ${
              step === 2 ? "opacity-100" : "opacity-60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 2
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] border border-[#E1E5E2]"
              }`}
            >
              2
            </div>
            <div>
              <p className="text-xs font-bold text-[#1B2420]">Taksiran Emas (NT)</p>
              <p className="text-[11px] text-[#5F6B65]">Rumus (Karat/24) × Berat × STLE</p>
            </div>
          </div>

          <div className="hidden sm:block w-12 h-0.5 bg-[#E1E5E2]" />

          {/* Step 3 */}
          <div
            onClick={() => {
              if (validateStep1() && validateStep2()) setStep(3);
            }}
            className={`flex items-center gap-3 cursor-pointer ${
              step === 3 ? "opacity-100" : "opacity-60"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 3
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] border border-[#E1E5E2]"
              }`}
            >
              3
            </div>
            <div>
              <p className="text-xs font-bold text-[#1B2420]">Kalkulasi HITCEP &amp; Akad</p>
              <p className="text-[11px] text-[#5F6B65]">UP 94%, Ujroh Tiering &amp; PPAP</p>
            </div>
          </div>
        </div>
      </div>

      {/* DUA KOLOM: FORM WIZARD (KIRI 8 KOLOM) & RINGKASAN REAL-TIME HITCEP (KANAN 4 KOLOM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* PANEL KIRI: FORM STEP */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E1E5E2] p-6 shadow-xs">
          {formError && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FDECEC] border border-[#C62828]/30 flex items-start justify-between gap-3 text-xs text-[#C62828]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                aria-label="Tutup pesan kesalahan"
                className="text-[#C62828]/70 hover:text-[#C62828] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* STEP 1: DATA NASABAH & NO SBR MANUAL */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="border-b border-[#E1E5E2] pb-3">
                <h3 className="text-base font-bold text-[#1B2420]">
                  Langkah 1: Identitas Nasabah &amp; Nomor SBR
                </h3>
                <p className="text-xs text-[#5F6B65] mt-0.5">
                  Nomor SBR diisi manual sesuai blangko fisik resmi yang dipegang penaksir.
                </p>
              </div>

              {/* Input Nomor SBR Manual */}
              <div className="p-4 rounded-xl bg-[#FBF3D6]/60 border border-[#C9A227]/40">
                <label className="block text-xs font-extrabold text-[#084530] mb-1">
                  Nomor Seri SBR Manual (Wajib Unik) <span className="text-[#C62828]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={noSbrManual}
                    onChange={(e) => setNoSbrManual(e.target.value.toUpperCase())}
                    placeholder="0005215"
                    className="w-full h-10 px-3.5 rounded-xl border border-[#C9A227] bg-white text-sm font-extrabold text-[#1B2420] num focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
                <p className="text-[11px] text-[#7A6110] mt-1.5 leading-relaxed">
                  Nomor ini dicetak pada blangko fisik SBR dan terikat sejak disimpan pertama kali.
                </p>
              </div>

              {/* Info Sinkronisasi CIF Pusat */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#E6F2EC] border border-[#0B5D3B]/20 text-xs">
                <span className="text-[#084530] font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#0B5D3B] shrink-0" />
                  Data Nasabah disinkronkan langsung dari Core Banking System (CBS) Pusat.
                </span>
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="px-3 py-1 rounded-lg bg-[#0B5D3B] text-white text-[11px] font-bold hover:bg-[#084530] cursor-pointer"
                >
                  Segarkan CIF
                </button>
              </div>

              {/* Mode Pilih Nasabah Terdaftar */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#5F6B65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nasabahQuery}
                    onChange={(e) => setNasabahQuery(e.target.value)}
                    placeholder="Ketik nama atau No. KTP nasabah..."
                    className="w-full h-10 pl-10 pr-3 rounded-xl border border-[#E1E5E2] text-xs bg-white focus:outline-none focus:border-[#0B5D3B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                  {initialNasabahs
                    .filter(
                      (n) =>
                        nasabahQuery === "" ||
                        n.nama.toLowerCase().includes(nasabahQuery.toLowerCase()) ||
                        n.nik.includes(nasabahQuery)
                    )
                    .map((n) => {
                      const isSelected = selectedNasabah?.cif === n.cif;
                      return (
                        <div
                          key={n.cif}
                          onClick={() => {
                            setSelectedNasabah(n);
                            setSelectedOldSbr("");
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#E6F2EC] border-[#0B5D3B] shadow-xs"
                              : "bg-white border-[#E1E5E2] hover:bg-[#F6F7F5]"
                          }`}
                        >
                          <p className="font-bold text-[#1B2420] text-xs">{n.nama}</p>
                          <div className="flex items-center justify-between text-[11px] mt-0.5">
                            <span className="text-[#0B5D3B] font-bold num">CIF: {n.cif}</span>
                            <span className="text-[#5F6B65] font-mono text-[10px]">KTR: {n.noKontrak || "-"}</span>
                          </div>
                          <p className="text-[11px] text-[#5F6B65] num mt-0.5">
                            KTP: {n.nik}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Pilih Jenis Transaksi & Referensi SBR Lama (Dipindah ke Paling Atas Step 1) */}
              <div className="p-4 rounded-xl bg-[#E6F2EC]/60 border border-[#0B5D3B]/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#084530] mb-1">
                      Keterangan Jenis Gadai <span className="text-[#C62828]">*</span>
                    </label>
                    <select
                      value={keteranganGadai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setKeteranganGadai(val);
                        if (val === "Baru") {
                          setSelectedOldSbr("");
                        } else if (selectedOldSbr) {
                          handleSelectOldSbr(selectedOldSbr, val);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-[#0B5D3B] bg-white text-xs font-bold text-[#1B2420] focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                    >
                      <option value="Baru">1. Gadai Baru (Emas Baru Diuji)</option>
                      <option value="Topup">2. Top-up (Penambahan Plafon)</option>
                      <option value="Perpanjangan">3. Perpanjangan (Rollover 120 Hari)</option>
                      <option value="Tebus Sebagian">4. Tebus Sebagian (Ambil Sebagian Emas)</option>
                      <option value="Turun Plafon">5. Turun Plafon (Angsuran Pokok)</option>
                    </select>
                  </div>

                  {keteranganGadai !== "Baru" && (
                    <div>
                      <label className="block font-bold text-[#084530] mb-1">
                        Pilih Nomor SBR Lama <span className="text-[#C62828]">*</span>
                      </label>
                      <select
                        value={selectedOldSbr}
                        onChange={(e) => handleSelectOldSbr(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-[#C9A227] bg-white text-xs font-bold text-[#1B2420] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                      >
                        <option value="">-- Pilih SBR Aktif Nasabah --</option>
                        {(() => {
                          const activeTxs =
                            selectedNasabah?.transaksi?.filter(
                              (tx) => !["Draft", "Dibatalkan", "Lunas", "Lelang"].includes(tx.status)
                            ) || [];
                          return activeTxs.length > 0 ? (
                            activeTxs.map((tx) => (
                              <option key={tx.sbr} value={tx.sbr}>
                                {tx.sbr} ({tx.status}) — Pinjaman: {fmtRp(tx.marhunBih)}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              Nasabah ini belum memiliki SBR aktif
                            </option>
                          );
                        })()}
                      </select>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-[#084530] font-medium pt-2 border-t border-[#0B5D3B]/20 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0B5D3B] shrink-0" />
                  <span>
                    {keteranganGadai === "Baru" && "Mode Gadai Baru: Input fisik emas baru dari nol di Langkah 2."}
                    {keteranganGadai === "Perpanjangan" && "Mode Perpanjangan: Agunan di khazanah terkunci, pokok pinjaman sama persis dengan SBR lama."}
                    {keteranganGadai === "Topup" && "Mode Top-up: Agunan lama dimuat, kalkulasi selisih penambahan plafon baru."}
                    {keteranganGadai === "Tebus Sebagian" && "Mode Tebus Sebagian: Hapus barang yang diambil pulang, sisakan agunan baru."}
                    {keteranganGadai === "Turun Plafon" && "Mode Turun Plafon: Agunan utuh, sesuaikan turun pinjaman di Langkah 3."}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E1E5E2] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  Lanjut ke Taksiran Emas
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: TAKSIRAN BARANG JAMINAN DENGAN RUMUS 1 (NT = (Karat/24) * Berat * STLE) */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1E5E2] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#1B2420]">
                    Langkah 2: Taksiran Fisik Barang Jaminan (Marhun)
                  </h3>
                  <p className="text-xs text-[#5F6B65] mt-0.5">
                    Rumus Baku: <b>NT = (Karat / 24) × Berat Bersih (g) × STLE</b>
                  </p>
                </div>
                {/* Display STLE Resmi Kantor (Read-Only) */}
                <div className="flex items-center gap-2 bg-[#F6F7F5] px-3.5 py-1.5 rounded-xl border border-[#E1E5E2]">
                  <span className="text-[11px] font-bold text-[#5F6B65]">STLE Resmi Kantor:</span>
                  <span className="text-xs font-extrabold text-[#0B5D3B] num font-mono">
                    {fmtRp(stlePrice)} / gram
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E6F2EC] text-[#084530] font-bold border border-[#0B5D3B]/20">
                    Terkunci
                  </span>
                </div>
              </div>

              {/* Status Sumber Barang */}
              {selectedOldSbr && (
                <div className="p-3.5 rounded-xl bg-[#FBF3D6]/70 border border-[#C9A227]/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#C9A227]" />
                    <span className="text-xs font-bold text-[#1B2420]">
                      Barang disalin dari SBR Lama: <b>{selectedOldSbr}</b> ({keteranganGadai})
                    </span>
                  </div>
                  <span className="text-[11px] text-[#7A6110] font-semibold">
                    Agunan Tersimpan di Khazanah
                  </span>
                </div>
              )}

              {/* Tabel Daftar Barang Jaminan (Jika Perpanjangan, Read-Only; Jika Baru/Topup, Editable) */}
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="p-4 rounded-xl border border-[#E1E5E2] bg-[#F6F7F5]/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#0B5D3B]">
                          Barang #{idx + 1} {keteranganGadai === "Perpanjangan" && "(Agunan Tersimpan di Khazanah - Terkunci)"}
                        </span>
                        {it.beratKotor > 0 && it.beratBersih < it.beratKotor * 0.8 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#B7791F] border border-[#B7791F]/30 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Berat bersih &lt; 80% kotor
                          </span>
                        )}
                      </div>
                      {items.length > 1 && keteranganGadai !== "Perpanjangan" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(it.id)}
                          className="text-[#C62828] hover:text-[#A81F1F] text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      {/* Jenis Perhiasan */}
                      <div className="sm:col-span-3">
                        <label className="block font-bold text-[#1B2420] mb-1">
                          Jenis Perhiasan <span className="text-[#C62828]">*</span>
                        </label>
                        <input
                          type="text"
                          disabled={keteranganGadai === "Perpanjangan"}
                          value={it.jenis}
                          onChange={(e) => handleUpdateItem(it.id, "jenis", e.target.value)}
                          placeholder="Misal: Cincin Solitaire, Kalung Nori"
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E1E5E2] bg-white text-xs font-semibold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5]"
                        />
                      </div>

                      {/* Jumlah Unit (Pcs) */}
                      <div className="sm:col-span-1">
                        <label className="block font-bold text-[#1B2420] mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          disabled={keteranganGadai === "Perpanjangan"}
                          value={it.jumlah || ""}
                          onChange={(e) =>
                            handleUpdateItem(it.id, "jumlah", parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full h-9 px-2 rounded-lg border border-[#E1E5E2] bg-white text-xs font-bold text-[#1B2420] num text-center focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5]"
                        />
                      </div>

                      {/* Kadar Karat */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#1B2420] mb-1">
                          Kadar Karat (K) <span className="text-[#C62828]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={8}
                            max={24}
                            disabled={keteranganGadai === "Perpanjangan"}
                            value={it.karat || ""}
                            onChange={(e) => handleUpdateItem(it.id, "karat", parseInt(e.target.value, 10) || 0)}
                            placeholder="8–24"
                            className={`w-full h-9 pl-2.5 pr-7 rounded-lg border bg-white text-xs font-bold text-[#1B2420] num focus:outline-none disabled:bg-[#F6F7F5] ${
                              it.karat > 0 && (it.karat < 8 || it.karat > 24)
                                ? "border-[#C62828] text-[#C62828] focus:border-[#C62828]"
                                : "border-[#E1E5E2] focus:border-[#0B5D3B]"
                            }`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#5F6B65] pointer-events-none">
                            K
                          </span>
                        </div>
                        {it.karat > 0 && (it.karat < 8 || it.karat > 24) && (
                          <p className="text-[10px] font-bold text-[#C62828] mt-1">
                            Harus 8 – 24 K
                          </p>
                        )}
                      </div>

                      {/* Berat Kotor */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#1B2420] mb-1">
                          Kotor (g)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={keteranganGadai === "Perpanjangan"}
                          value={it.beratKotor || ""}
                          placeholder="0"
                          onChange={(e) =>
                            handleUpdateItem(it.id, "beratKotor", parseFloat(e.target.value) || 0)
                          }
                          className="w-full h-9 px-2.5 rounded-lg border border-[#E1E5E2] bg-white text-xs num focus:outline-none focus:border-[#0B5D3B] disabled:bg-[#F6F7F5]"
                        />
                      </div>

                      {/* Berat Bersih */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#1B2420] mb-1">
                          Bersih (g)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={keteranganGadai === "Perpanjangan"}
                          value={it.beratBersih || ""}
                          placeholder="0"
                          onChange={(e) =>
                            handleUpdateItem(it.id, "beratBersih", parseFloat(e.target.value) || 0)
                          }
                          className="w-full h-9 px-2.5 rounded-lg border border-[#C9A227] bg-white text-xs font-extrabold num focus:outline-none focus:ring-1 focus:ring-[#C9A227] disabled:bg-[#F6F7F5]"
                        />
                      </div>

                      {/* Nilai Taksiran Item */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#1B2420] mb-1">
                          Nilai Taksir (NT)
                        </label>
                        <div className="h-9 px-2.5 rounded-lg bg-[#E6F2EC] flex items-center text-xs font-extrabold text-[#0B5D3B] num truncate">
                          {fmtRp(it.nilaiTaksiran)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {keteranganGadai !== "Perpanjangan" && keteranganGadai !== "Tebus Sebagian" && (
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="h-8 px-3 rounded-xl bg-[#E6F2EC] text-[#0B5D3B] hover:bg-[#0B5D3B] hover:text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Item Barang
                  </button>
                </div>
              )}

              {keteranganGadai === "Tebus Sebagian" && (
                <div className="p-3 rounded-lg bg-[#FFF8E1] border border-[#B7791F]/30 text-xs text-[#7A6110] font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#B7791F] shrink-0" />
                  <span>
                    Tombol tambah barang dinonaktifkan untuk transaksi Tebus Sebagian. Silakan hapus item yang dibawa pulang oleh nasabah.
                  </span>
                </div>
              )}

              {/* Banner Aturan Toleransi Berat Timbangan */}
              <div className="p-3.5 rounded-xl bg-[#FFF8E1] border border-[#B7791F]/30 flex items-start gap-2.5 text-xs text-[#7A6110]">
                <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
                <p>
                  <b>Standar Toleransi Syariah:</b> Berat bersih marhun emas harus{" "}
                  <b>&ge; 80% dari berat kotor</b>. Jika ada kotoran/permata lebih dari 20%, berkas
                  wajib diverifikasi dan disetujui oleh Pejabat Pemutus.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E1E5E2] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-10 px-4 rounded-xl border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  Lanjut ke Kalkulasi HITCEP
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: KALKULASI HITCEP RESMI (RUMUS 2, 3, 4, 5, 6) */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="border-b border-[#E1E5E2] pb-3">
                <h3 className="text-base font-bold text-[#1B2420]">
                  Langkah 3: Kalkulasi HITCEP &amp; Evaluasi Risiko Akad
                </h3>
                <p className="text-xs text-[#5F6B65] mt-0.5">
                  Menerapkan UP Maks 94%, Ujroh Berjenjang 4 Bulan, Cadangan PPAP 85%, dan Uji Wewenang Pemutus.
                </p>
              </div>

              {/* Rincian Parameter Taksiran & UP Maks (Rumus 2) */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2]">
                  <span className="text-[#5F6B65]">Total Nilai Taksiran (NT):</span>
                  <p className="text-lg font-extrabold text-[#1B2420] num mt-0.5">
                    {fmtRp(hitcep.totalTaksiran)}
                  </p>
                  <p className="text-[11px] text-[#5F6B65] num">
                    {items.length} item barang · {fmtBerat(totalBeratBersih)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#E6F2EC] border border-[#0B5D3B]/20">
                  <span className="text-[#0B5D3B] font-bold">Maksimum Plafond / UP Maks (94%):</span>
                  <p className="text-lg font-extrabold text-[#0B5D3B] num mt-0.5">
                    {fmtRp(hitcep.upMaks)}
                  </p>
                  <p className="text-[11px] text-[#084530]">Safety Net Manrisk 94%</p>
                </div>
              </div>

              {/* Input Pinjaman Dimohon (UP Kewenangan) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#1B2420]">
                    Uang Pinjaman Dimohon (UP Kewenangan) <span className="text-[#C62828]">*</span>
                  </label>
                  {!hitcep.isUpValid && (
                    <span className="text-xs font-bold text-[#C62828] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Melebihi UP Maks 94%!
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="50000"
                    disabled={keteranganGadai === "Perpanjangan"}
                    value={pinjamanDimohon || ""}
                    placeholder="0"
                    onChange={(e) => setPinjamanDimohon(parseFloat(e.target.value) || 0)}
                    className={`w-full h-11 px-3.5 rounded-xl border bg-white text-base font-extrabold num focus:outline-none focus:ring-2 disabled:bg-[#F6F7F5] disabled:text-[#5F6B65] ${
                      !hitcep.isUpValid
                        ? "border-[#C62828] text-[#C62828] focus:ring-[#C62828]/20"
                        : "border-[#0B5D3B] text-[#0B5D3B] focus:ring-[#0B5D3B]/20"
                    }`}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#0B5D3B] font-mono font-bold">
                    Terbilang: {fmtRp(pinjamanDimohon)}
                  </span>
                  {keteranganGadai !== "Perpanjangan" && (
                    <button
                      type="button"
                      onClick={() => setPinjamanDimohon(hitcep.upMaks)}
                      className="text-[#0B5D3B] font-bold hover:underline cursor-pointer text-[11px]"
                    >
                      Gunakan UP Maks (94%)
                    </button>
                  )}
                </div>
                {keteranganGadai === "Perpanjangan" && (
                  <p className="text-[11px] text-[#5F6B65] mt-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#5F6B65] shrink-0" />
                    <span>Pada akad Perpanjangan, pokok pinjaman dikunci sama persis dengan SBR lama.</span>
                  </p>
                )}
              </div>

              {/* KARTU EVALUASI PPAP & WEWENANG PEMUTUS (RUMUS 5 & 6) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Evaluasi PPAP */}
                <div className="p-3.5 rounded-xl border border-[#E1E5E2] bg-[#F6F7F5] space-y-1">
                  <span className="font-bold text-[#1B2420] flex items-center gap-1.5">
                    {hitcep.isPpapCovered ? (
                      <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-[#C62828]" />
                    )}
                    Evaluasi Cadangan PPAP (85% NT)
                  </span>
                  <p className="text-[#5F6B65]">
                    Taksiran 85%: <b className="text-[#1B2420] num">{fmtRp(hitcep.taksiran85Persen)}</b>
                  </p>
                  <p className="text-[#5F6B65]">
                    Selisih PPAP:{" "}
                    <b className={hitcep.isPpapCovered ? "text-[#2E7D32] num" : "text-[#C62828] num"}>
                      {fmtRp(hitcep.selisihPpap)}
                    </b>
                  </p>
                  <p className="text-[10px] text-[#5F6B65] flex items-center gap-1">
                    {hitcep.isPpapCovered ? (
                      <>
                        <Check className="w-3 h-3 text-[#2E7D32] shrink-0" />
                        <span>Cadangan agunan mencukupi jika terjadi penurunan harga emas 15%.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-[#C62828] shrink-0" />
                        <span>Risiko agunan: Selisih PPAP negatif.</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Wewenang Pemutus Kredit */}
                <div className="p-3.5 rounded-xl border border-[#C9A227]/40 bg-[#FBF3D6]/60 space-y-1">
                  <span className="font-bold text-[#7A6110] block">
                    Penentuan Wewenang Pemutus Kredit
                  </span>
                  <p className="text-base font-extrabold text-[#084530]">
                    {hitcep.wewenangPemutus}
                  </p>
                  <p className="text-[10px] text-[#7A6110]">
                    {hitcep.wewenangPemutus === "Kabag Marketing"
                      ? "Plafond 500 rb – 50 Juta (Wewenang Kabag Marketing)"
                      : hitcep.wewenangPemutus === "Kabag Mkt + Dir. Bisnis"
                      ? "Plafond > 50 Jt – 100 Juta (Wewenang Kabag Mkt & Dir. Bisnis)"
                      : pinjamanDimohon > 250_000_000
                      ? "Plafond > 250 Juta (Melebihi batas komite 250 Jt — butuh persetujuan khusus Dekom)"
                      : "Plafond > 100 Jt – 250 Juta (Wewenang Kabag Mkt, Dir. Bisnis & Dekom)"}
                  </p>
                </div>
              </div>

              {/* Informasi Keterangan Gadai & Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#1B2420] mb-1">
                    Jenis Transaksi &amp; Referensi
                  </label>
                  <div className="h-10 px-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#084530]">
                      {keteranganGadai}
                    </span>
                    {selectedOldSbr && (
                      <span className="font-mono font-bold text-[11px] text-[#C9A227]">
                        Ref: {selectedOldSbr}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#1B2420] mb-1">
                    Jangka Waktu Akad (120 Hari)
                  </label>
                  <div className="h-10 px-3 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] flex items-center justify-between text-xs font-semibold text-[#1B2420]">
                    <span>{tglAkadStr}</span>
                    <span className="text-[#5F6B65]">s/d</span>
                    <span className="font-bold text-[#0B5D3B]">{tglJatuhStr}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Komparasi Khusus Topup / Tebus Sebagian / Turun Plafon */}
              {keteranganGadai === "Topup" && selectedOldSbr && (
                <div className="p-4 rounded-xl bg-[#E6F2EC] border border-[#0B5D3B]/20 text-xs space-y-1.5">
                  <p className="font-bold text-[#084530] uppercase text-[11px] tracking-wider">
                    Komparasi Top-Up Penambahan Pinjaman
                  </p>
                  {selectedOldTx && (
                    <div className="flex justify-between">
                      <span className="text-[#5F6B65]">Pokok SBR Lama ({selectedOldSbr}):</span>
                      <span className="font-semibold num text-[#1B2420]">{fmtRp(selectedOldTx.marhunBih)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#5F6B65]">Pinjaman Baru Dimohon:</span>
                    <span className="font-bold num text-[#0B5D3B]">{fmtRp(pinjamanDimohon)}</span>
                  </div>
                  {selectedOldTx && (
                    <div className="flex justify-between pt-1 border-t border-[#0B5D3B]/15">
                      <span className="font-bold text-[#084530]">Selisih Dana Tambahan (Cair):</span>
                      <span
                        className={`font-extrabold num ${
                          pinjamanDimohon - selectedOldTx.marhunBih > 0
                            ? "text-[#0B5D3B]"
                            : "text-[#C62828]"
                        }`}
                      >
                        {fmtRp(pinjamanDimohon - selectedOldTx.marhunBih)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#5F6B65]">Plafon Maksimal Baru (94% FTV):</span>
                    <span className="font-bold num text-[#1B2420]">{fmtRp(hitcep.upMaks)}</span>
                  </div>
                  <p className="text-[11px] text-[#5F6B65] pt-1 border-t border-[#0B5D3B]/20">
                    Sisa pinjaman lama pada <b>{selectedOldSbr}</b> akan dilunasi dan digantikan dengan akad SBR baru ini.
                  </p>
                </div>
              )}

              {keteranganGadai === "Tebus Sebagian" && selectedOldSbr && (
                <div className="p-4 rounded-xl bg-[#FFF8E1] border border-[#B7791F]/30 text-xs space-y-1.5 text-[#7A6110]">
                  <p className="font-bold uppercase text-[11px] tracking-wider">
                    Ketentuan Tebus Sebagian
                  </p>
                  <p>
                    Silakan <b>hapus (ikon Hapus)</b> barang jaminan di Langkah 2 yang ditebus/diambil pulang oleh nasabah. Sisa barang yang tertinggal di tabel akan menjadi agunan baru untuk SBR ini.
                  </p>
                </div>
              )}

              {keteranganGadai === "Turun Plafon" && selectedOldSbr && (
                <div className="p-4 rounded-xl bg-[#E3F0FB] border border-[#1E6FB8]/30 text-xs space-y-1.5 text-[#1E6FB8]">
                  <p className="font-bold uppercase text-[11px] tracking-wider">
                    Ketentuan Turun Plafon (Angsuran Pokok)
                  </p>
                  {selectedOldTx && (
                    <div className="space-y-1 bg-white/80 p-2.5 rounded-lg border border-[#1E6FB8]/20 text-[#1B2420]">
                      <div className="flex justify-between">
                        <span className="text-[#5F6B65]">Pokok SBR Lama ({selectedOldSbr}):</span>
                        <span className="font-semibold num">{fmtRp(selectedOldTx.marhunBih)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5F6B65]">Pinjaman Baru Dimohon:</span>
                        <span className="font-bold num">{fmtRp(pinjamanDimohon)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[#E1E5E2]">
                        <span className="font-bold text-[#1E6FB8]">Angsuran Pokok Disetor:</span>
                        <span
                          className={`font-extrabold num ${
                            selectedOldTx.marhunBih - pinjamanDimohon > 0
                              ? "text-[#0B5D3B]"
                              : "text-[#C62828]"
                          }`}
                        >
                          {fmtRp(selectedOldTx.marhunBih - pinjamanDimohon)}
                        </span>
                      </div>
                    </div>
                  )}
                  <p>
                    Agunan tetap utuh di khazanah. Sesuaikan turun nominal <b>Uang Pinjaman Dimohon</b> di atas lebih kecil dari pokok SBR lama.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1B2420] mb-1">
                  Catatan Tambahan Akad (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatanAkad}
                  onChange={(e) => setCatatanAkad(e.target.value)}
                  placeholder="Catatan kondisi fisik perhiasan atau kesepakatan loket..."
                  className="w-full p-2.5 rounded-xl border border-[#E1E5E2] text-xs focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>

              <div className="pt-4 border-t border-[#E1E5E2] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-10 px-4 rounded-xl border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Kembali
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitTransaksi("Draft")}
                    className="h-10 px-4 rounded-xl border border-[#0B5D3B] text-[#0B5D3B] hover:bg-[#E6F2EC] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Draft
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitTransaksi("Menunggu Pemutus")}
                    className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Ajukan ke {hitcep.wewenangPemutus}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL KANAN: RINGKASAN HITCEP RESMI (RUMUS 3, 4 & PELUNASAN) */}
        <HitcepSummaryPanel
          step={step}
          noSbrManual={noSbrManual}
          nasabahNama={selectedNasabah?.nama}
          nasabahCif={selectedNasabah?.cif}
          nasabahNik={selectedNasabah?.nik}
          nasabahHp={selectedNasabah?.hp}
          totalBeratBersih={totalBeratBersih}
          pinjamanDimohon={pinjamanDimohon}
          hitcep={hitcep}
        />
      </div>
    </AppShell>
  );
}
