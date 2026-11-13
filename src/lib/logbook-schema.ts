/** Skema validasi Logbook Mingguan & Ulasan Dosen (FR-06, api-spec §7). */
import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .optional()
    .transform((v) => v || undefined);

export const logbookInputSchema = z.object({
  activityDate: z
    .string({ required_error: "Tanggal pelaksanaan wajib diisi." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal pelaksanaan wajib diisi."),
  durationHours: z.coerce
    .number({ invalid_type_error: "Durasi harus berupa angka." })
    .int("Durasi harus bilangan bulat (jam).")
    .min(1, "Durasi minimal 1 jam.")
    .max(60, "Durasi maksimal 60 jam per minggu."),
  activityDescription: z
    .string({ required_error: "Deskripsi aktivitas wajib diisi." })
    .trim()
    .min(30, "Deskripsi aktivitas minimal 30 karakter agar dosen dapat menilai progres.")
    .max(3000, "Deskripsi aktivitas maksimal 3000 karakter."),
  challengesFaced: optionalText(2000, "Kendala"),
  solutionsImplemented: optionalText(2000, "Solusi"),
  repositoryLink: z
    .string()
    .trim()
    .max(255, "Tautan maksimal 255 karakter.")
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^https:\/\/\S+$/.test(v), "Tautan repositori harus diawali https:// (GitHub / GitLab / Google Colab)."),
});

export type LogbookInput = z.infer<typeof logbookInputSchema>;
export type LogbookField = keyof LogbookInput | "evidence";

export type LogbookFormValues = {
  activityDate: string;
  durationHours: string;
  activityDescription: string;
  challengesFaced: string;
  solutionsImplemented: string;
  repositoryLink: string;
};

export type LogbookFormState = {
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<LogbookField, string>>;
  values?: LogbookFormValues;
};

export const REVIEW_STATUSES = ["APPROVED", "REVISION_REQUESTED"] as const;

export const logbookReviewSchema = z
  .object({
    reviewStatus: z.enum(REVIEW_STATUSES, { errorMap: () => ({ message: "Status ulasan tidak dikenali." }) }),
    feedbackNotes: optionalText(2000, "Catatan bimbingan"),
  })
  .refine((d) => d.reviewStatus === "APPROVED" || (d.feedbackNotes?.length ?? 0) >= 10, {
    path: ["feedbackNotes"],
    message: "Tuliskan arahan revisi minimal 10 karakter agar mahasiswa tahu apa yang harus diperbaiki.",
  });

export type LogbookReviewInput = z.infer<typeof logbookReviewSchema>;
