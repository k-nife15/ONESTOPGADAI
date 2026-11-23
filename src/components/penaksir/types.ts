export interface BarangHistori {
  jenis: string;
  karat: string | number;
  jumlah?: number;
  beratKotor: number;
  beratBersih: number;
  nilaiTaksiran: number;
  keterangan: string | null;
}

export interface TransaksiHistori {
  sbr: string;
  status: string;
  marhunBih: number;
  totalTaksiran: number;
  tanggalAkad: string;
  barang: BarangHistori[];
}

export interface NasabahOption {
  cif: string;
  nama: string;
  nik: string;
  hp: string;
  alamat: string;
  noRek: string | null;
  noKontrak?: string | null;
  transaksi?: TransaksiHistori[];
}

export interface FormItemBarang {
  id: string;
  jenis: string;
  karat: number; // 16 s/d 24
  jumlah: number;
  beratKotor: number;
  beratBersih: number;
  kondisi: string;
  nilaiTaksiran: number;
}

export interface PendingConfirmTx {
  sbr: string;
  nama: string;
  totalTaksiran: number;
  marhunBih: number;
  ujroh: number;
  biayaAdmin: number;
  nominalBersih: number;
  tanggalJatuhTempo: string;
  catatan: string | null;
}

export interface SuccessResultData {
  sbr: string;
  nama: string;
  marhunBih: number;
  status: string;
  wewenang: string;
  kewajiban: number;
}
