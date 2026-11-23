export type UserRole = "PENAKSIR" | "PEMUTUS" | "BACK_OFFICE" | "ADMIN_IT";

export const CABANG_KANTOR = [
  "Kantor Pusat Ponorogo",
  "Kantor Kas Pasar Legi",
  "Kantor Cabang Somoroto",
] as const;

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  avatar?: string;
  branch: string;
}

export interface Nasabah {
  cif: string;
  nik: string;
  nama: string;
  hp: string;
  alamat: string;
  noRek?: string;
  pekerjaan?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  createdAt: string;
}

export type TransaksiStatus =
  | "Draft"
  | "Menunggu Pemutus"
  | "Disetujui Pemutus"
  | "Menunggu Back Office"
  | "Siap Cetak"
  | "Tercetak"
  | "Dibatalkan"
  | "Lunas"
  | "Lelang";

export interface MarhunItem {
  id: string;
  jenis: string; // "Cincin emas", "Kalung emas", "Gelang emas", "Logam Mulia"
  karat: string; // "24K", "22K", "21K", "20K", "18K", "16K"
  jumlah: number;
  beratKotor: number; // gram
  beratBersih: number; // gram
  nilaiTaksiran: number; // Rp
  keterangan?: string;
}

export interface TransaksiRahn {
  sbr: string; // SBR-2026-XXXXXX atau DRAFT-XXXX
  cif: string;
  nama: string;
  nik: string;
  alamat: string;
  hp: string;
  noRek?: string;
  
  // Barang jaminan
  barang: MarhunItem[];
  totalBeratKotor: number;
  totalBeratBersih: number;
  totalTaksiran: number;

  // Pembiayaan
  marhunBih: number; // Uang pinjaman
  ujroh: number; // Biaya pemeliharaan/sewa titipan
  biayaAdministrasi: number;
  nominalBersihDiterima: number;
  
  // Akad & Tanggal
  tanggalAkad: string;
  tanggalJatuhTempo: string; // biasanya 120 hari
  keteranganGadai: "Baru" | "Topup" | "Perpanjangan" | "Tebus Sebagian" | "Turun Plafon";
  
  // Legalitas & Pejabat
  kantor: string;
  petugasPenaksir: string;
  pemutusTtd?: string;
  pemutusWaktu?: string;
  noAkad?: string;
  noSbg?: string;
  noKontrak?: string;
  akadAsal?: string;
  
  status: TransaksiStatus;
  catatan?: string;
  batalAlasan?: string;
  cetakHistory: {
    dokumen: "SBR" | "NOTA" | "STIKER" | "HITCEP";
    waktu: string;
    petugas: string;
    ke: number;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  refId: string;
  notes: string;
}
