import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fmtRp } from "@/lib/formatters";
import { isWebhookAuthorized, normalizePhoneNumber } from "@/lib/wa-notifier";

export const dynamic = "force-dynamic";

function getJakartaDateString(offsetDays = 0): string {
  const now = new Date();
  const jakartaMs = now.getTime() + 7 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(jakartaMs).toISOString().slice(0, 10);
}

/**
 * Endpoint untuk Schedule Trigger (Cron) n8n setiap pagi.
 * Mengembalikan daftar akad aktif yang jatuh tempo hari ini (H-0) atau 3 hari lagi (H-3).
 */
export async function GET(request: Request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized webhook secret." },
      { status: 401 }
    );
  }

  try {
    const todayStr = getJakartaDateString(0);
    const h3Str = getJakartaDateString(3);

    const rows = await prisma.transaksiRahn.findMany({
      where: {
        status: { in: ["Siap Cetak", "Tercetak"] },
        tanggalJatuhTempo: { in: [todayStr, h3Str] },
      },
      select: {
        sbr: true,
        nama: true,
        hp: true,
        noAkad: true,
        noSbg: true,
        marhunBih: true,
        tanggalJatuhTempo: true,
      },
      orderBy: { tanggalJatuhTempo: "asc" },
    });

    const items = rows
      .map((tx) => {
        const nomorHp = normalizePhoneNumber(tx.hp);
        if (!nomorHp) return null;

        const isToday = tx.tanggalJatuhTempo === todayStr;
        const reminderType = isToday ? "H-0" : "H-3";
        const waktuLabel = isToday ? "HARI INI" : "3 HARI LAGI";

        const pesan = [
          `Assalamu'alaikum Wr. Wb. Bpk/Ibu *${tx.nama}*,`,
          ``,
          `Kami mengingatkan bahwa akad Gadai Syariah (Rahn) *${tx.noAkad || tx.sbr}* akan jatuh tempo *${waktuLabel}* (${tx.tanggalJatuhTempo}).`,
          `• No. SBG: *${tx.noSbg || "-"}*`,
          `• Marhun Bih: *${fmtRp(tx.marhunBih)}*`,
          ``,
          `Silakan melakukan pelunasan atau perpanjangan di kantor kami sebelum melewati jatuh tempo.`,
          `Terima kasih — OneStop Gadai Syariah`,
        ].join("\n");

        return {
          sbr: tx.sbr,
          namaNasabah: tx.nama,
          nomorHp,
          noAkad: tx.noAkad,
          noSbg: tx.noSbg,
          marhunBih: tx.marhunBih,
          tanggalJatuhTempo: tx.tanggalJatuhTempo,
          reminderType,
          pesan,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({
      success: true,
      date: todayStr,
      h3Date: h3Str,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Gagal mengambil daftar pengingat jatuh tempo:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat daftar pengingat jatuh tempo." },
      { status: 500 }
    );
  }
}
