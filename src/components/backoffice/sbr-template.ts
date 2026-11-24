import { fmtBerat } from "@/lib/formatters";

export interface MarhunItemData {
  id: string;
  jenis: string;
  karat: string;
  beratKotor: number;
  beratBersih: number;
  nilaiTaksiran: number;
  jumlah: number;
  keterangan: string | null;
}

export interface TransaksiCetakData {
  sbr: string;
  cif: string | null;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  noRek: string | null;
  totalBeratKotor: number;
  totalBeratBersih: number;
  totalTaksiran: number;
  marhunBih: number;
  ujroh: number;
  biayaAdmin: number;
  nominalBersih: number;
  tanggalAkad: string;
  tanggalJatuhTempo: string;
  keteranganGadai: string;
  kantor: string;
  petugasPenaksir: string;
  pemutusTtd: string | null;
  noAkad: string | null;
  noSbg: string | null;
  noKontrak?: string | null;
  status: string;
  catatan: string | null;
  barang: MarhunItemData[];
}

export interface SbrFieldLayout {
  k: string;
  label: string;
  l: number;
  t: number;
  f: number;
  w?: number;
  m?: boolean;
}

export interface SbrFieldOverlay extends SbrFieldLayout {
  v: (t: TransaksiCetakData) => string;
}

export const SBR_LAYOUT_STORAGE_KEY = "osg_sbr_layout_v1";

const fmtAngka = (n: number) => Number(n || 0).toLocaleString("id-ID");

export const ISIAN_SBR: SbrFieldOverlay[] = [
  { k: "kodeUnit", label: "Kode Unit / Cabang", l: 30.03, t: 20.03, f: 1.0, v: (t) => (t.kantor || "").toUpperCase() || "-" },
  { k: "s_cif", label: "CIF (Slip Custody)", l: 60.5, t: 21.6, f: 0.85, v: (t) => t.cif || "-" },
  { k: "r_cif", label: "CIF (Slip Rahin)", l: 81.3, t: 21.6, f: 0.82, v: (t) => t.cif || "-" },
  { k: "noAkad", label: "No. Akad", l: 25.77, t: 22.01, f: 1.0, v: (t) => t.noAkad || "" },
  { k: "cif", label: "CIF Utama", l: 11.95, t: 25.3, f: 0.88, v: (t) => t.cif || "-" },
  { k: "s_nama", label: "Nama (Slip Custody)", l: 56.5, t: 28.4, f: 0.8, w: 17.0, v: (t) => t.nama.toUpperCase() },
  { k: "r_nama", label: "Nama (Slip Rahin)", l: 77.3, t: 28.4, f: 0.78, w: 13.0, v: (t) => t.nama.toUpperCase() },
  { k: "akad", label: "Tgl Awal Gadai", l: 46.25, t: 26.03, f: 1.0, v: (t) => t.tanggalAkad },
  { k: "nama", label: "Nama Utama", l: 11.26, t: 26.85, f: 0.88, v: (t) => t.nama.toUpperCase() },
  { k: "alamat", label: "Alamat Utama", l: 11.95, t: 28.45, f: 0.88, v: (t) => t.alamat },
  { k: "noRek", label: "No. Rekening", l: 12.29, t: 30.64, f: 0.92, v: (t) => t.noRek || "-" },
  { k: "jatuh", label: "Tgl Jatuh Tempo", l: 44.54, t: 31.49, f: 1.0, v: (t) => t.tanggalJatuhTempo },
  { k: "hp", label: "No. HP / Telp", l: 16.72, t: 32.14, f: 0.92, v: (t) => t.hp },
  { k: "s_nik", label: "NIK (Slip Custody)", l: 61.5, t: 32.2, f: 0.78, v: (t) => t.nik },
  { k: "r_nik", label: "NIK (Slip Rahin)", l: 82.3, t: 32.2, f: 0.74, v: (t) => t.nik },
  { k: "s_alamat", label: "Alamat (Slip Custody)", l: 56.5, t: 39.8, f: 0.76, w: 17.0, v: (t) => t.alamat || "-" },
  { k: "r_alamat", label: "Alamat (Slip Rahin)", l: 77.3, t: 39.8, f: 0.74, w: 13.0, v: (t) => t.alamat || "-" },
  {
    k: "keterangan",
    label: "Keterangan Marhun Utama",
    l: 8.53,
    t: 37.49,
    f: 1.05,
    m: true,
    v: (t) =>
      t.barang.length
        ? t.barang
            .map((x, i) => `${i + 1}. ${x.jenis} ${x.karat} (${x.jumlah || 1}x), berat ${fmtBerat(x.beratBersih)}`)
            .join("\n")
        : "-",
  },
  { k: "s_no", label: "No. (Slip Custody)", l: 59.0, t: 45.8, f: 0.85, v: () => "" },
  { k: "r_no", label: "No. (Slip Rahin)", l: 79.8, t: 45.8, f: 0.82, v: () => "" },
  {
    k: "s_keterangan",
    label: "Marhun (Slip Custody)",
    l: 56.5,
    t: 53.6,
    f: 0.78,
    w: 17.0,
    v: (t) =>
      t.barang.length
        ? t.barang.map((x) => `${x.jenis} ${x.karat}, ${fmtBerat(x.beratBersih)}`).join("; ")
        : "-",
  },
  {
    k: "r_keterangan",
    label: "Marhun (Slip Rahin)",
    l: 77.3,
    t: 53.6,
    f: 0.76,
    w: 13.0,
    v: (t) =>
      t.barang.length
        ? t.barang.map((x) => `${x.jenis} ${x.karat}, ${fmtBerat(x.beratBersih)}`).join("; ")
        : "-",
  },
  { k: "taksiran", label: "Taksiran Marhun Utama", l: 42.66, t: 62.4, f: 1.2, v: (t) => fmtAngka(t.totalTaksiran) },
  { k: "s_akad", label: "Tgl Akad (Slip Custody)", l: 56.5, t: 67.0, f: 0.85, v: (t) => t.tanggalAkad },
  { k: "r_akad", label: "Tgl Akad (Slip Rahin)", l: 77.3, t: 67.0, f: 0.82, v: (t) => t.tanggalAkad },
  { k: "marhun", label: "Marhun Bih Utama", l: 42.66, t: 70.8, f: 1.2, v: (t) => fmtAngka(t.marhunBih) },
  { k: "s_taksiran", label: "Taksiran (Slip Custody)", l: 62.8, t: 72.4, f: 0.92, v: (t) => fmtAngka(t.totalTaksiran) },
  { k: "r_taksiran", label: "Taksiran (Slip Rahin)", l: 83.6, t: 72.4, f: 0.9, v: (t) => fmtAngka(t.totalTaksiran) },
  { k: "ujroh", label: "Ujroh Utama", l: 45.05, t: 78.4, f: 1.2, v: (t) => fmtAngka(t.ujroh) },
  { k: "s_marhun", label: "Marhun Bih (Slip Custody)", l: 62.8, t: 76.9, f: 0.92, v: (t) => fmtAngka(t.marhunBih) },
  { k: "r_marhun", label: "Marhun Bih (Slip Rahin)", l: 83.6, t: 76.9, f: 0.9, v: (t) => fmtAngka(t.marhunBih) },
  { k: "s_jatuh", label: "Jatuh Tempo (Slip Custody)", l: 56.5, t: 84.0, f: 0.85, v: (t) => t.tanggalJatuhTempo },
  { k: "r_jatuh", label: "Jatuh Tempo (Slip Rahin)", l: 77.3, t: 84.0, f: 0.82, v: (t) => t.tanggalJatuhTempo },
  { k: "ttd", label: "TTD Penaksir", l: 9.56, t: 84.09, f: 0.8, v: () => "" },
];
