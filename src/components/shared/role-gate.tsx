"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  pageTitle?: string;
}

export function RoleGate({ allowedRoles, children, pageTitle }: RoleGateProps) {
  const { user } = useAuth();

  const isAllowed = allowedRoles.includes(user.role);

  if (!isAllowed) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E1E5E2] p-8 text-center shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-[#FDECEA] text-[#C62828] flex items-center justify-center mx-auto mb-4 border border-[#C62828]/20">
              <ShieldAlert className="w-9 h-9 stroke-[2]" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FDECEA] text-[#C62828] mb-3">
              <Lock className="w-3.5 h-3.5" />
              Akses Ditolak (RBAC Restriction)
            </span>

            <h3 className="text-xl font-extrabold text-[#1B2420]">
              Peran Anda Tidak Berwenang
            </h3>

            <p className="text-xs text-[#5F6B65] mt-2 leading-relaxed">
              Halaman {pageTitle ? `"${pageTitle}"` : "ini"} hanya dapat diakses oleh petugas dengan hak akses:{" "}
              <b className="text-[#0B5D3B]">{allowedRoles.join(", ")}</b>.
            </p>

            <div className="my-5 p-3.5 rounded-xl bg-[#F6F7F5] border border-[#E1E5E2] text-xs text-left">
              <div className="flex justify-between py-1 border-b border-[#E1E5E2]">
                <span className="text-[#5F6B65]">Nama Petugas:</span>
                <span className="font-bold text-[#1B2420]">{user.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6B65]">Peran Anda Saat Ini:</span>
                <span className="font-extrabold text-[#C62828]">{user.roleLabel}</span>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full h-10 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
