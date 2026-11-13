/** Skema validasi Laporan Kemajuan & Evaluasi Monev LPPM (FR-07, api-spec §8). */
import { z } from "zod";

export const progressReportSchema = z.object({
  reportTitle: z
    .string({ required_error: "Judul laporan wajib diisi." })
    .trim()
    .min(10, "Judul laporan minimal 10 karakter.")
    .max(255, "Judul laporan maksimal 255 karakter."),
  researchProgressSummary: z
    .string({ required_error: "Ringkasan eksekutif wajib diisi." })
    .trim()
    .min(50, "Ringkasan eksekutif minimal 50 karakter.")
    .max(3000, "Ringkasan eksekutif maksimal 3000 karakter."),
  estimatedPercentage: z.coerce
    .number({ invalid_type_error: "Persentase capaian harus berupa angka." })
    .min(0, "Persentase capaian minimal 0%.")
    .max(100, "Persentase capaian maksimal 100%."),
});

export type ProgressReportInput = z.infer<typeof progressReportSchema>;
export type ProgressReportField = keyof ProgressReportInput | "reportFile";

export type ProgressReportFormState = {
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<ProgressReportField, string>>;
  values?: { reportTitle: string; researchProgressSummary: string; estimatedPercentage: string };
};

const score = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} harus berupa angka.` })
    .min(0, `${label} minimal 0.`)
    .max(100, `${label} maksimal 100.`);

export const monevEvaluationSchema = z.object({
  scoreProgress: score("Skor capaian kemajuan"),
  scoreMethodology: score("Skor penguasaan metodologi"),
  evaluationNotes: z
    .string({ required_error: "Catatan evaluasi wajib diisi." })
    .trim()
    .min(20, "Catatan evaluasi minimal 20 karakter.")
    .max(3000, "Catatan evaluasi maksimal 3000 karakter."),
  improvementRecommendations: z
    .string()
    .trim()
    .max(3000, "Rekomendasi maksimal 3000 karakter.")
    .optional()
    .transform((v) => v || undefined),
});

export type MonevEvaluationInput = z.infer<typeof monevEvaluationSchema>;
export type MonevEvaluationField = keyof MonevEvaluationInput;

export type MonevEvaluationFormState = {
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<MonevEvaluationField, string>>;
  values?: Record<MonevEvaluationField, string>;
};
