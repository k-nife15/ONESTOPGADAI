import { NextResponse } from "next/server";
import { checkWhatsAppRegistered } from "@/lib/wa-notifier";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = String(body?.phone || "").trim();

    if (!phone) {
      return NextResponse.json(
        { success: false, registered: false, error: "Nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    const result = await checkWhatsAppRegistered(phone);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          registered: false,
          normalized: result.normalized,
          error: result.message,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      registered: result.registered,
      normalized: result.normalized,
      provider: result.provider,
      message: result.message,
    });
  } catch {
    return NextResponse.json(
      { success: false, registered: false, error: "Gagal memproses verifikasi nomor WhatsApp." },
      { status: 500 }
    );
  }
}
