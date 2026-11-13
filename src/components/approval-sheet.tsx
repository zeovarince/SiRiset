import { BadgeCheck } from "lucide-react";
import { formatCode, type ApprovalCertificate } from "@/lib/approval-certificate";
import { formatDateTime } from "@/lib/format";

/**
 * Lembar Pengesahan Digital Terpadu (Form MBKM + Paket Konversi KRS + Rencana Riset — FR-04.1)
 * dengan stempel QR verifikasi integritas data prodi.
 */
export function ApprovalSheet({ cert, qr }: { cert: ApprovalCertificate; qr: { url: string; svg: string } }) {
  const { application: app } = cert;
  const rows: [string, React.ReactNode][] = [
    ["Nama Mahasiswa", app.student.fullName],
    ["NIM", <span key="nim" className="font-mono">{app.student.nimNip}</span>],
    ["IPK (SIAKAD)", Number(app.gpaAtApplication).toFixed(2)],
    ["Judul Riset Hibah", app.vacancy.title],
    ["Nomor Kontrak / Skema", <span key="k"><span className="font-mono">{app.vacancy.grantContractNumber}</span> · {app.vacancy.grantScheme}</span>],
    ["Dosen Peneliti", app.vacancy.lecturer.fullName],
    ["Rencana Riset Mahasiswa", app.proposalTitle],
  ];

  return (
    <article className="mx-auto max-w-[210mm] bg-white text-[13px] leading-relaxed text-slate-900 shadow-sm ring-1 ring-slate-200 print:shadow-none print:ring-0">
      <header className="flex items-center gap-4 border-b-4 border-gold-500 bg-navy-800 px-8 py-5 text-white print:px-6">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-gold-500 text-lg font-black text-navy-900">UTM</div>
        <div className="leading-tight">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Universitas Trunodjoyo Madura</p>
          <p className="text-base font-bold">Fakultas Teknik · Program Studi S1 Teknik Informatika</p>
          <p className="text-xs text-navy-200">Jl. Raya Telang, Kamal, Bangkalan, Jawa Timur · Sistem Informasi MBKM Riset (SiRiset)</p>
        </div>
      </header>

      <div className="space-y-6 px-8 py-6 print:px-6">
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-wide text-navy-800 uppercase">Lembar Pengesahan Digital Program MBKM Riset</h1>
          <p className="text-xs text-slate-500">
            Nomor Dokumen: <span className="font-mono font-semibold text-slate-700">{cert.documentNumber}</span> · Disahkan{" "}
            {formatDateTime(cert.completedAt)}
          </p>
        </div>

        <table className="w-full">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="align-top">
                <td className="w-48 py-1 pr-3 text-slate-500">{k}</td>
                <td className="w-3 py-1 text-slate-400">:</td>
                <td className="py-1 font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <p className="mb-2 font-semibold text-navy-800">Paket Konversi Mata Kuliah (Kode MK: {app.conversionScheme})</p>
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="border border-slate-300 px-2 py-1.5 w-10">No</th>
                <th className="border border-slate-300 px-2 py-1.5 w-24">Kode</th>
                <th className="border border-slate-300 px-2 py-1.5">Mata Kuliah</th>
                <th className="border border-slate-300 px-2 py-1.5 w-16 text-right">SKS</th>
              </tr>
            </thead>
            <tbody>
              {cert.courses.map((c, i) => (
                <tr key={c.code}>
                  <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{c.code}</td>
                  <td className="border border-slate-300 px-2 py-1">{c.name}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{c.credits}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={3} className="border border-slate-300 px-2 py-1.5 text-right">Total SKS Diakui</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{cert.totalCredits}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <p className="mb-2 font-semibold text-navy-800">Persetujuan Elektronik Simultan (E-Approval 3 Pihak)</p>
          <div className="grid grid-cols-3 gap-3">
            {cert.approvals.map((a) => (
              <div key={a.id} className="rounded-lg border border-green-300 bg-green-50/50 p-3 text-center">
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{a.roleLabel}</p>
                <div className="my-2 flex items-center justify-center gap-1 text-xs font-bold text-green-700">
                  <BadgeCheck className="size-4" /> DISETUJUI ELEKTRONIK
                </div>
                <p className="text-xs font-semibold">{a.approver.fullName}</p>
                <p className="font-mono text-[10px] text-slate-500">NIP {a.approver.nimNip}</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(a.decidedAt!)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-lg border-2 border-dashed border-navy-200 p-4">
          <div
            className="size-32 shrink-0 [&>svg]:h-full [&>svg]:w-full"
            role="img"
            aria-label="QR-Code verifikasi keabsahan dokumen"
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
          <div className="min-w-0 space-y-1 text-xs">
            <p className="text-sm font-bold text-navy-800">Stempel Digital Keabsahan Dokumen</p>
            <p>
              Kode Verifikasi: <span className="font-mono text-sm font-bold tracking-wider text-navy-800">{formatCode(cert.code)}</span>
            </p>
            <p className="break-all text-slate-500">
              Verifikasi: <span className="font-mono">{qr.url}</span>
            </p>
            <p className="break-all text-slate-500">
              SHA-256 proposal: <span className="font-mono">{cert.proposalSha256.slice(0, 32)}…</span>
            </p>
            <p className="text-slate-600">
              Dokumen ini sah tanpa tanda tangan basah dan dicetak dari SiRiset (100% paperless). Pindai QR untuk
              memastikan data tidak berubah sejak disahkan.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
