"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FilePlus2,
  ClipboardList,
  CheckCircle2,
  Printer,
  BookOpen,
  UserCog,
  History,
  Bell,
  LogOut,
  FileCheck2,
  X,
  Menu,
  ArrowRight,
  CheckCircle2 as CheckCircleIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";
import { fmtRp } from "@/lib/formatters";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard Operasional",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"],
  },
  {
    id: "nasabah",
    label: "Master Data Nasabah (CIF)",
    href: "/nasabah",
    icon: Users,
    roles: ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"],
  },
  {
    id: "taksiran",
    label: "Input Taksiran & Gadai",
    href: "/taksiran",
    icon: FilePlus2,
    roles: ["PENAKSIR", "ADMIN_IT"],
  },
  {
    id: "monitoring",
    label: "Monitoring Transaksi",
    href: "/monitoring",
    icon: ClipboardList,
    roles: ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"],
  },
  {
    id: "pemutus",
    label: "Konfirmasi Pemutus",
    href: "/pemutus",
    icon: CheckCircle2,
    roles: ["PEMUTUS", "ADMIN_IT"],
  },
  {
    id: "backoffice",
    label: "Registrasi Back Office",
    href: "/backoffice",
    icon: FileCheck2,
    roles: ["BACK_OFFICE", "ADMIN_IT"],
  },
  {
    id: "cetak",
    label: "Studio Cetak Dokumen",
    href: "/cetak",
    icon: Printer,
    roles: ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"],
  },
  {
    id: "rekap",
    label: "Rekap Buku Besar (db gadai)",
    href: "/rekap",
    icon: BookOpen,
    roles: ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"],
  },
  {
    id: "users",
    label: "Manajemen User (RBAC)",
    href: "/users",
    icon: UserCog,
    roles: ["ADMIN_IT"],
  },
  {
    id: "audit",
    label: "Audit Log Aktivitas",
    href: "/audit",
    icon: History,
    roles: ["ADMIN_IT"],
  },
  {
    id: "profil",
    label: "Pengaturan Profil & Sandi",
    href: "/profil",
    icon: UserCog,
    roles: ["PENAKSIR", "PEMUTUS", "BACK_OFFICE", "ADMIN_IT"],
  },
];

interface AppNotificationItem {
  sbr: string;
  nama: string;
  marhunBih: number;
  status: string;
  tanggalAkad: string;
  href: string;
  label: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [clockText, setClockText] = useState("Jumat, 16 Okt 2026 · 10:45 WIB");
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState<AppNotificationItem[]>([]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const dayName = days[now.getDay()];
      const d = String(now.getDate()).padStart(2, "0");
      const m = months[now.getMonth()];
      const y = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setClockText(`${dayName}, ${d} ${m} ${y} · ${hh}:${mm} WIB`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const res = await fetch(
          `/api/notifications?role=${encodeURIComponent(user.role)}&branch=${encodeURIComponent(user.branch)}&userName=${encodeURIComponent(user.name)}`,
          {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data.success) return;

        setNotifCount(data.count || 0);
        setNotifItems(data.items || []);

        if (
          (user.role === "PEMUTUS" || user.role === "BACK_OFFICE") &&
          (data.count || 0) > 0 &&
          typeof window !== "undefined"
        ) {
          const shownKey = `osg_notif_shown_${user.role}`;
          if (!sessionStorage.getItem(shownKey)) {
            sessionStorage.setItem(shownKey, "1");
            setNotifOpen(true);
          }
        }
      } catch {
        // Ignore transient network errors for background notification polling
      }
    };

    loadNotifications();
    const handleRefresh = () => {
      loadNotifications();
    };
    window.addEventListener("osg:refresh-notifications", handleRefresh);
    return () => {
      active = false;
      window.removeEventListener("osg:refresh-notifications", handleRefresh);
    };
  }, [user.role, user.branch, user.name, pathname]);

  useEffect(() => {
    if (!user.username) return;
    const sendHeartbeat = () => {
      void fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(timer);
  }, [user.username]);

  const currentNav =
    NAV_ITEMS.find((it) => pathname === it.href || pathname.startsWith(it.href + "/")) ||
    NAV_ITEMS[0];

  const visibleMenu = NAV_ITEMS.filter((it) => it.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-[#F6F7F5] text-[#1B2420]">
      {/* MOBILE DRAWER BACKDROP */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden noprint"
        />
      )}

      {/* SIDEBAR NAVIGATION (EMERALD DARK #084530) */}
      <aside
        className={`w-[252px] shrink-0 bg-[#084530] text-white flex flex-col fixed inset-y-0 left-0 z-40 h-screen noprint border-r border-[#0B5D3B]/40 shadow-lg transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Block (64px height) */}
        <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between gap-2 bg-[#063525]">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mitra-syariah-icon.png"
              alt="Bank Mitra Syariah"
              className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_1px_3px_rgba(255,255,255,0.25)]"
            />
            <div className="leading-tight min-w-0">
              <span className="block font-extrabold text-[14px] tracking-tight text-white truncate">
                ONE STOP GADAI
              </span>
              <span className="block text-[11px] text-[#FBF3D6]/80 font-medium truncate">
                Bank Mitra Syariah
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu"
            className="lg:hidden p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {visibleMenu.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#0B5D3B] text-white font-bold shadow-xs border border-white/15"
                    : "text-white/75 hover:text-white hover:bg-white/10 font-medium"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#C9A227] rounded-r-md" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-[#C9A227]" : "text-white/70"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Profile & Logout */}
        <div className="p-3 border-t border-white/10 space-y-2.5 bg-[#063525]/60">
          <div className="rounded-xl bg-white/10 border border-white/15 p-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#C9A227] text-[#084530] flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user.name}
                </p>
                <p className="text-[11px] font-semibold text-[#FBF3D6] truncate">
                  {user.roleLabel}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/70 mt-2 pt-2 border-t border-white/10 truncate">
              {user.branch}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void fetch("/api/auth/heartbeat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user.username, offline: true }),
              }).catch(() => {});
              logout();
              router.push("/login");
            }}
            className="w-full h-9 rounded-lg bg-white/10 hover:bg-[#C62828] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR NAVIGATION (EMERALD PEKAT #0B5D3B DENGAN AKSEN EMAS) */}
        <header className="h-16 bg-[#0B5D3B] text-white border-b-2 border-[#C9A227] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 noprint shadow-md">
          {/* Mobile Hamburger + Breadcrumb & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] text-[#FBF3D6]/90 font-medium truncate">
                Operasional / {currentNav.label}
              </p>
              <h1 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                {currentNav.label}
              </h1>
            </div>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-4">
            <span className="hidden xl:inline-block text-xs text-white/80 font-medium num bg-white/10 px-3 py-1 rounded-full border border-white/15">
              {clockText}
            </span>

            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-white">
              {user.branch}
            </span>

            {/* Notification Bell & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer transition-colors"
                title="Notifikasi berkas antrean"
              >
                <Bell className="w-4 h-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#C62828] text-white text-[10px] font-bold flex items-center justify-center shadow-xs num">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white text-[#1B2420] rounded-2xl border border-[#E1E5E2] shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 bg-[#084530] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#C9A227]" />
                      <span className="text-xs font-extrabold tracking-wide">
                        Notifikasi Tugas ({notifCount})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      aria-label="Tutup notifikasi"
                      className="text-white/75 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E1E5E2]">
                    {notifItems.length > 0 ? (
                      notifItems.map((item, idx) => (
                        <button
                          key={`${item.sbr}-${item.status}-${idx}`}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            router.push(item.href);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#E6F2EC]/50 transition-colors cursor-pointer flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-extrabold text-[#084530]">
                                {item.sbr}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#FBF3D6] text-[#7A6110] text-[10px] font-bold">
                                {item.label}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-[#1B2420] mt-0.5 truncate">
                              {item.nama}
                            </p>
                            <p className="text-[11px] text-[#5F6B65] num">
                              UP: {fmtRp(item.marhunBih)} · {item.tanggalAkad}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#0B5D3B] shrink-0 mt-1" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-xs text-[#5F6B65] space-y-1.5">
                        <CheckCircleIcon className="w-6 h-6 text-[#2E7D32] mx-auto" />
                        <p className="font-semibold text-[#1B2420]">Semua antrean sudah bersih</p>
                        <p className="text-[11px]">Belum ada berkas baru untuk peran {user.roleLabel}.</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2.5 bg-[#F6F7F5] border-t border-[#E1E5E2] flex items-center justify-between">
                    <span className="text-[11px] text-[#5F6B65] font-medium">
                      Peran: <b className="text-[#1B2420]">{user.roleLabel}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        router.push(
                          user.role === "PEMUTUS"
                            ? "/pemutus"
                            : user.role === "BACK_OFFICE"
                            ? "/backoffice"
                            : "/monitoring"
                        );
                      }}
                      className="text-[11px] font-extrabold text-[#0B5D3B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Buka Halaman Kerja
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE VIEWPORT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1240px] w-full mx-auto print:p-0 print:max-w-none print:m-0">
          {children}
        </main>
      </div>
    </div>
  );
}
