/**
 * Repositori Luaran Riset (FR-08): mahasiswa mendaftarkan luaran sesuai target proposal,
 * Dosen Peneliti memverifikasi kesesuaiannya sebelum penilaian akhir dapat diterbitkan.
 */
import type { CurrentUser } from "./auth";
import type { OutputInput } from "./grading-schema";
import { prisma } from "./prisma";
import { deleteStoredFile, saveUpload, type StoredExt } from "./storage";

export class OutputRuleError extends Error {}

/** documentFileUrl berisi storage key ("outputs/<uuid>.pdf") atau tautan https (demo / repositori / DOI). */
export function isStoredDocument(documentFileUrl: string) {
  return documentFileUrl.startsWith("outputs/");
}

export async function listOutputs(applicationId: string) {
  return prisma.researchOutput.findMany({ where: { applicationId }, orderBy: { submittedAt: "asc" } });
}

export async function createOutput(params: {
  studentId: string;
  applicationId: string;
  input: OutputInput;
  document: { bytes: Buffer; ext: StoredExt } | null;
}) {
  const app = await prisma.application.findUnique({
    where: { id: params.applicationId },
    select: { id: true, studentId: true, status: true },
  });
  if (!app || app.studentId !== params.studentId) throw new OutputRuleError("Riset tidak ditemukan.");
  if (app.status !== "IN_PROGRESS") throw new OutputRuleError("Luaran hanya dapat didaftarkan selama riset aktif.");
  if (!params.document && !params.input.demoLink) {
    throw new OutputRuleError("Unggah draf naskah/poster (PDF/PNG/JPG) atau cantumkan tautan demo aplikasi.");
  }

  const key = params.document ? await saveUpload("outputs", params.document.bytes, params.document.ext) : null;
  try {
    return await prisma.researchOutput.create({
      data: {
        applicationId: app.id,
        outputType: params.input.outputType,
        title: params.input.title,
        targetPublicationName: params.input.targetPublicationName,
        publicationStatus: params.input.publicationStatus,
        documentFileUrl: key ?? params.input.demoLink!,
      },
      select: { id: true },
    });
  } catch (err) {
    if (key) await deleteStoredFile(key);
    throw err;
  }
}

/** Hapus luaran yang belum diverifikasi dosen (berkas tetap disimpan sebagai jejak audit). */
export async function deleteOutput(studentId: string, outputId: string) {
  const output = await prisma.researchOutput.findUnique({
    where: { id: outputId },
    select: { id: true, isVerifiedByLecturer: true, application: { select: { studentId: true, status: true } } },
  });
  if (!output || output.application.studentId !== studentId) throw new OutputRuleError("Luaran tidak ditemukan.");
  if (output.isVerifiedByLecturer) throw new OutputRuleError("Luaran yang sudah diverifikasi dosen tidak dapat dihapus.");
  if (output.application.status !== "IN_PROGRESS") throw new OutputRuleError("Riset sudah selesai; luaran terkunci.");
  await prisma.researchOutput.delete({ where: { id: output.id } });
}

/** Dosen Peneliti: "Verifikasi Luaran Sesuai Target" (FR-08.2). */
export async function verifyOutput(lecturer: Pick<CurrentUser, "id" | "activeRole">, outputId: string) {
  const output = await prisma.researchOutput.findUnique({
    where: { id: outputId },
    select: {
      id: true,
      isVerifiedByLecturer: true,
      title: true,
      application: { select: { id: true, status: true, vacancy: { select: { lecturerId: true } } } },
    },
  });
  if (!output || (output.application.vacancy.lecturerId !== lecturer.id && lecturer.activeRole !== "ADMIN")) {
    throw new OutputRuleError("Luaran tidak ditemukan pada mahasiswa bimbingan Anda.");
  }
  if (output.application.status !== "IN_PROGRESS") throw new OutputRuleError("Riset sudah selesai; luaran terkunci.");
  if (output.isVerifiedByLecturer) throw new OutputRuleError("Luaran ini sudah diverifikasi.");
  await prisma.researchOutput.update({ where: { id: output.id }, data: { isVerifiedByLecturer: true } });
  return { applicationId: output.application.id, title: output.title };
}

/** Hak akses berkas luaran: mahasiswa pemilik, dosen pembimbing, & pengelola prodi/LPPM. */
export async function canAccessOutput(user: CurrentUser, outputId: string) {
  const output = await prisma.researchOutput.findUnique({
    where: { id: outputId },
    select: {
      id: true,
      documentFileUrl: true,
      outputType: true,
      application: { select: { studentId: true, student: { select: { nimNip: true } }, vacancy: { select: { lecturerId: true } } } },
    },
  });
  if (!output) return null;
  const a = output.application;
  const allowed =
    a.studentId === user.id ||
    a.vacancy.lecturerId === user.id ||
    ["KAPRODI", "KOORDINATOR_MBKM", "LPPM_REVIEWER", "ADMIN"].includes(user.activeRole);
  return allowed ? output : null;
}
