"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
import {
  Search,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  timestamp: string | Date;
  user: string;
  role: string;
  action: string;
  refId: string | null;
  notes: string | null;
}

export function AuditClient({ initialLogs }: { initialLogs: AuditLogItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  const filtered = initialLogs.filter((l) => {
    const matchSearch =
      search === "" ||
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.refId && l.refId.toLowerCase().includes(search.toLowerCase())) ||
      (l.notes && l.notes.toLowerCase().includes(search.toLowerCase()));

    const matchRole = filterRole === "ALL" || l.role === filterRole;

    return matchSearch && matchRole;
  });

  const handleExportCsv = () => {
    const headers = ["Waktu", "Petugas", "Peran", "Aksi", "Ref ID", "Keterangan"];
    const rows = filtered.map((l) => {
      const dateStr =
        typeof l.timestamp === "string"
          ? l.timestamp
          : new Date(l.timestamp).toLocaleString("id-ID");
      return [
        `"${dateStr}"`,
        `"${l.user}"`,
        l.role,
        `"${l.action}"`,
        l.refId || "-",
        `"${(l.notes || "-").replace(/"/g, '""')}"`,
      ];
    });
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E5E2] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#1B2420]">
                Jejak Audit Aktivitas (Audit Log Trail)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F2EC] text-[#084530] text-[11px] font-bold border border-[#0B5D3B]/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B5D3B]" /> Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-[#5F6B65] mt-1">
              Catatan sistem permanen untuk seluruh aksi otorisasi, penaksiran, dan pencetakan dokumen rahn syariah.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="h-9 px-3.5 rounded-xl border border-[#E1E5E2] bg-white hover:bg-[#F6F7F5] text-xs font-bold text-[#1B2420] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3.5 rounded-xl bg-[#0B5D3B] hover:bg-[#084530] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor CSV
            </button>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="bg-white p-4 rounded-2xl border border-[#E1E5E2] shadow-xs grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6B65]" />
            <input
              type="text"
              placeholder="Cari User, No. SBR, atau Aksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E1E5E2] bg-white text-xs text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
            />
          </div>

          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#E1E5E2] bg-white text-xs font-semibold text-[#1B2420] focus:outline-none focus:border-[#0B5D3B]"
            >
              <option value="ALL">Semua Peran Petugas</option>
              <option value="PENAKSIR">PENAKSIR</option>
              <option value="PEMUTUS">PEMUTUS</option>
              <option value="BACK_OFFICE">BACK OFFICE</option>
              <option value="ADMIN_IT">ADMIN IT</option>
            </select>
          </div>
        </div>

        {/* Tabel Log */}
        <div className="bg-white rounded-2xl border border-[#E1E5E2] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#E6F2EC] text-[#084530] font-bold">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Petugas</th>
                  <th className="p-3">Peran</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Ref ID (SBR)</th>
                  <th className="p-3">Keterangan Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5E2]">
                {filtered.map((log) => {
                  const dateStr =
                    typeof log.timestamp === "string"
                      ? log.timestamp
                      : new Date(log.timestamp).toLocaleString("id-ID");

                  return (
                    <tr key={log.id} className="hover:bg-[#F6F7F5] transition-colors">
                      <td className="p-3 text-[#5F6B65] font-mono whitespace-nowrap">{dateStr}</td>
                      <td className="p-3 font-bold text-[#1B2420]">{log.user}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#F6F7F5] border border-[#E1E5E2] text-[#084530]">
                          {log.role}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[#0B5D3B]">{log.action}</td>
                      <td className="p-3 font-mono font-bold text-[#1B2420]">{log.refId || "-"}</td>
                      <td className="p-3 text-[#5F6B65] max-w-md">{log.notes || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
