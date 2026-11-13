/** Skema validasi Luaran Riset (FR-08) & Penilaian Rubrik (FR-09). */
import { z } from "zod";

export const OUTPUT_TYPES = {
  JURNAL: "Artikel Jurnal",
  PROSIDING: "Naskah Prosiding",
  POSTER: "Poster Ilmiah",
  PROTOTIPE: "Prototipe Software",
} as const;
export type OutputTypeKey = keyof typeof OUTPUT_TYPES;

export const PUBLICATION_STATUSES = {
  DRAFT: "Draf",
  SUBMITTED: "Submitted",
  ACCEPTED: "Accepted",
  PUBLISHED: "Published",
} as const;

export const outputInputSchema = z.object({
  outputType: z.enum(Object.keys(OUTPUT_TYPES) as [OutputTypeKey], {
    errorMap: () => ({ message: "Pilih kategori luaran." }),
  }),
  title: z
    .string({ required_error: "Judul luaran wajib diisi." })
    .trim()
    .min(10, "Judul luaran minimal 10 karakter.")
    .max(255, "Judul luaran maksimal 255 karakter."),
  targetPublicationName: z
    .string({ required_error: "Target publikasi wajib diisi." })
    .trim()
    .min(3, "Target publikasi wajib diisi.")
    .max(255, "Target publikasi maksimal 255 karakter."),
  publicationStatus: z.enum(Object.keys(PUBLICATION_STATUSES) as [keyof typeof PUBLICATION_STATUSES], {
    errorMap: () => ({ message: "Pilih status publikasi." }),
  }),
  demoLink: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^https:\/\/\S+$/.test(v), "Tautan harus diawali https:// (demo aplikasi, repositori, atau DOI)."),
});

export type OutputInput = z.infer<typeof outputInputSchema>;
export type OutputField = keyof OutputInput | "document";

export type OutputFormState = {
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<OutputField, string>>;
  values?: Record<keyof OutputInput, string>;
};

const score = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} harus berupa angka.` })
    .min(0, `${label} minimal 0.`)
    .max(100, `${label} maksimal 100.`);

export const assessmentInputSchema = z.object({
  scoreDisciplineLogbook: score("Skor kedisiplinan & logbook"),
  scoreResearchQuality: score("Skor kualitas teknis & metodologi"),
  scoreOutputAchievement: score("Skor pemenuhan target luaran"),
  scoreReportPresentation: score("Skor laporan akhir & presentasi"),
});

export type AssessmentInput = z.infer<typeof assessmentInputSchema>;

export type AssessmentFormState = {
  nonce: number;
  error?: string;
  fieldErrors?: Partial<Record<keyof AssessmentInput, string>>;
};
