import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hourglass } from "lucide-react";
import { ApprovalSheet } from "@/components/approval-sheet";
import { PrintButton } from "@/components/print-button";
import { buildCertificate, certificateQr } from "@/lib/approval-certificate";
import { canAccessApplication } from "@/lib/applications";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Lembar Pengesahan Digital" };

/** Pratinjau lembar pengesahan digital terpadu ber-QR (terbit setelah APPROVAL_COMPLETE). */
export default async function ApprovalSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!(await canAccessApplication(user, id))) notFound();

  const back = user.activeRole === "MAHASISWA" ? "/dashboard/student/tracker" : "/dashboard/approvals";
  const cert = await buildCertificate(id);

  if (!cert) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Hourglass className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-semibold text-slate-800">Lembar pengesahan belum terbit</p>
        <p className="mt-1 text-sm text-slate-500">Dokumen terbit otomatis setelah ketiga pihak menyetujui (APPROVAL_COMPLETE).</p>
        <Link href={back} className="mt-4 inline-block text-sm font-medium text-navy-600 hover:text-navy-800">
          ← Kembali
        </Link>
      </div>
    );
  }

  const qr = await certificateQr(cert);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={back} className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800">
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <PrintButton />
      </div>
      <ApprovalSheet cert={cert} qr={qr} />
    </div>
  );
}
