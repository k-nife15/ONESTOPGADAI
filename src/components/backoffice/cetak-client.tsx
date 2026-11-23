"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { fmtRp, fmtBerat } from "@/lib/formatters";
import { tentukanWewenangPemutus } from "@/lib/hitcep";
import { buildQrSvgData } from "@/lib/qr";
import {
  Printer,
  FileText,
  Tag,
  Receipt,
  FileSpreadsheet,
  ArrowLeft,
  AlertTriangle,
  SlidersHorizontal,
  RotateCcw,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import {
  ISIAN_SBR,
  SBR_LAYOUT_STORAGE_KEY,
  type TransaksiCetakData,
} from "./sbr-template";

export function CetakClient({
  transaksis,
  defaultSbr,
}: {
  transaksis: TransaksiCetakData[];
  defaultSbr?: string;
}) {
  const { user } = useAuth();
  const [txList, setTxList] = useState<TransaksiCetakData[]>(transaksis);
  const [selectedSbr, setSelectedSbr] = useState<string>(
    defaultSbr || transaksis[0]?.sbr || ""
  );
  const [activeDoc, setActiveDoc] = useState<"SBR" | "NOTA" | "STIKER" | "HITCEP">("SBR");
  const [notaSize, setNotaSize] = useState<"80mm" | "58mm" | "a5">("80mm");
  const [showSbrBg, setShowSbrBg] = useState(true);
  const [editLayout, setEditLayout] = useState(false);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("kodeUnit");
  const [hoveredFieldKey, setHoveredFieldKey] = useState<string | null>(null);
  const [zoneTarget, setZoneTarget] = useState<"ALL" | "MAIN" | "CUSTODY" | "RAHIN">("MAIN");
  const [globalFontScale, setGlobalFontScale] = useState<number>(1);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [sbrLayout, setSbrLayout] = useState<Record<string, { l: number; t: number; f: number }>>(() =>
    Object.fromEntries(ISIAN_SBR.map((f) => [f.k, { l: f.l, t: f.t, f: f.f }]))
  );
  const sbrCanvasRef = useRef<HTMLDivElement | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(SBR_LAYOUT_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.fields) setSbrLayout((prev) => ({ ...prev, ...parsed.fields }));
        if (typeof parsed.globalFontScale === "number") setGlobalFontScale(parsed.globalFontScale);
      } catch {
        // Ignore malformed local storage
      }
    });
  }, []);

  const persistSbrLayout = (
    nextFields: Record<string, { l: number; t: number; f: number }>,
    nextScale: number
  ) => {
    try {
      localStorage.setItem(
        SBR_LAYOUT_STORAGE_KEY,
        JSON.stringify({ fields: nextFields, globalFontScale: nextScale })
      );
    } catch {
      // Ignore storage quota errors
    }
  };

  const updateSelectedField = (patch: Partial<{ l: number; t: number; f: number }>) => {
    setSbrLayout((prev) => {
      const cur = prev[selectedFieldKey] || { l: 0, t: 0, f: 1 };
      const next = {
        ...prev,
        [selectedFieldKey]: {
          l: patch.l ?? cur.l,
          t: patch.t ?? cur.t,
          f: patch.f ?? cur.f,
        },
      };
      persistSbrLayout(next, globalFontScale);
      return next;
    });
  };

  const handleStartDrag = (fieldKey: string, e: React.MouseEvent<HTMLSpanElement>) => {
    if (!editLayout || !sbrCanvasRef.current) return;
    e.preventDefault();
    setSelectedFieldKey(fieldKey);
    const rect = sbrCanvasRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = sbrLayout[fieldKey] || { l: 0, t: 0, f: 1 };

    const onMove = (ev: MouseEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      const nextL = Math.max(0, Math.min(95, Number((orig.l + dxPct).toFixed(2))));
      const nextT = Math.max(0, Math.min(95, Number((orig.t + dyPct).toFixed(2))));
      setSbrLayout((prev) => {
        const next = { ...prev, [fieldKey]: { ...orig, l: nextL, t: nextT } };
        persistSbrLayout(next, globalFontScale);
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleResetLayout = () => {
    const defaults = Object.fromEntries(ISIAN_SBR.map((f) => [f.k, { l: f.l, t: f.t, f: f.f }]));
    setSbrLayout(defaults);
    setGlobalFontScale(1);
    persistSbrLayout(defaults, 1);
    setPresetMsg("Tata letak dikembalikan ke posisi default.");
  };

  // 1. Geser halus dengan tombol panah keyboard saat mode kalibrasi aktif
  useEffect(() => {
    if (!editLayout) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;

      e.preventDefault();
      const step = e.shiftKey ? 0.5 : 0.1;
      const dl = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dt = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;

      setSbrLayout((prev) => {
        const cur = prev[selectedFieldKey] || { l: 0, t: 0, f: 1 };
        const next = {
          ...prev,
          [selectedFieldKey]: {
            ...cur,
            l: Math.max(0, Math.min(95, Number((cur.l + dl).toFixed(2)))),
            t: Math.max(0, Math.min(95, Number((cur.t + dt).toFixed(2)))),
          },
        };
        persistSbrLayout(next, globalFontScale);
        return next;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editLayout, selectedFieldKey, globalFontScale]);

  // 2. Geser & ubah ukuran font massal per zona kertas
  const handleNudgeZone = (dl: number, dt: number, df: number = 0) => {
    const matchesZone = (key: string) => {
      if (zoneTarget === "ALL") return true;
      if (zoneTarget === "CUSTODY") return key.startsWith("s_");
      if (zoneTarget === "RAHIN") return key.startsWith("r_");
      return !key.startsWith("s_") && !key.startsWith("r_");
    };

    setSbrLayout((prev) => {
      const next = { ...prev };
      for (const f of ISIAN_SBR) {
        if (!matchesZone(f.k)) continue;
        const cur = next[f.k] || { l: f.l, t: f.t, f: f.f };
        next[f.k] = {
          l: Math.max(0, Math.min(95, Number((cur.l + dl).toFixed(2)))),
          t: Math.max(0, Math.min(95, Number((cur.t + dt).toFixed(2)))),
          f: Math.max(0.4, Math.min(2.5, Number((cur.f + df).toFixed(2)))),
        };
      }
      persistSbrLayout(next, globalFontScale);
      return next;
    });
  };

  // 3. Ekspor & Impor Preset Kalibrasi JSON
  const handleExportPreset = () => {
    const blob = new Blob(
      [JSON.stringify({ fields: sbrLayout, globalFontScale }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preset-kalibrasi-sbr.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPresetMsg("Preset kalibrasi berhasil diunduh.");
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        if (!parsed.fields || typeof parsed.fields !== "object") {
          setPresetMsg("Format file preset tidak valid.");
          return;
        }
        const merged = { ...sbrLayout, ...parsed.fields };
        const scale = typeof parsed.globalFontScale === "number" ? parsed.globalFontScale : globalFontScale;
        setSbrLayout(merged);
        setGlobalFontScale(scale);
        persistSbrLayout(merged, scale);
        setPresetMsg("Preset kalibrasi berhasil dimuat!");
      } catch {
        setPresetMsg("Gagal membaca file JSON preset.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const [printing, setPrinting] = useState(false);

  const currentTx = txList.find((t) => t.sbr === selectedSbr) || txList[0];

  const handlePrint = async () => {
    if (!currentTx) return;
    setPrintError(null);
    setPrinting(true);
    try {
      const res = await fetch("/api/cetak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sbr: currentTx.sbr,
          dokumen: activeDoc,
          user: user?.name || "Petugas Loket",
          role: user?.role || "PENAKSIR",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setPrintError(data.error || "Gagal mencatat pencetakan dokumen.");
        return;
      }
      setTxList((prev) =>
        prev.map((t) => (t.sbr === currentTx.sbr ? { ...t, status: "Tercetak" } : t))
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("osg:refresh-notifications"));
      }
      window.print();
    } catch {
      setPrintError("Terjadi kesalahan koneksi saat mencatat cetak dokumen.");
    } finally {
      setPrinting(false);
    }
  };

  if (!currentTx) {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E1E5E2]">
          <p className="text-sm text-[#5F6B65]">Belum ada data transaksi yang dapat dicetak.</p>
          <Link
            href="/taksiran"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#0B5D3B] text-white text-xs font-bold rounded-lg"
          >
            Buat Taksiran Baru
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Control Header & Nav (Hidden on Print) */}
      <div className="noprint mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5F6B65] mb-1">
              <Link href="/dashboard" className="hover:text-[#0B5D3B] flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <span>/</span>
              <span className="text-[#1B2420]">Studio Cetak Dokumen</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#1B2420]">
              Studio Cetak Operasional Rahn
            </h1>
            <p className="text-xs text-[#5F6B65] mt-0.5">
              Cetak fisik Surat Bukti Rahn (SBR), Stiker Kantong Emas QR, Nota Pencairan, dan Rincian HITCEP.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={printing || (currentTx.status !== "Siap Cetak" && currentTx.status !== "Tercetak")}
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 stroke-[2.3]" />
              {currentTx.status === "Tercetak" ? "Cetak Ulang (Ctrl+P)" : "Cetak Sekarang (Ctrl+P)"}
            </button>
          </div>
        </div>

        {printError && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#FDECEA] border border-[#C62828]/30 text-xs font-semibold text-[#C62828] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{printError}</span>
          </div>
        )}

        {/* Selector Berkas & Mode Cetak */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Pilih Transaksi */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-[#E1E5E2]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6B65] mb-1.5">
              Pilih Transaksi / Nomor SBR
            </label>
            <select
              value={selectedSbr}
              onChange={(e) => {
                setSelectedSbr(e.target.value);
                setPrintError(null);
              }}
              className="w-full h-10 px-3 rounded-lg border border-[#E1E5E2] text-xs font-bold text-[#1B2420] bg-white focus:outline-none focus:border-[#0B5D3B]"
            >
              {txList.map((t) => (
                <option key={t.sbr} value={t.sbr}>
                  {t.sbr} — {t.nama} ({t.status})
                </option>
              ))}
            </select>
          </div>

          {/* Tab Jenis Dokumen */}
          <div className="md:col-span-7 bg-white p-2 rounded-xl border border-[#E1E5E2] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveDoc("SBR")}
              className={`flex-1 h-11 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDoc === "SBR"
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] hover:text-[#1B2420]"
              }`}
            >
              <FileText className="w-4 h-4" /> SBR Fisik A4
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc("STIKER")}
              className={`flex-1 h-11 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDoc === "STIKER"
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] hover:text-[#1B2420]"
              }`}
            >
              <Tag className="w-4 h-4" /> Stiker Kantong
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc("NOTA")}
              className={`flex-1 h-11 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDoc === "NOTA"
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] hover:text-[#1B2420]"
              }`}
            >
              <Receipt className="w-4 h-4" /> Nota Kasir
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc("HITCEP")}
              className={`flex-1 h-11 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDoc === "HITCEP"
                  ? "bg-[#0B5D3B] text-white shadow-xs"
                  : "bg-[#F6F7F5] text-[#5F6B65] hover:text-[#1B2420]"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Lembar HITCEP
            </button>
          </div>
        </div>
      </div>

      {/* CANVAS DOKUMEN CETAK */}
      <style>{`
        @page {
          size: ${
            activeDoc === "SBR"
              ? "24.8cm 15.8cm"
              : activeDoc === "HITCEP"
              ? "A4 portrait"
              : activeDoc === "NOTA"
              ? notaSize === "80mm"
                ? "80mm auto"
                : notaSize === "58mm"
                ? "58mm auto"
                : "A5 landscape"
              : "auto"
          };
          margin: ${
            activeDoc === "SBR"
              ? "0"
              : activeDoc === "HITCEP"
              ? "1.2cm"
              : activeDoc === "NOTA"
              ? notaSize === "a5"
                ? "0.8cm"
                : "2mm"
              : "0.6cm"
          };
        }
      `}</style>
      <div className="bg-white p-8 lg:p-12 rounded-2xl border border-[#E1E5E2] shadow-sm max-w-[1040px] mx-auto text-[#1B2420] text-xs print:border-0 print:shadow-none print:p-0 print:mx-0 print:max-w-none print:rounded-none">
        {activeDoc === "SBR" && (
          <div className="space-y-3 print:space-y-0">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E1E5E2] noprint">
              <p className="text-[11px] text-[#5F6B65]">
                Overlay presisi blangko resmi <b>SBR.png</b> (24,8cm × 15,8cm, margin 0) — mencakup SBR Utama, Slip Tengah Custody, dan Slip Pinggir Rahin.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#084530] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSbrBg}
                    onChange={(e) => setShowSbrBg(e.target.checked)}
                    className="rounded border-[#0B5D3B] text-[#0B5D3B]"
                  />
                  Tampilkan Gambar Blangko
                </label>
                <button
                  type="button"
                  onClick={() => setEditLayout((v) => !v)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer transition-colors ${
                    editLayout
                      ? "bg-[#0B5D3B] text-white border-[#0B5D3B]"
                      : "bg-[#F6F7F5] text-[#084530] border-[#E1E5E2] hover:bg-[#E6F2EC]"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {editLayout ? "Selesai Atur Posisi" : "Atur Posisi & Font"}
                </button>
              </div>
            </div>

            {editLayout && (
              <div className="p-3.5 rounded-xl bg-[#F6F7F5] border border-[#0B5D3B]/30 space-y-3 noprint">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold text-[#084530]">
                      Mode Kalibrasi (Pakai Panah Keyboard ↑↓←→ untuk geser 0.1%, Shift+Panah 0.5%)
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#0B5D3B]/20 text-[11px] font-extrabold text-[#0B5D3B]">
                      {hoveredFieldKey
                        ? `Diarahkan: ${ISIAN_SBR.find((x) => x.k === hoveredFieldKey)?.label}`
                        : `Dipilih: ${ISIAN_SBR.find((x) => x.k === selectedFieldKey)?.label}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="h-7 px-2.5 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Uji Cetak (Tanpa Ubah Status)
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPreset}
                      className="h-7 px-2.5 rounded-lg border border-[#E1E5E2] bg-white text-[11px] font-bold text-[#1B2420] hover:bg-[#E6F2EC] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Ekspor Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="h-7 px-2.5 rounded-lg border border-[#E1E5E2] bg-white text-[11px] font-bold text-[#1B2420] hover:bg-[#E6F2EC] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Impor Preset
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json"
                      onChange={handleImportPreset}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleResetLayout}
                      className="h-7 px-2.5 rounded-lg border border-[#E1E5E2] bg-white text-[11px] font-bold text-[#5F6B65] hover:text-[#1B2420] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>

                {presetMsg && (
                  <p className="text-[11px] font-semibold text-[#084530] bg-[#E6F2EC] px-2.5 py-1 rounded-lg border border-[#0B5D3B]/20">
                    {presetMsg}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-[#5F6B65] mb-1">Pilih Field</label>
                    <select
                      value={selectedFieldKey}
                      onChange={(e) => setSelectedFieldKey(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-[#E1E5E2] bg-white text-[11px] font-bold"
                    >
                      {ISIAN_SBR.map((f) => (
                        <option key={f.k} value={f.k}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5F6B65] mb-1">Posisi Kiri (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sbrLayout[selectedFieldKey]?.l || ""}
                      placeholder="0"
                      onChange={(e) => updateSelectedField({ l: parseFloat(e.target.value) || 0 })}
                      className="w-full h-8 px-2 rounded-lg border border-[#E1E5E2] bg-white text-xs font-bold num"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5F6B65] mb-1">Posisi Atas (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sbrLayout[selectedFieldKey]?.t || ""}
                      placeholder="0"
                      onChange={(e) => updateSelectedField({ t: parseFloat(e.target.value) || 0 })}
                      className="w-full h-8 px-2 rounded-lg border border-[#E1E5E2] bg-white text-xs font-bold num"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5F6B65] mb-1">Font Field (em)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.4"
                      max="2.5"
                      value={sbrLayout[selectedFieldKey]?.f ?? 1}
                      onChange={(e) => updateSelectedField({ f: parseFloat(e.target.value) || 1 })}
                      className="w-full h-8 px-2 rounded-lg border border-[#E1E5E2] bg-white text-xs font-bold num"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5F6B65] mb-1">Skala Global</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.6"
                      max="1.6"
                      value={globalFontScale}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1;
                        setGlobalFontScale(val);
                        persistSbrLayout(sbrLayout, val);
                      }}
                      className="w-full h-8 px-2 rounded-lg border border-[#0B5D3B]/40 bg-white text-xs font-bold num text-[#0B5D3B]"
                    />
                  </div>
                </div>

                {/* Geser & Font Per Zona */}
                <div className="pt-2 border-t border-[#E1E5E2] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#5F6B65]">Geser Sekaligus Zona:</span>
                    <select
                      value={zoneTarget}
                      onChange={(e) => setZoneTarget(e.target.value as "ALL" | "MAIN" | "CUSTODY" | "RAHIN")}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white font-bold text-[11px]"
                    >
                      <option value="MAIN">SBR Utama</option>
                      <option value="CUSTODY">Slip Tengah Custody</option>
                      <option value="RAHIN">Slip Pinggir Rahin</option>
                      <option value="ALL">Seluruh Kertas</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleNudgeZone(-0.2, 0)}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white hover:bg-[#E6F2EC] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                      title="Geser zona ke kiri 0.2%"
                    >
                      <ArrowLeft className="w-3 h-3" /> Kiri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeZone(0.2, 0)}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white hover:bg-[#E6F2EC] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                      title="Geser zona ke kanan 0.2%"
                    >
                      Kanan <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeZone(0, -0.2)}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white hover:bg-[#E6F2EC] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                      title="Geser zona ke atas 0.2%"
                    >
                      <ArrowUp className="w-3 h-3" /> Atas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeZone(0, 0.2)}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white hover:bg-[#E6F2EC] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                      title="Geser zona ke bawah 0.2%"
                    >
                      <ArrowDown className="w-3 h-3" /> Bawah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeZone(0, 0, -0.05)}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white hover:bg-[#E6F2EC] font-bold cursor-pointer"
                    >
                      Font -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeZone(0, 0, 0.05)}
                      className="h-7 px-2 rounded-lg border border-[#E1E5E2] bg-white hover:bg-[#E6F2EC] font-bold cursor-pointer"
                    >
                      Font +
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto print:overflow-visible">
              <div
                ref={sbrCanvasRef}
                className="relative mx-auto w-[940px] aspect-[2480/1580] bg-white print:mx-0 print:w-[24.8cm] print:h-[15.8cm] text-[11px]"
              >
                {showSbrBg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/SBR.png"
                    alt="Template Blangko Surat Bukti Rahn"
                    className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
                  />
                )}
                {ISIAN_SBR.map((f) => {
                  const pos = sbrLayout[f.k] || { l: f.l, t: f.t, f: f.f };
                  const isSel = editLayout && selectedFieldKey === f.k;
                  const isHov = editLayout && hoveredFieldKey === f.k;
                  return (
                    <span
                      key={f.k}
                      title={editLayout ? f.label : undefined}
                      onMouseEnter={() => editLayout && setHoveredFieldKey(f.k)}
                      onMouseLeave={() => editLayout && setHoveredFieldKey((cur) => (cur === f.k ? null : cur))}
                      onMouseDown={(e) => handleStartDrag(f.k, e)}
                      style={{
                        left: `${pos.l}%`,
                        top: `${pos.t}%`,
                        width: f.w ? `${f.w}%` : undefined,
                        fontSize: `${(pos.f * globalFontScale).toFixed(3)}em`,
                      }}
                      className={`absolute font-bold text-black font-sans transition-all ${
                        editLayout
                          ? isSel
                            ? "cursor-move ring-2 ring-[#0B5D3B] bg-[#E6F2EC]/90 rounded px-1 py-0.5 z-20"
                            : isHov
                            ? "cursor-move ring-2 ring-[#C9A227] bg-[#FBF3D6]/95 rounded px-1 py-0.5 z-20 scale-[1.02]"
                            : "cursor-move border border-dashed border-[#0B5D3B]/45 bg-white/50 rounded px-0.5"
                          : ""
                      } ${
                        f.m
                          ? "whitespace-pre-line leading-[1.35]"
                          : f.w
                          ? "whitespace-normal break-words overflow-hidden leading-[1.2]"
                          : "whitespace-nowrap"
                      }`}
                    >
                      {(isHov || isSel) && (
                        <span className="pointer-events-none absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-[#084530] text-white text-[9px] font-bold whitespace-nowrap shadow-xs z-30">
                          {f.label}
                        </span>
                      )}
                      {f.v(currentTx)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeDoc === "STIKER" && (() => {
          const barangRingkas = currentTx.barang.length
            ? currentTx.barang
                .map((b) => `${b.jenis} ${b.karat} (${b.jumlah || 1}x), ${fmtBerat(b.beratBersih)}`)
                .join("; ")
            : "-";
          const qrPayload = [
            `NASABAH: ${currentTx.nama}`,
            `CIF: ${currentTx.cif || "-"} | NIK: ${currentTx.nik}`,
            `SBR: ${currentTx.sbr} | AKAD: ${currentTx.noAkad || "-"}`,
            `PINJAMAN: ${fmtRp(currentTx.marhunBih)}`,
            `TEMPO: ${currentTx.tanggalJatuhTempo}`,
            `BARANG: ${barangRingkas}`,
          ].join("\n");
          const qr = buildQrSvgData(qrPayload);

          return (
            <div className="max-w-md mx-auto p-6 border-2 border-dashed border-[#0B5D3B] rounded-2xl bg-white space-y-4 print:border print:rounded-lg">
              <div className="flex flex-col items-center text-center border-b border-[#E1E5E2] pb-4 space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#084530]">
                  STIKER KANTONG MARHUN
                </span>
                <div className="w-40 h-40 border border-[#E1E5E2] rounded-xl p-2 bg-white shadow-2xs">
                  <svg
                    viewBox={`0 0 ${qr.size} ${qr.size}`}
                    xmlns="http://www.w3.org/2000/svg"
                    shapeRendering="crispEdges"
                    className="w-full h-full"
                    aria-label={`QR Code ${currentTx.sbr}`}
                  >
                    <rect width={qr.size} height={qr.size} fill="#ffffff" />
                    <path d={qr.path} fill="#000000" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-extrabold text-[#1B2420]">
                    {currentTx.nama}
                  </p>
                  <p className="text-[11px] font-mono font-bold text-[#0B5D3B]">
                    CIF: {currentTx.cif || "-"} · SBR: {currentTx.sbr}
                  </p>
                  <p className="text-[11px] font-mono text-[#5F6B65]">
                    NIK: {currentTx.nik}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[#5F6B65]">No. Akad</span>
                  <span className="font-mono font-bold text-[#1B2420]">{currentTx.noAkad || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5F6B65]">UP / Plafond</span>
                  <span className="font-extrabold text-[#0B5D3B] num">{fmtRp(currentTx.marhunBih)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5F6B65]">Ujroh 4 Bulan</span>
                  <span className="font-bold text-[#1B2420] num">{fmtRp(currentTx.ujroh)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5F6B65]">Mulai – Jatuh Tempo</span>
                  <span className="font-semibold text-[#1B2420] text-right">
                    {currentTx.tanggalAkad} – <b className="text-[#C62828]">{currentTx.tanggalJatuhTempo}</b>
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5F6B65]">Kantor</span>
                  <span className="font-semibold text-[#1B2420] text-right">{currentTx.kantor}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#5F6B65]">Keterangan</span>
                  <span className="font-bold uppercase text-[#084530]">{currentTx.keteranganGadai || "BARU"}</span>
                </div>
                <div className="pt-1.5 border-t border-[#E1E5E2]">
                  <span className="text-[#5F6B65] block text-[11px] mb-0.5">
                    Rincian Barang ({fmtBerat(currentTx.totalBeratBersih)}):
                  </span>
                  <ul className="space-y-0.5 text-[11px] font-semibold text-[#1B2420]">
                    {currentTx.barang.length > 0 ? (
                      currentTx.barang.map((b, i) => (
                        <li key={b.id || i}>
                          {i + 1}. {b.jumlah || 1} {b.jenis}, {b.karat}, {fmtBerat(b.beratBersih)}
                        </li>
                      ))
                    ) : (
                      <li>{barangRingkas}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}

        {activeDoc === "NOTA" && (
          <div className="space-y-3 print:space-y-0">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E1E5E2] noprint">
              <p className="text-[11px] text-[#5F6B65]">
                Pilih ukuran kertas printer kasir (Thermal <b>80 mm</b> / <b>58 mm</b>) atau <b>A5 Landscape</b>.
              </p>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "80mm", label: "Thermal 80 mm" },
                    { id: "58mm", label: "Thermal 58 mm" },
                    { id: "a5", label: "A5 Landscape" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNotaSize(opt.id)}
                    className={`h-8 px-3 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      notaSize === opt.id
                        ? "bg-[#0B5D3B] text-white border-[#0B5D3B]"
                        : "bg-white text-[#5F6B65] border-[#E1E5E2] hover:bg-[#F6F7F5]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

          <div
            className={`mx-auto bg-white font-mono print:mx-0 print:rounded-none ${
              notaSize === "80mm"
                ? "w-[76mm] p-3 border border-[#E1E5E2] rounded-xl space-y-2 text-[10px] print:w-[76mm] print:p-1 print:border-0"
                : notaSize === "58mm"
                ? "w-[54mm] p-2 border border-[#E1E5E2] rounded-xl space-y-1.5 text-[9px] print:w-[54mm] print:p-0.5 print:border-0"
                : "max-w-lg p-6 border border-[#E1E5E2] rounded-xl space-y-3 text-xs print:border-black/40 print:max-w-none"
            }`}
          >
            <div className="text-center pb-2.5 border-b border-dashed border-[#9AA5A0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mitra-syariah.png"
                alt="Bank Mitra Syariah"
                className="h-9 w-auto mx-auto mb-1.5 object-contain"
              />
              <p className="font-bold text-sm">PT. BPRS MITRA MENTARI SEJAHTERA</p>
              <p className="text-[10px] italic text-[#0B5D3B]">Menebar Manfaat Sesuai Syariah</p>
              <p className="font-extrabold text-xs tracking-wider mt-1.5 border-y border-dashed border-[#9AA5A0] py-1">
                NOTA TRANSAKSI (FAKTUR GADAI)
              </p>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span>Tanggal</span>
                <span className="font-semibold">{currentTx.tanggalAkad}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>No. SBR / CIF</span>
                <span className="font-bold">{currentTx.sbr} / {currentTx.cif || "-"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Nama Nasabah</span>
                <span className="font-bold text-right">{currentTx.nama}</span>
              </div>
              <div className="flex justify-between gap-2 items-start">
                <span className="shrink-0">Jenis Barang</span>
                <span className="font-sans text-[11px] font-semibold text-right text-[#1B2420]">
                  {currentTx.barang.map((b) => `${b.jumlah || 1} ${b.jenis}`).join(", ") || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Berat Bersih</span>
                <span className="font-semibold num">{fmtBerat(currentTx.totalBeratBersih)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Kadar Karatase</span>
                <span className="font-semibold">
                  {currentTx.barang.map((b) => b.karat).join(", ") || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Nilai Taksiran (NST)</span>
                <span className="font-semibold num">{fmtRp(currentTx.totalTaksiran)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Biaya Adm</span>
                <span className="num">{fmtRp(currentTx.biayaAdmin)}</span>
              </div>
            </div>

            <div className="space-y-1 py-2 border-y border-dashed border-[#9AA5A0]">
              <div className="flex justify-between font-bold text-sm text-[#0B5D3B]">
                <span>Uang Pinjaman (UP)</span>
                <span className="num">{fmtRp(currentTx.marhunBih)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Biaya Sewa (Ujroh 4 Bln)</span>
                <span className="num">{fmtRp(currentTx.ujroh)}</span>
              </div>
              <div className="flex justify-between border-t border-[#1B2420] pt-1 font-extrabold text-sm">
                <span>Total Kewajiban</span>
                <span className="num">{fmtRp(currentTx.marhunBih + currentTx.ujroh + currentTx.biayaAdmin)}</span>
              </div>
            </div>

            {/* Klausul Pengikat & Pernyataan Nasabah sesuai Format Faktur Excel */}
            <div className="space-y-2 text-[10px] leading-relaxed text-[#1B2420]">
              <p className="font-bold text-center uppercase border-b border-dashed border-[#E1E5E2] pb-1.5">
                NOTA TRANSAKSI INI MERUPAKAN SATU KESATUAN YANG TIDAK TERPISAHKAN DENGAN NOMOR AKAD:{" "}
                <span className="underline">{currentTx.noAkad || "-"}</span>
              </p>
              <p>
                <b>Tanggal Jatuh Tempo:</b> {currentTx.tanggalJatuhTempo}. Apabila gadai ini tidak
                dilunasi atau diperpanjang sampai tanggal jatuh tempo tersebut, maka barang jaminan
                akan diproses sesuai ketentuan akad Rahn.
              </p>
              <p className="bg-[#F6F7F5] p-2 rounded border border-[#E1E5E2] font-sans">
                Bahwa dengan ini saya <b>{currentTx.nama}</b> melakukan transaksi gadai senilai{" "}
                <b className="num">{fmtRp(currentTx.marhunBih)}</b> dan biaya sewa sebesar{" "}
                <b className="num">{fmtRp(currentTx.ujroh)}</b> yang merupakan kewajiban saya selama{" "}
                <b>120 hari</b> ke depan sampai dengan lunas.
              </p>
            </div>

            <div className="pt-2 text-right text-[10px]">
              Ponorogo, {currentTx.tanggalAkad}
            </div>

            <div className="pt-2 border-t border-dashed border-[#9AA5A0] grid grid-cols-2 gap-4 text-center text-[10px]">
              <div>
                <p className="text-[#5F6B65] mb-10">Petugas / Teller</p>
                <p className="font-bold border-t border-[#1B2420] pt-1 truncate">
                  {user?.name || "Petugas Operasional"}
                </p>
              </div>
              <div>
                <p className="text-[#5F6B65] mb-10">Nasabah (Rahin)</p>
                <p className="font-bold border-t border-[#1B2420] pt-1 truncate">{currentTx.nama}</p>
              </div>
            </div>

            <div className="pt-1 text-center text-[10px] text-[#5F6B65]">
              Terima kasih atas kepercayaan Anda.
            </div>
          </div>
          </div>
        )}

        {activeDoc === "HITCEP" && (
          <div className="space-y-4">
            <div className="flex justify-between items-start border-b border-[#E1E5E2] pb-3">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-mitra-syariah.png"
                  alt="Bank Mitra Syariah"
                  className="h-9 w-auto mb-1.5 object-contain"
                />
                <h3 className="text-base font-extrabold text-[#084530]">LEMBAR KERJA PENAKSIRAN EMAS (HITCEP)</h3>
                <p className="text-xs text-[#5F6B65]">
                  Perhitungan Standar Taksiran Logam Emas &amp; Matriks Kewenangan · Akad: <b>{currentTx.keteranganGadai}</b>
                </p>
                <p className="text-[11px] text-[#5F6B65] mt-0.5">
                  Tgl Akad: <b>{currentTx.tanggalAkad}</b> · Jatuh Tempo: <b>{currentTx.tanggalJatuhTempo}</b>
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-xs bg-[#E6F2EC] px-3 py-1 rounded text-[#084530]">
                  {currentTx.sbr}
                </span>
                <p className="text-[10px] text-[#5F6B65] mt-1">
                  Nasabah: <b>{currentTx.nama}</b> ({currentTx.cif || "-"})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-[#E1E5E2] bg-[#F6F7F5]">
                <p className="text-[10px] text-[#5F6B65]">Total Taksiran (NT)</p>
                <p className="text-sm font-extrabold text-[#0B5D3B] num">{fmtRp(currentTx.totalTaksiran)}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#E1E5E2] bg-[#F6F7F5]">
                <p className="text-[10px] text-[#5F6B65]">UP Maks (94% FTV)</p>
                <p className="text-sm font-extrabold num">{fmtRp(Math.round(currentTx.totalTaksiran * 0.94))}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#0B5D3B]/30 bg-[#E6F2EC]">
                <p className="text-[10px] text-[#084530]">UP Disetujui</p>
                <p className="text-sm font-extrabold text-[#084530] num">{fmtRp(currentTx.marhunBih)}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#C9A227]/40 bg-[#FBF3D6]/70">
                <p className="text-[10px] text-[#7A6110]">Wewenang Pemutus</p>
                <p className="text-sm font-extrabold text-[#7A6110]">
                  {tentukanWewenangPemutus(currentTx.marhunBih)}
                </p>
              </div>
            </div>

            <table className="w-full border-collapse border border-[#E1E5E2] text-xs">
              <thead>
                <tr className="bg-[#E6F2EC] text-[#084530] font-bold text-left">
                  <th className="p-2 border border-[#E1E5E2]">Barang Jaminan</th>
                  <th className="p-2 border border-[#E1E5E2]">Karat</th>
                  <th className="p-2 border border-[#E1E5E2] text-right">Qty</th>
                  <th className="p-2 border border-[#E1E5E2] text-right">Berat Kotor</th>
                  <th className="p-2 border border-[#E1E5E2] text-right">Berat Bersih</th>
                  <th className="p-2 border border-[#E1E5E2] text-right">Nilai Taksiran</th>
                </tr>
              </thead>
              <tbody>
                {currentTx.barang.map((b, idx) => (
                  <tr key={b.id || idx}>
                    <td className="p-2 border border-[#E1E5E2] font-semibold">{b.jenis}</td>
                    <td className="p-2 border border-[#E1E5E2] font-bold text-[#C9A227]">{b.karat}</td>
                    <td className="p-2 border border-[#E1E5E2] text-right num">{b.jumlah || 1}</td>
                    <td className="p-2 border border-[#E1E5E2] text-right num">{fmtBerat(b.beratKotor)}</td>
                    <td className="p-2 border border-[#E1E5E2] text-right num font-bold">{fmtBerat(b.beratBersih)}</td>
                    <td className="p-2 border border-[#E1E5E2] text-right num font-bold text-[#0B5D3B]">
                      {fmtRp(b.nilaiTaksiran)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* 16 Poin Konsol HITCEP sesuai Master Excel */}
              <div className="lg:col-span-7 border border-[#E1E5E2] rounded-xl overflow-hidden">
                <div className="bg-[#084530] text-white px-3 py-2 text-[11px] font-bold">
                  RINGKASAN KONSOLIDASI HITCEP (16 PARAMETER)
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <tbody className="divide-y divide-[#E1E5E2]">
                    {[
                      ["1. Nama Nasabah", currentTx.nama],
                      [
                        "2. Nama Barang",
                        currentTx.barang.map((b) => `${b.jumlah || 1} ${b.jenis}`).join(", ") || "-",
                      ],
                      [
                        "3. Kadar / Karatase",
                        currentTx.barang.map((b) => b.karat).join(", ") || "-",
                      ],
                      ["4. Berat Emas Bersih", fmtBerat(currentTx.totalBeratBersih)],
                      ["5. Tanggal Mulai – JT", `${currentTx.tanggalAkad} s.d. ${currentTx.tanggalJatuhTempo}`],
                      ["6. Nilai Taksiran (NT)", fmtRp(currentTx.totalTaksiran)],
                      ["7. UP Maks (94% FTV)", fmtRp(Math.round(currentTx.totalTaksiran * 0.94))],
                      ["8. Pembanding PPAP (85% NT)", fmtRp(Math.round(currentTx.totalTaksiran * 0.85))],
                      ["9. UP Disetujui (Plafond)", fmtRp(currentTx.marhunBih)],
                      [
                        "10. Status Limit UP Maks",
                        currentTx.marhunBih <= Math.round(currentTx.totalTaksiran * 0.94)
                          ? "BENAR (Sesuai Limit)"
                          : "MELEBIHI LIMIT",
                      ],
                      ["11. Ujroh Bulanan", fmtRp(Math.round(currentTx.ujroh / 4))],
                      ["12. Ujroh 4 Bulan", fmtRp(currentTx.ujroh)],
                      ["13. Biaya Admin", fmtRp(currentTx.biayaAdmin)],
                      ["14. DP Ujroh", fmtRp(0)],
                      ["15. Petugas Penaksir", currentTx.petugasPenaksir || "-"],
                      [
                        "16. Total Plafond + Ujroh",
                        fmtRp(currentTx.marhunBih + currentTx.ujroh + currentTx.biayaAdmin),
                      ],
                    ].map(([label, value], i) => (
                      <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-[#F6F7F5]/60"}>
                        <td className="py-1.5 px-3 text-[#5F6B65] font-medium w-[48%]">{label}</td>
                        <td className="py-1.5 px-3 font-bold text-[#1B2420] num text-right">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Matriks Batas Wewenang Pemutus Komite */}
              <div className="lg:col-span-5 space-y-3">
                <div className="border border-[#E1E5E2] rounded-xl overflow-hidden">
                  <div className="bg-[#FBF3D6] text-[#7A6110] px-3 py-2 text-[11px] font-bold border-b border-[#C9A227]/30">
                    BATAS WEWENANG PEMUTUS KOMITE
                  </div>
                  <table className="w-full text-[10px] border-collapse text-center">
                    <thead>
                      <tr className="bg-[#F6F7F5] text-[#5F6B65] border-b border-[#E1E5E2]">
                        <th className="p-2 text-left">Plafond</th>
                        <th className="p-1.5">Kabag Mkt</th>
                        <th className="p-1.5">Dir. Bisnis</th>
                        <th className="p-1.5">Dekom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5E2]">
                      <tr className={currentTx.marhunBih <= 50_000_000 ? "bg-[#E6F2EC] font-bold text-[#084530]" : ""}>
                        <td className="p-2 text-left">500rb – 50jt</td>
                        <td className="p-1.5">&#10003;</td>
                        <td className="p-1.5">-</td>
                        <td className="p-1.5">-</td>
                      </tr>
                      <tr
                        className={
                          currentTx.marhunBih > 50_000_000 && currentTx.marhunBih <= 100_000_000
                            ? "bg-[#E6F2EC] font-bold text-[#084530]"
                            : ""
                        }
                      >
                        <td className="p-2 text-left">&gt; 50jt – 100jt</td>
                        <td className="p-1.5">&#10003;</td>
                        <td className="p-1.5">&#10003;</td>
                        <td className="p-1.5">-</td>
                      </tr>
                      <tr className={currentTx.marhunBih > 100_000_000 ? "bg-[#E6F2EC] font-bold text-[#084530]" : ""}>
                        <td className="p-2 text-left">&gt; 100jt – 250jt</td>
                        <td className="p-1.5">&#10003;</td>
                        <td className="p-1.5">&#10003;</td>
                        <td className="p-1.5">&#10003;</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl border border-[#E1E5E2] bg-[#F6F7F5] text-[11px] space-y-1">
                  <p className="text-[#5F6B65]">Selisih Risiko PPAP (UP Maks − 85% NT):</p>
                  <p className="text-sm font-extrabold text-[#0B5D3B] num">
                    {fmtRp(Math.round(currentTx.totalTaksiran * 0.94) - Math.round(currentTx.totalTaksiran * 0.85))}
                  </p>
                  <p className="text-[10px] text-[#5F6B65]">
                    Wewenang Aktif: <b className="text-[#084530]">{tentukanWewenangPemutus(currentTx.marhunBih)}</b>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <p className="text-[10px] text-[#5F6B65] mb-12">Petugas Penaksir</p>
                <p className="font-bold border-t border-[#1B2420] pt-1 max-w-[220px] mx-auto">
                  {currentTx.petugasPenaksir}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#5F6B65] mb-12">
                  Pejabat Pemutus ({tentukanWewenangPemutus(currentTx.marhunBih)})
                </p>
                <p className="font-bold border-t border-[#1B2420] pt-1 max-w-[220px] mx-auto">
                  {currentTx.pemutusTtd || "-"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
