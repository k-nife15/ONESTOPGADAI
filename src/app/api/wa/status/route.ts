import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWebhookAuthorized, normalizePhoneNumber } from "@/lib/wa-notifier";

/**
 * Endpoint callback asinkron dari n8n (WhatsApp Trigger) saat Meta WA Business
 * melaporkan status pengiriman gagal (mis. error 131026 nomor tidak terdaftar di WA).
 */
export async function POST(request: Request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized webhook secret." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { sbr, nomorHp, status, errorCode, reason } = body as {
      sbr?: string;
      nomorHp?: string;
      status?: string;
      errorCode?: string | number;
      reason?: string;
    };

    const normalizedHp = nomorHp ? normalizePhoneNumber(nomorHp) : "";
    let refSbr = sbr || null;

    if (!refSbr && normalizedHp) {
      const localSuffix = normalizedHp.startsWith("62") ? normalizedHp.slice(2) : normalizedHp;
      const matchedTx = await prisma.transaksiRahn.findFirst({
        where: {
          OR: [
            { hp: { contains: localSuffix } },
            { hp: { contains: normalizedHp } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: { sbr: true },
      });
      refSbr = matchedTx?.sbr || null;
    }

    const isFailed = !status || status.toLowerCase() === "failed";
    const detailReason =
      reason ||
      (errorCode ? `Kode error WA: ${errorCode} (nomor tidak terdaftar / tidak dapat dihubungi)` : "Pesan WA gagal terkirim");

    await prisma.auditLog.create({
      data: {
        user: "n8n WA Callback",
        role: "SYSTEM",
        action: isFailed ? "Notifikasi WA Gagal" : "Notifikasi WA Terkirim",
        refId: refSbr,
        notes: `${isFailed ? "Gagal kirim" : "Terkirim"} ke ${normalizedHp || nomorHp || "-"}: ${detailReason}`,
      },
    });

    return NextResponse.json({ success: true, refId: refSbr });
  } catch (error) {
    console.error("Gagal memproses callback status WA:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mencatat status WA." },
      { status: 500 }
    );
  }
}
