/**
 * Adapter MOCK SIMPELMAS LPPM UTM (FR-05.1).
 *
 * Mensimulasikan endpoint REST SIMPELMAS: `POST {SIMPELMAS_API_ENDPOINT}/research-members/batch`.
 * Kontrak request/response dibuat sama dengan API sesungguhnya, sehingga integrasi live cukup
 * mengganti isi `pushParticipants` dengan `fetch()` ke SIMPELMAS_API_ENDPOINT.
 */
import { createHash } from "node:crypto";

/** Skema data peserta yang dikirim ke SIMPELMAS (FR-05.2). */
export type SimpelmasParticipant = {
  nim: string;
  studentName: string;
  programStudy: string;
  leadLecturerNip: string;
  leadLecturerName: string;
  researchTitle: string;
  grantContractNumber: string;
  grantScheme: string;
  startDate: string; // YYYY-MM-DD
  academicPeriod: string; // "2026/2027 Ganjil"
  facultyCode: string; // "FT"
};

export type SimpelmasBatchRequest = {
  batchReferenceId: string;
  sourceSystem: "SIRISET-TI-UTM";
  participants: SimpelmasParticipant[];
};

export type SimpelmasRecordResult =
  | { nim: string; status: "ACCEPTED"; simpelmasId: string; registeredAt: string }
  | { nim: string; status: "REJECTED"; errorCode: string; message: string };

export type SimpelmasBatchResponse = {
  batchReferenceId: string;
  receivedAt: string;
  results: SimpelmasRecordResult[];
};

export class SimpelmasUnavailableError extends Error {}

/** ID peserta di SIMPELMAS bersifat stabil per (NIM, nomor kontrak) — sinkron ulang tidak membuat duplikat. */
function simpelmasIdFor(p: SimpelmasParticipant) {
  const year = p.startDate.slice(0, 4);
  const hash = createHash("sha256").update(`${p.nim}|${p.grantContractNumber}`).digest("hex").slice(0, 6).toUpperCase();
  return `SMP-${year}-${hash}`;
}

function validate(p: SimpelmasParticipant): string | null {
  if (!/^\d{12}$/.test(p.nim)) return "NIM harus 12 digit.";
  if (!/^\d{18}$/.test(p.leadLecturerNip)) return "NIP Dosen Ketua harus 18 digit.";
  if (!p.grantContractNumber.includes("/")) return "Nomor kontrak hibah tidak dikenali LPPM.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)) return "Tanggal mulai tidak valid.";
  return null;
}

/** Kirim batch peserta ke SIMPELMAS (mock: latensi jaringan ± 400 ms, validasi skema per baris). */
export async function pushParticipants(request: SimpelmasBatchRequest): Promise<SimpelmasBatchResponse> {
  if (process.env.SIMPELMAS_API_MOCK_ENABLED !== "true") {
    throw new SimpelmasUnavailableError(
      'Integrasi SIMPELMAS live belum dikonfigurasi. Set SIMPELMAS_API_MOCK_ENABLED="true" untuk mode mock.',
    );
  }
  await new Promise((r) => setTimeout(r, 400));

  const now = new Date().toISOString();
  return {
    batchReferenceId: request.batchReferenceId,
    receivedAt: now,
    results: request.participants.map((p): SimpelmasRecordResult => {
      const error = validate(p);
      return error
        ? { nim: p.nim, status: "REJECTED", errorCode: "SCHEMA_VALIDATION", message: error }
        : { nim: p.nim, status: "ACCEPTED", simpelmasId: simpelmasIdFor(p), registeredAt: now };
    }),
  };
}
