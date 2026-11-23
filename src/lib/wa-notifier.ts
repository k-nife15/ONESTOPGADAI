import { fmtRp } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export type WaProvider = "mock" | "fonnte" | "waha" | "webhook";

export type WaEventType =
  | "PEMUTUS_APPROVED"
  | "TRANSAKSI_REJECTED"
  | "BACKOFFICE_REGISTERED"
  | "TRANSAKSI_LUNAS";

export interface WaNotificationPayload {
  event: WaEventType;
  sbr: string;
  nama: string;
  hp: string;
  marhunBih?: number;
  noAkad?: string | null;
  noSbg?: string | null;
  tanggalJatuhTempo?: string | null;
  alasan?: string | null;
}

/**
 * Normalisasi nomor HP Indonesia menjadi format internasional tanpa '+' (contoh: 0812xxx -> 62812xxx).
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/**
 * Menyusun isi pesan WhatsApp berdasarkan event transaksi rahn.
 */
export function buildWaMessage(payload: WaNotificationPayload): string {
  const { event, sbr, nama, marhunBih, noAkad, noSbg, tanggalJatuhTempo, alasan } = payload;

  switch (event) {
    case "PEMUTUS_APPROVED":
      return [
        `Assalamu'alaikum Wr. Wb. Bpk/Ibu *${nama}*,`,
        ``,
        `Pengajuan Gadai Syariah (Rahn) Anda dengan nomor berkas *${sbr}* telah *DISETUJUI* oleh Pemutus.`,
        `Nilai Pinjaman (Marhun Bih): *${fmtRp(marhunBih)}*`,
        ``,
        `Silakan konfirmasi ke petugas penaksir kami untuk proses registrasi akad dan pencairan.`,
        `Terima kasih — OneStop Gadai Syariah`,
      ].join("\n");

    case "TRANSAKSI_REJECTED":
      return [
        `Assalamu'alaikum Wr. Wb. Bpk/Ibu *${nama}*,`,
        ``,
        `Mohon maaf, pengajuan Gadai Syariah (Rahn) dengan nomor berkas *${sbr}* saat ini *DIBATALKAN / BELUM DAPAT DIPROSES*.`,
        alasan ? `Keterangan: ${alasan}` : "",
        ``,
        `Silakan hubungi petugas kami untuk informasi lebih lanjut.`,
        `Terima kasih — OneStop Gadai Syariah`,
      ]
        .filter(Boolean)
        .join("\n");

    case "BACKOFFICE_REGISTERED":
      return [
        `Assalamu'alaikum Wr. Wb. Bpk/Ibu *${nama}*,`,
        ``,
        `Akad Gadai Syariah (Rahn) Anda telah selesai diregistrasi dan siap dicairkan:`,
        `• No. Berkas: *${sbr}*`,
        noAkad ? `• No. Akad: *${noAkad}*` : "",
        noSbg ? `• No. SBG: *${noSbg}*` : "",
        marhunBih !== undefined ? `• Marhun Bih: *${fmtRp(marhunBih)}*` : "",
        tanggalJatuhTempo ? `• Jatuh Tempo: *${tanggalJatuhTempo}*` : "",
        ``,
        `Terima kasih atas kepercayaan Anda — OneStop Gadai Syariah`,
      ]
        .filter(Boolean)
        .join("\n");

    case "TRANSAKSI_LUNAS":
      return [
        `Assalamu'alaikum Wr. Wb. Bpk/Ibu *${nama}*,`,
        ``,
        `Pelunasan akad Gadai Syariah (Rahn) *${noAkad || sbr}* telah berhasil dicatat dengan status *LUNAS*.`,
        `Barang jaminan (marhun) siap/telah diserahkan kembali.`,
        ``,
        `Terima kasih telah bertransaksi — OneStop Gadai Syariah`,
      ].join("\n");
  }
}

function getProviderConfig() {
  const rawProvider = (process.env.WA_PROVIDER || "mock").toLowerCase();
  const provider: WaProvider =
    rawProvider === "fonnte" || rawProvider === "waha" || rawProvider === "webhook"
      ? rawProvider
      : "mock";

  return {
    provider,
    apiUrl: process.env.WA_API_URL || "",
    apiKey: process.env.WA_API_KEY || "",
    wahaSession: process.env.WA_WAHA_SESSION || "default",
    webhookHeader: process.env.WA_WEBHOOK_HEADER || "x-webhook-secret",
  };
}

/**
 * Memeriksa header autentikasi untuk endpoint callback/cron dari n8n.
 * Jika WA_API_KEY belum disetel di .env, akses diizinkan untuk kebutuhan dev lokal.
 */
export function isWebhookAuthorized(request: Request): boolean {
  const { apiKey, webhookHeader } = getProviderConfig();
  if (!apiKey) return true;
  return request.headers.get(webhookHeader) === apiKey;
}

async function recordWaFailureAudit(sbr: string, hp: string, reason: string) {
  try {
    await prisma.auditLog.create({
      data: {
        user: "System WA",
        role: "SYSTEM",
        action: "Notifikasi WA Gagal",
        refId: sbr || null,
        notes: `Gagal mengirim WA ke ${hp}: ${reason}`,
      },
    });
  } catch (err) {
    console.error("[WA-NOTIF] Gagal menyimpan auditLog:", err);
  }
}

/**
 * Mengirim notifikasi WhatsApp ke nasabah secara non-blocking.
 * Tidak akan melempar error ke caller agar transaksi utama tetap berhasil.
 */
export async function notifyNasabahWa(payload: WaNotificationPayload): Promise<void> {
  try {
    const nomorHp = normalizePhoneNumber(payload.hp);
    if (!nomorHp) {
      console.warn(`[WA-NOTIF] Nomor HP kosong/tidak valid untuk berkas ${payload.sbr}`);
      return;
    }

    const message = buildWaMessage(payload);
    const config = getProviderConfig();

    if (config.provider === "mock") {
      console.info(
        `[WA-NOTIF][MOCK] Event=${payload.event} | To=${nomorHp} (${payload.nama}) | SBR=${payload.sbr}\n${message}`
      );
      return;
    }

    const signal = AbortSignal.timeout(5000);
    let url = config.apiUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let body: Record<string, unknown>;

    if (config.provider === "fonnte") {
      url = url || "https://api.fonnte.com/send";
      if (config.apiKey) headers.Authorization = config.apiKey;
      body = { target: nomorHp, message };
    } else if (config.provider === "waha") {
      url = url || "http://localhost:3000/api/sendText";
      if (config.apiKey) headers["X-Api-Key"] = config.apiKey;
      body = {
        session: config.wahaSession,
        chatId: `${nomorHp}@c.us`,
        text: message,
      };
    } else {
      if (!url) {
        console.warn(`[WA-NOTIF] WA_API_URL belum diisi untuk mode webhook (${payload.sbr})`);
        return;
      }
      if (config.apiKey) headers[config.webhookHeader] = config.apiKey;
      body = {
        event: payload.event,
        nomor: nomorHp,
        nomorHp,
        namaNasabah: payload.nama,
        sbr: payload.sbr,
        noAkad: payload.noAkad || null,
        noSbg: payload.noSbg || null,
        pesan: message,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const reason = `HTTP ${res.status}${errText ? ` - ${errText.slice(0, 120)}` : ""}`;
      console.error(
        `[WA-NOTIF][${config.provider.toUpperCase()}] Gagal (${res.status}) untuk ${payload.sbr}: ${errText}`
      );
      await recordWaFailureAudit(payload.sbr, nomorHp, reason);
      return;
    }

    if (config.provider === "webhook") {
      const json = await res.json().catch(() => null);
      if (json && json.sent === false) {
        const reason = String(json.reason || "Nomor tidak terdaftar di WhatsApp");
        console.warn(`[WA-NOTIF][WEBHOOK] Gagal untuk ${payload.sbr}: ${reason}`);
        await recordWaFailureAudit(payload.sbr, nomorHp, reason);
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Koneksi ke gateway WA gagal";
    console.error(`[WA-NOTIF] Error mengirim notifikasi untuk ${payload.sbr}:`, error);
    await recordWaFailureAudit(payload.sbr, payload.hp, reason);
  }
}
