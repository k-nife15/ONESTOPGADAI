"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_STLE, fmtRp } from "@/lib/formatters";
import { CABANG_KANTOR } from "@/lib/types";
import {
  Building,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  KeyRound,
  Pencil,
  Coins,
  Trash2,
} from "lucide-react";

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
  branch: string;
  updatedAt: string;
}

export function UsersClient({
  initialUsers,
  initialStle = DEFAULT_STLE,
}: {
  initialUsers: UserItem[];
  initialStle?: number;
}) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("PENAKSIR");
  const [newBranch, setNewBranch] = useState("Kantor Pusat Ponorogo");
  const [newPassword, setNewPassword] = useState("syariah2026");
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("syariah2026");
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("PENAKSIR");
  const [editBranch, setEditBranch] = useState("");
  const [stleInput, setStleInput] = useState<number>(initialStle);
  const [savingStle, setSavingStle] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const toggleStatus = async (target: UserItem) => {
    if (target.active && target.username === currentUser?.username) {
      setFeedback({ type: "error", msg: "Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan." });
      return;
    }
    setSavingId(target.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          active: !target.active,
          actor: currentUser?.name || "Admin IT",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal memperbarui status user." });
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, active: !u.active } : u))
      );
      setFeedback({
        type: "success",
        msg: `Status akses ${target.name} berhasil diubah menjadi ${!target.active ? "Aktif" : "Nonaktif"}.`,
      });
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          role: newRole,
          branch: newBranch,
          password: newPassword,
          actor: currentUser?.name || "Admin IT",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal menambahkan petugas." });
        return;
      }
      setUsers((prev) => [...prev, data.data]);
      setAddOpen(false);
      setNewUsername("");
      setNewName("");
      setNewRole("PENAKSIR");
      setNewPassword("syariah2026");
      setFeedback({ type: "success", msg: `Petugas ${data.data.name} berhasil ditambahkan ke database.` });
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setSavingId(resetTarget.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetTarget.id,
          newPassword: resetPasswordValue,
          actor: currentUser?.name || "Admin IT",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal mereset kata sandi." });
        return;
      }
      setFeedback({
        type: "success",
        msg: `Kata sandi untuk ${resetTarget.name} (@${resetTarget.username}) berhasil direset.`,
      });
      setResetTarget(null);
      setResetPasswordValue("syariah2026");
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingId(editTarget.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          name: editName.trim(),
          role: editRole,
          branch: editBranch.trim(),
          actor: currentUser?.name || "Admin IT",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal memperbarui data petugas." });
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === editTarget.id ? { ...u, ...data.data } : u))
      );
      setFeedback({
        type: "success",
        msg: `Data petugas ${data.data.name} berhasil diperbarui.`,
      });
      setEditTarget(null);
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveStle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStle(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/stle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stle: stleInput,
          actor: currentUser?.name || "Admin IT",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal memperbarui STLE kantor." });
        return;
      }
      setStleInput(data.stle);
      setFeedback({
        type: "success",
        msg: `STLE resmi kantor berhasil diperbarui menjadi ${fmtRp(data.stle)} / gram.`,
      });
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingStle(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.username === currentUser?.username) {
      setFeedback({ type: "error", msg: "Anda tidak dapat menghapus akun yang sedang Anda gunakan." });
      setDeleteTarget(null);
      return;
    }

    setSavingId(deleteTarget.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deleteTarget.id,
          actor: currentUser?.name || "Admin IT",
          actorUsername: currentUser?.username,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFeedback({ type: "error", msg: data.error || "Gagal menghapus akun petugas." });
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setFeedback({
        type: "success",
        msg: data.message || `Akun ${deleteTarget.name} berhasil dihapus.`,
      });
      setDeleteTarget(null);
    } catch {
      setFeedback({ type: "error", msg: "Terjadi kesalahan jaringan." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppShell>
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDECEA] text-[#C62828] flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1B2420]">
                    Hapus Akun Petugas
                  </h3>
                  <p className="text-xs text-[#5F6B65] mt-1 leading-relaxed">
                    Akun <b className="text-[#1B2420]">{deleteTarget.name}</b> (
                    <span className="font-mono">@{deleteTarget.username}</span>) akan dihapus permanen dari sistem RBAC.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-9 px-4 rounded-lg border border-[#E1E5E2] text-xs font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingId === deleteTarget.id}
                onClick={handleDeleteUser}
                className="h-9 px-4 rounded-lg bg-[#C62828] hover:bg-[#A61E1E] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingId === deleteTarget.id ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E5E2]">
              <h3 className="text-base font-extrabold text-[#1B2420]">
                Edit Peran &amp; Cabang Petugas
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Peran (Role) *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] bg-white font-bold focus:outline-none focus:border-[#0B5D3B]"
                >
                  <option value="PENAKSIR">PENAKSIR</option>
                  <option value="PEMUTUS">PEMUTUS</option>
                  <option value="BACK_OFFICE">BACK_OFFICE</option>
                  <option value="ADMIN_IT">ADMIN_IT</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Kantor Cabang *</label>
                <input
                  type="text"
                  required
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="h-9 px-4 rounded-xl border border-[#E1E5E2] font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingId === editTarget.id}
                  className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E5E2]">
              <h3 className="text-base font-extrabold text-[#1B2420]">
                Reset Kata Sandi Petugas
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-3 text-xs">
              <p className="text-[#5F6B65]">
                Atur kata sandi sementara untuk <b className="text-[#1B2420]">{resetTarget.name}</b> (@{resetTarget.username}):
              </p>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Kata Sandi Baru (min. 6 karakter) *</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] font-mono focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="h-9 px-4 rounded-xl border border-[#E1E5E2] font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingId === resetTarget.id}
                  className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  Simpan Kata Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#E1E5E2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E5E2]">
              <h3 className="text-base font-extrabold text-[#1B2420]">Tambah Petugas Baru</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="text-[#5F6B65] hover:text-[#1B2420] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Username / NIP *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="contoh: pnk.budi / pmt.arifin / bof.rina / adm.slamet"
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] font-mono focus:outline-none focus:border-[#0B5D3B]"
                />
                <p className="text-[10px] text-[#5F6B65] mt-1">
                  Gunakan kode awalan unik per role: <b>pnk.</b> (Penaksir), <b>pmt.</b> (Pemutus), <b>bof.</b> (Back Office), <b>adm.</b> (Admin IT).
                </p>
              </div>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Peran (Role) *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] bg-white font-bold focus:outline-none focus:border-[#0B5D3B]"
                >
                  <option value="PENAKSIR">PENAKSIR</option>
                  <option value="PEMUTUS">PEMUTUS</option>
                  <option value="BACK_OFFICE">BACK_OFFICE</option>
                  <option value="ADMIN_IT">ADMIN_IT</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Kantor Cabang</label>
                <select
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] bg-white font-semibold focus:outline-none focus:border-[#0B5D3B]"
                >
                  {CABANG_KANTOR.map((cabang) => (
                    <option key={cabang} value={cabang}>
                      {cabang}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1B2420] mb-1">Kata Sandi Awal (min. 6 karakter) *</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E1E5E2] font-mono focus:outline-none focus:border-[#0B5D3B]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="h-9 px-4 rounded-xl border border-[#E1E5E2] font-bold text-[#5F6B65] hover:bg-[#F6F7F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-9 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {creating ? "Menyimpan..." : "Simpan Petugas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-[#1B2420]">
                Manajemen User &amp; Peran Petugas (RBAC)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F2EC] text-[#084530] text-[11px] font-bold border border-[#0B5D3B]/20">
                Akses Khusus Admin IT
              </span>
            </div>
            <p className="text-xs text-[#5F6B65] mt-1">
              Pengaturan akun petugas loket penaksir, pemutus akad pembiayaan, kasir back office, dan dewan pengawas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Tambah Petugas
          </button>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border ${
              feedback.type === "success"
                ? "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/30"
                : "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#0B5D3B]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C62828]" />
              )}
              <span>{feedback.msg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pengaturan STLE Resmi Kantor (Khusus Super Admin IT) */}
        <form
          onSubmit={handleSaveStle}
          className="bg-white p-5 rounded-2xl border border-[#C9A227]/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FBF3D6] text-[#7A6110] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#1B2420]">
                Standar Taksiran Logam Emas (STLE) Resmi Kantor
              </h2>
              <p className="text-[11px] text-[#5F6B65] mt-0.5">
                Nilai paten acuan taksiran per gram 24K untuk loket Penaksir. Hanya dapat diubah oleh Admin IT.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5F6B65]">Rp</span>
              <input
                type="number"
                step="10000"
                min={100000}
                value={stleInput || ""}
                placeholder="0"
                onChange={(e) => setStleInput(parseInt(e.target.value, 10) || 0)}
                className="w-44 h-10 pl-8 pr-3 rounded-xl border border-[#C9A227] bg-white text-xs font-extrabold text-[#084530] num focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>
            <button
              type="submit"
              disabled={savingStle}
              className="h-10 px-4 rounded-xl bg-[#084530] hover:bg-[#0B5D3B] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {savingStle ? "Menyimpan..." : "Simpan STLE"}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white p-5 rounded-2xl border border-[#E1E5E2] shadow-xs flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#1B2420]">{u.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === "PENAKSIR"
                        ? "bg-[#E6F2EC] text-[#084530]"
                        : u.role === "PEMUTUS"
                        ? "bg-[#FBF3D6] text-[#7A6110]"
                        : u.role === "BACK_OFFICE"
                        ? "bg-[#E0F2F1] text-[#00695C]"
                        : "bg-[#ECEFED] text-[#1B2420]"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <p className="text-xs text-[#5F6B65] font-mono">Username: @{u.username}</p>
                <p className="text-xs text-[#5F6B65] flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" /> {u.branch}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={savingId === u.id}
                  onClick={() => toggleStatus(u)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                    u.active
                      ? "bg-[#E6F2EC] text-[#084530] border-[#0B5D3B]/30 hover:bg-[#C62828] hover:text-white"
                      : "bg-[#FDECEA] text-[#C62828] border-[#C62828]/30 hover:bg-[#2E7D32] hover:text-white"
                  }`}
                >
                  {u.active ? "Aktif" : "Nonaktif"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget(u);
                    setEditName(u.name);
                    setEditRole(u.role);
                    setEditBranch(u.branch);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[#E1E5E2] text-[#084530] hover:bg-[#E6F2EC] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" /> Edit Role/Cabang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(u);
                    setResetPasswordValue("syariah2026");
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[#E1E5E2] text-[#5F6B65] hover:text-[#084530] hover:bg-[#F6F7F5] inline-flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" /> Reset Sandi
                </button>
                <button
                  type="button"
                  disabled={savingId === u.id || u.username === currentUser?.username}
                  onClick={() => setDeleteTarget(u)}
                  title={
                    u.username === currentUser?.username
                      ? "Tidak dapat menghapus akun sendiri"
                      : "Hapus akun petugas"
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[#C62828]/30 text-[#C62828] hover:bg-[#FDECEA] inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
