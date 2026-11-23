"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";
import {
  UserCog,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Building,
  ShieldCheck,
} from "lucide-react";

export function ProfilClient() {
  const { user, setActiveUser } = useAuth();

  const [name, setName] = useState(user.name);
  const [newUsername, setNewUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      setName(user.name);
      setNewUsername(user.username);
    });
  }, [user.name, user.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !newUsername.trim()) {
      setFeedback({ type: "error", msg: "Nama lengkap dan username tidak boleh kosong." });
      return;
    }

    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setFeedback({ type: "error", msg: "Masukkan kata sandi saat ini untuk mengganti kata sandi." });
        return;
      }
      if (newPassword.length < 6) {
        setFeedback({ type: "error", msg: "Kata sandi baru minimal 6 karakter." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFeedback({ type: "error", msg: "Konfirmasi kata sandi baru tidak cocok." });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUsername: user.username,
          name: name.trim(),
          newUsername: newUsername.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal menyimpan profil." });
        return;
      }

      setActiveUser({
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        role: data.user.role as UserRole,
        branch: user.branch,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({
        type: "success",
        msg: "Profil dan kredensial akun Anda berhasil diperbarui.",
      });
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan saat menyimpan profil." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl space-y-5">
        <div className="bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#084530] text-[#C9A227] flex items-center justify-center font-extrabold text-sm shrink-0">
              {user.initials}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#1B2420]">{user.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#5F6B65]">
                <span className="px-2 py-0.5 rounded bg-[#E6F2EC] text-[#084530] font-bold">
                  {user.roleLabel}
                </span>
                <span className="font-mono">@{user.username}</span>
                <span className="inline-flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" /> {user.branch}
                </span>
              </div>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              feedback.type === "success"
                ? "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/30"
                : "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#0B5D3B] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#C62828] shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs space-y-5 text-xs"
        >
          <div className="border-b border-[#E1E5E2] pb-3">
            <h2 className="text-sm font-extrabold text-[#1B2420] flex items-center gap-2">
              <UserCog className="w-4 h-4 text-[#0B5D3B]" />
              Pengaturan Identitas &amp; Username
            </h2>
            <p className="text-[11px] text-[#5F6B65] mt-0.5">
              Anda dapat menyesuaikan nama tampilan dan username untuk login berikutnya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#1B2420] mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2420] mb-1">Username / NIP *</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] font-mono focus:outline-none focus:border-[#0B5D3B]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E1E5E2]">
            <h2 className="text-sm font-extrabold text-[#1B2420] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#C9A227]" />
              Ganti Kata Sandi (Opsional)
            </h2>
            <p className="text-[11px] text-[#5F6B65] mt-0.5">
              Kosongkan bagian ini jika tidak ingin mengubah kata sandi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#1B2420] mb-1">Kata Sandi Saat Ini</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2420] mb-1">Kata Sandi Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1B2420] mb-1">Ulangi Sandi Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi sandi baru"
                className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E1E5E2] flex items-center justify-between">
            <span className="text-[11px] text-[#5F6B65] inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0B5D3B]" />
              Perubahan tercatat otomatis di Audit Log.
            </span>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
