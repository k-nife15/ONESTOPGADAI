import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface NotificationItem {
  sbr: string;
  nama: string;
  marhunBih: number;
  status: string;
  tanggalAkad: string;
  href: string;
  label: string;
}

function mapStatusToAction(status: string): { href: string; label: string } {
  switch (status) {
    case "Menunggu Pemutus":
      return { href: "/pemutus", label: "Perlu Otorisasi Pemutus" };
    case "Disetujui Pemutus":
      return { href: "/monitoring", label: "Disetujui — Bacakan ke Nasabah" };
    case "Menunggu Back Office":
      return { href: "/backoffice", label: "Perlu Registrasi Back Office" };
    case "Siap Cetak":
      return { href: "/cetak", label: "Siap Cetak Dokumen" };
    case "Draft":
      return { href: "/monitoring", label: "Draft Belum Diajukan" };
    case "Dibatalkan":
      return { href: "/monitoring", label: "Dibatalkan / Dikembalikan" };
    default:
      return { href: "/monitoring", label: status };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "PENAKSIR";

    let statusFilter: string[];
    let orderBy: { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc" } = {
      createdAt: "asc",
    };

    if (role === "PEMUTUS") {
      statusFilter = ["Menunggu Pemutus"];
    } else if (role === "BACK_OFFICE") {
      statusFilter = ["Menunggu Back Office"];
    } else if (role === "PENAKSIR") {
      statusFilter = ["Disetujui Pemutus", "Draft", "Siap Cetak", "Dibatalkan"];
      orderBy = { updatedAt: "desc" };
    } else {
      statusFilter = [
        "Menunggu Pemutus",
        "Disetujui Pemutus",
        "Menunggu Back Office",
        "Siap Cetak",
      ];
    }

    const rows = await prisma.transaksiRahn.findMany({
      where: {
        status: { in: statusFilter },
      },
      select: {
        sbr: true,
        nama: true,
        marhunBih: true,
        status: true,
        tanggalAkad: true,
      },
      orderBy,
      take: 15,
    });

    const totalCount = await prisma.transaksiRahn.count({
      where: {
        status: { in: statusFilter },
      },
    });

    const items: NotificationItem[] = rows.map((row) => {
      const action = mapStatusToAction(row.status);
      return {
        ...row,
        href: action.href,
        label: action.label,
      };
    });

    if (role === "BACK_OFFICE" || role === "PENAKSIR" || role === "ADMIN_IT") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const waFailures = await prisma.auditLog.findMany({
        where: {
          action: "Notifikasi WA Gagal",
          timestamp: { gte: sevenDaysAgo },
        },
        include: {
          transaksi: {
            select: {
              sbr: true,
              nama: true,
              marhunBih: true,
              tanggalAkad: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        take: 5,
      });

      for (const log of waFailures) {
        items.unshift({
          sbr: log.transaksi?.sbr || log.refId || "WA-ALERT",
          nama: log.transaksi?.nama || "Nasabah",
          marhunBih: log.transaksi?.marhunBih || 0,
          status: "WA Gagal",
          tanggalAkad: log.transaksi?.tanggalAkad || log.timestamp.toISOString().slice(0, 10),
          href: "/monitoring",
          label: `WA Gagal Terkirim — ${log.notes.slice(0, 60)}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: totalCount + Math.max(0, items.length - rows.length),
      items,
    });
  } catch (error) {
    console.error("Gagal mengambil notifikasi:", error);
    return NextResponse.json(
      { success: false, count: 0, items: [] },
      { status: 500 }
    );
  }
}
