/**
 * Skema validasi & konstanta Lowongan Riset (FR-02). Dipakai bersama oleh
 * Server Action, Route Handler /api/vacancies, dan komponen formulir (client).
 */
import { z } from "zod";

export const GRANT_SCHEMES = [
  "Penelitian Mandiri LPPM UTM",
  "Penelitian Terapan Fakultas Teknik",
  "Kerjasama Industri",
] as const;

export type GrantScheme = (typeof GRANT_SCHEMES)[number];

export const SKILL_SUGGESTIONS = [
  "Python",
  "PyTorch",
  "TensorFlow",
  "Deep Learning",
  "Machine Learning",
  "Image Processing",
  "Data Mining",
  "NLP",
  "Next.js",
  "REST API",
  "Flutter",
  "UI/UX",
  "Analisis Proses Bisnis",
  "IoT",
];

export const QUOTA_MIN = 1;
export const QUOTA_MAX = 4;
export const MAX_SKILLS = 10;

/** Simpan tag keahlian sebagai string dipisah koma (kolom required_skills). */
export function serializeSkills(skills: string[]): string {
  return skills.join(", ");
}

export function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const isoDate = z
  .string({ required_error: "Tanggal wajib diisi." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal tidak valid.");

const skillsField = z.preprocess(
  // API boleh mengirim "Python, PyTorch"; formulir mengirim array.
  (v) => (typeof v === "string" ? v.split(",") : v),
  z
    .array(z.string())
    .transform((arr) => {
      const seen = new Set<string>();
      return arr
        .map((s) => s.trim().replace(/\s+/g, " "))
        .filter((s) => {
          const key = s.toLowerCase();
          if (!s || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    })
    .pipe(
      z
        .array(z.string().max(40, "Satu tag keahlian maksimal 40 karakter."))
        .min(1, "Tambahkan minimal satu kualifikasi keahlian.")
        .max(MAX_SKILLS, `Maksimal ${MAX_SKILLS} tag keahlian.`),
    ),
);

export const vacancyInputSchema = z
  .object({
    title: z
      .string({ required_error: "Judul riset wajib diisi." })
      .trim()
      .min(10, "Judul riset minimal 10 karakter.")
      .max(255, "Judul riset maksimal 255 karakter."),
    grantContractNumber: z
      .string({ required_error: "Nomor kontrak hibah wajib diisi." })
      .trim()
      .min(5, "Nomor kontrak hibah terlalu pendek.")
      .max(100, "Nomor kontrak hibah maksimal 100 karakter.")
      .regex(/^[\w.\-]+(\/[\w.\-]+)+$/, "Format nomor kontrak tidak valid, contoh: 042/UN46.4.1/PT/2026."),
    grantScheme: z.enum(GRANT_SCHEMES, {
      errorMap: () => ({ message: "Pilih skema hibah yang tersedia." }),
    }),
    description: z
      .string({ required_error: "Deskripsi riset wajib diisi." })
      .trim()
      .min(50, "Deskripsi & silabus minimal 50 karakter agar mahasiswa memahami ruang lingkup kerja.")
      .max(5000, "Deskripsi maksimal 5000 karakter."),
    quota: z.coerce
      .number({ invalid_type_error: "Kuota harus berupa angka." })
      .int("Kuota harus bilangan bulat.")
      .min(QUOTA_MIN, `Kuota minimal ${QUOTA_MIN} mahasiswa.`)
      .max(QUOTA_MAX, `Kuota maksimal ${QUOTA_MAX} mahasiswa.`),
    requiredSkills: skillsField,
    applicationStartDate: isoDate,
    applicationEndDate: isoDate,
  })
  .refine((d) => d.applicationEndDate >= d.applicationStartDate, {
    path: ["applicationEndDate"],
    message: "Tanggal tutup tidak boleh sebelum tanggal buka.",
  });

export type VacancyInput = z.infer<typeof vacancyInputSchema>;
export type VacancyField = keyof VacancyInput;

/** Aksi submit formulir lowongan. */
export const vacancyIntentSchema = z.enum(["publish", "draft", "save"]);
export type VacancyIntent = z.infer<typeof vacancyIntentSchema>;

/** Nilai formulir mentah (untuk mengisi ulang formulir saat validasi gagal). */
export type VacancyFormValues = {
  title: string;
  grantContractNumber: string;
  grantScheme: string;
  description: string;
  quota: string;
  requiredSkills: string[];
  applicationStartDate: string;
  applicationEndDate: string;
};

export type VacancyFormState = {
  /** Berubah setiap submit agar formulir di-mount ulang dengan nilai terbaru. */
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<VacancyField, string>>;
  values?: VacancyFormValues;
};

/** Filter katalog mahasiswa (query string). */
export const catalogFilterSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  scheme: z.enum(GRANT_SCHEMES).optional().catch(undefined),
  skill: z.string().trim().max(40).optional().catch(undefined),
});
export type CatalogFilter = z.infer<typeof catalogFilterSchema>;
