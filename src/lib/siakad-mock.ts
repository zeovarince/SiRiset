/**
 * Adapter MOCK SIAKAD UTM — verifikasi kelayakan akademik otomatis (FR-03.2, BR-03).
 *
 * Cek 1: Status mahasiswa AKTIF pada semester berjalan.
 * Cek 2: IPK kumulatif ≥ 3.00.
 * Cek 3: Seluruh mata kuliah wajib semester 1–4 LULUS (100%).
 *
 * Data di bawah adalah data simulasi untuk demo. Integrasi SIAKAD sesungguhnya cukup
 * mengganti implementasi `fetchAcademicRecord` dengan pemanggilan ke SIAKAD_API_ENDPOINT.
 */

export const MIN_GPA = 3.0;

export type StudentStatus = "AKTIF" | "CUTI" | "NONAKTIF";

export type MandatoryCourse = { code: string; name: string; semester: number; passed: boolean };

export type AcademicRecord = {
  nim: string;
  name: string;
  programStudy: string;
  semester: number;
  status: StudentStatus;
  gpa: number;
  totalCredits: number;
  failedMandatoryCodes: string[];
};

export type EligibilityCheck = {
  key: "status" | "gpa" | "mandatory";
  label: string;
  passed: boolean;
  detail: string;
};

export type EligibilityResult =
  | { found: false; eligible: false; nim: string; message: string; checks: [] }
  | {
      found: true;
      eligible: boolean;
      nim: string;
      record: AcademicRecord;
      mandatory: { total: number; passed: number; percent: number; failed: MandatoryCourse[] };
      checks: EligibilityCheck[];
      checkedAt: Date;
    };

/** Mata kuliah wajib dasar S1 Teknik Informatika UTM semester 1–4 (simulasi kurikulum). */
export const MANDATORY_COURSES: Omit<MandatoryCourse, "passed">[] = [
  { code: "TIF101", name: "Algoritma dan Pemrograman", semester: 1 },
  { code: "TIF102", name: "Matematika Diskrit", semester: 1 },
  { code: "TIF103", name: "Pengantar Teknologi Informasi", semester: 1 },
  { code: "TIF201", name: "Struktur Data", semester: 2 },
  { code: "TIF202", name: "Aljabar Linear", semester: 2 },
  { code: "TIF203", name: "Sistem Digital", semester: 2 },
  { code: "TIF301", name: "Basis Data", semester: 3 },
  { code: "TIF302", name: "Pemrograman Berorientasi Objek", semester: 3 },
  { code: "TIF303", name: "Statistika dan Probabilitas", semester: 3 },
  { code: "TIF401", name: "Sistem Operasi", semester: 4 },
  { code: "TIF402", name: "Jaringan Komputer", semester: 4 },
  { code: "TIF403", name: "Rekayasa Perangkat Lunak", semester: 4 },
];

const PRODI = "S1 Teknik Informatika";

/** Rekam akademik simulasi. NIM 230411100999 = skenario uji GAGAL (IPK 2.75). */
const RECORDS: Record<string, AcademicRecord> = {
  "220411100088": {
    nim: "220411100088",
    name: "Ilyas",
    programStudy: PRODI,
    semester: 7,
    status: "AKTIF",
    gpa: 3.78,
    totalCredits: 118,
    failedMandatoryCodes: [],
  },
  "240411100020": {
    nim: "240411100020",
    name: "Reno Syaelendra",
    programStudy: PRODI,
    semester: 5,
    status: "AKTIF",
    gpa: 3.85,
    totalCredits: 86,
    failedMandatoryCodes: [],
  },
  "240411100019": {
    nim: "240411100019",
    name: "Rifda Nahariyah",
    programStudy: PRODI,
    semester: 5,
    status: "AKTIF",
    gpa: 3.9,
    totalCredits: 86,
    failedMandatoryCodes: [],
  },
  "230411100999": {
    nim: "230411100999",
    name: "Mahasiswa Uji Coba (IPK Rendah)",
    programStudy: PRODI,
    semester: 5,
    status: "AKTIF",
    gpa: 2.75,
    totalCredits: 80,
    failedMandatoryCodes: [],
  },
};

async function fetchAcademicRecord(nim: string): Promise<AcademicRecord | null> {
  if (process.env.SIAKAD_API_MOCK_ENABLED !== "true") {
    throw new Error("Integrasi SIAKAD live belum dikonfigurasi. Set SIAKAD_API_MOCK_ENABLED=\"true\" untuk mode mock.");
  }
  return RECORDS[nim] ?? null;
}

/** Jalankan tiga cek kelayakan BR-03 terhadap data SIAKAD. */
export async function checkEligibility(nim: string): Promise<EligibilityResult> {
  const record = await fetchAcademicRecord(nim);
  if (!record) {
    return {
      found: false,
      eligible: false,
      nim,
      message: `NIM ${nim} tidak ditemukan pada data SIAKAD. Hubungi bagian akademik Fakultas Teknik.`,
      checks: [],
    };
  }

  const courses: MandatoryCourse[] = MANDATORY_COURSES.map((c) => ({
    ...c,
    passed: !record.failedMandatoryCodes.includes(c.code),
  }));
  const passedCount = courses.filter((c) => c.passed).length;
  const percent = Math.round((passedCount / courses.length) * 100);
  const failed = courses.filter((c) => !c.passed);

  const checks: EligibilityCheck[] = [
    {
      key: "status",
      label: "Status Mahasiswa",
      passed: record.status === "AKTIF",
      detail:
        record.status === "AKTIF"
          ? `AKTIF (Semester ${record.semester} – ${record.programStudy})`
          : `${record.status} — harus berstatus AKTIF pada semester berjalan`,
    },
    {
      key: "gpa",
      label: "IPK Kumulatif",
      passed: record.gpa >= MIN_GPA,
      detail:
        record.gpa >= MIN_GPA
          ? `${record.gpa.toFixed(2)} (Memenuhi syarat ≥ ${MIN_GPA.toFixed(2)})`
          : `${record.gpa.toFixed(2)} (Belum memenuhi syarat minimal ${MIN_GPA.toFixed(2)})`,
    },
    {
      key: "mandatory",
      label: "MK Wajib Semester 1–4",
      passed: failed.length === 0,
      detail:
        failed.length === 0
          ? "100% Lulus"
          : `${percent}% Lulus — belum lulus: ${failed.map((c) => c.name).join(", ")}`,
    },
  ];

  return {
    found: true,
    eligible: checks.every((c) => c.passed),
    nim,
    record,
    mandatory: { total: courses.length, passed: passedCount, percent, failed },
    checks,
    checkedAt: new Date(),
  };
}
