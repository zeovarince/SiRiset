/**
 * Skema validasi Pendaftaran (FR-03) & Keputusan Seleksi — dipakai Server Action dan API.
 */
import { z } from "zod";

export const CONVERSION_SCHEMES = {
  MB04: {
    label: "Paket MB04 – 20 SKS",
    // Rincian 6 mata kuliah konversi — ui-ux-design-wireframes.md Layar 3 (BR-01: total 20 SKS)
    courses: [
      { code: "MB04-01", name: "Capstone Project Riset", credits: 4 },
      { code: "MB04-02", name: "Pemrograman & Implementasi Machine Learning", credits: 4 },
      { code: "MB04-03", name: "Pengujian & Evaluasi Model AI", credits: 3 },
      { code: "MB04-04", name: "Rekayasa Perangkat Lunak Lanjut", credits: 3 },
      { code: "MB04-05", name: "Metodologi Penelitian Ilmiah", credits: 3 },
      { code: "MB04-06", name: "Etika Profesi Informatika", credits: 3 },
    ],
  },
} as const;

/** Mata kuliah Kerja Praktik terpisah (BR-02). */
export const KP_COURSE = { code: "KP-01", name: "Kerja Praktik (topik terpisah dari riset)", credits: 2 } as const;

export function conversionCourses(scheme: string, includesKp: boolean) {
  const base = CONVERSION_SCHEMES[scheme as ConversionScheme]?.courses ?? [];
  const list = includesKp ? [...base, KP_COURSE] : [...base];
  return { list, totalCredits: list.reduce((n, c) => n + c.credits, 0) };
}

export type ConversionScheme = keyof typeof CONVERSION_SCHEMES;

const checkbox = z.preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean());

export const applicationInputSchema = z.object({
  proposalTitle: z
    .string({ required_error: "Judul rencana riset wajib diisi." })
    .trim()
    .min(10, "Judul rencana riset minimal 10 karakter.")
    .max(255, "Judul rencana riset maksimal 255 karakter."),
  conversionScheme: z.enum(Object.keys(CONVERSION_SCHEMES) as [ConversionScheme], {
    errorMap: () => ({ message: "Pilih paket konversi yang tersedia." }),
  }),
  includesKpConversion: checkbox,
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export type ApplicationField = keyof ApplicationInput | "proposal";

export type ApplyFormState = {
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<ApplicationField, string>>;
  values?: { proposalTitle: string; conversionScheme: string; includesKpConversion: boolean };
};

export const decisionSchema = z
  .object({
    decision: z.enum(["ACCEPT", "REJECT"], { errorMap: () => ({ message: "Keputusan tidak dikenali." }) }),
    notes: z
      .string()
      .trim()
      .max(1000, "Catatan maksimal 1000 karakter.")
      .optional()
      .transform((v) => v || undefined),
  })
  .refine((d) => d.decision === "ACCEPT" || (d.notes?.length ?? 0) >= 10, {
    path: ["notes"],
    message: "Alasan penolakan wajib diisi (minimal 10 karakter) agar mahasiswa memperoleh umpan balik objektif.",
  });

export type DecisionInput = z.infer<typeof decisionSchema>;
