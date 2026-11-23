/**
 * Modul Hitungan Cepat (HITCEP) Resmi — Bank Mitra Syariah Ponorogo
 * Mengimplementasikan 6 rumus baku:
 * 1. Nilai Taksiran (NT) per Item = (Karat / 24) * Berat (g) * STLE
 * 2. UP Maks (Maksimum Plafond) = Total Nilai Taksiran * 94%
 * 3. Tarif Ujroh Berjenjang (Sheet 'tabel' VLOOKUP tiering)
 * 4. Total Kewajiban = UP + Ujroh 4 Bulan + Biaya Admin
 * 5. Selisih PPAP (Analisis Risiko) = UP Maks - (Taksiran * 85%)
 * 6. Wewenang Pemutus Kredit (Kabag Marketing, Direktur Bisnis, Komite / Dekom)
 */

export interface HitcepItemInput {
  karat: number; // 16 s/d 24
  berat: number; // gram
}

export interface HitcepResult {
  // Nilai Taksiran
  stle: number;
  totalTaksiran: number;
  upMaks: number; // 94% LTV

  // Uang Pinjaman Dimohon
  upDisetujui: number;
  isUpValid: boolean; // UP <= UP Maks

  // Biaya Sewa (Ujroh)
  ujrohBulanan: number;
  ujroh4Bulan: number;
  biayaAdmin: number;
  totalKewajiban: number;

  // Analisis Risiko Manrisk
  taksiran85Persen: number;
  selisihPpap: number;
  isPpapCovered: boolean; // apakah cadangan cover

  // Wewenang Pemutus
  wewenangPemutus: "Kabag Marketing" | "Kabag Mkt + Dir. Bisnis" | "Kabag Mkt + Dir. Bisnis + Dekom";
}

/**
 * Tabel Tiering Ujroh (Sheet 'tabel' VLOOKUP acuan Rahn Emas)
 * Tarif per bulan berjenjang berdasarkan plafon pinjaman (UP)
 */
export interface TierUjroh {
  minUp: number;
  maxUp: number;
  ratePerBulan: number; // Persentase (contoh: 0.01 = 1%)
  biayaAdminFlat?: number; // Biaya admin flat jika ada
}

export const TABEL_TIER_UJROH: TierUjroh[] = [
  { minUp: 0, maxUp: 5_000_000, ratePerBulan: 0.0125, biayaAdminFlat: 25_000 }, // Tier 1: s/d 5 Jt
  { minUp: 5_000_001, maxUp: 20_000_000, ratePerBulan: 0.0115, biayaAdminFlat: 50_000 }, // Tier 2: 5 - 20 Jt
  { minUp: 20_000_001, maxUp: 50_000_000, ratePerBulan: 0.01, biayaAdminFlat: 75_000 }, // Tier 3: 20 - 50 Jt
  { minUp: 50_000_001, maxUp: 100_000_000, ratePerBulan: 0.0095, biayaAdminFlat: 100_000 }, // Tier 4: 50 - 100 Jt
  { minUp: 100_000_001, maxUp: Infinity, ratePerBulan: 0.0085, biayaAdminFlat: 150_000 }, // Tier 5: > 100 Jt
];

/**
 * 1. Hitung Nilai Taksiran per Item:
 * NT Item = (Karat / 24) * Berat (g) * STLE
 */
export function hitungNtItem(karat: number, berat: number, stle: number): number {
  if (karat < 8 || karat > 24 || berat <= 0 || stle <= 0) return 0;
  const kemurnian = karat / 24;
  return Math.round(kemurnian * berat * stle);
}

/**
 * Cari tarif Ujroh Bulanan berdasarkan tabel tiering (VLOOKUP TRUE)
 */
export function lookupUjrohBulanan(up: number, totalTaksiran: number): {
  ujrohBulanan: number;
  biayaAdmin: number;
  rate: number;
} {
  const safeUp = Math.max(0, up || 0);
  const tier =
    TABEL_TIER_UJROH.find((t) => safeUp <= t.maxUp) ||
    TABEL_TIER_UJROH[TABEL_TIER_UJROH.length - 1];

  // Ujroh dihitung dari Nilai Taksiran Agunan Emas (Sesuai Fiqih Rahn DSN-MUI)
  const ujrohBulanan = Math.round(totalTaksiran * tier.ratePerBulan);
  const biayaAdmin = tier.biayaAdminFlat || Math.round(safeUp * 0.005);

  return {
    ujrohBulanan,
    biayaAdmin,
    rate: tier.ratePerBulan,
  };
}

/**
 * 6. Penentuan Wewenang Pemutus Kredit
 * 500rb - 50 Jt      -> Kabag Marketing
 * > 50 Jt - 100 Jt   -> Kabag Mkt + Dir. Bisnis
 * > 100 Jt - 250 Jt  -> Kabag Mkt + Dir. Bisnis + Dekom
 */
export function tentukanWewenangPemutus(
  up: number
): "Kabag Marketing" | "Kabag Mkt + Dir. Bisnis" | "Kabag Mkt + Dir. Bisnis + Dekom" {
  if (up <= 50_000_000) {
    return "Kabag Marketing";
  } else if (up <= 100_000_000) {
    return "Kabag Mkt + Dir. Bisnis";
  } else {
    return "Kabag Mkt + Dir. Bisnis + Dekom";
  }
}

/**
 * Fungsi Lengkap Eksekusi HITCEP
 */
export function kalkulasiHitcep(
  items: { karat: number; berat: number }[],
  upDimohon: number,
  stle: number
): HitcepResult {
  // 1. Total Nilai Taksiran (NT)
  const totalTaksiran = items.reduce(
    (acc, it) => acc + hitungNtItem(it.karat, it.berat, stle),
    0
  );

  // 2. Maksimum Plafond (UP Maks = Total NT * 94%)
  const upMaks = Math.round(totalTaksiran * 0.94);
  const isUpValid = upDimohon <= upMaks;

  // 3. Tarif Ujroh Berjenjang (Sheet 'tabel' VLOOKUP)
  const { ujrohBulanan, biayaAdmin } = lookupUjrohBulanan(upDimohon, totalTaksiran);
  const ujroh4Bulan = ujrohBulanan * 4; // Tenor Standar Rahn 120 Hari

  // 4. Total Kewajiban Pelunasan
  const totalKewajiban = upDimohon + ujroh4Bulan + biayaAdmin;

  // 5. Evaluasi PPAP & Selisih Agunan (Analisis Risiko)
  // Selisih PPAP = UP Maks - (Taksiran * 85%)
  const taksiran85Persen = Math.round(totalTaksiran * 0.85);
  const selisihPpap = upMaks - taksiran85Persen;
  const isPpapCovered = selisihPpap >= 0;

  // 6. Penentuan Wewenang Pemutus Kredit
  const wewenangPemutus = tentukanWewenangPemutus(upDimohon);

  return {
    stle,
    totalTaksiran,
    upMaks,
    upDisetujui: upDimohon,
    isUpValid,
    ujrohBulanan,
    ujroh4Bulan,
    biayaAdmin,
    totalKewajiban,
    taksiran85Persen,
    selisihPpap,
    isPpapCovered,
    wewenangPemutus,
  };
}
