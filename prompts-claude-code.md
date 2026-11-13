# Kumpulan Prompt Eksekusi Bertahap (Claude Code Opus 5.5 High)
## Pembangunan Platform SiRiset (Branch: `reno-development`)
### Sesuai Model Proses Bisnis BPMN 2.0 To-Be & Prinsip BPI (ESIA + PSC)

---

## 📌 Ketentuan Umum Eksekusi di Claude Code:
1. **Branch Kerja Wajib**: Seluruh proses pengembangan dilakukan secara eksklusif pada branch **`reno-development`**.
2. **Konteks Dokumen Acuan**: Setiap prompt merujuk langsung ke dokumen spesifikasi di folder `markdown/` (`PRD.md`, `bpmn-tobe.md`, `database-schema.md`, `tech-stack.md`, `api-spec.md`, `ui-ux-design-wireframes.md`, `urutan-pengerjaan.md`).
3. **Eksekusi Berurutan**: Jalankan prompt secara berurutan dari **Prompt 0** sampai **Prompt 8**. Jangan melompati urutan fase agar integritas basis data dan dependensi logika bisnis tetap terjaga.

---

### 🔹 PROMPT 0: Inisialisasi Proyek, Basis Data Prisma, Seeding UTM, & Auth RBAC (Fase 0)

```markdown
Kamu adalah Lead Software Architect & Fullstack Engineer. Tugasmu adalah menginisialisasi dan membangun fondasi proyek web "SiRiset" (Sistem Informasi MBKM Riset Terpadu Teknik Informatika UTM).

ATURAN PENTING GIT & BRANCH:
- Pastikan kamu bekerja secara eksklusif di branch `reno-development`.
- Jalankan `git branch` untuk memastikan kamu berada di `reno-development`. Jangan beralih ke branch lain.

BACA DAN PAHAMI DOKUMEN ACUAN SEBELUM MENULIS KODE:
- `markdown/urutan-pengerjaan.md` (Fase 0)
- `markdown/database-schema.md` (Skema Prisma 12 model relasional & Data Seeder)
- `markdown/tech-stack.md` (Spesifikasi dependensi & package.json)
- `markdown/arsitektur.md` (Arsitektur C4 Model, DFD, & Matriks Keamanan RBAC 6 Peran)

INSTRUKSI TEKNIS LANGKAH DEMI LANGKAH:
1. Inisialisasi proyek Next.js 15 dengan App Router, TypeScript, Tailwind CSS, ESLint, dan direktori `src/` di folder saat ini.
2. Pasang seluruh dependensi yang dispesifikasikan di `markdown/tech-stack.md`:
   - Dependencies: `@prisma/client`, `prisma`, `lucide-react`, `date-fns`, `zod`, `recharts`, `clsx`, `tailwind-merge`, `bcryptjs`.
   - Dev Dependencies: `@types/bcryptjs`, `@types/node`, `tsx`, `typescript`.
3. Buat file `prisma/schema.prisma` yang mengimplementasikan persis 12 model relasional dari `markdown/database-schema.md`:
   - `User`, `UserRole`, `ResearchVacancy`, `Application`, `ApplicationApproval`, `Logbook`, `LogbookReview`, `ProgressReport`, `MonevEvaluation`, `ResearchOutput`, `GradeAssessment`, `SimpelmasSyncLog`, `AuditLog`.
   - Gunakan SQLite (`file:./dev.db`) sebagai database provider agar dapat langsung dijalankan secara lokal tanpa konfigurasi PostgreSQL server.
4. Jalankan perintah `npx prisma db push` untuk membuat seluruh tabel database lokal.
5. Buat file `prisma/seed.ts` dan jalankan `npx tsx prisma/seed.ts` untuk menyemai data awal akun riil sivitas akademika Teknik Informatika UTM (password hash menggunakan bcrypt default: "password123"):
   - Dosen Peneliti: Dr. Mula'ab, S.Si., M.Kom. (NIP: 197204152000031001)
   - Dosen Wali: Dr. Rika Yunitarini, ST., MT. (NIP: 198306072006042001)
   - Koordinator MBKM: Fifin Ayu Mufarroha, S.Kom., M.Kom. (NIP: 198902122019032014)
   - Kaprodi: Bain Khusnul Khotimah, S.T., M.Kom. (NIP: 197905202005012002)
   - Reviewer LPPM: Dr. Budi Santoso, MT. (NIP: 196803121994031002)
   - Mahasiswa: Ilyas (NIM: 220411100088), Reno Syaelendra (NIM: 240411100020), Rifda Nahariyah (NIM: 240411100019)
6. Bangun modul autentikasi sesi terenkripsi (cookies) dengan utilitas `src/lib/auth.ts` yang mendukung fitur "Role Switcher" di Navbar (memudahkan berpindah konteks peran antara Mahasiswa, Dosen Peneliti, Dosen Wali, Kaprodi, Koordinator MBKM, dan Reviewer LPPM).
7. Buat Shell Layout Master (`src/app/dashboard/layout.tsx` & komponen navigasi) dengan identitas visual resmi Universitas Trunodjoyo Madura: Navy Blue (`#0f2b5c`) dan Accent Gold (`#eab308`), lengkap dengan menu sidebar dinamis sesuai peran pengguna saat ini.
8. Jalankan `npm run build` atau `npm run dev` untuk memastikan server berjalan tanpa error TypeScript.
9. Commit seluruh perubahan ke branch `reno-development`:
   `git add . && git commit -m "feat(fase-0): init Next.js 15, Prisma SQLite schema, UTM seeders, and RBAC layout"`
```

---

### 🔹 PROMPT 1: Tahap 1 BPMN To-Be — Portal Lowongan Riset Resmi (Fase 1, Solusi PP1)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 1 yang merefleksikan TAHAP 1 BPMN TO-BE: Publikasi Lowongan Riset Resmi & Eksplorasi Mahasiswa (Solusi Titik Nyeri PP1 - Penawaran informal lewat WA grup).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.1: Tahap 1 To-Be)
- `markdown/PRD.md` (FR-02: Modul Manajemen Lowongan Riset)
- `markdown/ui-ux-design-wireframes.md` (Layar 1: Wireframe Katalog Lowongan Riset)
- `markdown/api-spec.md` (Bagian 3: Endpoints Vacancies)

INSTRUKSI TEKNIS:
1. **Sisi Dosen Peneliti (`src/app/dashboard/lecturer/vacancies/page.tsx`)**:
   - Bangun antarmuka pengelolaan lowongan riset milik dosen peneliti yang sedang aktif (misal: Dr. Mulaab).
   - Buat formulir publikasi lowongan terstruktur:
     - Judul Riset Hibah (contoh: "Pengembangan Model Klasifikasi Citra Medis Berbasis Vision Transformer")
     - Nomor Kontrak Hibah LPPM (contoh: "042/UN46.4.1/PT/2026")
     - Skema Hibah (Penelitian Mandiri LPPM, Penelitian Terapan FT, Kerjasama Industri)
     - Deskripsi riset & silabus tugas teknis mahasiswa
     - Kuota mahasiswa (1 sampai 4 orang, default: 4)
     - Kualifikasi keahlian khusus (tags: Python, PyTorch, Deep Learning, Image Processing)
     - Tanggal buka & tanggal tutup pendaftaran
   - Simpan data ke tabel `research_vacancies` menggunakan Server Action / Route Handler terproteksi.
   - Tabel ringkasan lowongan dosen dengan informasi jumlah pendaftar, sisa kuota, dan status (PUBLISHED / CLOSED).
2. **Sisi Mahasiswa (`src/app/dashboard/student/vacancies/page.tsx`)**:
   - Bangun portal Katalog Penawaran Riset Resmi yang dapat diakses seluruh mahasiswa Teknik Informatika.
   - Komponen Pencarian & Filter Cepat:
     - Input pencarian teks (judul riset / nama dosen peneliti)
     - Filter dropdown berdasarkan Skema Hibah LPPM
     - Filter berdasarkan Tag Keahlian
   - Grid Kartu Lowongan (*Vacancy Cards*):
     - Menampilkan Judul Riset, Nama Dosen Peneliti, Badge Skema Hibah, Nomor Kontrak, Badge Kuota ("3 Tersisa / Kuota 4"), dan Tenggat Waktu.
     - Tombol "Lihat Detail Silabus" yang memunculkan rincian tugas dan tombol "Daftar Riset Ini" yang mengarahkan ke form pendaftaran `/dashboard/student/vacancies/[id]/apply`.
3. Pastikan kode bersih, divalidasi via Zod, dan bekerja lancar di branch `reno-development`.
4. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-1): implement official research vacancy portal and catalog"`
```

---

### 🔹 PROMPT 2: Tahap 2 BPMN To-Be — Pendaftaran 1 Pintu & Verifikasi SIAKAD (Fase 2, Solusi PP2 & PP4)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 2 yang merefleksikan TAHAP 2 BPMN TO-BE: Pendaftaran Satu Pintu, Verifikasi Kelayakan SIAKAD Otomatis, dan Seleksi Ber-SLA (Solusi PP2: Seleksi tanpa SLA & PP4: Berkas di 3 kanal).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.2: Tahap 2 To-Be)
- `markdown/PRD.md` (FR-03, Aturan Bisnis BR-03 & BR-06)
- `markdown/ui-ux-design-wireframes.md` (Layar 2: Form Pendaftaran 1 Pintu & Pelacak Status Real-Time)
- `markdown/api-spec.md` (Bagian 4: Endpoints Applications)

INSTRUKSI TEKNIS:
1. **Mock Service SIAKAD (`src/lib/siakad-mock.ts`)**:
   - Buat service pemeriksa kelayakan akademik otomatis:
     - Cek 1: Mahasiswa status AKTIF.
     - Cek 2: IPK Kumulatif $\ge 3.00$ (Aturan BR-03).
     - Cek 3: Mata kuliah wajib dasar semester 1-4 LULUS 100%.
   - Reno Syaelendra (IPK: 3.85) & Ilyas (IPK: 3.78) lolos verifikasi; sediakan skenario uji mahasiswa IPK 2.75 yang gagal verifikasi.
2. **Sisi Mahasiswa - Formulir Pendaftaran Satu Pintu (`src/app/dashboard/student/vacancies/[id]/apply/page.tsx`)**:
   - Tampilkan kotak banner hijau verifikasi SIAKAD: "Status: AKTIF | IPK: 3.85 (Memenuhi Syarat >= 3.00) | MK Wajib: 100% Lulus". Jika IPK $< 3.00$, disable form dengan alert merah (*Fail Fast Rule*).
   - Form pendaftaran paperless (1 kali submit, meniadakan map kertas & form gdrive terpisah):
     - Judul Rencana Riset Mahasiswa
     - Paket Konversi: Dropdown "Paket MB04 - 20 SKS"
     - Checkbox "Konversi Kerja Praktik (KP 2 SKS terpisah)"
     - Input Upload File Proposal Ringkas (.PDF, maks 5MB)
   - Logika submit: Simpan ke tabel `applications` dengan status `SUBMITTED` dan tetapkan `sla_deadline` = 7 hari kerja ke depan.
3. **Sisi Dosen Peneliti - Seleksi Pelamar Ber-SLA (`src/app/dashboard/lecturer/applicants/page.tsx`)**:
   - Tabel pelamar masuk per lowongan: Nama Mahasiswa, NIM, IPK, Unduh Proposal PDF, dan Countdown Badge SLA ("Sisa waktu: X hari kerja").
   - Aksi Dosen: Tombol "Terima Pelamar" (status berubah menjadi `DOSEN_ACCEPTED`, kuota berkurang 1) atau "Tolak Pelamar" (dengan modal catatan alasan penolakan).
4. **Sisi Mahasiswa - Pelacak Status Real-Time (`src/app/dashboard/student/tracker/page.tsx`)**:
   - Stepper visual horizontal: `Submitted` -> `Seleksi Dosen (SLA 7 Hari)` -> `Parallel E-Approval 3 Pihak` -> `Validasi Koordinator` -> `Riset Aktif`.
5. Uji alur dari mahasiswa mendaftar hingga dosen menerima pelamar.
6. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-2): implement single-window application, siakad auto-check, and sla-based selection"`
```

---

### 🔹 PROMPT 3: Tahap 3 BPMN To-Be — Workflow Parallel E-Approval Simultan (Fase 3, Solusi PP3)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 3 yang merefleksikan TAHAP 3 BPMN TO-BE: Workflow Parallel E-Approval Simultan 3 Aktor (Solusi PP3: Mahasiswa keliling meminta tanda tangan basah ke 3 dosen).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.3: Tahap 3 To-Be: E-Approval Simultan)
- `markdown/PRD.md` (FR-04: Modul E-Approval Paralel)
- `markdown/ui-ux-design-wireframes.md` (Layar 3: Modal E-Approval Simultan)
- `markdown/api-spec.md` (Bagian 5: Endpoints Approvals)

INSTRUKSI TEKNIS:
1. **Backend Fork-Join Approval Engine**:
   - Ketika pelamar berstatus `DOSEN_ACCEPTED`, sistem secara otomatis membuat 3 baris di tabel `application_approvals`:
     - Role `DOSEN_WALI` (status: `PENDING`)
     - Role `DOSEN_PENELITI` (status: `PENDING`)
     - Role `KAPRODI` (status: `PENDING`)
   - Parallel Join Condition: Status pendaftaran di tabel `applications` hanya bertransisi menjadi `APPROVAL_COMPLETE` jika KETIGA pihak telah menyetujui (`status = APPROVED`).
   - Jika salah satu pihak meminta revisi (`REJECTED`), status aplikasi berubah menjadi `REVISION_REQUIRED` disertai catatan revisi yang tampil di akun mahasiswa.
2. **Antarmuka E-Approval Terpusat (`src/app/dashboard/approvals/page.tsx`)**:
   - Halaman daftar antrean berkas yang menunggu persetujuan dari pengguna yang sedang aktif (otomatis mendeteksi apakah login sebagai Dosen Wali, Dosen Peneliti, atau Kaprodi).
   - Modal Review & Persetujuan Instan (1-Click Approval):
     - Rincian Mahasiswa (Nama, NIM, IPK, Judul Riset, Pembimbing)
     - Daftar 6 Mata Kuliah Paket Konversi MB04 (20 SKS) yang diusulkan
     - Pratinjau berkas proposal PDF
     - Kolom catatan umpan balik / arahan
     - Tombol Aksi: `Setujui Dokumen (1-Click Approve)` atau `Minta Perbaikan / Tolak`
3. **Penerbitan Stempel Digital Keabsahan (QR-Code)**:
   - Setelah ketiga persetujuan lengkap (`APPROVAL_COMPLETE`), sediakan tampilan pratinjau lembar pengesahan digital terpadu lengkap dengan kode QR verifikasi integritas data prodi (100% paperless).
4. Uji alur persetujuan simultan: Login Dosen Wali -> Approve, ganti peran Dosen Peneliti -> Approve, ganti peran Kaprodi -> Approve -> Status berubah menjadi `APPROVAL_COMPLETE`.
5. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-3): implement parallel e-approval workflow and digital qr verification"`
```

---

### 🔹 PROMPT 4: Tahap 4 BPMN To-Be — Validasi Koordinator & 1-Click Sync SIMPELMAS (Fase 4, Solusi PP5)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 4 yang merefleksikan TAHAP 4 BPMN TO-BE: Validasi Koordinator MBKM & Jembatan Sinkronisasi 1-Klik ke SIMPELMAS LPPM (Solusi PP5: Pendaftaran ganda dan desinkronisasi data antara SI MBKM dan SIMPELMAS).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.4: Tahap 4 To-Be)
- `markdown/PRD.md` (FR-05: Modul Adapter Integrasi SIMPELMAS)
- `markdown/ui-ux-design-wireframes.md` (Layar 5: Dasbor Koordinator MBKM & Sync SIMPELMAS)
- `markdown/api-spec.md` (Bagian 6: Endpoints Sync SIMPELMAS)

INSTRUKSI TEKNIS:
1. **Dasbor Koordinator MBKM - Verifikasi Daring (`src/app/dashboard/coordinator/verification/page.tsx`)**:
   - Akun: Koordinator MBKM Prodi TI (Ibu Fifin Ayu Mufarroha).
   - Tabel verifikasi berkas mahasiswa yang telah berstatus `APPROVAL_COMPLETE`.
   - Tombol `Validasi Akhir Prodi` yang mengaktifkan status mahasiswa resmi menjadi `IN_PROGRESS` (Riset Aktif Berjalan).
2. **Pusat Integrasi & 1-Click Sync SIMPELMAS (`src/app/dashboard/coordinator/sync-simpelmas/page.tsx`)**:
   - Panel Indikator Sinkronisasi Antar-Unit:
     - Jumlah Mahasiswa Terverifikasi Prodi (misal: 3 Mahasiswa)
     - Jumlah Mahasiswa Tercatat di SIMPELMAS LPPM (awalnya: 0)
     - Badge Status: "Perhatian: Terdapat data peserta yang belum disinkronkan ke LPPM"
   - Tombol Aksi Utama: `1-Click Sinkronkan ke SIMPELMAS LPPM`.
   - Logika Sinkronisasi:
     - Mengirim payload data peserta (NIM, Nama, NIP Dosen Ketua, Judul Riset, Nomor Hibah) ke mock endpoint SIMPELMAS.
     - Menyimpan catatan log transaksi di tabel `simpelmas_sync_logs` (stempel waktu, status sukses, ID referensi batch).
     - Indikator otomatis berubah menjadi: "Status Data: 100% Sinkron Sempurna (0 Data Mismatch)".
3. **Ekspor Usulan SK Dekan Fakultas Teknik**:
   - Tombol `Ekspor Rekap untuk SK Dekan Fakultas Teknik` yang menghasilkan data/tabel terstruktur siap serah-terima ke dekanat.
4. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-4): implement coordinator verification and 1-click simpelmas lppm sync"`
```

---

### 🔹 PROMPT 5: Tahap 5 BPMN To-Be — Digital Weekly Logbook & Inline Mentoring (Fase 5, Solusi PP7)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 5 yang merefleksikan TAHAP 5 BPMN TO-BE: Manajemen Digital Weekly Logbook & Inline Mentoring Dosen (Solusi PP7: Logbook sporadis dan dosen pembimbing tidak memiliki akses melihat catatan logbook mahasiswa).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.5: Tahap 5 To-Be)
- `markdown/PRD.md` (FR-06: Modul Digital Weekly Logbook)
- `markdown/ui-ux-design-wireframes.md` (Layar 4: Dasbor Monitoring Logbook Dosen Peneliti)
- `markdown/api-spec.md` (Bagian 7: Endpoints Logbooks)

INSTRUKSI TEKNIS:
1. **Sisi Mahasiswa - Digital Weekly Logbook (`src/app/dashboard/student/logbook/page.tsx`)**:
   - Linimasa 16 Minggu Pelaksanaan MBKM Riset (Minggu 1 s/d Minggu 16).
   - Banner Jadwal Baku: "Batas Pengisian Logbook: Setiap Jumat Pukul 23:59 WIB".
   - Formulir Input Logbook Mingguan:
     - Tanggal Pelaksanaan Riset
     - Total Durasi Waktu Riset (Jam, contoh: 18 Jam)
     - Deskripsi Rinci Aktivitas Riset
     - Kendala Teknis / Masalah yang Dihadapi
     - Upaya / Solusi yang Diterapkan
     - Upload Berkas Bukti (Foto/Screenshot dokumen)
     - Tautan Repositori Kode (GitHub Commit / Google Colab)
   - Sistem menandai otomatis `is_late = true` jika disubmit melewati hari Minggu 23:59 WIB.
2. **Sisi Dosen Peneliti - Monitoring & Inline Feedback (`src/app/dashboard/lecturer/mentoring/page.tsx`)**:
   - Dasbor Pemantauan Bimbingan: Menampilkan daftar mahasiswa bimbingan beserta kartu persentase kepatuhan logbook (contoh: "95% Tepat Waktu").
   - Riwayat Logbook Lengkap: Dosen dapat membuka dan membaca catatan harian minggu 1 s/d 16 (100% visibilitas data, menyelesaikan PP7).
   - Fitur Bimbingan Dosen:
     - Tombol `Validasi Logbook (Valid)` atau `Minta Revisi Logbook`.
     - Kolom `Catatan Arahan Bimbingan (Inline Feedback)`: Dosen mengetik arahan riset teknis yang langsung tersimpan di tabel `logbook_reviews` dan tampil di akun mahasiswa.
3. Pastikan mahasiswa dapat mengisi logbook dan dosen dapat mengulas serta memvalidasi logbook tersebut.
4. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-5): implement digital weekly logbook and inline mentoring feedback"`
```

---

### 🔹 PROMPT 6: Tahap 6 BPMN To-Be — Hub Laporan Kemajuan & Monev Digital LPPM (Fase 6, Solusi PP6)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 6 yang merefleksikan TAHAP 6 BPMN TO-BE: Hub Laporan Kemajuan & Sesi Monev LPPM Digital (Solusi PP6: Laporan kemajuan tercecer di Google Classroom luar).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.6: Tahap 6 To-Be)
- `markdown/PRD.md` (FR-07: Modul Monitoring & Evaluasi Terpusat)
- `markdown/api-spec.md` (Bagian 8: Endpoints Monev Reports & Evaluations)

INSTRUKSI TEKNIS:
1. **Sisi Mahasiswa - Unggah Laporan Kemajuan (`src/app/dashboard/student/monev/page.tsx`)**:
   - Menghapus ketergantungan pada Google Classroom.
   - Pada minggu ke-8 riset, sistem mengaktifkan modul unggah Laporan Kemajuan:
     - Judul Laporan Kemajuan
     - Ringkasan Eksekutif Kemajuan Proyek Riset
     - Estimasi Persentase Capaian Riset (misal: 55%)
     - Upload File Laporan Kemajuan PDF sesuai templat baku LPPM UTM.
   - Status: "Laporan Kemajuan Terunggah - Menunggu Penilaian Seminar Monev LPPM".
2. **Sisi Reviewer LPPM - Dasbor Evaluasi Monev (`src/app/dashboard/lppm/monev-session/page.tsx`)**:
   - Akun: Reviewer LPPM (Dr. Budi Santoso, MT.).
   - Daftar proyek riset yang telah mengumpulkan Laporan Kemajuan.
   - Akses satu-klik mengunduh dokumen Laporan Kemajuan PDF dan melihat rekapitulasi kepatuhan logbook minggu 1-8.
   - Formulir Penilaian Sesi Monev:
     - Skor Capaian Kemajuan Riset (Skala 0 - 100)
     - Skor Penguasaan Metodologi Ilmiah (Skala 0 - 100)
     - Kolom Catatan Evaluasi Reviewer
     - Kolom Rekomendasi Tindak Lanjut Perbaikan
   - Simpan data evaluasi ke tabel `monev_evaluations`.
3. **Visibilitas Tim Riset**:
   - Nilai dan rekomendasi reviewer LPPM otomatis tampil di dasbor Dosen Peneliti dan Mahasiswa sebagai dasar perbaikan di sisa masa riset.
4. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-6): implement centralized progress report hub and lppm monev scoring"`
```

---

### 🔹 PROMPT 7: Tahap 7 BPMN To-Be — Repositori Luaran & Penilaian Rubrik Digital (Fase 7, Solusi PP8 & PP9)

```markdown
Kamu sedang melanjutkan pengembangan SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 7 yang merefleksikan TAHAP 7 BPMN TO-BE: Repositori Luaran Riset & Penilaian Digital Rubrik Konversi MB04 (Solusi PP8: Nilai di atas kertas fisik & PP9: Target luaran mahasiswa tidak jelas sejak awal).

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 4.7: Tahap 7 To-Be)
- `markdown/PRD.md` (FR-08 & FR-09)
- `markdown/ui-ux-design-wireframes.md` (Layar 6: Formulir Penilaian Rubrik Digital)
- `markdown/api-spec.md` (Bagian 9: Endpoints Outputs & Grade Assessments)

INSTRUKSI TEKNIS:
1. **Sisi Mahasiswa - Unggah Luaran Riset (`src/app/dashboard/student/outputs/page.tsx`)**:
   - Mahasiswa mendaftarkan luaran akhir sesuai target proposal (Solusi PP9):
     - Pilihan Kategori: `Artikel Jurnal`, `Naskah Prosiding`, `Poster Ilmiah`, atau `Prototipe Software`.
     - Judul Naskah / Luaran Publikasi
     - Target Publikasi (misal: "Jurnal Sinta 2 / Konferensi Nasional")
     - Upload file draf naskah PDF atau tautan demo aplikasi.
   - Dosen Peneliti memeriksa luaran dan mengklik tombol `Verifikasi Luaran Sesuai Target`.
2. **Sisi Dosen Peneliti - Formulir Penilaian Rubrik Digital (`src/app/dashboard/lecturer/grading/page.tsx`)**:
   - Menghilangkan pengisian nilai manual di atas kertas fisik (Solusi PP8).
   - Formulir Penilaian Digital berbasis 4 rubrik resmi Program Studi Teknik Informatika UTM:
     1. Kedisiplinan & Logbook Mingguan (Bobot: 20%) -> Input Skor (0-100)
     2. Kualitas Teknis & Penguasaan Metodologi Riset (Bobot: 30%) -> Input Skor (0-100)
     3. Pemenuhan Target Luaran Publikasi Ilmiah (Bobot: 30%) -> Input Skor (0-100)
     4. Kualitas Laporan Akhir & Presentasi Hasil (Bobot: 20%) -> Input Skor (0-100)
   - Kalkulasi Otomatis:
     `Nilai Akhir = (0.20 * S1) + (0.30 * S2) + (0.30 * S3) + (0.20 * S4)`
   - Pemetaan Otomatis Huruf Mutu:
     `A (>=80)`, `B+ (75-79.9)`, `B (70-74.9)`, `C+ (65-69.9)`, `C (56-64.9)`, `D (45-55.9)`, `E (<45)`.
   - Tombol `Kunci & Terbitkan Nilai Resmi`. Simpan ke tabel `grade_assessments` dan ubah status riset menjadi `COMPLETED`.
3. **Sisi Koordinator MBKM - Rekapitulasi Konversi Nilai SIAKAD (`src/app/dashboard/coordinator/grade-conversion/page.tsx`)**:
   - Tabel rekapitulasi nilai akhir seluruh mahasiswa peserta riset.
   - Rincian konversi paket 20 SKS mata kuliah MB04 (Capstone Project, Machine Learning Lanjut, Rekayasa Perangkat Lunak, Metodologi Penelitian, Etika Profesi).
   - Tombol `Ekspor Berita Acara Nilai Resmi (PDF/Print)` berstempel digital QR-Code untuk diserahkan ke bagian Akademik Fakultas.
4. Lakukan commit di branch `reno-development`:
   `git add . && git commit -m "feat(fase-7): implement research output repository, digital rubric grading, and mb04 conversion"`
```

---

### 🔹 PROMPT 8: Dasbor Eksekutif KPI, Quick Demo Mode, & Kesiapan UAS (Fase 8, Finalisasi)

```markdown
Kamu sedang melakukan finalisasi proyek SiRiset pada branch `reno-development`.
Tugasmu adalah mengimplementasikan FASE 8: Dasbor Eksekutif KPI SMART, Quick Demo Mode Switcher, dan Kesiapan Demonstrasi Ujian Akhir Semester (UAS) di hadapan Dosen Pengampu Dr. Rika Yunitarini, ST., MT.

BACA DAN PAHAMI DOKUMEN ACUAN:
- `markdown/bpmn-tobe.md` (Bagian 7: Evaluasi Kinerja Kuantitatif KPI As-Is vs To-Be)
- `markdown/implementation-roadmap.md` (Bagian 5: Strategi Presentasi UAS)

INSTRUKSI TEKNIS:
1. **Dasbor Eksekutif KPI MBKM Riset (`src/app/dashboard/coordinator/analytics-kpi/page.tsx`)**:
   - Bangun visualisasi grafik interaktif menggunakan pustaka `Recharts`:
     - Grafik Batang (Bar Chart): Perbandingan Siklus Waktu (Cycle Time) As-Is vs To-Be:
       - Lead Time Seleksi Pendaftar: 18 hari (As-Is) vs 4.2 hari (To-Be) -> Efisiensi 76%
       - Waktu Tunggu E-Approval: 3 hari (As-Is) vs 8.5 jam (To-Be) -> Efisiensi 85%
       - Waktu Sinkronisasi SIMPELMAS: 21 hari (As-Is) vs Real-time < 5 menit (To-Be)
       - Waktu Terbit Konversi Nilai: 10 hari (As-Is) vs 0.5 hari (To-Be)
     - Diagram Donut / Pie: Kepatuhan Logbook Mingguan (96.2% Tepat Waktu vs 3.8% Terlambat).
     - Kartu Metrik Kunci:
       - Paperless Rate: 100% Digital (Hemat Kertas Rp 0)
       - Data Mismatch Rate: 0% (100% Sinkron dengan LPPM)
       - CSAT User Satisfaction: 4.8 / 5.0
2. **Quick Demo Bar (Pintas Ganti Akun Demo)**:
   - Tambahkan bar mengambang (*floating bar*) di bagian bawah layar yang memungkinkan penguji berganti akun secara instan dengan 1 klik tanpa harus logout-login:
     - [Mhs: Reno Syaelendra (24-020)]
     - [Mhs: Ilyas (Peserta Aktif)]
     - [Dosen Peneliti: Dr. Mula'ab]
     - [Dosen Wali: Dr. Rika Yunitarini]
     - [Kaprodi: Bain Khusnul Khotimah]
     - [Koordinator MBKM: Fifin Ayu Mufarroha]
     - [Reviewer LPPM: Dr. Budi Santoso]
3. **Dokumentasi Panduan Demonstrasi UAS (`DEMO-GUIDE.md`)**:
   - Buat file `DEMO-GUIDE.md` di root direktori proyek yang memuat naskah presentasi 15 menit bagi Reno Syaelendra dan Kelompok 2 saat ujian akhir di hadapan Dr. Rika Yunitarini, ST., MT. (menit per menit skenario demonstrasi).
4. Jalankan `npm run build` untuk memverifikasi bahwa proyek terkompilasi 100% tanpa error TypeScript/ESLint.
5. Lakukan commit akhir dan push ke branch `reno-development`:
   `git add . && git commit -m "feat(fase-8): complete kpi analytics dashboard, quick demo switcher, and demo guide"`
   `git push origin reno-development`
```
