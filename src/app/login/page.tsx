"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { UserRole, CABANG_KANTOR } from "@/lib/types";
import { fmtRp } from "@/lib/formatters";
import type { VendorGoldData } from "@/app/api/gold-price/route";

export default function LoginPage() {
  const router = useRouter();
  const { setActiveUser } = useAuth();

  const [username, setUsername] = useState("19940812.ahmad");
  const [password, setPassword] = useState("syariah2026");
  const [branch, setBranch] = useState<string>(CABANG_KANTOR[0]);
  const [showPass, setShowPass] = useState(false);
  const [activeStagingRole, setActiveStagingRole] = useState<UserRole>("PENAKSIR");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // State Harga Emas Live Galeri 24
  const [vendors, setVendors] = useState<Record<string, VendorGoldData>>({});
  const [selectedVendor, setSelectedVendor] = useState<string>("GALERI 24");
  const [selectedWeight, setSelectedWeight] = useState<string>("1");
  const [loadingGold, setLoadingGold] = useState<boolean>(true);
  const [isLiveGold, setIsLiveGold] = useState<boolean>(false);

  const fetchGoldPrices = async () => {
    setLoadingGold(true);
    try {
      const res = await fetch("/api/gold-price");
      const data = await res.json();
      if (data && data.vendors) {
        setVendors(data.vendors);
        setIsLiveGold(Boolean(data.live));
      }
    } catch {
      // Fallback handled inside API
    } finally {
      setLoadingGold(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadPrices() {
      try {
        const res = await fetch("/api/gold-price");
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.vendors && isMounted) {
          setVendors(data.vendors);
          setIsLiveGold(Boolean(data.live));
        }
      } catch (err) {
        console.error("Gagal memuat harga emas:", err);
      } finally {
        if (isMounted) setLoadingGold(false);
      }
    }
    loadPrices();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentVendorData = vendors[selectedVendor];
  const weightList = currentVendorData?.items || [
    { weight: "0.5", sellPrice: 1320000, buybackPrice: 1182000 },
    { weight: "1", sellPrice: 2518000, buybackPrice: 2370000 },
    { weight: "2", sellPrice: 4974000, buybackPrice: 4731000 },
    { weight: "5", sellPrice: 12345000, buybackPrice: 11827000 },
    { weight: "10", sellPrice: 24622000, buybackPrice: 23655000 },
    { weight: "25", sellPrice: 61225000, buybackPrice: 58846000 },
    { weight: "50", sellPrice: 122353000, buybackPrice: 117692000 },
    { weight: "100", sellPrice: 244583000, buybackPrice: 235384000 },
  ];

  const activeWeightItem =
    weightList.find((w) => w.weight === selectedWeight) ||
    weightList.find((w) => w.weight === "1") ||
    weightList[0];

  const handleSelectStagingRole = (role: UserRole) => {
    setActiveStagingRole(role);
    setUsername(DEMO_USERS[role].username);
    setPassword("syariah2026");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username / NIP dan Kata Sandi wajib diisi.");
      return;
    }

    setLoggingIn(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          branch,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Gagal masuk ke sistem.");
        return;
      }
      setActiveUser(data.user);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("osg_notif_shown_PEMUTUS");
        sessionStorage.removeItem("osg_notif_shown_BACK_OFFICE");
      }
      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan koneksi saat menghubungi server.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* SISI KIRI: PANEL BRANDING EMERALD + KARTU HARGA EMAS HARIAN (40%) */}
      <div className="lg:w-[40%] bg-[#084530] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Ornamen Lingkaran Geometris */}
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full border border-[#C9A227]/20 pointer-events-none" />

        {/* Identitas Brand & Kartu Harga Emas (Sesuai Figma P-01) */}
        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mitra-syariah-icon.png"
            alt="Bank Mitra Syariah"
            className="w-14 h-14 object-contain mb-5 drop-shadow-[0_2px_6px_rgba(255,255,255,0.22)]"
          />

          <h1 className="text-3xl lg:text-[32px] font-extrabold tracking-tight leading-tight">
            ONE STOP GADAI
            <span className="block text-[#C9A227] mt-0.5">EMAS SYARIAH</span>
          </h1>

          <p className="text-white/80 text-sm mt-3 leading-relaxed max-w-sm">
            Sistem Terpadu Penaksiran, Pemutusan, &amp; Pencetakan Dokumen Operasional
          </p>

          {/* KARTU HARGA PASAR EMAS HARI INI (DENGAN VENDOR & DROPDOWN GRAM DI BAWAH) */}
          <div className="mt-8 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 p-5 max-w-md">
            {/* Baris Atas: Judul & Badge Persentase */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#FBF3D6]/90">
                    HARGA PASAR EMAS HARI INI
                  </p>
                  <button
                    type="button"
                    onClick={fetchGoldPrices}
                    title="Segarkan harga dari Galeri 24"
                    className="text-white/70 hover:text-white cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingGold ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
                <p className="text-xs text-white/75 mt-0.5">
                  Logam Mulia 24 Karat (99.99%) · {selectedVendor}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                  isLiveGold
                    ? "bg-[#2E7D32] text-white"
                    : "bg-[#C9A227]/25 text-[#FBF3D6] border border-[#C9A227]/40"
                }`}
              >
                {isLiveGold ? "Live" : "Referensi Harian"}
              </span>
            </div>

            {/* Baris Tengah: Nominal Harga Utama */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold num tracking-tight text-white">
                {fmtRp(activeWeightItem?.sellPrice || 2518000)}
              </span>
              <span className="text-xs text-white/75 font-medium">
                / {activeWeightItem?.weight.replace(".", ",") || "1"} gram
              </span>
            </div>
            <p className="text-xs text-[#FBF3D6]/90 mt-1 num">
              Harga Buyback:{" "}
              <b className="text-white">
                {fmtRp(activeWeightItem?.buybackPrice || 2370000)}
              </b>
            </p>

            {/* Baris Bawah: Pilihan Vendor & Dropdown Pilih Berat (Gram) */}
            <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Pilihan Vendor */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">
                  Vendor Logam Mulia
                </span>
                <div className="inline-flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/10">
                  {["GALERI 24", "ANTAM", "UBS"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setSelectedVendor(v);
                        setSelectedWeight("1");
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        selectedVendor === v
                          ? "bg-[#C9A227] text-[#084530]"
                          : "text-white/75 hover:text-white"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropdown Pilih Berat per Gram */}
              <div className="sm:w-36">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">
                  Pilih Berat (Gram)
                </label>
                <div className="relative">
                  <select
                    value={selectedWeight}
                    onChange={(e) => setSelectedWeight(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-7 rounded-lg bg-white text-[#084530] font-extrabold text-xs num border border-[#C9A227] appearance-none focus:outline-none cursor-pointer"
                  >
                    {weightList.map((item) => (
                      <option key={item.weight} value={item.weight} className="text-[#1B2420] font-bold bg-white">
                        {item.weight.replace(".", ",")} gram
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#084530] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-white/55 mt-2.5">
              Sumber: galeri24.co.id/harga-emas ·{" "}
              {currentVendorData?.updatedAt || "Diperbarui Harian"}
            </p>
          </div>
        </div>

        {/* Badge Kepatuhan DPS di Bawah Kiri */}
        <div className="relative z-10 mt-8">
          <div className="rounded-xl bg-[#0B5D3B]/90 border border-white/15 p-4 flex items-center gap-3.5 max-w-md">
            <div className="w-10 h-10 rounded-lg bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                Teraudit &amp; Diawasi Dewan Pengawas Syariah
              </p>
              <p className="text-[11px] text-white/75 mt-0.5">
                Standar Operasional Akad Rahn &amp; Mu&apos;nah — Fatwa DSN-MUI No. 25
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SISI KANAN: FOKUS MURNI FORM LOGIN (60% - Sesuai Figma P-01) */}
      <div className="flex-1 flex flex-col justify-between p-6 lg:p-12 bg-[#F6F7F5]/60 relative">
        {/* Status Kantor di Kanan Atas */}
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F2EC] border border-[#0B5D3B]/20 text-xs font-semibold text-[#084530]">
            Bank Mitra Syariah · Layanan Rahn
          </div>
        </div>

        {/* Kartu Form Login di Tengah Kanan */}
        <div className="w-full max-w-[440px] mx-auto bg-white rounded-2xl border border-[#E1E5E2] shadow-xs p-8 my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-mitra-syariah.png"
            alt="Bank Mitra Syariah"
            className="h-12 w-auto object-contain mb-5"
          />
          <h2 className="text-2xl font-bold text-[#1B2420]">Selamat Datang Kembali</h2>
          <p className="text-sm text-[#5F6B65] mt-1.5 leading-relaxed">
            Silakan masuk menggunakan kredensial petugas operasional yang telah terdaftar.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-[#FDECEA] border-l-4 border-[#C62828] text-xs font-medium text-[#C62828]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Username / NIP */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2420] mb-1.5">
                Username / NIP Petugas
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan NIP atau username"
                className="w-full h-11 px-3.5 rounded-lg border border-[#E1E5E2] bg-white text-sm text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/15"
              />
            </div>

            {/* Kata Sandi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1B2420]">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setInfoMsg(
                      "Silakan hubungi Super Admin IT Cabang Ponorogo untuk reset kata sandi Anda melalui menu Manajemen User."
                    )
                  }
                  className="text-xs font-semibold text-[#0B5D3B] hover:underline cursor-pointer"
                >
                  Lupa Sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-10 rounded-lg border border-[#E1E5E2] bg-white text-sm text-[#1B2420] focus:outline-none focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6B65] hover:text-[#1B2420]"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Unit Kerja / Kantor Cabang */}
            <div>
              <label className="block text-xs font-semibold text-[#1B2420] mb-1.5">
                Unit Kerja / Kantor Cabang
              </label>
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-9 rounded-lg border border-[#E1E5E2] bg-white text-sm font-bold text-[#1B2420] appearance-none focus:outline-none focus:border-[#0B5D3B] focus:ring-2 focus:ring-[#0B5D3B]/15"
                >
                  {CABANG_KANTOR.map((cabang) => (
                    <option key={cabang} value={cabang} className="text-[#1B2420] font-semibold bg-white">
                      {cabang}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#5F6B65] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {infoMsg && (
              <div className="p-3 rounded-lg bg-[#E6F2EC] border border-[#0B5D3B]/30 text-xs font-medium text-[#084530]">
                {infoMsg}
              </div>
            )}

            {/* Tombol Masuk Sistem */}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-12 mt-2 rounded-lg bg-[#0B5D3B] hover:bg-[#084530] text-white font-semibold text-sm transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loggingIn ? "Memverifikasi..." : "Masuk Sistem"}
            </button>
          </form>

          {/* Garis Pemisah */}
          <div className="my-6 border-t border-[#E1E5E2]" />

          {/* Simulasi Akses Mode Staging */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5F6B65] mb-2.5">
              SIMULASI AKSES · MODE STAGING
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { role: "PENAKSIR", label: "Penaksir" },
                  { role: "PEMUTUS", label: "Pemutus" },
                  { role: "BACK_OFFICE", label: "Back Office" },
                  { role: "ADMIN_IT", label: "Admin IT" },
                ] as { role: UserRole; label: string }[]
              ).map((item) => {
                const isSelected = activeStagingRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleSelectStagingRole(item.role)}
                    className={`h-8 px-2 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#E6F2EC] border-[#0B5D3B] text-[#0B5D3B]"
                        : "bg-[#F6F7F5] border-[#E1E5E2] text-[#5F6B65] hover:text-[#1B2420]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#5F6B65] mt-2.5 leading-normal">
              Pilih peran di atas untuk mengisi cepat kredensial demo, atau masukkan akun karyawan Anda secara langsung.
            </p>
          </div>
        </div>

        {/* Footer Hak Cipta */}
        <div className="text-center lg:text-right text-xs text-[#5F6B65] space-y-0.5">
          <p>© 2026 Bank Mitra Syariah Ponorogo · Sistem One Stop Gadai v2.4.0</p>
          <p className="text-[11px] text-[#9AA5A0]">
            Kebijakan Privasi · Keamanan &amp; Kepatuhan Syariah
          </p>
        </div>
      </div>
    </div>
  );
}
