import Link from "next/link";
import { AlertCircle, FileCheck2, FileText, GraduationCap } from "lucide-react";
import { issueBeritaAcaraAction } from "@/app/actions/grading";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { StatusBadge, type Tone } from "@/components/status-badge";
import { listBeritaAcara, listGradeRecap, type GradeState } from "@/lib/assessments";
import { conversionCourses } from "@/lib/application-schema";
import { requireRole } from "@/lib/auth";
import { academicPeriod, formatDateTime } from "@/lib/format";
import { RUBRIC } from "@/lib/grading";
import { cn } from "@/lib/utils";

export const metadata = { title: "Konversi Nilai" };

const STATE: Record<GradeState, { label: string; tone: Tone }> = {
  NOT_READY: { label: "Belum dinilai", tone: "neutral" },
  READY: { label: "Belum dinilai", tone: "neutral" },
  DRAFT: { label: "Draf dosen", tone: "warning" },
  PUBLISHED: { label: "Terbit — belum dikunci", tone: "info" },
  LOCKED: { label: "Terkunci", tone: "success" },
};

/** Rekapitulasi nilai & konversi SIAKAD paket MB04 (FR-09.3). */
export default async function GradeConversionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("KOORDINATOR_MBKM");
  const sp = await searchParams;
  const [recap, bas] = await Promise.all([listGradeRecap(), listBeritaAcara()]);

  const published = recap.filter((r) => r.state === "PUBLISHED");
  const locked = recap.filter((r) => r.state === "LOCKED");
  const graded = [...published, ...locked];
  const avg = graded.length ? graded.reduce((n, r) => n + r.summary!.score, 0) / graded.length : null;
  const courses = conversionCourses("MB04", true).list;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-800">Rekapitulasi Nilai & Konversi SIAKAD (MB04)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Nilai rubrik digital dari Dosen Peneliti dikunci di sini lalu diterbitkan sebagai Berita Acara Nilai Resmi ber-QR untuk
            Bagian Akademik Fakultas. Periode {academicPeriod().label}.
          </p>
        </div>
        <form action={issueBeritaAcaraAction} className="shrink-0">
          <ConfirmSubmit
            disabled={graded.length === 0}
            confirmMessage={`Kunci ${published.length} nilai yang baru terbit dan terbitkan Berita Acara Nilai Resmi untuk ${graded.length} mahasiswa? Nilai terkunci tidak dapat diubah.`}
            className="bg-navy-800 text-white hover:bg-navy-700"
          >
            <FileCheck2 className="size-4" /> Kunci Nilai & Ekspor Berita Acara (PDF/Print)
          </ConfirmSubmit>
        </form>
      </div>

      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {sp.error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan nilai">
        {[
          { label: "Peserta riset", value: String(recap.length) },
          { label: "Nilai terbit (belum dikunci)", value: String(published.length) },
          { label: "Nilai terkunci", value: String(locked.length) },
          { label: "Rata-rata nilai akhir", value: avg === null ? "—" : avg.toFixed(2) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-navy-800 tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">Rekap Nilai Akhir Peserta</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">Mahasiswa</th>
                <th className="px-3 py-3">Dosen Peneliti</th>
                {RUBRIC.map((r) => (
                  <th key={r.key} className="px-2 py-3 text-right" title={r.label}>
                    S{r.no} <span className="font-normal">({r.weight * 100}%)</span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Nilai Akhir</th>
                <th className="px-3 py-3 text-center">Huruf</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recap.map((r) => {
                const a = r.app.assessment;
                return (
                  <tr key={r.app.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{r.app.student.fullName}</p>
                      <p className="font-mono text-xs text-slate-500">{r.app.student.nimNip}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{r.app.vacancy.lecturer.fullName}</td>
                    {RUBRIC.map((rb) => (
                      <td key={rb.key} className="px-2 py-3 text-right tabular-nums text-slate-700">
                        {a ? Number(a[rb.key]).toFixed(1) : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{a ? Number(a.finalNumericScore).toFixed(2) : "—"}</td>
                    <td className="px-3 py-3 text-center text-lg font-black text-navy-800">{a && r.state !== "DRAFT" ? a.letterGrade : "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={STATE[r.state].tone}>{STATE[r.state].label}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">
          <GraduationCap className="size-4" /> Rincian Konversi Paket 20 SKS Mata Kuliah MB04 (+ KP 2 SKS)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold text-slate-600">Mahasiswa</th>
                {courses.map((c) => (
                  <th key={c.code} className="px-2 py-2.5 text-center font-semibold text-slate-600" title={c.name}>
                    <span className="block font-mono">{c.code}</span>
                    <span className="block font-normal text-slate-500">{c.name.split(" ").slice(0, 2).join(" ")} · {c.credits} SKS</span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">SKS Diakui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {graded.map((r) => (
                <tr key={r.app.id}>
                  <td className="px-5 py-2 font-medium text-slate-800">{r.app.student.fullName}</td>
                  {courses.map((c) => {
                    const row = r.conversion!.rows.find((x) => x.code === c.code);
                    return (
                      <td key={c.code} className={cn("px-2 py-2 text-center font-bold", row ? "text-navy-800" : "text-slate-300")}>
                        {row ? row.letter : "—"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {r.conversion!.recognizedCredits} / {r.conversion!.totalCredits}
                  </td>
                </tr>
              ))}
              {graded.length === 0 && (
                <tr>
                  <td colSpan={courses.length + 2} className="px-5 py-6 text-center text-slate-500">
                    Belum ada nilai resmi yang diterbitkan Dosen Peneliti.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">
          <FileText className="size-4" /> Riwayat Berita Acara Nilai Resmi
        </h3>
        {bas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Belum ada berita acara yang diterbitkan.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {bas.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="font-mono font-semibold text-navy-800">{b.baNumber}</span>
                <span className="text-slate-500">{formatDateTime(b.createdAt)}</span>
                <span className="text-slate-500">{b.rows} mahasiswa</span>
                <Link href={`/dashboard/coordinator/grade-conversion/berita-acara/${b.id}`} className="ml-auto font-semibold text-navy-700 hover:text-navy-900">
                  Buka / Cetak →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
