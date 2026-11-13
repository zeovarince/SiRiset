/**
 * Definisi peran, menu navigasi, dan aturan akses rute (RBAC).
 * Sumber: markdown/arsitektur.md Bagian 5 (RBAC Matrix) & markdown/urutan-pengerjaan.md.
 *
 * Berkas ini edge-safe (tanpa Prisma / Node API) sehingga dapat diimpor oleh middleware.
 */

export const ROLE_CODES = [
  "MAHASISWA",
  "DOSEN_PENELITI",
  "DOSEN_WALI",
  "KAPRODI",
  "KOORDINATOR_MBKM",
  "LPPM_REVIEWER",
  "ADMIN",
] as const;

export type Role = (typeof ROLE_CODES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLE_CODES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<Role, string> = {
  MAHASISWA: "Mahasiswa",
  DOSEN_PENELITI: "Dosen Peneliti",
  DOSEN_WALI: "Dosen Wali",
  KAPRODI: "Kaprodi",
  KOORDINATOR_MBKM: "Koordinator MBKM",
  LPPM_REVIEWER: "Reviewer LPPM",
  ADMIN: "Administrator",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  MAHASISWA: "Mendaftar riset, mengisi logbook mingguan, mengunggah laporan kemajuan dan luaran.",
  DOSEN_PENELITI: "Mempublikasikan lowongan riset hibah, menyeleksi pelamar, membimbing, dan menilai.",
  DOSEN_WALI: "Memberikan e-approval akademik bagi mahasiswa bimbingan perwalian.",
  KAPRODI: "Memberikan e-approval tingkat program studi dan memantau capaian KPI.",
  KOORDINATOR_MBKM: "Memvalidasi peserta, sinkronisasi SIMPELMAS LPPM, dan mengunci konversi nilai.",
  LPPM_REVIEWER: "Mengevaluasi laporan kemajuan riset pada sesi Monev LPPM.",
  ADMIN: "Akses penuh ke seluruh modul dan audit log sistem.",
};

/** Urutan tampilan peran di Role Switcher (ADMIN tidak ditampilkan di mode demo). */
export const DEMO_ROLES = [
  "MAHASISWA",
  "DOSEN_PENELITI",
  "DOSEN_WALI",
  "KAPRODI",
  "KOORDINATOR_MBKM",
  "LPPM_REVIEWER",
] as const satisfies readonly Role[];

export type DemoRole = (typeof DEMO_ROLES)[number];

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === "string" && (DEMO_ROLES as readonly string[]).includes(value);
}

/** Akun representatif per peran untuk pintasan "Masuk sebagai" (Mode Demo). */
export const DEMO_ACCOUNTS: Record<DemoRole, string> = {
  MAHASISWA: "220411100088", // Ilyas
  DOSEN_PENELITI: "197204152000031001", // Dr. Mula'ab
  DOSEN_WALI: "198306072006042001", // Dr. Rika Yunitarini
  KAPRODI: "197905202005012002", // Bain Khusnul Khotimah
  KOORDINATOR_MBKM: "198902122019032014", // Fifin Ayu Mufarroha
  LPPM_REVIEWER: "196803121994031002", // Dr. Budi Santoso
};

/**
 * Quick Demo Bar (Fase 8): daftar putih akun yang dapat dipilih 1-klik saat demonstrasi UAS.
 * Hanya kombinasi NIM/NIP + peran di daftar ini yang diterima server.
 */
export const QUICK_DEMO_ACCOUNTS: { nimNip: string; role: Role; group: string; label: string }[] = [
  { nimNip: "240411100020", role: "MAHASISWA", group: "Mhs", label: "Reno Syaelendra (24-020)" },
  { nimNip: "220411100088", role: "MAHASISWA", group: "Mhs", label: "Ilyas (Peserta Aktif)" },
  { nimNip: "197204152000031001", role: "DOSEN_PENELITI", group: "Dosen Peneliti", label: "Dr. Mula'ab" },
  { nimNip: "198306072006042001", role: "DOSEN_WALI", group: "Dosen Wali", label: "Dr. Rika Yunitarini" },
  { nimNip: "197905202005012002", role: "KAPRODI", group: "Kaprodi", label: "Bain Khusnul Khotimah" },
  { nimNip: "198902122019032014", role: "KOORDINATOR_MBKM", group: "Koordinator MBKM", label: "Fifin Ayu Mufarroha" },
  { nimNip: "196803121994031002", role: "LPPM_REVIEWER", group: "Reviewer LPPM", label: "Dr. Budi Santoso" },
];

export type IconName =
  | "home"
  | "search"
  | "route"
  | "notebook"
  | "file-chart"
  | "award"
  | "briefcase"
  | "users"
  | "stamp"
  | "messages"
  | "clipboard-check"
  | "shield-check"
  | "refresh"
  | "graduation"
  | "bar-chart"
  | "clipboard-list";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  /** Fase implementasi pada urutan-pengerjaan.md. */
  phase: number;
  roles: Role[];
};

export const DASHBOARD_HOME: NavItem = {
  href: "/dashboard",
  label: "Beranda",
  description: "Ringkasan aktivitas MBKM Riset sesuai peran aktif.",
  icon: "home",
  phase: 0,
  roles: [...ROLE_CODES],
};

export const NAV_ITEMS: NavItem[] = [
  // Mahasiswa
  {
    href: "/dashboard/student/vacancies",
    label: "Katalog Lowongan Riset",
    description: "Cari dan filter lowongan riset hibah LPPM yang dibuka dosen peneliti.",
    icon: "search",
    phase: 1,
    roles: ["MAHASISWA"],
  },
  {
    href: "/dashboard/student/tracker",
    label: "Status Pendaftaran",
    description: "Lacak tahapan pendaftaran: seleksi dosen, e-approval, validasi prodi, hingga aktif.",
    icon: "route",
    phase: 2,
    roles: ["MAHASISWA"],
  },
  {
    href: "/dashboard/student/logbook",
    label: "Logbook Mingguan",
    description: "Isi logbook 16 minggu pelaksanaan riset beserta bukti dan tautan repositori.",
    icon: "notebook",
    phase: 5,
    roles: ["MAHASISWA"],
  },
  {
    href: "/dashboard/student/monev",
    label: "Laporan Kemajuan",
    description: "Unggah laporan kemajuan untuk sesi Monev LPPM pada minggu ke-8.",
    icon: "file-chart",
    phase: 6,
    roles: ["MAHASISWA"],
  },
  {
    href: "/dashboard/student/outputs",
    label: "Luaran Riset",
    description: "Daftarkan luaran akhir: jurnal, prosiding, poster, atau prototipe.",
    icon: "award",
    phase: 7,
    roles: ["MAHASISWA"],
  },

  // Dosen Peneliti
  {
    href: "/dashboard/lecturer/vacancies",
    label: "Lowongan Riset Saya",
    description: "Publikasikan dan kelola lowongan riset berbasis kontrak hibah LPPM.",
    icon: "briefcase",
    phase: 1,
    roles: ["DOSEN_PENELITI"],
  },
  {
    href: "/dashboard/lecturer/applicants",
    label: "Seleksi Pelamar",
    description: "Tinjau pelamar per riset, cek IPK & proposal, terima atau tolak sebelum SLA berakhir.",
    icon: "users",
    phase: 2,
    roles: ["DOSEN_PENELITI"],
  },

  // E-Approval (tiga pihak paralel)
  {
    href: "/dashboard/approvals",
    label: "E-Approval Berkas",
    description: "Persetujuan digital simultan Dosen Wali, Dosen Peneliti, dan Kaprodi.",
    icon: "stamp",
    phase: 3,
    roles: ["DOSEN_PENELITI", "DOSEN_WALI", "KAPRODI"],
  },

  {
    href: "/dashboard/lecturer/mentoring",
    label: "Mentoring Logbook",
    description: "Validasi logbook mingguan mahasiswa bimbingan dan tulis catatan mentoring.",
    icon: "messages",
    phase: 5,
    roles: ["DOSEN_PENELITI"],
  },
  {
    href: "/dashboard/lecturer/grading",
    label: "Penilaian Rubrik",
    description: "Input nilai 4 rubrik berbobot dengan konversi huruf mutu otomatis.",
    icon: "clipboard-check",
    phase: 7,
    roles: ["DOSEN_PENELITI"],
  },

  // Koordinator MBKM
  {
    href: "/dashboard/coordinator/verification",
    label: "Validasi Prodi",
    description: "Validasi akhir peserta yang telah lolos e-approval tiga pihak.",
    icon: "shield-check",
    phase: 4,
    roles: ["KOORDINATOR_MBKM"],
  },
  {
    href: "/dashboard/coordinator/sync-simpelmas",
    label: "Sinkronisasi SIMPELMAS",
    description: "Sinkronkan peserta terverifikasi ke SIMPELMAS LPPM dalam satu klik.",
    icon: "refresh",
    phase: 4,
    roles: ["KOORDINATOR_MBKM"],
  },
  {
    href: "/dashboard/coordinator/sk-dekan",
    label: "Rekap SK Dekan",
    description: "Rekap peserta tervalidasi untuk usulan SK Dekan Fakultas Teknik (cetak / CSV).",
    icon: "clipboard-list",
    phase: 4,
    roles: ["KOORDINATOR_MBKM"],
  },
  {
    href: "/dashboard/coordinator/grade-conversion",
    label: "Konversi Nilai",
    description: "Rekap, kunci, dan ekspor berita acara nilai konversi 20 SKS MB04.",
    icon: "graduation",
    phase: 7,
    roles: ["KOORDINATOR_MBKM"],
  },
  {
    href: "/dashboard/coordinator/analytics-kpi",
    label: "Analitik KPI",
    description: "Dasbor KPI efisiensi proses As-Is vs To-Be MBKM Riset.",
    icon: "bar-chart",
    phase: 8,
    roles: ["KOORDINATOR_MBKM", "KAPRODI"],
  },

  // Reviewer LPPM
  {
    href: "/dashboard/lppm/monev-session",
    label: "Sesi Monev",
    description: "Evaluasi laporan kemajuan riset dan beri skor serta rekomendasi.",
    icon: "clipboard-list",
    phase: 6,
    roles: ["LPPM_REVIEWER"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  if (role === "ADMIN") return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Aturan akses berbasis prefix rute. Dicocokkan dari prefix terpanjang.
 * Rute /dashboard tanpa aturan khusus dapat diakses semua peran yang login.
 */
const ROUTE_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/dashboard/student", roles: ["MAHASISWA"] },
  { prefix: "/dashboard/lecturer", roles: ["DOSEN_PENELITI"] },
  { prefix: "/dashboard/approvals", roles: ["DOSEN_PENELITI", "DOSEN_WALI", "KAPRODI"] },
  { prefix: "/dashboard/coordinator/analytics-kpi", roles: ["KOORDINATOR_MBKM", "KAPRODI"] },
  { prefix: "/dashboard/coordinator", roles: ["KOORDINATOR_MBKM"] },
  { prefix: "/dashboard/lppm", roles: ["LPPM_REVIEWER"] },
].sort((a, b) => b.prefix.length - a.prefix.length) as { prefix: string; roles: Role[] }[];

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "ADMIN") return true;
  const rule = ROUTE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return rule ? rule.roles.includes(role) : true;
}
