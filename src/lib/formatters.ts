/**
 * Format angka ke format mata uang Rupiah Indonesia (Rp 1.000.000)
 */
export function fmtRp(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;
  if (!n || isNaN(n)) return "Rp 0";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/**
 * Format berat emas dengan koma desimal (contoh: 12,40 g)
 */
export function fmtBerat(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (n === null || n === undefined || isNaN(n)) return "0,00 g";
  return n.toFixed(2).replace(".", ",") + " g";
}

/**
 * Parse string berat yang mengandung koma atau titik menjadi number float
 */
export function parseBerat(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const normalized = value.toString().trim().replace(",", ".");
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/**
 * Menyeragamkan nomor HP/WhatsApp menjadi digit lokal tanpa tanda hubung (contoh: 081234567890)
 */
export function formatNoWaLocal(value: string | null | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return `0${digits.slice(2)}`.slice(0, 15);
  return digits.slice(0, 15);
}

/**
 * Faktor konversi kemurnian karat ke desimal
 */
export const KARAT_FAKTOR: Record<string, number> = {
  "24K": 0.999,
  "23K": 0.958,
  "22K": 0.916,
  "21K": 0.875,
  "20K": 0.833,
  "18K": 0.750,
  "17K": 0.708,
  "16K": 0.666,
};

/**
 * Harga Pasar Standar (HPS) Emas per gram default (24K Murni)
 */
export const DEFAULT_HPS_PER_GRAM = 1_350_000;
export const DEFAULT_STLE = 1_350_000;

/**
 * Hitung taksiran satu item marhun emas
 */
export function hitungTaksiranItem(
  karat: string,
  beratBersih: number,
  hpsBase: number = DEFAULT_HPS_PER_GRAM
): number {
  const faktor = KARAT_FAKTOR[karat] || 0.833;
  return Math.round(beratBersih * faktor * hpsBase);
}

/**
 * Hitung rangkuman pembiayaan Rahn
 * - Plafon Maksimal: 60% dari total taksiran (standar konservatif syariah)
 * - Ujroh bulanan: kisaran 1.1% - 1.25% dari nilai taksiran per bulan
 * - Biaya Administrasi: 0.5% dari marhun bih
 */
export function hitungPembiayaanRahn(
  totalTaksiran: number,
  marhunBihDimohon: number
) {
  const maxPinjaman60Persen = Math.round(totalTaksiran * 0.6);
  const marhunBih = Math.min(marhunBihDimohon, totalTaksiran);
  
  // Ujroh 120 hari (~4 bulan) dihitung proporsional ~1% per bulan dari nilai taksiran
  const ujrohBulanan = Math.round(totalTaksiran * 0.01);
  const ujrohTotal = ujrohBulanan * 4; // 120 hari
  
  // Biaya administrasi & asuransi titipan
  const biayaAdmin = Math.round(marhunBih * 0.005);
  const nominalBersihDiterima = Math.max(0, marhunBih - biayaAdmin);

  return {
    maxPinjaman: maxPinjaman60Persen,
    marhunBih,
    ujrohTotal,
    biayaAdmin,
    nominalBersihDiterima,
  };
}

/**
 * Format tanggal dalam format Indonesia formal (12 Okt 2026)
 */
export function formatDateIndo(dateStrOrObj?: string | Date): string {
  if (!dateStrOrObj) return "-";
  const date = typeof dateStrOrObj === "string" ? new Date(dateStrOrObj) : dateStrOrObj;
  if (isNaN(date.getTime())) return String(dateStrOrObj);

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const d = String(date.getDate()).padStart(2, "0");
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

/**
 * Konversi angka bulan ke angka Romawi (1 -> I, 9 -> IX, 10 -> X, dst.)
 */
export function getRomanMonth(monthZeroIndexed: number): string {
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return romanMonths[monthZeroIndexed] || "I";
}

/**
 * Generator No. Akad resmi: [NomorUrut]/MMS/RAHN/[BulanRomawi]/[Tahun]
 * Contoh: 001/MMS/RAHN/IX/2026
 */
export function generateNoAkad(seq: number, date: Date = new Date()): string {
  const padSeq = String(seq).padStart(3, "0");
  const romanMonth = getRomanMonth(date.getMonth());
  const year = date.getFullYear();
  return `${padSeq}/MMS/RAHN/${romanMonth}/${year}`;
}

/**
 * Generator No. SBG (Surat Bukti Gadai) 11 Digit
 * Contoh: 26092856186
 */
export function generateNoSbg(seq: number, date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const randFive = String((seq * 71 + 56186) % 100000).padStart(5, "0");
  return `${yy}${mm}${dd}${randFive}`;
}

/**
 * Generator No. Kontrak Permanen Nasabah (10 Digit CBS)
 * Contoh: 4420101123
 */
export function generateNoKontrakPermanen(cif: string): string {
  const cleanDigits = cif.replace(/\D/g, "");
  const baseNum = cleanDigits.slice(-6) || "010388";
  return `442${baseNum.padStart(7, "0")}`;
}
