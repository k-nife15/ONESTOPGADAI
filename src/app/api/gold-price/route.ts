import { NextResponse } from "next/server";

export interface GoldWeightPrice {
  weight: string; // "0.5", "1", "2", "5", "10", "25", "50", "100"
  sellPrice: number;
  buybackPrice: number;
}

export interface VendorGoldData {
  vendor: string;
  updatedAt: string;
  items: GoldWeightPrice[];
}

const FALLBACK_DATA: Record<string, VendorGoldData> = {
  ANTAM: {
    vendor: "ANTAM",
    updatedAt: "Senin, 9 November 2026",
    items: [
      { weight: "0.5", sellPrice: 1343000, buybackPrice: 1172000 },
      { weight: "1", sellPrice: 2584000, buybackPrice: 2344000 },
      { weight: "2", sellPrice: 5106000, buybackPrice: 4688000 },
      { weight: "3", sellPrice: 7633000, buybackPrice: 7033000 },
      { weight: "5", sellPrice: 12688000, buybackPrice: 11722000 },
      { weight: "10", sellPrice: 25320000, buybackPrice: 23444000 },
      { weight: "25", sellPrice: 63171000, buybackPrice: 58321000 },
      { weight: "50", sellPrice: 126261000, buybackPrice: 116642000 },
      { weight: "100", sellPrice: 252443000, buybackPrice: 233285000 },
    ],
  },
  "GALERI 24": {
    vendor: "GALERI 24",
    updatedAt: "Senin, 9 November 2026",
    items: [
      { weight: "0.5", sellPrice: 1320000, buybackPrice: 1182000 },
      { weight: "1", sellPrice: 2518000, buybackPrice: 2370000 },
      { weight: "2", sellPrice: 4974000, buybackPrice: 4731000 },
      { weight: "5", sellPrice: 12345000, buybackPrice: 11827000 },
      { weight: "10", sellPrice: 24622000, buybackPrice: 23655000 },
      { weight: "25", sellPrice: 61225000, buybackPrice: 58846000 },
      { weight: "50", sellPrice: 122353000, buybackPrice: 117692000 },
      { weight: "100", sellPrice: 244583000, buybackPrice: 235384000 },
      { weight: "250", sellPrice: 609955000, buybackPrice: 585549000 },
      { weight: "500", sellPrice: 1219910000, buybackPrice: 1171098000 },
      { weight: "1000", sellPrice: 2439819000, buybackPrice: 2342197000 },
    ],
  },
  UBS: {
    vendor: "UBS",
    updatedAt: "Senin, 9 November 2026",
    items: [
      { weight: "0.5", sellPrice: 1390000, buybackPrice: 1172000 },
      { weight: "1", sellPrice: 2572000, buybackPrice: 2344000 },
      { weight: "2", sellPrice: 5104000, buybackPrice: 4688000 },
      { weight: "5", sellPrice: 12611000, buybackPrice: 11722000 },
      { weight: "10", sellPrice: 25089000, buybackPrice: 23444000 },
      { weight: "25", sellPrice: 62600000, buybackPrice: 58321000 },
      { weight: "50", sellPrice: 124944000, buybackPrice: 116642000 },
      { weight: "100", sellPrice: 249789000, buybackPrice: 233285000 },
    ],
  },
};

function parseRpNumber(str: string): number {
  const digits = str.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function parseVendorSection(htmlText: string, vendorTitle: string): VendorGoldData | null {
  // Strip tags for clean text matching
  const text = htmlText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const headerRegex = new RegExp(
    `Diperbarui\\s+([^H]+?)\\s+Harga\\s+${vendorTitle}\\s+Berat\\s+Harga\\s+Jual\\s+Harga\\s+Buyback\\s+([\\s\\S]+?)(?=Diperbarui|Produk Emas|$)`,
    "i"
  );
  const match = text.match(headerRegex);
  if (!match) return null;

  const updatedAt = match[1].trim();
  const body = match[2].trim();

  // Match rows like: 0.5 Rp1.343.000 Rp1.172.000 or 1 Rp2.584.000 Rp2.344.000
  const rowRegex = /(\d+(?:\.\d+)?)\s*Rp\s*([\d.]+)\s*Rp\s*([\d.]+)/g;
  const items: GoldWeightPrice[] = [];
  let rowMatch;
  while ((rowMatch = rowRegex.exec(body)) !== null) {
    items.push({
      weight: rowMatch[1],
      sellPrice: parseRpNumber(rowMatch[2]),
      buybackPrice: parseRpNumber(rowMatch[3]),
    });
  }

  if (items.length === 0) return null;
  return {
    vendor: vendorTitle,
    updatedAt,
    items,
  };
}

export async function GET() {
  try {
    const res = await fetch("https://galeri24.co.id/harga-emas", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 }, // Cache 1 jam
    });

    if (!res.ok) {
      return NextResponse.json({
        source: "https://galeri24.co.id/harga-emas",
        live: false,
        vendors: FALLBACK_DATA,
      });
    }

    const html = await res.text();
    const antam = parseVendorSection(html, "ANTAM") || FALLBACK_DATA["ANTAM"];
    const galeri24 = parseVendorSection(html, "GALERI 24") || FALLBACK_DATA["GALERI 24"];
    const ubs = parseVendorSection(html, "UBS") || FALLBACK_DATA["UBS"];

    return NextResponse.json({
      source: "https://galeri24.co.id/harga-emas",
      live: true,
      vendors: {
        ANTAM: antam,
        "GALERI 24": galeri24,
        UBS: ubs,
      },
    });
  } catch {
    return NextResponse.json({
      source: "https://galeri24.co.id/harga-emas",
      live: false,
      vendors: FALLBACK_DATA,
    });
  }
}
