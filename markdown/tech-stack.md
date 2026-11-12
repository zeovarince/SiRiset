# Dokumen Pemilihan & Justifikasi Tumpukan Teknologi (Tech Stack)
## SiRiset: Sistem Informasi MBKM Riset Terpadu
### Program Studi Teknik Informatika, Fakultas Teknik, Universitas Trunodjoyo Madura

---

## 1. Filosofi & Kriteria Pemilihan Teknologi

Pemilihan tumpukan teknologi (*technology stack*) untuk sistem **SiRiset** didasarkan pada empat kriteria rekayasa perangkat lunak utama:
1. **Kecepatan Pengembangan & Prototyping (*Development Velocity*)**: Memungkinkan tim mahasiswa (Kelompok 2) mengimplementasikan fitur lengkap sesuai kebutuhan PRD dan BPMN To-Be dalam siklus sprint akademik yang singkat tanpa hambatan konfigurasi yang rumit.
2. **Kesesuaian Kurikulum & Keahlian Mahasiswa TI UTM**: Menggunakan teknologi industri modern yang selaras dengan profil lulusan Teknik Informatika UTM (ekosistem JavaScript/TypeScript modern, REST API, dan basis data relasional).
3. **Kekokohan Tipe Data (*End-to-End Type Safety*)**: Mengurangi *runtime bugs* dan kesalahan parsing data antar-lapisan (dari skema basis data, API backend, hingga form antarmuka pengguna) melalui integrasi TypeScript dan Prisma ORM.
4. **Kemudahan Demonstrasi & Portabilitas *Deployment***: Sistem dapat dijalankan dengan mudah di lingkungan pengujian lokal dosen penguji (*laptop demo*), wadah *Docker*, maupun layanan komputasi awan (*Cloud Hosting* seperti Vercel dan Supabase).

---

## 2. Peta Arsitektur Tumpukan Teknologi (*Tech Stack Landscape*)

```mermaid
graph TD
    subgraph FRONTEND["Frontend Presentation Layer"]
        NextClient["Next.js 15 (App Router & React 19)"]
        TS["TypeScript (Type Safety)"]
        Tailwind["Tailwind CSS 3.4 (Design System)"]
        Shadcn["Shadcn UI + Radix Primitives"]
        Lucide["Lucide React (Iconography)"]
        Recharts["Recharts (KPI & Analytics Dashboards)"]
    end

    subgraph BACKEND["Backend & Application Logic Layer"]
        ServerActions["Next.js Server Actions & Route Handlers"]
        NextAuth["NextAuth.js v5 / Auth.js (RBAC Auth)"]
        Zod["Zod (Request Validation & Sanitization)"]
        Prisma["Prisma ORM 5.x (Data Access Layer)"]
        Adapters["SIAKAD & SIMPELMAS Integration Adapters"]
    end

    subgraph DATABASE["Data Persistence & Storage Layer"]
        Postgres["PostgreSQL 16 (Primary Production DB)"]
        SQLite["SQLite (Local Zero-Config Dev DB)"]
        Storage["Local File System / S3-Compatible Storage"]
    end

    FRONTEND <-->|Server RPC / Typed JSON| BACKEND
    BACKEND <-->|Prisma Type-Safe Client| DATABASE

    style FRONTEND fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style BACKEND fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style DATABASE fill:#dcfce7,stroke:#16a34a,stroke-width:2px
```

---

## 3. Rincian Komponen Teknologi

### 3.1 Lapisan Antarmuka Pengguna (*Frontend Layer*)

| Komponen | Pilihan Teknologi | Versi | Justifikasi Pemilihan |
| :--- | :--- | :--- | :--- |
| **Framework Utama** | **Next.js (App Router)** | `15.0+` | Menawarkan *Server-Side Rendering (SSR)* untuk performa cepat dan *React Server Components (RSC)* yang meminimalkan pengiriman bundle JavaScript ke browser. |
| **Bahasa Pemrograman** | **TypeScript** | `5.6+` | Menjamin kepatuhan tipe data statis, mempermudah refaktorisasi tim, dan menyediakan *IntelliSense* akurat saat menghubungkan skema basis data ke komponen UI. |
| **Styling & CSS Engine** | **Tailwind CSS** | `3.4+` | Pendekatan *utility-first* mempercepat pembangunan antarmuka responsif tanpa harus menulis ribuan baris CSS manual. Mudah disesuaikan dengan warna identitas UTM (Biru & Emas). |
| **Komponen UI Primitives** | **Shadcn UI (Radix UI)** | Latest | Kumpulan komponen yang *accessible*, *customizable*, dan tidak terikat *runtime bundle* eksternal karena kodenya disalin langsung ke repositori proyek. |
| **Manajemen Formulir** | **React Hook Form** | `7.5+` | Pengelolaan form kompleks (seperti pengisian logbook mingguan dan form pendaftaran) yang ringan, cepat, dan terintegrasi dengan validasi Zod. |
| **Visualisasi Data & KPI**| **Recharts** | `2.12+` | Pustaka diagram berbasis SVG yang deklaratif dan responsif untuk menampilkan metrik analitik kepatuhan logbook dan capaian KPI MBKM bagi koordinator prodi. |
| **Ikonografi** | **Lucide React** | `0.4+` | Paket ikon modern yang konsisten dan berbobot ringan untuk navigasi dasbor. |

---

### 3.2 Lapisan Logika Bisnis & Layanan Backend (*Backend Layer*)

| Komponen | Pilihan Teknologi | Versi | Justifikasi Pemilihan |
| :--- | :--- | :--- | :--- |
| **Runtime Server** | **Node.js** | `20+ LTS` | Runtime JavaScript sisi server yang andal, berkinerja tinggi dalam operasi I/O asinkron, dan didukung ekosistem pustaka (*npm*) terbesar di dunia. |
| **Pola API Server** | **Next.js Server Actions & Route Handlers** | Bawaan | Meniadakan keharusan mengonfigurasi Express terpisah. Server Actions memungkinkan eksekusi mutasi data langsung dari form dengan proteksi CSRF otomatis. |
| **Object-Relational Mapping** | **Prisma ORM** | `5.18+` | ORM modern yang menghasilkan tipe data TypeScript secara otomatis dari file `schema.prisma`. Mempermudah migrasi basis data dan mencegah kesalahan query SQL manual. |
| **Validasi & Sanitasi Data** | **Zod** | `3.23+` | Validasi skema input deklaratif. Menjamin bahwa seluruh data yang masuk dari pengguna memenuhi kriteria kelayakan (contoh: IPK $\ge$ 3.00, format email UTM, dan batas ukuran karakter). |
| **Autentikasi & RBAC** | **NextAuth.js (Auth.js)** | `5.0-beta` | Solusi autentikasi standar industri untuk Next.js. Mengelola token sesi berbasis JWT terenkripsi dan menyediakan *middleware* proteksi rute berbasis peran (*Role-Based Access Control*). |

---

### 3.3 Lapisan Pangkalan Data & Penyimpanan Berkas (*Persistence Layer*)

| Komponen | Pilihan Teknologi | Keterangan & Justifikasi |
| :--- | :--- | :--- |
| **Pangkalan Data Primer** | **PostgreSQL 16** | Basis data relasional *open-source* paling andal di dunia. Mendukung transaksi *ACID*, pemrosesan JSON native, dan integritas relasional tingkat tinggi untuk lingkungan produksi. |
| **Pangkalan Data Lokal (Dev)**| **SQLite** | Basis data relasional berbasis file yang tidak membutuhkan instalasi server terpisah. Sangat ideal untuk demo cepat di laptop dosen penguji tanpa harus menjalankan PostgreSQL lokal. |
| **Penyimpanan Berkas Digital** | **Local Disk / Supabase Storage** | Penyimpanan berkas PDF proposal, bukti logbook, laporan kemajuan, dan artikel hasil riset dengan validasi *MIME type* ketat di sisi server. |

---

## 4. Analisis Perbandingan & Trade-Off Arsitektur

Tim pengembang mempertimbangkan beberapa alternatif arsitektur sebelum menetapkan pilihan pada **Next.js Fullstack (TypeScript + Prisma)**:

| Aspek Evaluasi | Opsi 1: Laravel + Blade / Vue | Opsi 2: FastAPI (Python) + React | Opsi 3: Next.js Fullstack (Dipilih) |
| :--- | :--- | :--- | :--- |
| **Keseragaman Bahasa** | Terpisah (PHP di backend, JS/HTML di frontend). | Terpisah (Python di backend, TypeScript di frontend). | **Tunggal (TypeScript di frontend & backend).** |
| **Kecepatan Setup & Demo** | Membutuhkan server PHP, Composer, MySQL, Nginx. | Membutuhkan Python virtualenv, Uvicorn, Node.js terpisah. | **Satu perintah: `npm run dev` langsung siap diuji.** |
| **Type Safety Lintas Layer** | Tidak ada tipe bawaan dari PHP ke template Blade. | Butuh sinkronisasi skema Pydantic ke TypeScript. | **100% otomatis via Prisma Client ke komponen UI.** |
| **Kemudahan Deployment** | Hosting cPanel / VPS dengan konfigurasi manual. | Memerlukan Docker / WSGI server terpisah. | **Gratis di Vercel / Netlify atau 1 container Docker.** |
| **Kesesuaian dengan Modul AI** | Kurang fleksibel jika diintegrasikan dengan model NLP. | Sangat baik untuk riset machine learning dosen. | **Cukup baik; dapat memanggil microservice Python via REST.** |

**Kesimpulan Evaluasi**:
Opsi 3 (**Next.js Fullstack**) dipilih karena memberikan efisiensi pengerjaan tertinggi bagi Kelompok 2, meminimalkan potensi kesalahan integrasi berkat keseragaman ekosistem TypeScript, dan sangat praktis untuk didemonstrasikan di hadapan dosen pengampu (**Dr. Rika Yunitarini, ST., MT.**) tanpa kerumitan konfigurasi server kampus.

---

## 5. Konfigurasi Proyek & Berkas Dependensi (`package.json`)

Berikut adalah spesifikasi berkas `package.json` yang telah disiapkan untuk proyek SiRiset:

```json
{
  "name": "siriset-utm",
  "version": "1.0.0",
  "private": true,
  "description": "Sistem Informasi MBKM Riset Terpadu Teknik Informatika UTM",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.4.2",
    "@hookform/resolvers": "^3.9.0",
    "@prisma/client": "^5.18.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "bcryptjs": "^2.4.3",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.428.0",
    "next": "15.0.3",
    "next-auth": "5.0.0-beta.20",
    "react": "19.0.0-rc-66855b96-20241025",
    "react-dom": "19.0.0-rc-66855b96-20241025",
    "react-hook-form": "^7.52.2",
    "recharts": "^2.12.7",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.14.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "prisma": "^5.18.0",
    "tailwindcss": "^3.4.10",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4"
  }
}
```

---

## 6. Variabel Lingkungan (*Environment Variables Configuration*)

Berkas konfigurasi `.env.example` disiapkan untuk standardisasi lingkungan kerja tim:

```env
# URL Basis Data (Gunakan SQLite untuk dev lokal tanpa install PostgreSQL)
# DATABASE_URL="file:./dev.db"
DATABASE_URL="postgresql://postgres:password@localhost:5432/siriset_db?schema=public"

# Rahasia Autentikasi NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-random-32-character-hash-key-siriset-utm-2026"

# Kunci API Mock Adapter Integrasi Eksternal
SIAKAD_API_MOCK_ENABLED="true"
SIAKAD_API_ENDPOINT="https://api-mock.trunojoyo.ac.id/siakad/v1"
SIMPELMAS_API_MOCK_ENABLED="true"
SIMPELMAS_API_ENDPOINT="https://api-mock.trunojoyo.ac.id/simpelmas/v1"

# Pengaturan Penyimpanan Berkas
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE_MB="5"
```

