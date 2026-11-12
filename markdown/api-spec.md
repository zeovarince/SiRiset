# Spesifikasi Antarmuka Pemrograman Aplikasi (RESTful API Specification)
## SiRiset: Sistem Informasi MBKM Riset Terpadu
### Program Studi Teknik Informatika, Fakultas Teknik, Universitas Trunodjoyo Madura

---

## 1. Konvensi & Standar API

Seluruh antarmuka pertukaran data pada **SiRiset** mengikuti kaidah arsitektur **RESTful API** dengan konvensi standar industri:

### 1.1 Base URL & Versi
```
https://siriset.trunojoyo.ac.id/api/v1
```
*(Untuk lingkungan pengembangan lokal: `http://localhost:3000/api/v1`)*

### 1.2 Header Standar
Setiap permintaan (*request*) dan respon (*response*) wajib menyertakan header:
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <JWT_TOKEN>` (atau berbasis sesi *HTTP-Only Cookie*)

### 1.3 Format Respon Terstandar (*Standard Response Envelope*)

#### Respon Sukses (2xx):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operasi berhasil dieksekusi.",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "totalRecords": 45
  }
}
```

#### Respon Kesalahan (4xx / 5xx):
```json
{
  "success": false,
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Pendaftaran gagal: Nilai IPK Anda (2.85) di bawah syarat minimum 3.00.",
  "details": [
    {
      "field": "gpaAtApplication",
      "issue": "Nilai harus >= 3.00 sesuai Aturan Akademik BR-03"
    }
  ],
  "timestamp": "2026-11-12T20:15:30.000Z"
}
```

---

## 2. Modul Autentikasi & Sesi Pengguna

### 2.1 `POST /auth/login`
Autentikasi akun pengguna menggunakan kredensial kampus (NIM/NIP).

- **Hak Akses**: Publik
- **Request Body**:
```json
{
  "nimNip": "240411100020",
  "password": "PasswordAman123!"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login berhasil.",
  "data": {
    "user": {
      "id": "e4b6d910-1a2b-4c3d-9e8f-7a6b5c4d3e2f",
      "nimNip": "240411100020",
      "fullName": "Reno Syaelendra",
      "email": "reno.syaelendra@student.trunojoyo.ac.id",
      "roles": ["MAHASISWA"],
      "activeRole": "MAHASISWA"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.2 `POST /auth/switch-role`
Beralih konteks peran bagi pengguna dengan multi-peran (misal: Dosen Peneliti beralih ke Dosen Wali).

- **Hak Akses**: Terautentikasi
- **Request Body**:
```json
{
  "targetRole": "DOSEN_WALI"
}
```

---

## 3. Modul Manajemen Lowongan Riset (Solusi PP1)

### 3.1 `GET /vacancies`
Mengambil katalog penawaran riset dosen yang berstatus `PUBLISHED`.

- **Hak Akses**: Terautentikasi (Semua Peran)
- **Query Parameters**:
  - `page`: nomor halaman (default: `1`)
  - `limit`: jumlah data per halaman (default: `10`)
  - `search`: kata kunci pencarian (judul / nama dosen)
  - `grantScheme`: filter skema hibah LPPM
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "title": "Pengembangan Model Klasifikasi Citra Medis Berbasis Vision Transformer",
      "grantContractNumber": "042/UN46.4.1/PT/2026",
      "grantScheme": "Penelitian Mandiri LPPM UTM",
      "quota": 4,
      "enrolledCount": 1,
      "remainingQuota": 3,
      "requiredSkills": "Python, PyTorch, Deep Learning, Image Processing",
      "applicationEndDate": "2026-09-05",
      "lecturer": {
        "id": "f9e8d7c6-b5a4-4321-8765-4321fedcba98",
        "name": "Dr. Mula'ab, S.Si., M.Kom.",
        "nimNip": "197204152000031001"
      }
    }
  ]
}
```

### 3.2 `POST /vacancies`
Dosen Peneliti menerbitkan penawaran riset baru.

- **Hak Akses**: `DOSEN_PENELITI`, `ADMIN`
- **Request Body**:
```json
{
  "title": "Klasifikasi Varietas Jagung Madura Berbasis Mobile App & Edge AI",
  "grantContractNumber": "089/UN46.4.1/PT/2026",
  "grantScheme": "Penelitian Terapan LPPM",
  "description": "Riset berfokus pada optimasi model deteksi hama jagung menggunakan TensorFlow Lite.",
  "quota": 3,
  "requiredSkills": "Flutter, Kotlin, Machine Learning",
  "applicationStartDate": "2026-08-15",
  "applicationEndDate": "2026-09-01"
}
```

---

## 4. Modul Pendaftaran & Seleksi Mahasiswa (Solusi PP2 & PP4)

### 4.1 `POST /applications`
Mahasiswa mengajukan lamaran ke lowongan riset. Endpoint ini secara otomatis memicu verifikasi kelayakan akademik via adapter SIAKAD (*Automated Eligibility Check*).

- **Hak Akses**: `MAHASISWA`
- **Request Body**:
```json
{
  "vacancyId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "proposalTitle": "Penerapan Algoritma ViT pada Citra CT-Scan Tumor Otak",
  "proposalFileUrl": "https://storage.trunojoyo.ac.id/proposals/proposal_reno_2026.pdf",
  "conversionScheme": "MB04",
  "includesKpConversion": false
}
```
- **Response Sukses (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Lamaran berhasil diajukan dan memenuhi syarat kelayakan SIAKAD (IPK: 3.85).",
  "data": {
    "applicationId": "b8a7c6d5-e4f3-4210-9876-543210fedcba",
    "status": "SUBMITTED",
    "slaDeadline": "2026-09-08T23:59:59.000Z",
    "student": "Reno Syaelendra"
  }
}
```

### 4.2 `PATCH /applications/:id/decision`
Dosen Peneliti menerima atau menolak mahasiswa pendaftar dengan tenggat waktu SLA maksimal 7 hari kerja.

- **Hak Akses**: `DOSEN_PENELITI` (Pemilik Lowongan Terkait)
- **Request Body**:
```json
{
  "decision": "ACCEPT",
  "notes": "Lolos seleksi portofolio pemrograman Python dan pemahaman machine learning."
}
```
- **Efek Samping Sistem**:
  Jika `ACCEPT`: Status berubah menjadi `DOSEN_ACCEPTED` dan sistem secara otomatis men-generate instans data approval simultan untuk Dosen Wali, Dosen Peneliti, dan Kaprodi.

---

## 5. Modul Workflow E-Approval Simultan (Solusi PP3)

### 5.1 `GET /approvals/pending`
Mengambil antrean berkas pendaftaran mahasiswa yang menunggu persetujuan elektronik pengguna saat ini.

- **Hak Akses**: `DOSEN_WALI`, `DOSEN_PENELITI`, `KAPRODI`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "approvalId": "c1d2e3f4-a5b6-7890-bcde-f123456789ab",
      "applicationId": "b8a7c6d5-e4f3-4210-9876-543210fedcba",
      "studentName": "Reno Syaelendra",
      "nim": "240411100020",
      "researchTitle": "Pengembangan Model Klasifikasi Citra Medis Berbasis Vision Transformer",
      "gpa": 3.85,
      "roleToApprove": "DOSEN_WALI",
      "documentDownloadUrl": "/api/v1/applications/b8a7c6d5.../pdf"
    }
  ]
}
```

### 5.2 `POST /approvals/:id/decide`
Mengeksekusi persetujuan elektronik satu-klik (*One-Click E-Approval*).

- **Hak Akses**: `DOSEN_WALI`, `DOSEN_PENELITI`, `KAPRODI`
- **Request Body**:
```json
{
  "action": "APPROVE",
  "notes": "Rencana konversi paket mata kuliah MB04 (20 SKS) telah sesuai dengan kurikulum."
}
```
- **Efek Samping Sistem**:
  Jika ketiga pihak telah menyetujui, status aplikasi naik menjadi `APPROVAL_COMPLETE` dan masuk ke antrean validasi Koordinator MBKM.

---

## 6. Modul Jembatan Sinkronisasi SIMPELMAS LPPM (Solusi PP5)

### 6.1 `POST /sync/simpelmas`
Memicu sinkronisasi data seluruh mahasiswa MBKM Riset terverifikasi ke sistem SIMPELMAS LPPM UTM dalam satu klik, menghapus input ganda oleh dosen pasca-KRS.

- **Hak Akses**: `KOORDINATOR_MBKM`, `ADMIN`
- **Request Body**:
```json
{
  "academicPeriod": "2026/2027 Ganjil",
  "facultyCode": "FT"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Sinkronisasi berhasil: 18 data mahasiswa riset berhasil dicatat di SIMPELMAS.",
  "data": {
    "syncedCount": 18,
    "failedCount": 0,
    "timestamp": "2026-09-15T10:30:00.000Z",
    "batchReferenceId": "SYNC-SIMPELMAS-2026-09-15-001"
  }
}
```

---

## 7. Modul Digital Logbook Mingguan (Solusi PP7)

### 7.1 `POST /logbooks`
Mahasiswa mencatat aktivitas penelitian mingguan secara terstruktur.

- **Hak Akses**: `MAHASISWA`
- **Request Body**:
```json
{
  "applicationId": "b8a7c6d5-e4f3-4210-9876-543210fedcba",
  "weekNumber": 3,
  "activityDate": "2026-09-22",
  "durationHours": 18,
  "activityDescription": "Melakukan preprocessing dataset citra MRI otak: normalisasi ukuran piksel 224x224, augmentasi data rotasi dan flipping.",
  "challengesFaced": "Ketidakseimbangan jumlah sampel antara kelas tumor jinak dan ganas.",
  "solutionsImplemented": "Menerapkan teknik oversampling SMOTE dan focal loss pada fungsi loss pelatihan.",
  "evidenceFileUrl": "https://storage.trunojoyo.ac.id/logbooks/week3_proof.jpg",
  "repositoryLink": "https://github.com/renosyaelendra/vit-brain-tumor/commit/8a7b6c5"
}
```

### 7.2 `POST /logbooks/:id/review`
Dosen Peneliti memeriksa dan memberikan catatan bimbingan (*inline mentoring*).

- **Hak Akses**: `DOSEN_PENELITI`
- **Request Body**:
```json
{
  "reviewStatus": "APPROVED",
  "feedbackNotes": "Langkah preprocessing sudah tepat. Pada minggu berikutnya, lanjutkan dengan eksplorasi patch extraction ukuran 16x16."
}
```

---

## 8. Modul Monev & Laporan Kemajuan (Solusi PP6)

### 8.1 `POST /monev/reports`
Mahasiswa mengunggah dokumen Laporan Kemajuan pertengahan masa kegiatan (Minggu ke-8).

- **Hak Akses**: `MAHASISWA`
- **Request Body**:
```json
{
  "applicationId": "b8a7c6d5-e4f3-4210-9876-543210fedcba",
  "reportTitle": "Laporan Kemajuan: Implementasi Arsitektur ViT untuk Klasifikasi Medis",
  "reportFileUrl": "https://storage.trunojoyo.ac.id/monev/lap_kemajuan_reno.pdf",
  "researchProgressSummary": "Pengumpulan dataset dan pelatihan model baseline telah mencapai akurasi validasi 89.2%.",
  "estimatedPercentage": 55.0
}
```

### 8.2 `POST /monev/evaluations`
Tim Reviewer LPPM menginput hasil penilaian sesi seminar Monev.

- **Hak Akses**: `LPPM_REVIEWER`
- **Request Body**:
```json
{
  "progressReportId": "d4e5f6a7-b8c9-0123-4567-89abcdef0123",
  "scoreProgress": 88.5,
  "scoreMethodology": 85.0,
  "evaluationNotes": "Progres riset sangat baik dan sesuai timeline hibah dosen.",
  "improvementRecommendations": "Tambahkan visualisasi peta atensi (Attention Map) untuk analisis interpretasi model AI."
}
```

---

## 9. Modul Luaran Riset & Penilaian Digital Rubrik (Solusi PP8 & PP9)

### 9.1 `POST /outputs`
Mahasiswa mendaftarkan luaran riset akhir sesuai target proposal.

- **Hak Akses**: `MAHASISWA`
- **Request Body**:
```json
{
  "applicationId": "b8a7c6d5-e4f3-4210-9876-543210fedcba",
  "outputType": "JURNAL",
  "title": "Brain Tumor Classification Using Enhanced Vision Transformer Architecture",
  "targetPublicationName": "Journal of Informatics and Computer Science (JIKOM - Sinta 2)",
  "documentFileUrl": "https://storage.trunojoyo.ac.id/outputs/manuscript_draft_final.pdf"
}
```

### 9.2 `POST /assessments`
Dosen Peneliti menginput nilai akhir digital berbasis 4 rubrik resmi Program Studi Teknik Informatika UTM.

- **Hak Akses**: `DOSEN_PENELITI`
- **Request Body**:
```json
{
  "applicationId": "b8a7c6d5-e4f3-4210-9876-543210fedcba",
  "scoreDisciplineLogbook": 92.0,
  "scoreResearchQuality": 88.0,
  "scoreOutputAchievement": 90.0,
  "scoreReportPresentation": 89.0
}
```
- **Kalkulasi Otomatis Backend**:
  $$\text{Nilai Akhir} = (92.0 \times 0.20) + (88.0 \times 0.30) + (90.0 \times 0.30) + (89.0 \times 0.20) = 89.60$$
  $$\text{Huruf Mutu} = \mathbf{A}$$
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Penilaian berhasil disimpan.",
  "data": {
    "finalNumericScore": 89.60,
    "letterGrade": "A",
    "conversionTarget": "Mata Kuliah MB04 (20 SKS) - Lulus Sempurna",
    "finalizedAt": "2026-12-20T14:00:00.000Z"
  }
}
```

