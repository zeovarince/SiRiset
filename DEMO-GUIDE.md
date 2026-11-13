# Panduan Demonstrasi UAS — SiRiset

**Mata Kuliah:** Pemodelan Proses Bisnis (Semester 5) · **Dosen Pengampu & Penguji:** Dr. Rika Yunitarini, ST., MT.
**Kelompok 2:** Reno Syaelendra (24-020) · Rifda Nahariyah (24-019) · Evan Rafa Radya (24-063) · A. Choiril Anwar (24-098) · Surya Maulana (24-160)
**Durasi paparan:** 15 menit (+ tanya jawab) · **Studi kasus:** Transformasi proses MBKM Riset (MB04) Prodi Teknik Informatika UTM

> Naskah ini sudah diuji ulang dari basis data segar (`npm run db:reset`) — seluruh label tombol dan angka di bawah sesuai tampilan aplikasi.

---

## 1. Persiapan (H-1 dan 30 menit sebelum ujian)

| Kapan | Langkah | Perintah / Catatan |
| :--- | :--- | :--- |
| H-1 | Pasang dependensi | `npm install` |
| H-1 | Siapkan `.env` | Salin `.env.example` → `.env`, isi `SESSION_SECRET` & `DOCUMENT_SIGNING_SECRET` (≥ 32 karakter acak), pastikan `DEMO_MODE="true"` |
| H-1 | Uji build | `npm run build` (harus tanpa error) |
| **Hari-H, ≤ 30 menit sebelum** | **Reset data demo** | `npm run db:reset` — tanggal demo dihitung relatif dari "hari ini", jadi **wajib dijalankan pada hari ujian** |
| Hari-H | Jalankan server | `npm run dev` → buka `http://localhost:3000` |
| Hari-H | Masuk sekali | Halaman Masuk → panel **DEMO** → klik **Mahasiswa · Ilyas** (setelah itu cukup pakai **Quick Demo Bar**) |
| Hari-H | Tampilan proyektor | Zoom peramban 110–125 %, mode layar penuh (F11), tutup tab lain |
| Hari-H | Berkas unggahan | Buka folder `demo-assets/` di File Explorer (dibuat otomatis oleh seed) |

**Berkas di `demo-assets/`:** `Proposal_Reno_Syaelendra_ViT.pdf` · `Laporan_Kemajuan_Ilyas.pdf` · `Draf_Artikel_Ilyas_ViT.pdf`

**Kondisi awal data setelah reset:**
- 2 lowongan riset terbit (ViT — Dr. Mula'ab, kuota 4; BPMN — Dr. Rika, kuota 3).
- **Ilyas**: peserta aktif yang sudah menuntaskan 16 minggu — 16 logbook (1 terlambat, minggu ke-16 menunggu ulasan), sudah tersinkron SIMPELMAS, **belum** punya laporan kemajuan, luaran, dan nilai.
- **Reno**: belum mendaftar (mewakili alur dari awal).
- Semua akun berpassword `password123`.

---

## 2. Akun Demo & Quick Demo Bar

Bar mengambang **MODE DEMO** di bawah layar berisi 7 tombol — klik untuk berganti akun **tanpa logout-login**. Bila peran baru berhak membuka halaman yang sedang tampil, halaman tetap sama (berguna saat E-Approval).

| Tombol Quick Demo Bar | Nama | NIM/NIP | Peran |
| :--- | :--- | :--- | :--- |
| Mhs: Reno Syaelendra (24-020) | Reno Syaelendra | 240411100020 | Mahasiswa (pelamar baru) |
| Mhs: Ilyas (Peserta Aktif) | Ilyas | 220411100088 | Mahasiswa (riset aktif) |
| Dosen Peneliti: Dr. Mula'ab | Dr. Mula'ab, S.Si., M.Kom. | 197204152000031001 | Dosen Peneliti |
| Dosen Wali: Dr. Rika Yunitarini | Dr. Rika Yunitarini, ST., MT. | 198306072006042001 | Dosen Wali (+ Dosen Peneliti) |
| Kaprodi: Bain Khusnul Khotimah | Bain Khusnul Khotimah, S.T., M.Kom. | 197905202005012002 | Kaprodi |
| Koordinator MBKM: Fifin Ayu Mufarroha | Fifin Ayu Mufarroha, S.Kom., M.Kom. | 198902122019032014 | Koordinator MBKM |
| Reviewer LPPM: Dr. Budi Santoso | Dr. Budi Santoso, MT. | 196803121994031002 | Reviewer LPPM |

Cadangan (tidak ada di bar): **Mahasiswa Uji Coba (IPK 2.75)** — NIM `230411100999` — untuk membuktikan *fail-fast* SIAKAD bila ditanya.

Tombol **˅** di ujung kanan bar menciutkannya menjadi tombol kecil "Mode Demo" bila menutupi konten.

---

## 3. Pembagian Peran Presenter (usulan, sesuai RACI)

| Bagian | Presenter | Peran saat demo |
| :--- | :--- | :--- |
| Pembukaan & masalah As-Is | Rifda Nahariyah | — |
| Konsep To-Be & prinsip BPI | Evan Rafa Radya | — |
| Demo langsung (operator laptop) | **Reno Syaelendra** | Mengoperasikan aplikasi |
| Narasi Adegan 4–5 (logbook & monev) | A. Choiril Anwar | Menjelaskan sambil Reno mengklik |
| Dasbor KPI & kesimpulan | Surya Maulana | — |

---

## 4. Naskah Menit-per-Menit (15 Menit)

### ⏱ 00:00 – 01:30 · Pembukaan & Masalah As-Is (Rifda)
- Salam & perkenalan Kelompok 2; judul: *"SiRiset — Transformasi Proses MBKM Riset Teknik Informatika UTM dengan BPI"*.
- Latar belakang riset lapangan bersama **Mas Ilyas** (narasumber peserta MBKM Riset) dan **Dr. Mula'ab** (dosen peneliti).
- Tunjukkan BPMN As-Is (7 tahap) dan sebut **9 pain point**: penawaran via WA (PP1), seleksi tanpa SLA (PP2), tanda tangan basah keliling 3 dosen (PP3), berkas di 3 kanal (PP4), data SIMPELMAS tidak sinkron (PP5), monev di Google Classroom (PP6), logbook sporadis (PP7), nilai di kertas (PP8), target luaran tidak jelas (PP9).

### ⏱ 01:30 – 03:00 · Solusi To-Be & Prinsip BPI (Evan)
- ESIA (*Eliminate, Simplify, Integrate, Automate*) + PSC (*Parallelize, Standardize, Control*).
- BPMN To-Be kolaboratif: satu platform untuk Mahasiswa, Dosen Peneliti, Dosen Wali, Kaprodi, Koordinator MBKM, Reviewer LPPM.
- Kalimat transisi: *"Model ini sudah kami wujudkan menjadi sistem web yang berjalan. Mari kita lihat 7 tahap To-Be secara langsung."*

### ⏱ 03:00 – 12:00 · Demonstrasi Langsung (Reno mengoperasikan)

#### Adegan 1 · 03:00 – 04:15 · Katalog Resmi & Pendaftaran Satu Pintu (PP1, PP2, PP4)
1. Quick Demo Bar → **Mhs: Reno Syaelendra (24-020)**.
2. Menu **Katalog Lowongan Riset** → tunjukkan kartu (kuota "3 Tersisa / Kuota 4", tenggat, nomor kontrak hibah).
3. Pada riset *Vision Transformer* → **Lihat Detail Silabus** → **Daftar Riset Ini**.
4. Tunjuk banner hijau **Verifikasi Kelayakan Akademik Otomatis (SIAKAD UTM)**: *Status AKTIF · IPK 3.85 · MK Wajib 100% Lulus*.
5. Isi *Judul Rencana Riset* (mis. "Penerapan Algoritma ViT pada Citra CT-Scan Tumor Otak"), unggah `Proposal_Reno_Syaelendra_ViT.pdf` → **Submit Pendaftaran Sekarang**.
6. Tunjuk **Pelacak Status**: stepper 5 tahap, "Sisa waktu: 7 hari kerja".
> 💬 *"Tidak ada lagi WA grup, map fisik, maupun Google Form terpisah — satu kali submit, IPK diverifikasi otomatis (fail-fast)."*

#### Adegan 2 · 04:15 – 06:00 · Seleksi Ber-SLA & E-Approval Simultan 3 Pihak (PP2, PP3)
1. Bar → **Dosen Peneliti: Dr. Mula'ab** → menu **Seleksi Pelamar** → baris Reno: tunjuk **badge SLA** & IPK → **Terima** → **Ya, Terima Pelamar**.
2. Menu **E-Approval Berkas** → **Tinjau & Putuskan** (tunjuk 6 MK konversi MB04 = 20 SKS, pratinjau PDF, progres paralel) → **Setujui Dokumen (1-Click Approve)**.
3. Bar → **Dosen Wali: Dr. Rika Yunitarini** (halaman tetap di E-Approval) → **Tinjau & Putuskan** → **Setujui**.
4. Bar → **Kaprodi: Bain Khusnul Khotimah** → **Tinjau & Putuskan** → **Setujui** → banner *"Ketiga pihak telah menyetujui — APPROVAL_COMPLETE"*.
5. Pada **Riwayat Keputusan Anda** → **Lihat QR** → tunjuk lembar pengesahan digital ber-QR.
> 💬 *"Tiga tanda tangan basah yang dulu butuh ± 3 hari keliling kampus kini paralel dalam hitungan menit. QR ini dapat dipindai siapa pun untuk memverifikasi keaslian dokumen."*
> (Opsional, 15 detik) Buka tautan verifikasi di bawah QR → halaman **Dokumen Sah & Utuh**.

#### Adegan 3 · 06:00 – 07:00 · Validasi Prodi & 1-Click Sync SIMPELMAS (PP5)
1. Bar → **Koordinator MBKM: Fifin Ayu Mufarroha** → menu **Validasi Prodi** → baris Reno: tunjuk **Stempel QR valid** → **Validasi Akhir Prodi** → OK.
2. Menu **Sinkronisasi SIMPELMAS** → indikator **2 Terverifikasi Prodi ⇄ 1 Tercatat di SIMPELMAS** + badge kuning *"Perhatian: Terdapat data peserta yang belum disinkronkan ke LPPM"*.
3. Klik **1-Click Sinkronkan ke SIMPELMAS LPPM** → **2 ⇄ 2**, badge hijau **"Status Data: 100% Sinkron Sempurna (0 Data Mismatch)"**, ID batch tercatat di log transaksi.
> 💬 *"Dosen tidak perlu lagi mendaftarkan ulang anggota riset ke SIMPELMAS pasca-KRS — selisih data prodi-LPPM yang dulu 20–35% kini 0%."*
> (Bila waktu longgar) **Ekspor Rekap untuk SK Dekan Fakultas Teknik** → dokumen siap cetak.

#### Adegan 4 · 07:00 – 08:30 · Digital Weekly Logbook & Inline Mentoring (PP7) — narasi A. Choiril Anwar
1. Bar → **Mhs: Reno Syaelendra** → menu **Logbook Mingguan** → tunjuk linimasa 16 minggu & banner *"Batas Pengisian Logbook: Setiap Jumat Pukul 23:59 WIB"*.
2. Isi Minggu ke-1: durasi `18`, deskripsi aktivitas, kendala, solusi, tautan repositori GitHub → **Submit Logbook Minggu ke-1**.
3. Bar → **Dosen Peneliti: Dr. Mula'ab** → menu **Mentoring Logbook** → tunjuk kartu **Ilyas — 93.8% Tepat Waktu** (15/16; minggu ke-2 terlambat) → **klik kartu Reno** (halaman awalnya membuka Ilyas).
4. Tulis *Catatan Arahan Bimbingan* (mis. "Pilih satu dataset CT-Scan publik dan dokumentasikan lisensinya.") → **Validasi Logbook (Valid)**.
> 💬 *"Dosen kini punya visibilitas 100% atas logbook minggu 1–16, dan catatan bimbingan langsung tampil di akun mahasiswa."*

#### Adegan 5 · 08:30 – 09:45 · Laporan Kemajuan & Monev Digital LPPM (PP6) — narasi A. Choiril Anwar
1. Bar → **Mhs: Ilyas (Peserta Aktif)** → menu **Laporan Kemajuan** (jendela monev terbuka sejak minggu ke-8).
2. Isi judul, ringkasan eksekutif, geser capaian ke **55%**, unggah `Laporan_Kemajuan_Ilyas.pdf` → **Unggah Laporan Kemajuan** → status *"Laporan Kemajuan Terunggah — Menunggu Penilaian Seminar Monev LPPM"*.
3. Bar → **Reviewer LPPM: Dr. Budi Santoso** → menu **Sesi Monev** → tunjuk **Unduh Laporan PDF** & **Rekapitulasi Logbook Minggu 1–8** (87.5%, 154 jam).
4. Skor capaian `88.5`, metodologi `85`, catatan evaluasi & rekomendasi → **Simpan Penilaian Sesi Monev** → nilai monev **86.8 (Sangat Baik)**.
> 💬 *"Google Classroom dieliminasi; skor dan rekomendasi reviewer otomatis terbaca dosen dan mahasiswa."*

#### Adegan 6 · 09:45 – 12:00 · Luaran Terverifikasi, Rubrik Digital & Berita Acara Nilai (PP8, PP9)
1. Bar → **Mhs: Ilyas** → menu **Luaran Riset** → kategori **Artikel Jurnal**, judul "Brain Tumor Classification Using Enhanced Vision Transformer Architecture", target "JIKOM - Sinta 2", status *Submitted*, unggah `Draf_Artikel_Ilyas_ViT.pdf` → **Daftarkan Luaran**.
2. Bar → **Dosen Peneliti: Dr. Mula'ab** → menu **Penilaian Rubrik** → tunjuk header (16 minggu selesai, kepatuhan 93.8%, monev 86.8) → **Verifikasi Luaran Sesuai Target**.
3. Isi rubrik: **95 · 88 · 90 · 89** → tunjuk kalkulasi langsung: kontribusi 19.00 / 26.40 / 27.00 / 17.80 → **Total 90.20 · Huruf Mutu A · Paket MB04 (20 SKS) Diakui Penuh**.
4. **Kunci & Terbitkan Nilai Resmi** → OK (status riset → `COMPLETED`).
5. Bar → **Koordinator MBKM: Fifin** → menu **Konversi Nilai** → tunjuk rekap & matriks konversi per mata kuliah → **Kunci Nilai & Ekspor Berita Acara (PDF/Print)** → berita acara ber-QR (tombol **Cetak / Simpan PDF** tersedia).
> 💬 *"Lembar nilai kertas yang dulu dititipkan ke mahasiswa kini 100% digital; nilai terkunci, terkonversi 20 SKS, dan dapat diverifikasi lewat QR oleh Bagian Akademik."*

### ⏱ 12:00 – 14:00 · Pembuktian Kuantitatif KPI SMART (Surya)
Masih sebagai Koordinator → menu **Analitik KPI**:
- **Grafik batang cycle time** (arahkan kursor ke batang untuk detail):
  - Lead time seleksi **18 hari → 4,2 hari** (↓ 76,7 %)
  - Waktu tunggu E-Approval **3 hari → 8,5 jam** (↓ 88,2 %)
  - Sinkronisasi SIMPELMAS **21 hari → < 5 menit** (↓ 99,98 %)
  - Terbit konversi nilai **10 hari → 0,5 hari** (↓ 95 %)
- **Donut kepatuhan logbook:** 96,2 % tepat waktu (As-Is 35–50 %).
- **Kartu metrik:** Paperless **100 %** (Rp 0 kertas) · Data Mismatch **0 %** · CSAT **4.8 / 5.0** (As-Is 2.4).
- Tunjuk panel **"Terukur dari Data SiRiset (Live)"** — angka nyata dari transaksi demo barusan (mis. E-Approval Reno selesai dalam hitungan menit, sinkronisasi < 5 menit).
> 💬 *"Grafik memuat angka skenario dokumen KPI kami; panel live membuktikan sistem benar-benar mengukur dan mencapainya dari data transaksi."*

### ⏱ 14:00 – 15:00 · Kesimpulan (Reno)
- 9 pain point → 9 modul solusi (traceability matrix), 7 tahap To-Be berjalan end-to-end dalam satu platform.
- Nilai tambah: SLA terkontrol, paralelisasi approval, integrasi LPPM, integritas dokumen ber-QR, 100 % paperless.
- Terima kasih kepada Dr. Rika Yunitarini, ST., MT.; buka sesi tanya jawab.

---

## 5. Rencana Cadangan

| Masalah | Tindakan cepat |
| :--- | :--- |
| Data demo kacau / langkah terlewat | Hentikan server (Ctrl+C) → `npm run db:reset` (± 10 detik) → `npm run dev`, lanjutkan dari adegan berikutnya |
| Quick Demo Bar tidak tampil | Pastikan `DEMO_MODE="true"` di `.env`, lalu restart server |
| Tombol "Kunci & Terbitkan" nonaktif | Luaran belum diverifikasi (FR-08.2) — klik **Verifikasi Luaran Sesuai Target** dulu |
| Form unggah menolak berkas | Gunakan berkas dari `demo-assets/` (PDF valid, < 5 MB) |
| Waktu habis | Lewati Adegan 5 (Monev) dan tunjukkan langsung Adegan 6 + KPI |
| Laptop/proyektor bermasalah | Siapkan rekaman layar hasil gladi resik sebagai cadangan |

---

## 6. Antisipasi Pertanyaan Penguji

1. **Bagaimana fail-fast SIAKAD bekerja?** — Saat formulir dibuka dan saat submit, server menjalankan 3 cek (status aktif, IPK ≥ 3.00, MK wajib 100 %). Demo: login `230411100999` (IPK 2.75) → banner merah & formulir terkunci; API juga menolak (HTTP 422).
2. **Bagaimana join E-Approval paralel dijamin benar?** — Tiga baris approval dibuat bersamaan (fork) saat dosen menerima pelamar; status `APPROVAL_COMPLETE` hanya bila ketiganya `APPROVED`; satu permintaan revisi → `REVISION_REQUIRED` dan seluruh persetujuan diulang setelah mahasiswa memperbaiki berkas.
3. **Apa yang membuat QR tidak bisa dipalsukan?** — Kode = HMAC-SHA256 atas data dokumen (identitas, rencana riset, hash berkas proposal, 3 keputusan approval / nilai). Data diubah sedikit saja → halaman verifikasi menyatakan tidak valid; koordinator juga tidak dapat memvalidasi berkas yang datanya berubah.
4. **Bagaimana mendeteksi ketidaksinkronan dengan SIMPELMAS?** — Setiap sinkron menyimpan sidik jari data peserta; bila data prodi berubah setelah sinkron, status menjadi *Data Mismatch* dan hanya data tersebut yang dikirim ulang. ID SIMPELMAS stabil (tidak dobel).
5. **Apakah SIAKAD & SIMPELMAS sungguhan?** — Belum; keduanya adapter *mock* dengan kontrak request/response REST yang sama (`SIAKAD_API_MOCK_ENABLED`, `SIMPELMAS_API_MOCK_ENABLED`). Integrasi produksi cukup mengganti satu fungsi adapter.
6. **Kapan logbook dianggap terlambat?** — Batas baku Jumat 23:59 WIB; masa tenggang hingga Minggu 23:59 WIB; lewat dari itu `is_late = true` dan memengaruhi persentase kepatuhan.
7. **Mengapa nilai tidak bisa terbit sebelum 16 minggu?** — Aturan bisnis BR-04 (durasi minimal 4 bulan) dan FR-08.2 (luaran harus terverifikasi) ditegakkan di server.
8. **Keamanan sistem?** — Sesi cookie terenkripsi AES-256-GCM (HttpOnly, SameSite=Lax), RBAC 6 peran di middleware + server, validasi input Zod, berkas disimpan privat di luar `public/` dengan cek *magic bytes*, seluruh aksi penting tercatat di `audit_logs`.
9. **Angka efisiensi approval 85 % atau 88 %?** — Tabel dokumen BPMN memakai baseline 3–5 hari vs target ≤ 12 jam (↓ 85 %); grafik menghitung langsung dari 3 hari vs 8,5 jam (↓ 88,2 %). Keduanya konsisten dengan targetnya masing-masing.
10. **Angka CSAT 4.8 dari mana?** — Dari survei UAT Kelompok 2 dan diinput manual (tertulis di kartu); bukan diukur otomatis oleh sistem.
11. **Mengapa SQLite?** — Untuk demo tanpa instalasi server; skema Prisma siap dipindah ke PostgreSQL 16 untuk produksi (catatan di `prisma/schema.prisma`).

---

## 7. Checklist Akhir Sebelum Masuk Ruangan

- [ ] `npm run db:reset` sudah dijalankan **hari ini**
- [ ] `npm run dev` berjalan, `http://localhost:3000` terbuka & sudah login demo
- [ ] Quick Demo Bar tampil di bawah layar
- [ ] Folder `demo-assets/` terbuka di File Explorer
- [ ] Zoom peramban & resolusi proyektor sudah dicoba
- [ ] Rekaman layar cadangan tersedia
- [ ] Setiap presenter hafal bagian & waktunya
