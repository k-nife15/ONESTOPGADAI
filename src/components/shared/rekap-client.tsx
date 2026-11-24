"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import { CABANG_KANTOR } from "@/lib/types";
import {
  FileSpreadsheet,
  Search,
  Printer,
} from "lucide-react";

interface RekapBarangItem {
  id: string;
  jenis: string;
  karat: string;
  jumlah: number;
  beratBersih: number;
}

interface RekapItem {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  noAkad: string | null;
  noSbg: string | null;
  noKontrak: string | null;
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
  status: string;
  barang?: RekapBarangItem[];
}

const EXCEL_REKAP_HEADERS = [
  "NO",
  "NOMOR SBR",
  "NAMA",
  "NOMOR AKAD",
  "NOMOR SBG",
  "NOMOR FASILITAS",
  "PLAFOND",
  "UJROH",
  "UJROH 4 BULAN",
  "TANGGAL DROPPING",
  "JANGKA WAKTU",
  "TANGGAL JATUH TEMPO",
  "KELOLAAN",
  "KETERANGAN",
  "KETERANGAN BARANG",
  "KARAT",
  "BERAT",
  "JUMLAH BARANG",
  "NOMOR HP",
  "STATUS LUNAS",
] as const;

function buildExcelRekapRow(t: RekapItem, index: number) {
  const items = t.barang || [];
  const keteranganBarang = items.length
    ? items.map((b) => `${b.jenis}${b.jumlah > 1 ? ` (${b.jumlah}x)` : ""}`).join("; ")
    : "-";
  const karatList = items.length
    ? Array.from(new Set(items.map((b) => b.karat))).join(", ")
    : "-";
  const jumlahBarang = items.reduce((sum, b) => sum + (b.jumlah || 1), 0);

  return {
    no: index + 1,
    nomorSbr: t.sbr,
    nama: t.nama,
    nomorAkad: t.noAkad || "-",
    nomorSbg: t.noSbg || "-",
    nomorFasilitas: t.noKontrak || "-",
    plafond: t.marhunBih || 0,
    ujrohPerBulan: Math.round((t.ujroh || 0) / 4),
    ujroh4Bulan: t.ujroh || 0,
    tanggalDropping: t.tanggalAkad,
    jangkaWaktu: "4 Bulan",
    tanggalJatuhTempo: t.tanggalJatuhTempo,
    kelolaan: t.kantor,
    keterangan: t.keteranganGadai || "Baru",
    keteranganBarang,
    karat: karatList,
    berat: t.totalBeratBersih || 0,
    jumlahBarang,
    nomorHp: t.hp || "-",
    statusLunas: getRekapStatusLunas(t.status),
  };
}

function getRekapStatusLunas(status: string): "Lunas" | "Belum Lunas" {
  return status === "Lunas" ? "Lunas" : "Belum Lunas";
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function RekapClient({ transaksis }: { transaksis: RekapItem[] }) {
  const [search, setSearch] = useState("");
  const [filterKantor, setFilterKantor] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"ringkas" | "lengkap">("ringkas");

  const filtered = transaksis.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      search === "" ||
      t.nama.toLowerCase().includes(q) ||
      t.sbr.toLowerCase().includes(q) ||
      (t.noAkad && t.noAkad.toLowerCase().includes(q)) ||
      (t.noSbg && t.noSbg.toLowerCase().includes(q)) ||
      (t.noKontrak && t.noKontrak.toLowerCase().includes(q)) ||
      (t.cif && t.cif.toLowerCase().includes(q));

    const matchKantor = filterKantor === "ALL" || t.kantor === filterKantor;
    const matchStatus = filterStatus === "ALL" || getRekapStatusLunas(t.status) === filterStatus;

    return matchSearch && matchKantor && matchStatus;
  });

  const totalPinjaman = filtered.reduce((s, t) => s + (t.marhunBih || 0), 0);
  const totalTaksiran = filtered.reduce((s, t) => s + (t.totalTaksiran || 0), 0);
  const totalUjroh = filtered.reduce((s, t) => s + (t.ujroh || 0), 0);
  const totalGram = filtered.reduce((s, t) => s + (t.totalBeratBersih || 0), 0);

  const handleExportCSV = () => {
    const rows = filtered.map((t, idx) => {
      const r = buildExcelRekapRow(t, idx);
      return [
        r.no,
        r.nomorSbr,
        r.nama,
        r.nomorAkad,
        r.nomorSbg,
        r.nomorFasilitas,
        r.plafond,
        r.ujrohPerBulan,
        r.ujroh4Bulan,
        r.tanggalDropping,
        r.jangkaWaktu,
        r.tanggalJatuhTempo,
        r.kelolaan,
        r.keterangan,
        r.keteranganBarang,
        r.karat,
        r.berat,
        r.jumlahBarang,
        r.nomorHp,
        r.statusLunas,
      ].map(escapeCsvCell);
    });

    const csvText = [
      EXCEL_REKAP_HEADERS.map(escapeCsvCell).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `db_gadai_rekap_${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#1B2420]">
                Buku Besar Rekap Gadai (Register db gadai)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F2EC] text-[#084530] text-[11px] font-bold border border-[#0B5D3B]/20">
                Live Core-DB
              </span>
            </div>
            <p className="text-xs text-[#5F6B65] mt-1">
              Data transaksi gadai emas yang telah terverifikasi dan dibukukan ke core banking dan buku besar perbankan.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.3]" /> Ekspor Excel (.CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E1E5E2] bg-white hover:bg-[#F6F7F5] text-xs font-bold text-[#1B2420] transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#5F6B65]" /> Cetak PDF
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Total Pembiayaan (Marhun Bih)</p>
            <p className="text-xl font-extrabold text-[#0B5D3B] num mt-1">{fmtRp(totalPinjaman)}</p>
            <p className="text-[11px] text-[#5F6B65] mt-0.5">{filtered.length} Berkas Dibukukan</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Total Taksiran Emas</p>
            <p className="text-xl font-extrabold text-[#1B2420] num mt-1">{fmtRp(totalTaksiran)}</p>
            <p className="text-[11px] text-[#5F6B65] mt-0.5">Underlying Collateral</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Proyeksi Ujroh (Fee Simpan)</p>
            <p className="text-xl font-extrabold text-[#C9A227] num mt-1">{fmtRp(totalUjroh)}</p>
            <p className="text-[11px] text-[#5F6B65] mt-0.5">Pendapatan Jasa 120 Hari</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B65]">Total Agunan Logam Mulia</p>
            <p className="text-xl font-extrabold text-[#1B2420] num mt-1">{fmtBerat(totalGram)}</p>
            <p className="text-[11px] text-[#5F6B65] mt-0.5">Tersimpan di Khazanah</p>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6B65]" />
            <input
              type="text"
              placeholder="Cari Nasabah, SBR, No. Akad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E1E5E2] bg-white text-xs text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
            />
          </div>

          <div>
            <select
              value={filterKantor}
              onChange={(e) => setFilterKantor(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] bg-white text-xs font-semibold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
            >
              <option value="ALL">Semua Kantor Cabang</option>
              {CABANG_KANTOR.map((cabang) => (
                <option key={cabang} value={cabang}>
                  {cabang}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] bg-white text-xs font-semibold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
            >
              <option value="ALL">Semua Status</option>
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>
        </div>

        {/* Tabel Rekap Buku Besar */}
        <div className="bg-white rounded-2xl border border-[#E1E5E2] shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E1E5E2] bg-[#F6F7F5]/60 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-[#5F6B65]">
              Menampilkan <b className="text-[#1B2420]">{filtered.length}</b> berkas{" "}
              {viewMode === "lengkap" ? "· Format Lengkap 20 Kolom Excel (db gadai)" : "· Tampilan Ringkas"}
            </p>
            <div className="inline-flex rounded-xl border border-[#E1E5E2] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("ringkas")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  viewMode === "ringkas"
                    ? "bg-[#0B5D3B] text-white shadow-2xs"
                    : "text-[#5F6B65] hover:text-[#1B2420]"
                }`}
              >
                Ringkas
              </button>
              <button
                type="button"
                onClick={() => setViewMode("lengkap")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  viewMode === "lengkap"
                    ? "bg-[#0B5D3B] text-white shadow-2xs"
                    : "text-[#5F6B65] hover:text-[#1B2420]"
                }`}
              >
                Lengkap (20 Kolom Excel)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {viewMode === "ringkas" ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#E6F2EC] text-[#084530] font-bold">
                  <tr>
                    <th className="p-3">No. SBR</th>
                    <th className="p-3">Nasabah (CIF)</th>
                    <th className="p-3">No. Akad &amp; SBG</th>
                    <th className="p-3">Akad &amp; Jatuh Tempo</th>
                    <th className="p-3 text-right">Berat (g)</th>
                    <th className="p-3 text-right">Taksiran</th>
                    <th className="p-3 text-right">Pinjaman</th>
                    <th className="p-3 text-right">Ujroh</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E5E2]">
                  {filtered.map((t) => (
                    <tr key={t.sbr} className="hover:bg-[#F6F7F5] transition-colors">
                      <td className="p-3 font-mono font-bold text-[#084530]">{t.sbr}</td>
                      <td className="p-3">
                        <p className="font-bold text-[#1B2420]">{t.nama}</p>
                        <p className="text-[11px] text-[#5F6B65]">{t.cif || "CIF-New"}</p>
                      </td>
                      <td className="p-3 font-mono">
                        <p className="font-semibold text-[#1B2420]">{t.noAkad || "-"}</p>
                        <p className="text-[11px] text-[#5F6B65]">{t.noSbg || "-"}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-[#1B2420]">{t.tanggalAkad}</p>
                        <p className="text-[11px] text-[#C62828] font-bold">{t.tanggalJatuhTempo}</p>
                      </td>
                      <td className="p-3 text-right num font-semibold">{fmtBerat(t.totalBeratBersih)}</td>
                      <td className="p-3 text-right num text-[#5F6B65]">{fmtRp(t.totalTaksiran)}</td>
                      <td className="p-3 text-right num font-extrabold text-[#0B5D3B]">{fmtRp(t.marhunBih)}</td>
                      <td className="p-3 text-right num font-semibold text-[#C9A227]">{fmtRp(t.ujroh)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            getRekapStatusLunas(t.status) === "Lunas"
                              ? "bg-[#E6F2EC] text-[#084530]"
                              : "bg-[#FBF3D6] text-[#7A6110]"
                          }`}
                        >
                          {getRekapStatusLunas(t.status)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`/cetak?sbr=${encodeURIComponent(t.sbr)}`}
                          className="p-1.5 rounded-lg border border-[#E1E5E2] hover:bg-[#E6F2EC] text-[#0B5D3B] inline-flex items-center justify-center transition-colors"
                          title="Buka Lembar Cetak SBR"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-[11px] text-left whitespace-nowrap">
                <thead className="bg-[#E6F2EC] text-[#084530] font-bold">
                  <tr>
                    {EXCEL_REKAP_HEADERS.map((h) => (
                      <th key={h} className="px-3 py-2.5 border-r border-[#0B5D3B]/10 last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E5E2]">
                  {filtered.map((t, idx) => {
                    const r = buildExcelRekapRow(t, idx);
                    return (
                      <tr key={t.sbr} className="hover:bg-[#F6F7F5] transition-colors">
                        <td className="px-3 py-2.5 text-center num font-semibold text-[#5F6B65]">{r.no}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-[#084530]">{r.nomorSbr}</td>
                        <td className="px-3 py-2.5 font-bold text-[#1B2420]">{r.nama}</td>
                        <td className="px-3 py-2.5 font-mono text-[#1B2420]">{r.nomorAkad}</td>
                        <td className="px-3 py-2.5 font-mono text-[#1B2420]">{r.nomorSbg}</td>
                        <td className="px-3 py-2.5 font-mono text-[#1B2420]">{r.nomorFasilitas}</td>
                        <td className="px-3 py-2.5 text-right num font-extrabold text-[#0B5D3B]">{fmtRp(r.plafond)}</td>
                        <td className="px-3 py-2.5 text-right num font-semibold text-[#C9A227]">{fmtRp(r.ujrohPerBulan)}</td>
                        <td className="px-3 py-2.5 text-right num font-semibold text-[#C9A227]">{fmtRp(r.ujroh4Bulan)}</td>
                        <td className="px-3 py-2.5 text-[#1B2420]">{r.tanggalDropping}</td>
                        <td className="px-3 py-2.5 text-center text-[#5F6B65]">{r.jangkaWaktu}</td>
                        <td className="px-3 py-2.5 font-bold text-[#C62828]">{r.tanggalJatuhTempo}</td>
                        <td className="px-3 py-2.5 text-[#1B2420]">{r.kelolaan}</td>
                        <td className="px-3 py-2.5 uppercase font-semibold text-[#084530]">{r.keterangan}</td>
                        <td className="px-3 py-2.5 max-w-[240px] truncate text-[#1B2420]" title={r.keteranganBarang}>
                          {r.keteranganBarang}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-[#1B2420]">{r.karat}</td>
                        <td className="px-3 py-2.5 text-right num font-semibold">{fmtBerat(r.berat)}</td>
                        <td className="px-3 py-2.5 text-center num font-semibold">{r.jumlahBarang}</td>
                        <td className="px-3 py-2.5 font-mono text-[#5F6B65]">{r.nomorHp}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.statusLunas === "Lunas"
                                ? "bg-[#E6F2EC] text-[#084530]"
                                : "bg-[#FBF3D6] text-[#7A6110]"
                            }`}
                          >
                            {r.statusLunas}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
