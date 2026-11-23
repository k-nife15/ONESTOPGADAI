# Referensi Konsep Awal Master Excel (`One-Stop-Service-Gadai-MMS25-Pusat-Master.xlsx`)

Dokumen ini merangkum struktur sheet, rumus perhitungan, dan skema data dari file master Excel konsep awal pembuatan aplikasi **One Stop Gadai — Bank Mitra Syariah**.

## 1. Daftar Sheet (Total 22 Sheet)

| No | Nama Sheet | Peran di Operasional |
|---|---|---|
| 1 | `Form Responses 1` | Input awal form |
| 2 | `master cif (iba)` | Data induk nasabah & fasilitas (`Nomor CIF`, `No Rekening`, `KTP`, `Nama`, `Alamat`, `Nama Ibu Kandung`, `No HP`, `No SBR`, `Qty`, `Nominal Pinjaman`) |
| 3 | `konsol HITCEP` | Konsolidasi perhitungan taksiran & plafon dari seluruh barang jaminan |
| 4–13 | `HITCEP BJ 1` s.d. `HITCEP BJ 10` | Lembar kerja penaksiran per item barang jaminan (hingga 10 item per transaksi) |
| 14 | `CETAK NOTA TRANSAKSI (FAKTUR)` | Template cetak nota/faktur transaksi |
| 15 | `sbr_baru 15 x 25.7` | Template cetak Surat Bukti Rahn (SBR) ukuran `15 x 25.7 cm` untuk akad baru |
| 16 | `sbr_lama 15 x 25.7` | Template cetak SBR ukuran `15 x 25.7 cm` untuk perpanjangan/akad lama |
| 17 | `STIKER+QRCODE` | Template stiker kantong emas dengan QR Code (Nama, CIF/Akad, Plafond, Ujroh, Tgl Mulai–JT, Kantor, Status Baru/Lama, rincian BJ) |
| 18 | `db gadai (rekap)` | Database rekapitulasi seluruh akad gadai aktif/lunas |
| 19 | `history  log gadai` | Log riwayat transaksi gadai |
| 20 | `tabel` | Tabel referensi tarif Ujroh pembiayaan Rahn iB (per bulan & tahunan) |
| 21 | `master_data` | Konsolidasi field identitas nasabah & akad untuk kebutuhan cetak formulir |
| 22 | `FPG` | Formulir Permohonan Gadai (untuk diri sendiri / kuasa orang lain) |

---

## 2. Rumus & Aturan Bisnis yang Ditemukan

### A. Perhitungan Penaksiran (`konsol HITCEP` & `HITCEP BJ 1..10`)
- **Harga Dasar 24K (`D3`):** Diambil di `konsol HITCEP!D3` (contoh di master: `2.100.000`).
- **Taksiran:**
  ```excel
  =((Karat / 24) * HargaDasar24K) * Gram
  ```
- **Maks Plafond:**
  - `92%` dari Taksiran (terlihat pada contoh karat 17 & 21)
  - `94%` dari Taksiran (terlihat pada contoh karat 18)
- **UP (Uang Pinjaman):**
  ```excel
  = MaksPlafond * 94%
  ```
- **Pembanding PPAP 85% & Selisih:**
  ```excel
  PPAP_85 = Taksiran * 85%
  Selisih = UP - PPAP_85
  ```
- **Tanggal Jatuh Tempo Standar:**
  ```excel
  =EDATE(TglMulaiGadai, 4)   # Tenor standar 4 bulan
  ```

### B. Skema Kolom `db gadai (rekap)` (`A1:T1`)
1. `NO`
2. `NOMOR SBR`
3. `NAMA`
4. `NOMOR AKAD`
5. `NOMOR SBG`
6. `NOMOR FASILITAS`
7. `PLAFOND`
8. `UJROH`
9. `UJROH 4 BULAN`
10. `TANGGAL DROPPING`
11. `JANGKA WAKTU`
12. `TANGGAL JATUH TEMPO`
13. `KELOLAAN`
14. `KETERANGAN`
15. `KETERANGAN BARANG`
16. `KARAT`
17. `BERAT`
18. `JUMLAH BARANG`
19. `NOMOR HP`
20. `STATUS LUNAS`

---

## 3. Catatan Pemetaan ke Aplikasi Web (`onestopgadai-app`)
- **Sudah terakomodasi:** Master CIF, Penaksiran multi-barang (`HITCEP`), Nomor SBR & Akad, Studio Cetak (SBR `15×25,7`, Nota Kasir, Lembar HITCEP, Stiker Kantong QR Code), Rekap `db gadai`, dan Log Riwayat.
- **Potensi pengembangan lanjutan dari master Excel:**
  1. Cetak **FPG (Formulir Permohonan Gadai)** di Studio Cetak.
  2. Pembedaan template/penandaan **Akad Baru vs Perpanjangan (`sbr_baru` / `sbr_lama`)**.
  3. Penambahan kolom `Nomor SBG` & `Nomor Fasilitas` serta ekspor/impor langsung format `db gadai (rekap)` saat integrasi data kantor.
