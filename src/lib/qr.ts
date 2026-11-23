import qrcode from "./qr-vendor.js";

interface QrInstance {
  addData: (data: string) => void;
  make: () => void;
  getModuleCount: () => number;
  isDark: (row: number, col: number) => boolean;
}

export function buildQrSvgData(text: string): { size: number; path: string } {
  const qr = (qrcode as (typeNumber: number, errorCorrectionLevel: string) => QrInstance)(0, "L");
  qr.addData(String(text || "-"));
  qr.make();

  const count = qr.getModuleCount();
  const size = count + 8; // 4-module quiet zone on each side
  let path = "";

  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (qr.isDark(y, x)) {
        path += `M${x + 4} ${y + 4}h1v1h-1z`;
      }
    }
  }

  return { size, path };
}
