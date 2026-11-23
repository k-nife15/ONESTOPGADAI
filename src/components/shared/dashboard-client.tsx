"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import {
  FileText,
  Coins,
  Clock,
  Printer,
  ArrowRight,
  TrendingUp,
  Search,
  Eye,
  PlusCircle,
  PieChart,
  AlertTriangle,
} from "lucide-react";

interface TransaksiWithBarang {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  totalBeratBersih: number;
  totalTaksiran: number;
  marhunBih: number;
  tanggalAkad: string;
  tanggalJatuhTempo: string;
  status: string;
  barang: {
    id: string;
    jenis: string;
    karat: string;
    beratBersih: number;
    nilaiTaksiran: number;
  }[];
}

interface DashboardClientProps {
  initialTransaksi: TransaksiWithBarang[];
}

export function DashboardClient({ initialTransaksi }: DashboardClientProps) {
  const { user } = useAuth();
  const [transaksiList] = useState<TransaksiWithBarang[]>(initialTransaksi);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTx, setSelectedTx] = useState<TransaksiWithBarang | null>(null);

  // Perhitungan KPI Dinamis
  const activeTransaksi = useMemo(
    () => transaksiList.filter((t) => t.status !== "Dibatalkan"),
    [transaksiList]
  );
  const totalMarhunBih = activeTransaksi.reduce((sum, t) => sum + (t.marhunBih || 0), 0);
  const totalBeratBersih = activeTransaksi.reduce((sum, t) => sum + (t.totalBeratBersih || 0), 0);
  const menungguPemutusCount = transaksiList.filter((t) => t.status === "Menunggu Pemutus").length;
  const tercetakCount = transaksiList.filter((t) => t.status === "Tercetak" || t.status === "Siap Cetak").length;

  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">("weekly");
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const [pinnedBucket, setPinnedBucket] = useState<string | null>(null);
  const [selectedKarat, setSelectedKarat] = useState<string | null>(null);
  const [hoveredKarat, setHoveredKarat] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState<boolean>(false);

  const getDueDaysRemaining = (tx: TransaksiWithBarang): number | null => {
    if (
      tx.status === "Dibatalkan" ||
      tx.status === "Lunas" ||
      tx.status === "Lelang"
    ) {
      return null;
    }
    const due = new Date(tx.tanggalJatuhTempo);
    if (Number.isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  };

  const { jatuhTempoCount, overdueCount } = useMemo(() => {
    let dueSoon = 0;
    let overdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const tx of activeTransaksi) {
      if (tx.status === "Lunas" || tx.status === "Lelang") continue;
      const due = new Date(tx.tanggalJatuhTempo);
      if (Number.isNaN(due.getTime())) continue;
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
      if (diff < 0) overdue += 1;
      if (diff <= 7) dueSoon += 1;
    }
    return { jatuhTempoCount: dueSoon, overdueCount: overdue };
  }, [activeTransaksi]);

  const normalizeKaratKey = (raw: string): string => {
    const upper = raw.toUpperCase();
    if (upper.includes("24") || upper.includes("LM") || upper.includes("ANTAM") || upper.includes("MURNI")) return "24K";
    if (upper.includes("22") || upper.includes("23")) return "22K";
    if (upper.includes("20") || upper.includes("21")) return "20K";
    if (upper.includes("18") || upper.includes("19")) return "18K";
    return "LAIN";
  };

  // Filter Baris Tabel Antrean (Status / Jatuh Tempo + Karatase + Pencarian)
  const filteredList = transaksiList.filter((t) => {
    let matchStatus = false;
    if (filterStatus === "ALL") {
      matchStatus = true;
    } else if (filterStatus === "JATUH_TEMPO") {
      const diff = getDueDaysRemaining(t);
      matchStatus = diff !== null && diff <= 7;
    } else {
      matchStatus = t.status === filterStatus;
    }
    const matchKarat =
      !selectedKarat ||
      t.barang.some((b) => normalizeKaratKey(b.karat) === selectedKarat);
    const matchSearch =
      searchQuery === "" ||
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sbr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.cif && t.cif.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchKarat && matchSearch;
  });

  const MAX_DASHBOARD_ROWS = 10;
  const displayedList = showAllRows
    ? filteredList
    : filteredList.slice(0, MAX_DASHBOARD_ROWS);

  const fmtShortRp = (val: number): string => {
    if (val >= 1_000_000_000) {
      return `Rp ${(val / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
    }
    if (val >= 1_000_000) {
      const jt = val / 1_000_000;
      return `Rp ${jt >= 100 ? Math.round(jt) : jt.toFixed(1).replace(".", ",")} Jt`;
    }
    if (val >= 1_000) {
      return `Rp ${Math.round(val / 1_000)} Rb`;
    }
    return "Rp 0";
  };

  // Agregasi Grafik Batang Realisasi Pencairan dari Data Transaksi Nyata
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: {
      key: string;
      shortLabel: string;
      rangeLabel: string;
      start: Date;
      end: Date;
      total: number;
      tx: number;
    }[] = [];

    if (chartPeriod === "weekly") {
      // 8 minggu terakhir (Senin–Minggu atau rolling 7 hari per bucket)
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      for (let i = 7; i >= 0; i--) {
        const end = new Date(endOfToday.getTime() - i * 7 * 86_400_000);
        const start = new Date(end.getTime() - 6 * 86_400_000);
        start.setHours(0, 0, 0, 0);
        const weekNum = 8 - i;
        const shortDate = start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        const endDate = end.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        buckets.push({
          key: `M${weekNum}`,
          shortLabel: shortDate,
          rangeLabel: `${shortDate} – ${endDate}`,
          start,
          end,
          total: 0,
          tx: 0,
        });
      }
    } else {
      // 6 bulan terakhir
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const monthShort = start.toLocaleDateString("id-ID", { month: "short" });
        const monthFull = start.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        buckets.push({
          key: monthShort,
          shortLabel: monthShort,
          rangeLabel: monthFull,
          start,
          end,
          total: 0,
          tx: 0,
        });
      }
    }

    for (const tx of activeTransaksi) {
      const akadDate = new Date(tx.tanggalAkad);
      if (Number.isNaN(akadDate.getTime())) continue;
      const target = buckets.find((b) => akadDate >= b.start && akadDate <= b.end);
      if (target) {
        target.total += tx.marhunBih || 0;
        target.tx += 1;
      }
    }

    const maxTotal = Math.max(...buckets.map((b) => b.total), 0);
    return {
      maxTotal,
      bars: buckets.map((b) => ({
        ...b,
        pct: maxTotal > 0 ? Math.max(b.total > 0 ? 8 : 0, Math.round((b.total / maxTotal) * 100)) : 0,
        peak: maxTotal > 0 && b.total === maxTotal,
      })),
    };
  }, [activeTransaksi, chartPeriod]);

  // Agregasi Komposisi Karatase Emas Nyata dari Barang Jaminan Aktif
  const { karataseComposition, totalKhazanahWeight, avgPurityPct } = useMemo(() => {
    const meta = [
      {
        key: "24K",
        karat: "24 Karat",
        purity: "99,99%",
        purityNum: 99.99,
        badge: "Emas Murni",
        color: "bg-[#C9A227]",
        border: "border-[#C9A227]",
        text: "text-[#876D13]",
        bgSoft: "bg-[#FBF3D6]",
      },
      {
        key: "22K",
        karat: "22 Karat",
        purity: "91,60%",
        purityNum: 91.6,
        badge: "Perhiasan Tua",
        color: "bg-[#0B5D3B]",
        border: "border-[#0B5D3B]",
        text: "text-[#0B5D3B]",
        bgSoft: "bg-[#E6F2EC]",
      },
      {
        key: "20K",
        karat: "20 Karat",
        purity: "83,30%",
        purityNum: 83.3,
        badge: "Perhiasan Standar",
        color: "bg-[#1E6FB8]",
        border: "border-[#1E6FB8]",
        text: "text-[#1E6FB8]",
        bgSoft: "bg-[#E3F0FB]",
      },
      {
        key: "18K",
        karat: "18 Karat",
        purity: "75,00%",
        purityNum: 75.0,
        badge: "Perhiasan Muda",
        color: "bg-[#5F6B65]",
        border: "border-[#5F6B65]",
        text: "text-[#5F6B65]",
        bgSoft: "bg-[#F6F7F5]",
      },
    ];

    const weights: Record<string, number> = { "24K": 0, "22K": 0, "20K": 0, "18K": 0, LAIN: 0 };
    for (const tx of activeTransaksi) {
      for (const item of tx.barang) {
        const key = normalizeKaratKey(item.karat || "");
        weights[key] = (weights[key] || 0) + (item.beratBersih || 0);
      }
    }

    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
    const classifiedWeight = meta.reduce((sum, m) => sum + (weights[m.key] || 0), 0);
    const weightedPuritySum = meta.reduce(
      (sum, m) => sum + (weights[m.key] || 0) * m.purityNum,
      0
    );
    const avgPurity =
      classifiedWeight > 0 ? weightedPuritySum / classifiedWeight : 0;

    const list = meta.map((m) => {
      const w = weights[m.key] || 0;
      const pct = totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;
      return {
        ...m,
        weightNum: w,
        weight: fmtBerat(w),
        pct,
      };
    });

    if (weights.LAIN > 0) {
      list.push({
        key: "LAIN",
        karat: "Kadar Lainnya",
        purity: "< 75%",
        purityNum: 70,
        badge: "Perhiasan Campuran",
        color: "bg-[#8E9B95]",
        border: "border-[#8E9B95]",
        text: "text-[#4A5550]",
        bgSoft: "bg-[#ECEFED]",
        weightNum: weights.LAIN,
        weight: fmtBerat(weights.LAIN),
        pct: totalWeight > 0 ? Math.round((weights.LAIN / totalWeight) * 100) : 0,
      });
    }

    return {
      totalKhazanahWeight: totalWeight,
      avgPurityPct: avgPurity,
      karataseComposition: list,
    };
  }, [activeTransaksi]);

  function getStatusBadge(status: string) {
    switch (status) {
      case "Draft":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECEFED] text-[#4A5550]">Draft</span>;
      case "Menunggu Pemutus":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF8E1] text-[#B7791F]">Menunggu Pemutus</span>;
      case "Disetujui Pemutus":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2F1] text-[#00695C]">Disetujui Pemutus</span>;
      case "Menunggu Back Office":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F0FB] text-[#1E6FB8]">Menunggu Back Office</span>;
      case "Siap Cetak":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E4F3E5] text-[#2E7D32]">Terverifikasi · Siap Cetak</span>;
      case "Tercetak":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEE8F8] text-[#5B3FA0]">Tercetak</span>;
      case "Lunas":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6F2EC] text-[#084530]">Lunas</span>;
      case "Lelang":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF8E1] text-[#7A6110]">Lelang</span>;
      case "Dibatalkan":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDECEA] text-[#C62828]">Dibatalkan</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F0FB] text-[#1E6FB8]">{status}</span>;
    }
  }

  return (
    <AppShell>
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1B2420] tracking-tight">
            Dashboard Operasional &amp; Portofolio Gadai
          </h2>
          <p className="text-sm text-[#5F6B65] mt-1">
            Ringkasan portofolio pembiayaan emas dan antrean tugas operasional hari ini.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === "PENAKSIR" || user?.role === "ADMIN_IT") && (
            <Link
              href="/taksiran"
              className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              + Input Gadai Baru
            </Link>
          )}
          {user?.role === "PEMUTUS" && (
            <Link
              href="/pemutus"
              className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
            >
              Buka Antrean Pemutus
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          {user?.role === "BACK_OFFICE" && (
            <Link
              href="/backoffice"
              className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
            >
              Buka Antrean Back Office
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 4 KARTU KPI UTAMA DENGAN INTERAKSI FILTER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* KPI 1 */}
        <button
          type="button"
          onClick={() => setFilterStatus("ALL")}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
            filterStatus === "ALL"
              ? "bg-[#E6F2EC] border-[#0B5D3B] shadow-md ring-2 ring-[#0B5D3B]/20"
              : "bg-white border-[#E1E5E2] hover:border-[#0B5D3B]/40 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5F6B65]">Total Transaksi</span>
            <div className="w-9 h-9 rounded-xl bg-[#FBF3D6] flex items-center justify-center text-[#7A6110]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#1B2420] num mt-2">
            {activeTransaksi.length}
          </p>
          <p className="text-[11px] text-[#5F6B65] mt-1">
            Akad aktif ({fmtBerat(totalBeratBersih)})
          </p>
        </button>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-white border border-[#E1E5E2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5F6B65]">Total Marhun Bih</span>
            <div className="w-9 h-9 rounded-xl bg-[#E6F2EC] flex items-center justify-center text-[#0B5D3B]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-[#0B5D3B] num mt-2">
            {fmtRp(totalMarhunBih)}
          </p>
          <p className="text-[11px] text-[#5F6B65] mt-1">
            Total pinjaman tersalurkan
          </p>
        </div>

        {/* KPI 3 */}
        <button
          type="button"
          onClick={() => setFilterStatus("Menunggu Pemutus")}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
            filterStatus === "Menunggu Pemutus"
              ? "bg-[#FFF8E1] border-[#B7791F] shadow-md ring-2 ring-[#B7791F]/20"
              : "bg-white border-[#E1E5E2] hover:border-[#B7791F]/40 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#B7791F]">Menunggu Pemutus</span>
            <div className="w-9 h-9 rounded-xl bg-[#FFF8E1] flex items-center justify-center text-[#B7791F]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#B7791F] num mt-2">
            {menungguPemutusCount}
          </p>
          <p className="text-[11px] text-[#5F6B65] mt-1">
            Klik untuk filter antrean ini
          </p>
        </button>

        {/* KPI 4 */}
        <button
          type="button"
          onClick={() => setFilterStatus("Siap Cetak")}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
            filterStatus === "Siap Cetak"
              ? "bg-[#E6F2EC] border-[#0B5D3B] shadow-md ring-2 ring-[#0B5D3B]/20"
              : "bg-white border-[#E1E5E2] hover:border-[#0B5D3B]/40 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0B5D3B]">Siap Cetak Dokumen</span>
            <div className="w-9 h-9 rounded-xl bg-[#E6F2EC] flex items-center justify-center text-[#0B5D3B]">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#1B2420] num mt-2">
            {tercetakCount}
          </p>
          <p className="text-[11px] text-[#5F6B65] mt-1">
            SBR + Nota + Label QR
          </p>
        </button>
      </div>

      {/* BARIS KEDUA: DIAGRAM & GRAFIK REAL-TIME DARI DATA TRANSAKSI (EMERALD & GOLD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Kiri (8 Kolom): Diagram Batang Realisasi Pencairan Gadai */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E1E5E2] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0B5D3B]" />
                <h3 className="text-base font-bold text-[#1B2420]">
                  Realisasi Pencairan Gadai ·{" "}
                  {chartPeriod === "weekly" ? "8 Minggu Terakhir" : "6 Bulan Terakhir"}
                </h3>
              </div>
              <p className="text-xs text-[#5F6B65] mt-0.5">
                Akumulasi Marhun Bih berdasarkan tanggal akad aktif
              </p>
            </div>

            {/* Switch Rentang Waktu (1 Baris Rapi) */}
            <div className="inline-flex items-center self-start sm:self-auto bg-[#F6F7F5] p-1 rounded-xl border border-[#E1E5E2] text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setChartPeriod("weekly");
                  setHoveredBucket(null);
                  setPinnedBucket(null);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  chartPeriod === "weekly"
                    ? "bg-white text-[#084530] shadow-2xs font-bold"
                    : "text-[#5F6B65] hover:text-[#1B2420]"
                }`}
              >
                8 Minggu
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartPeriod("monthly");
                  setHoveredBucket(null);
                  setPinnedBucket(null);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  chartPeriod === "monthly"
                    ? "bg-white text-[#084530] shadow-2xs font-bold"
                    : "text-[#5F6B65] hover:text-[#1B2420]"
                }`}
              >
                6 Bulan
              </button>
            </div>
          </div>

          {/* Area Diagram Batang — Skala Y Sejajar Persis dengan Track Batang */}
          <div className="mt-8 flex gap-3 items-start">
            {/* Label Sumbu Y tepat sejajar tinggi area batang (h-36) */}
            <div className="flex flex-col justify-between h-36 mt-6 text-[10px] text-[#5F6B65] font-medium num text-right min-w-[52px] shrink-0">
              <span>{chartData.maxTotal > 0 ? fmtShortRp(chartData.maxTotal) : "Rp 0"}</span>
              <span>{chartData.maxTotal > 0 ? fmtShortRp(chartData.maxTotal / 2) : "-"}</span>
              <span>Rp 0</span>
            </div>

            <div
              onMouseLeave={() => setHoveredBucket(null)}
              className={`flex-1 grid ${
                chartPeriod === "weekly" ? "grid-cols-8" : "grid-cols-6"
              } gap-2 sm:gap-3 relative`}
            >
              {/* Grid Garis Tipis tepat di belakang track batang (mt-6, h-36) */}
              <div className="absolute inset-x-0 top-6 h-36 flex flex-col justify-between pointer-events-none opacity-35">
                <div className="border-b border-dashed border-[#9AA5A0]" />
                <div className="border-b border-dashed border-[#9AA5A0]" />
                <div className="border-b border-[#9AA5A0]" />
              </div>

              {chartData.bars.map((bar, idx) => {
                const isHovered = hoveredBucket === bar.key;
                const isPinned = pinnedBucket === bar.key;
                const isActive = isHovered || isPinned;
                const tooltipAlign =
                  idx === 0
                    ? "left-0 translate-x-0"
                    : idx === chartData.bars.length - 1
                    ? "right-0 left-auto translate-x-0"
                    : "left-1/2 -translate-x-1/2";
                const arrowAlign =
                  idx === 0
                    ? "left-5"
                    : idx === chartData.bars.length - 1
                    ? "right-5 left-auto"
                    : "left-1/2 -translate-x-1/2";

                return (
                  <button
                    key={bar.key}
                    type="button"
                    onMouseEnter={() => setHoveredBucket(bar.key)}
                    onFocus={() => setHoveredBucket(bar.key)}
                    onBlur={() => setHoveredBucket(null)}
                    onClick={() =>
                      setPinnedBucket((prev) => (prev === bar.key ? null : bar.key))
                    }
                    className="relative flex flex-col items-center group cursor-pointer z-10 focus:outline-none"
                  >
                    {/* Floating Tooltip tepat di atas batang saat hover */}
                    {isHovered && (
                      <div
                        className={`pointer-events-none absolute -top-11 ${tooltipAlign} z-30 whitespace-nowrap bg-[#084530] text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-[#C9A227]/60 text-[10px] leading-tight text-left`}
                      >
                        <p className="font-bold text-[#C9A227]">{bar.rangeLabel}</p>
                        <p className="font-extrabold num mt-0.5">
                          {fmtRp(bar.total)} · {bar.tx} Akad
                        </p>
                        <span
                          className={`absolute ${arrowAlign} -bottom-1 w-2 h-2 rotate-45 bg-[#084530] border-r border-b border-[#C9A227]/60`}
                        />
                      </div>
                    )}

                    {/* Angka Ringkas di Atas Track (tinggi fixed h-6) */}
                    <div className="h-6 flex items-center justify-center">
                      <span
                        className={`text-[10px] font-bold num px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                          isActive
                            ? "bg-[#C9A227] text-[#084530]"
                            : "text-[#5F6B65] group-hover:text-[#1B2420]"
                        }`}
                      >
                        {bar.total > 0 ? fmtShortRp(bar.total).replace("Rp ", "") : "0"}
                      </span>
                    </div>

                    {/* Track Batang (tinggi fixed h-36 sejajar persis sumbu Y) */}
                    <div
                      className={`w-full max-w-[44px] h-36 rounded-t-xl flex items-end overflow-hidden p-0.5 transition-colors ${
                        isActive
                          ? "bg-[#FBF3D6]/80 border border-[#C9A227]/60"
                          : "bg-[#E6F2EC]/60 border border-[#0B5D3B]/10 group-hover:border-[#0B5D3B]/30"
                      }`}
                    >
                      <div
                        style={{ height: `${bar.pct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-t from-[#B38F1E] to-[#E5C148]"
                            : bar.peak
                            ? "bg-gradient-to-t from-[#084530] to-[#0B5D3B]"
                            : "bg-gradient-to-t from-[#0B5D3B]/65 to-[#0B5D3B] group-hover:from-[#0B5D3B] group-hover:to-[#084530]"
                        }`}
                      />
                    </div>

                    {/* Label Periode di Bawah */}
                    <span
                      className={`mt-2 text-[11px] font-bold transition-colors whitespace-nowrap ${
                        isActive ? "text-[#9A7812]" : "text-[#5F6B65] group-hover:text-[#1B2420]"
                      }`}
                    >
                      {bar.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5F6B65]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B5D3B]" />
                Realisasi Reguler
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#084530]" />
                Puncak Periode
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227]" />
                Periode Dipilih
              </span>
            </div>
            <span className="font-semibold text-[#0B5D3B] num">
              Total Portofolio Aktif: {fmtRp(totalMarhunBih)}
            </span>
          </div>
        </div>

        {/* Kanan (4 Kolom): Komposisi Karatase Emas Nyata */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E1E5E2] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#C9A227]" />
                <h3 className="text-base font-bold text-[#1B2420]">
                  Komposisi Karatase
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#0B5D3B] bg-[#E6F2EC] px-2.5 py-0.5 rounded-full border border-[#0B5D3B]/20">
                Khazanah Bank
              </span>
            </div>
            <p className="text-xs text-[#5F6B65] mt-1">
              Klik karatase untuk memfilter tabel transaksi di bawah
            </p>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-[#1B2420] num tracking-tight">
                {fmtBerat(totalKhazanahWeight).replace(" g", "")}
              </span>
              <span className="text-xs font-bold text-[#5F6B65]">
                gram total fisik aktif
              </span>
            </div>

            {/* Segmented Multi-Color Bar */}
            <div className="mt-4 h-4 w-full rounded-full overflow-hidden flex gap-1 bg-[#F6F7F5] p-0.5 border border-[#E1E5E2]">
              {karataseComposition
                .filter((k) => k.pct > 0)
                .map((k) => {
                  const activeFocus = hoveredKarat || selectedKarat;
                  const isDimmed = activeFocus && activeFocus !== k.key;
                  const isHighlighted = hoveredKarat === k.key;
                  return (
                    <div
                      key={k.key}
                      style={{ width: `${k.pct}%` }}
                      onMouseEnter={() => setHoveredKarat(k.key)}
                      onMouseLeave={() => setHoveredKarat(null)}
                      className={`${k.color} h-full rounded-full transition-all duration-200 cursor-pointer shadow-2xs ${
                        isDimmed
                          ? "opacity-25"
                          : isHighlighted
                          ? "opacity-100 brightness-110"
                          : "opacity-100 hover:brightness-110"
                      }`}
                      onClick={() => setSelectedKarat(selectedKarat === k.key ? null : k.key)}
                      title={`${k.karat}: ${k.pct}% (${k.weight})`}
                    />
                  );
                })}
            </div>

            {/* List Karatase Interaktif dengan Warna Serasi */}
            <div className="mt-4 space-y-2">
              {karataseComposition.map((k) => {
                const isSelected = selectedKarat === k.key;
                const isHovered = hoveredKarat === k.key;
                return (
                  <button
                    key={k.key}
                    type="button"
                    onMouseEnter={() => setHoveredKarat(k.key)}
                    onMouseLeave={() => setHoveredKarat(null)}
                    onClick={() => setSelectedKarat(isSelected ? null : k.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? `${k.bgSoft} ${k.border} ring-2 ring-black/5 font-bold shadow-xs`
                        : isHovered
                        ? `${k.bgSoft} ${k.border}/60 shadow-2xs`
                        : "bg-white border-[#E1E5E2] hover:bg-[#F6F7F5]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${k.color} shadow-xs shrink-0`} />
                      <div className="text-left">
                        <span className="font-bold text-[#1B2420] block">{k.karat}</span>
                        <span className="text-[#5F6B65] text-[10px]">
                          {k.badge} · {k.purity}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 num">
                      <span className="text-[#5F6B65] font-medium">{k.weight}</span>
                      <span className={`font-extrabold w-9 text-right text-sm ${k.text}`}>
                        {k.pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E1E5E2]">
            <p className="text-[11px] text-[#5F6B65] leading-relaxed">
              Standar Syariah: Rata-rata kemurnian emas khazanah{" "}
              <b className="num text-[#1B2420]">
                {avgPurityPct.toFixed(1).replace(".", ",")}%
              </b>{" "}
              (seluruh marhun &ge; 75% sesuai DSN-MUI).
            </p>
          </div>
        </div>
      </div>

      {/* TABEL ANTREAN TUGAS (DILENGKAPI PENCARIAN & FILTER REAL-TIME) */}
      <div className="mt-6 bg-white rounded-2xl border border-[#E1E5E2] shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-5 border-b border-[#E1E5E2] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[#1B2420]">
                Antrean Tugas Mendesak
              </h3>
              {selectedKarat && (
                <button
                  type="button"
                  onClick={() => setSelectedKarat(null)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FBF3D6] border border-[#C9A227] text-[11px] font-bold text-[#876D13] hover:bg-[#F5E7B8] cursor-pointer"
                >
                  Filter Karat: {selectedKarat} &times;
                </button>
              )}
            </div>
            <p className="text-xs text-[#5F6B65] mt-0.5">
              Klik pada salah satu baris untuk melihat detail cepat berkas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Input Cari */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#5F6B65] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. SBR / Nama Nasabah..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E1E5E2] text-xs bg-white focus:outline-none focus:border-[#0B5D3B]"
              />
            </div>

            {/* Filter Pill */}
            <div className="flex items-center flex-wrap gap-1 bg-[#F6F7F5] p-1 rounded-xl border border-[#E1E5E2] text-xs">
              {["ALL", "JATUH_TEMPO", "Menunggu Pemutus", "Disetujui Pemutus", "Menunggu Back Office", "Siap Cetak", "Tercetak"].map((st) => {
                const isDuePill = st === "JATUH_TEMPO";
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setFilterStatus(st);
                      setShowAllRows(false);
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                      filterStatus === st
                        ? isDuePill
                          ? "bg-[#FFF8E1] text-[#B7791F] border border-[#C9A227]/40 shadow-2xs font-bold"
                          : "bg-white text-[#0B5D3B] shadow-2xs font-bold"
                        : isDuePill && jatuhTempoCount > 0
                        ? "text-[#B7791F] hover:bg-[#FFF8E1]/60"
                        : "text-[#5F6B65] hover:text-[#1B2420]"
                    }`}
                  >
                    {isDuePill && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    {st === "ALL"
                      ? "Semua Status"
                      : isDuePill
                      ? `Jatuh Tempo (${jatuhTempoCount})`
                      : st}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Banner Peringatan Ringkas jika ada Akad Mendekati Jatuh Tempo / Lewat Tempo */}
        {jatuhTempoCount > 0 && filterStatus !== "JATUH_TEMPO" && (
          <div className="px-5 py-2.5 bg-[#FFFBEB] border-b border-[#F3E5AB] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#7A6110]">
              <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0" />
              <span>
                Terdapat <b className="num">{jatuhTempoCount}</b> akad mendekati jatuh tempo (&le; 7 hari)
                {overdueCount > 0 && (
                  <>
                    {" "}
                    termasuk <b className="text-[#C62828] num">{overdueCount} lewat tempo</b>
                  </>
                )}
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterStatus("JATUH_TEMPO");
                setShowAllRows(false);
              }}
              className="font-bold text-[#0B5D3B] hover:underline cursor-pointer"
            >
              Tampilkan Antrean Jatuh Tempo &rarr;
            </button>
          </div>
        )}

        {/* Tabel Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7F5] border-b border-[#E1E5E2] text-[11px] font-bold uppercase text-[#5F6B65] tracking-wider">
                <th className="py-3 px-6">No. Berkas / SBR</th>
                <th className="py-3 px-4">Nasabah</th>
                <th className="py-3 px-4">Barang Jaminan</th>
                <th className="py-3 px-4 text-right">Nilai Taksiran</th>
                <th className="py-3 px-4 text-right">Marhun Bih</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5E2] text-sm">
              {displayedList.map((tx) => {
                const ringkasanBarang =
                  tx.barang.length > 0
                    ? `${tx.barang.map((b) => `${b.jenis} ${b.karat}`).join(" + ")} · ${fmtBerat(
                        tx.totalBeratBersih
                      )}`
                    : fmtBerat(tx.totalBeratBersih);

                let actionHref = "/monitoring";
                let actionLabel = "Lihat";
                if (tx.status === "Menunggu Pemutus") {
                  actionHref = "/pemutus";
                  actionLabel = "Otorisasi";
                } else if (tx.status === "Siap Cetak" || tx.status === "Tercetak") {
                  actionHref = `/cetak?sbr=${encodeURIComponent(tx.sbr)}`;
                  actionLabel = "Cetak";
                }

                return (
                  <tr
                    key={tx.sbr}
                    onClick={() => setSelectedTx(tx)}
                    className={`hover:bg-[#E6F2EC]/40 transition-colors cursor-pointer ${
                      selectedTx?.sbr === tx.sbr ? "bg-[#E6F2EC]/60" : ""
                    }`}
                  >
                    <td className="py-3.5 px-6 font-bold text-[#1B2420] num">
                      {tx.sbr}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#1B2420]">{tx.nama}</p>
                      <p className="text-xs text-[#5F6B65] num">
                        {tx.cif || "Nasabah Baru (Menunggu CIF)"}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#1B2420] font-medium">
                      {ringkasanBarang}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#1B2420] num">
                      {fmtRp(tx.totalTaksiran)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-[#0B5D3B] num">
                      {fmtRp(tx.marhunBih)}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(tx.status)}</td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="h-8 w-8 rounded-lg border border-[#E1E5E2] hover:bg-white text-[#5F6B65] hover:text-[#1B2420] flex items-center justify-center cursor-pointer"
                          title="Pratinjau detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={actionHref}
                          className="h-8 px-3 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          {actionLabel}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#5F6B65]">
                    Tidak ada berkas yang sesuai dengan filter pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel: Ringkasan Jumlah & Pintasan ke Monitoring */}
        <div className="px-6 py-3.5 bg-[#F6F7F5]/60 border-t border-[#E1E5E2] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5F6B65]">
          <span>
            Menampilkan <b className="text-[#1B2420] num">{displayedList.length}</b> dari{" "}
            <b className="text-[#1B2420] num">{filteredList.length}</b> berkas
          </span>

          <div className="flex items-center gap-3">
            {filteredList.length > MAX_DASHBOARD_ROWS && (
              <button
                type="button"
                onClick={() => setShowAllRows((prev) => !prev)}
                className="font-semibold text-[#0B5D3B] hover:underline cursor-pointer"
              >
                {showAllRows
                  ? `Ringkas (${MAX_DASHBOARD_ROWS} Teratas)`
                  : `Tampilkan Semua (${filteredList.length})`}
              </button>
            )}
            <Link
              href="/monitoring"
              className="inline-flex items-center gap-1 font-bold text-[#084530] hover:text-[#0B5D3B] hover:underline"
            >
              Lihat Semua di Monitoring
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL PRATINJAU DETAIL TRANSAKSI */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E1E5E2] shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#E1E5E2] pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#0B5D3B] bg-[#E6F2EC] px-2.5 py-0.5 rounded-full">
                  Pratinjau Transaksi Rahn
                </span>
                <h3 className="text-lg font-bold text-[#1B2420] mt-1.5 num">
                  {selectedTx.sbr}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-[#F6F7F5] hover:bg-[#E1E5E2] text-[#5F6B65] flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F6F7F5]">
                <div>
                  <span className="text-[#5F6B65]">Nama Nasabah</span>
                  <p className="font-bold text-[#1B2420] text-sm mt-0.5">{selectedTx.nama}</p>
                  <p className="text-[#5F6B65] num">{selectedTx.nik}</p>
                </div>
                <div>
                  <span className="text-[#5F6B65]">Nomor CIF</span>
                  <p className="font-bold text-[#1B2420] text-sm mt-0.5 num">{selectedTx.cif || "-"}</p>
                  <p className="text-[#5F6B65]">{selectedTx.hp}</p>
                </div>
              </div>

              <div className="border border-[#E1E5E2] rounded-xl p-3">
                <span className="font-bold text-[#1B2420] block mb-2">Barang Jaminan ({selectedTx.barang.length} Item):</span>
                <div className="space-y-1.5">
                  {selectedTx.barang.map((b) => (
                    <div key={b.id} className="flex justify-between items-center text-[#5F6B65]">
                      <span>{b.jenis} ({b.karat})</span>
                      <span className="font-semibold text-[#1B2420] num">{fmtBerat(b.beratBersih)} · {fmtRp(b.nilaiTaksiran)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-[#E6F2EC]/60 border border-[#0B5D3B]/20">
                <div>
                  <span className="text-[#5F6B65]">Nilai Taksiran Total:</span>
                  <p className="font-bold text-[#1B2420] num text-sm">{fmtRp(selectedTx.totalTaksiran)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[#0B5D3B] font-bold">Marhun Bih (Pinjaman):</span>
                  <p className="font-extrabold text-[#0B5D3B] num text-base">{fmtRp(selectedTx.marhunBih)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[#5F6B65] pt-1">
                <span>Tgl Akad: <b className="text-[#1B2420]">{selectedTx.tanggalAkad}</b></span>
                <span>Jatuh Tempo: <b className="text-[#1B2420]">{selectedTx.tanggalJatuhTempo}</b></span>
              </div>
            </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-[#E1E5E2] pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="h-9 px-4 rounded-xl border border-[#E1E5E2] text-xs font-semibold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
                >
                  Tutup
                </button>
                {selectedTx.status === "Siap Cetak" || selectedTx.status === "Tercetak" ? (
                  <Link
                    href={`/cetak?sbr=${encodeURIComponent(selectedTx.sbr)}`}
                    className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Dokumen
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="h-9 px-4 rounded-xl bg-[#E1E5E2] text-[#9AA5A0] text-xs font-bold cursor-not-allowed"
                    title="Dokumen belum dapat dicetak karena transaksi belum selesai / belum disetujui pemutus."
                  >
                    Cetak Terkunci (Belum Selesai)
                  </button>
                )}
              </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
