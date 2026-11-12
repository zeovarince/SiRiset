# Dokumen Arsitektur Sistem & Perangkat Lunak
## SiRiset: Sistem Informasi MBKM Riset Terpadu
### Program Studi Teknik Informatika, Fakultas Teknik, Universitas Trunodjoyo Madura

---

## 1. Ikhtisar & Pola Arsitektur Sistem

Sistem Informasi **SiRiset** dirancang menggunakan arsitektur perangkat lunak modern berbasis web dengan pola **Modular Monolith** yang dipadukan dengan prinsip **Clean Architecture** (Martin, 2017) dan model interaksi reaktif. Pola ini dipilih karena memberikan keseimbangan optimal antara kecepatan pengembangan tim mahasiswa, kemudahan pemeliharaan, kejelasan isolasi domain bisnis, serta keandalan saat diuji dalam demonstrasi perkuliahan dan lingkungan produksi kampus.

### Karakteristik Arsitektur Kunci:
1. **Single Source of Truth (SSOT)**: Menyatukan seluruh siklus hidup MBKM Riset ke dalam satu pangkalan data relasional terpusat, mengeliminasi duplikasi data yang sebelumnya tercecer di SI MBKM, SIMPELMAS, Google Classroom, dan map fisik.
2. **Loosely Coupled External Adapters**: Mengisolasi interaksi dengan sistem eksternal (SIAKAD dan SIMPELMAS LPPM) menggunakan pola *Adapter / Anti-Corruption Layer (ACL)*, sehingga perubahan antarmuka pada sistem kampus tidak merusak logika bisnis inti SiRiset.
3. **Role-Based Security by Design**: Mengintegrasikan otorisasi berbasis peran (*Role-Based Access Control - RBAC*) pada level middleware server dan baris data (*Row-Level Security*).
4. **Event-Driven Audit Logging**: Setiap mutasi status kritis (seperti perubahan status approval, penilaian, dan sinkronisasi data) secara otomatis memicu pencatatan jejak audit (*tamper-evident audit trail*).

---

## 2. Diagram Arsitektur C4 Model

Sesuai standar pendokumentasian arsitektur perangkat lunak industri (Brown, 2018), arsitektur SiRiset dimodelkan ke dalam 4 tingkatan C4 Model:

### 2.1 C4 Level 1: System Context Diagram
Diagram ini memperlihatkan interaksi platform SiRiset terhadap aktor manusia dan batas sistem eksternal universitas.

```mermaid
C4Context
    title Diagram Konteks Sistem (C4 Level 1) - SiRiset

    Person(mhs, "Mahasiswa Peserta", "Mahasiswa aktif S1 TI UTM yang menempuh MBKM Riset (MB04).")
    Person(dosen_peneliti, "Dosen Peneliti", "Dosen penerima hibah riset LPPM yang membimbing mahasiswa.")
    Person(dosen_wali, "Dosen Wali", "Pembimbing akademik yang memvalidasi rencana studi mahasiswa.")
    Person(kaprodi, "Koordinator Prodi (Kaprodi)", "Pimpinan prodi yang mengesahkan konversi kurikulum.")
    Person(koor_mbkm, "Koordinator MBKM (Bu Fifin)", "Pengelola harian administrasi MBKM prodi.")
    Person(lppm, "Reviewer LPPM", "Penguji dan pengelola hibah riset universitas.")

    System(siriset, "Platform SiRiset", "Sistem Informasi Terpadu Pengelolaan Siklus Hidup MBKM Riset.")

    System_Ext(siakad, "SIAKAD UTM", "Sistem Akademik Universitas (Sumber Data IPK & Nilai Konversi).")
    System_Ext(simpelmas, "SIMPELMAS LPPM", "Sistem Manajemen Penelitian & Pengabdian Masyarakat UTM.")

    Rel(mhs, siriset, "Mencari riset, mendaftar, isi logbook, unggah luaran", "HTTPS")
    Rel(dosen_peneliti, siriset, "Buat lowongan, seleksi pelamar, bimbingan, input nilai", "HTTPS")
    Rel(dosen_wali, siriset, "E-Approval rencana studi & konversi MK", "HTTPS")
    Rel(kaprodi, siriset, "E-Approval konversi & usulan pembimbing", "HTTPS")
    Rel(koor_mbkm, siriset, "Validasi pendaftaran, trigger sync SIMPELMAS, rekap nilai", "HTTPS")
    Rel(lppm, siriset, "Akses laporan kemajuan, monev, dan verifikasi luaran", "HTTPS")

    Rel(siriset, siakad, "Validasi IPK & kelulusan MK Wajib; Transfer nilai konversi", "REST API / Mock Adapter")
    Rel(siriset, simpelmas, "Sinkronisasi nama anggota peneliti mahasiswa riset hibah", "REST API / Adapter")
```

---

### 2.2 C4 Level 2: Container Diagram
Diagram ini memperlihatkan komponen runtime perangkat lunak, protokol komunikasi, dan media penyimpanan data SiRiset.

```mermaid
C4Container
    title Container Diagram (C4 Level 2) - SiRiset

    Person(user, "Pengguna SiRiset", "Mahasiswa, Dosen, Kaprodi, Koordinator, LPPM")

    Container_Boundary(c1, "SiRiset Web Application") {
        Container(spa, "Frontend Client (Next.js App Router)", "React 19, TypeScript, Tailwind CSS, Shadcn UI", "Antarmuka interaktif responsif untuk seluruh pemangku kepentingan.")
        Container(api, "Backend Core Services (Server Actions / Route Handlers)", "Node.js / Next.js Server Runtime", "Menangani logika bisnis, workflow e-approval, SLA timer, dan otorisasi RBAC.")
        Container(auth, "Authentication & Session Engine", "NextAuth.js / Auth.js (JWT/Session Cookies)", "Mengelola login terpadu, token kriptografi, dan context switcher.")
        Container(adapter_layer, "External System Adapters", "TypeScript Services", "Menjembatani komunikasi data terenkripsi ke SIAKAD dan SIMPELMAS.")
    }

    ContainerDb(db, "Primary Relational Database", "PostgreSQL 16 / SQLite", "Menyimpan seluruh data pengguna, lowongan, pendaftaran, approval, logbook, monev, dan audit log.")
    ContainerDb(storage, "Secure Object Storage", "Local Filesystem / S3-Compatible", "Menyimpan berkas digital proposal, dokumen monev, artikel jurnal, poster, dan bukti logbook.")

    Rel(user, spa, "Mengakses sistem", "HTTPS / Browser")
    Rel(spa, api, "Memanggil operasi bisnis & mutasi data", "JSON / HTTPS / Server RPC")
    Rel(api, auth, "Verifikasi hak akses & sesi pengguna", "In-Process")
    Rel(api, db, "Query & Transaksi Data (ACID)", "Prisma ORM (TCP / Pool)")
    Rel(api, storage, "Upload & Download Berkas Terenkripsi", "File I/O Stream")
    Rel(api, adapter_layer, "Mengirim permintaan integrasi", "Internal Service Call")

    System_Ext(siakad, "SIAKAD UTM", "API Akademik")
    System_Ext(simpelmas, "SIMPELMAS LPPM", "API Penelitian")

    Rel(adapter_layer, siakad, "Sinkronisasi Data Akademik", "HTTPS / JSON REST")
    Rel(adapter_layer, simpelmas, "Push Data Peserta Riset", "HTTPS / JSON REST")
```

---

### 2.3 C4 Level 3: Component Diagram (Backend Core Services)
Diagram ini memperlihatkan struktur modular di dalam lapisan logika backend SiRiset:

```mermaid
graph TD
    subgraph CONTROLLER["API Routing & Server Actions"]
        C_Auth["Auth Handler"]
        C_Vacancy["Vacancy Action"]
        C_Apply["Application Action"]
        C_Approval["E-Approval Action"]
        C_Logbook["Logbook Action"]
        C_Monev["Monev Action"]
        C_Grading["Grading & Output Action"]
        C_Sync["Integration Sync Action"]
    end

    subgraph BUSINESS_DOMAIN["Domain Logic & Business Services"]
        S_Elig["Eligibility Verification Service<br>(Cek IPK >= 3.0 & MK Wajib)"]
        S_SLA["SLA & Notification Engine<br>(Timer 7 Hari & Reminder)"]
        S_Workflow["Approval Workflow Orchestrator<br>(Parallel Fork-Join)"]
        S_Rubric["Grading & Conversion Calculator<br>(Formula MB04 20 SKS)"]
        S_Audit["Tamper-Evident Audit Logger"]
    end

    subgraph DATA_ACCESS["Data Access Layer (Prisma ORM)"]
        R_User["User & Role Repository"]
        R_Topic["Research Vacancy Repository"]
        R_App["Application Repository"]
        R_Appr["Approval Status Repository"]
        R_Log["Logbook Repository"]
        R_Eval["Evaluation Repository"]
        R_Audit["Audit Log Repository"]
    end

    C_Apply --> S_Elig
    C_Apply --> S_SLA
    C_Approval --> S_Workflow
    C_Grading --> S_Rubric
    
    S_Elig --> R_App
    S_Workflow --> R_Appr
    S_Rubric --> R_Eval
    
    C_Auth --> S_Audit
    C_Apply --> S_Audit
    C_Approval --> S_Audit
    C_Grading --> S_Audit
    S_Audit --> R_Audit

    style BUSINESS_DOMAIN fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style CONTROLLER fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style DATA_ACCESS fill:#dcfce7,stroke:#16a34a,stroke-width:2px
```

---

## 3. Data Flow Diagram (DFD)

### 3.1 DFD Level 0: Context Diagram
Diagram Alir Data tingkat konteks memperlihatkan batas sistem dan aliran pertukaran data antara SiRiset dengan seluruh entitas eksternal:

```mermaid
flowchart TD
    MHS[Mahasiswa] -->|Data Lamaran, Logbook Mingguan, Laporan Monev, Luaran Akhir| SIRISET((0.0<br>Sistem Informasi<br>SiRiset))
    SIRISET -->|Katalog Lowongan, Status Pendaftaran, Feedback Logbook, Rekap Nilai| MHS

    DOSEN_P[Dosen Peneliti] -->|Data Lowongan Hibah, Hasil Seleksi, Feedback Logbook, Nilai Rubrik| SIRISET
    SIRISET -->|Daftar Pelamar, Logbook Mahasiswa, Berkas Monev, Draft Berita Acara| DOSEN_P

    DOSEN_W[Dosen Wali] -->|E-Approval Rencana Studi & KRS Konversi| SIRISET
    SIRISET -->|Notifikasi & Ringkasan Dokumen Lamaran Mahasiswa| DOSEN_W

    KAPRODI[Kaprodi] -->|E-Approval Kurikulum & Pengesahan Usulan Pembimbing| SIRISET
    SIRISET -->|Berkas Pendaftaran Terverifikasi & Rekap Peserta| KAPRODI

    KOOR[Koordinator MBKM] -->|Validasi Berkas, Perintah Sync SIMPELMAS, Penguncian Nilai| SIRISET
    SIRISET -->|Dashboard KPI, Rekap Nilai Konversi MB04, Log Integrasi| KOOR

    LPPM[LPPM Reviewer] -->|Jadwal Monev, Lembar Nilai & Rekomendasi Reviewer| SIRISET
    SIRISET -->|Laporan Kemajuan Terpusat, Rekap Logbook, Luaran Penelitian| LPPM

    SIRISET -->|Request Verifikasi IPK & Riwayat MK| SIAKAD[SIAKAD UTM]
    SIAKAD -->|Data Prestasi Akademik Mahasiswa| SIRISET

    SIRISET -->|Payload Data Peserta Riset Hibah Terverifikasi| SIMPELMAS[SIMPELMAS LPPM]
    SIMPELMAS -->|Status Sinkronisasi & ID Penugasan Hibah| SIRISET

    style SIRISET fill:#3b82f6,color:#fff,stroke:#1d4ed8,stroke-width:3px
```

---

### 3.2 DFD Level 1: Dekomposisi Proses Utama

Sistem SiRiset didekomposisi ke dalam **6 Sub-proses Fungsional**:
1. **1.0 Manajemen Otentikasi & Profil**: Verifikasi akun pengguna (NIM/NIP), pembuatan token sesi terenkripsi, dan pengaturan preferensi peran.
2. **2.0 Manajemen Lowongan & Lamaran Riset**: Publikasi topik riset hibah oleh dosen, penelusuran katalog riset, pengajuan lamaran mahasiswa, dan verifikasi otomatis aturan kelayakan via SIAKAD.
3. **3.0 Orkestrasi E-Approval Simultan**: Pemicu alur kerja persetujuan paralel untuk Dosen Wali, Dosen Peneliti, dan Kaprodi beserta penerbitan dokumen digital berstempel QR-Code.
4. **4.0 Jembatan Sinkronisasi Eksternal**: Pemrosesan transfer data peserta riset ke basis data SIMPELMAS LPPM pasca-validasi Koordinator MBKM.
5. **5.0 Pengelolaan Logbook & Monitoring Bimbingan**: Siklus mingguan pengisian kegiatan mahasiswa, pengiriman notifikasi pengingat, dan peninjauan langsung (*inline review*) oleh dosen.
6. **6.0 Evaluasi Monev, Repositori Luaran, & Auto-Konversi Nilai**: Pengunggahan dokumen kemajuan dan hasil luaran, pengisian rubrik multi-kriteria digital, serta kalkulasi otomatis paket konversi nilai 20 SKS mata kuliah MB04.

---

## 4. Diagram Transisi Status (*State Machine Diagrams*)

Untuk memastikan tidak ada kondisi ambivalen pada siklus hidup data, sistem menerapkan mesin status (*State Machine*) yang ketat:

### 4.1 Mesin Status Pendaftaran Mahasiswa (`ApplicationStatus`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Mahasiswa Mengisi Form
    DRAFT --> SUBMITTED : Mahasiswa Submit Lamaran
    
    state SUBMITTED {
        [*] --> VERIFYING_SIAKAD
        VERIFYING_SIAKAD --> ELIGIBLE : IPK >= 3.0 & MK Wajib Lulus
        VERIFYING_SIAKAD --> INELIGIBLE_REJECTED : Syarat Tidak Terpenuhi
    }

    INELIGIBLE_REJECTED --> [*] : Ditolak Sistem Otomatis
    
    ELIGIBLE --> UNDER_REVIEW_DOSEN : Masuk ke Antrean Dosen
    UNDER_REVIEW_DOSEN --> DOSEN_REJECTED : Dosen Menolak / Kuota Penuh (SLA <= 7 Hari)
    DOSEN_REJECTED --> [*] : Mahasiswa Cari Riset Lain / Kuliah Reguler
    
    DOSEN_ACCEPTED --> PARALLEL_APPROVAL_PENDING : Dosen Menerima Pelamar
    UNDER_REVIEW_DOSEN --> DOSEN_ACCEPTED
    
    state PARALLEL_APPROVAL_PENDING {
        [*] --> WAITING_3_PARTIES
        WAITING_3_PARTIES --> REVISION_REQUESTED : Salah Satu Dosen Minta Revisi
        REVISION_REQUESTED --> WAITING_3_PARTIES : Mahasiswa Submit Revisi
        WAITING_3_PARTIES --> ALL_APPROVED : Dosen Wali, Peneliti, & Kaprodi Setuju
    }
    
    ALL_APPROVED --> VERIFIED_KOORDINATOR : Koordinator MBKM Validasi
    VERIFIED_KOORDINATOR --> SYNCED_SIMPELMAS : Sinkronisasi ke LPPM Selesai
    SYNCED_SIMPELMAS --> IN_PROGRESS_RESEARCH : Riset Berjalan Aktif (4 Bulan)
    
    IN_PROGRESS_RESEARCH --> MONEV_COMPLETED : Monev LPPM Selesai (Minggu ke-8)
    MONEV_COMPLETED --> OUTPUT_SUBMITTED : Luaran Diunggah (Bulan ke-4)
    OUTPUT_SUBMITTED --> GRADED_COMPLETED : Dosen Input Rubrik Nilai
    GRADED_COMPLETED --> [*] : Nilai MB04 Masuk SIAKAD
```

---

### 4.2 Mesin Status Logbook Mingguan (`LogbookStatus`)

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED : Dibuat Otomatis per Minggu
    SCHEDULED --> PENDING_SUBMISSION : Menunggu Mahasiswa Isi
    PENDING_SUBMISSION --> SUBMITTED_ON_TIME : Mahasiswa Submit Sebelum Deadline (Jumat 23:59)
    PENDING_SUBMISSION --> LATE_SUBMITTED : Mahasiswa Submit Melewati Deadline (Diberi Flag)
    
    SUBMITTED_ON_TIME --> UNDER_LECTURER_REVIEW : Masuk ke Dasbor Dosen
    LATE_SUBMITTED --> UNDER_LECTURER_REVIEW
    
    UNDER_LECTURER_REVIEW --> NEED_REVISION : Dosen Berikan Catatan Perbaikan
    NEED_REVISION --> RESUBMITTED : Mahasiswa Perbaiki Catatan
    RESUBMITTED --> UNDER_LECTURER_REVIEW
    
    UNDER_LECTURER_REVIEW --> APPROVED_VALID : Dosen Memvalidasi Logbook
    APPROVED_VALID --> [*] : Logbook Terarsip Sempurna & Terhitung di KPI
```

---

## 5. Matriks Kontrol Akses Berbasis Peran (RBAC Matrix)

Keamanan akses data dijamin melalui matriks hak akses (*Access Control List*) pada tabel berikut:

| Modul / Kemampuan Sistem | Mahasiswa | Dosen Peneliti | Dosen Wali | Kaprodi | Koordinator MBKM | Reviewer LPPM | Administrator |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Katalog Lowongan Riset** | Read | Create, Read, Update, Delete | Read | Read | Read | Read | Full Access |
| **Pendaftaran Mahasiswa** | Create, Read, Update (Draft) | Read (Pelamar Miliknya) | Read (Bimbingannya) | Read (Semua TI) | Read (Semua TI) | Read (Peserta) | Full Access |
| **Seleksi Pelamar Riset** | None | Update (Terima/Tolak) | None | None | None | None | Full Access |
| **E-Approval Berkas** | Read (Status) | Approve/Reject (Riset) | Approve/Reject (Wali) | Approve/Reject (Prodi) | Validate Final | None | Full Access |
| **1-Click Sync SIMPELMAS** | None | Read (Status Sync) | None | None | **Execute Sync** | Read (Hasil Sync) | Full Access |
| **Logbook Mingguan** | Create, Update (Milik Sendiri) | Read, Review, Feedback | Read (Bimbingannya) | Read (Laporan) | Read (Rekap Prodi) | Read (Rekap) | Full Access |
| **Monev & Laporan Kemajuan** | Create, Update (Upload) | Read, Tindak Lanjut | None | Read | Read | **Evaluate & Score** | Full Access |
| **Manajemen Luaran Riset** | Create, Update (Upload) | Verify & Validate | None | Read | Read | Read (Arsip) | Full Access |
| **Penilaian Rubrik Digital** | Read (Transkrip) | **Input Nilai Rubrik** | None | Read | **Lock & Export Nilai** | Read | Full Access |
| **Audit Log Keamanan** | None | None | None | None | Read (Aktivitas Prodi) | None | **Full Access** |

---

## 6. Arsitektur Keamanan & Kepatuhan Data

1. **Autentikasi & Manajemen Sesi**:
   - Menerapkan arsitektur sesi berbasis *JSON Web Token (JWT)* yang ditandatangani menggunakan algoritma *HMAC-SHA256* dengan kunci rahasia berkekuatan tinggi (*256-bit entropy*).
   - Cookie sesi disetel dengan atribut ketat: `HttpOnly = true` (kebal pencurian via XSS), `Secure = true` (hanya lewat HTTPS), `SameSite = Lax` (mencegah eksploitasi CSRF).
2. **Proteksi Injeksi Basis Data & Sanitasi Input**:
   - Seluruh interaksi basis data dieksekusi melalui **Prisma ORM** yang menerapkan *Parameterized Queries* secara inheren, menjamin sistem 100% imun terhadap serangan *SQL Injection*.
   - Seluruh payload request divalidasi dan disanitasi menggunakan skema deklaratif **Zod** sebelum dieksekusi oleh controller.
3. **Keamanan Penyimpanan Berkas (*File Upload Security*)**:
   - Pemeriksaan ganda: ekstensi nama file dan validasi *MIME Type* berbasis *Magic Bytes* di sisi server untuk mencegah berkas biner berbahaya (*executable masquerading*).
   - File diacak namanya menggunakan UUIDv4 (`{uuid}.pdf`) untuk mencegah serangan *Path Traversal* dan *File Overwriting*.
4. **Jejak Audit Digital (*Audit Trail*)**:
   - Seluruh aksi yang mengubah status data secara permanen (Approval, Input Nilai, Sinkronisasi API, Perubahan Status) dicatat di tabel `audit_logs` yang bersifat *Append-Only* (tidak dapat diubah atau dihapus).

