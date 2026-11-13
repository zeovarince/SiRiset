import Link from "next/link";
import type { ApprovalRole } from "@prisma/client";
import { AlertCircle, ArrowLeftRight, CheckCircle2, Clock, FileCheck2, Inbox, PartyPopper, Undo2 } from "lucide-react";
import { switchRoleAction } from "@/app/actions/auth";
import { ApplicationStatusBadge, StatusBadge } from "@/components/status-badge";
import { conversionCourses } from "@/lib/application-schema";
import {
  APPROVAL_ROLE_FOCUS,
  APPROVAL_ROLE_LABELS,
  APPROVAL_ROLES,
  APPROVED_STATUSES,
  backfillApprovalForks,
  isApprovalRole,
  listDecidedApprovals,
  listPendingApprovals,
  pendingInOtherRoles,
} from "@/lib/approvals";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { checkEligibility } from "@/lib/siakad-mock";
import { cn } from "@/lib/utils";
import { ReviewDialog, type ReviewItem } from "./review-dialog";

export const metadata = { title: "E-Approval Berkas" };

function waitingLabel(since: Date | null) {
  if (!since) return null;
  const hours = Math.floor((Date.now() - since.getTime()) / 3_600_000);
  if (hours < 1) return "kurang dari 1 jam";
  if (hours < 48) return `${hours} jam`;
  return `${Math.floor(hours / 24)} hari`;
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; name?: string; status?: string; error?: string }>;
}) {
  const user = await requireRole("DOSEN_WALI", "DOSEN_PENELITI", "KAPRODI");
  const sp = await searchParams;
  // ADMIN boleh melihat halaman, tetapi tidak memiliki antrean approval sendiri.
  const role: ApprovalRole | null = isApprovalRole(user.activeRole) ? user.activeRole : null;

  // Lengkapi fork lebih dulu agar ketiga query di bawah melihat baris approval yang sama.
  await backfillApprovalForks();
  const [pending, decided, otherRoles] = await Promise.all([
    listPendingApprovals(user),
    listDecidedApprovals(user),
    pendingInOtherRoles(user),
  ]);

  const items: ReviewItem[] = await Promise.all(
    pending.map(async (ap) => {
      const app = ap.application;
      const siakad = await checkEligibility(app.student.nimNip);
      const { list, totalCredits } = conversionCourses(app.conversionScheme, app.includesKpConversion);
      return {
        approvalId: ap.id,
        applicationId: app.id,
        roleLabel: APPROVAL_ROLE_LABELS[ap.approverRole],
        roleFocus: APPROVAL_ROLE_FOCUS[ap.approverRole],
        student: { name: app.student.fullName, nim: app.student.nimNip, gpa: Number(app.gpaAtApplication).toFixed(2) },
        siakad: siakad.found
          ? { status: siakad.record.status, semester: siakad.record.semester, mandatoryPercent: siakad.mandatory.percent }
          : null,
        researchTitle: app.vacancy.title,
        contract: app.vacancy.grantContractNumber,
        lecturerName: app.vacancy.lecturer.fullName,
        proposalTitle: app.proposalTitle,
        courses: list,
        totalCredits,
        includesKp: app.includesKpConversion,
        parallel: APPROVAL_ROLES.map((r) => {
          const a = app.approvals.find((x) => x.approverRole === r);
          return {
            roleLabel: APPROVAL_ROLE_LABELS[r],
            approverName: a?.approver.fullName ?? "—",
            status: a?.status ?? "PENDING",
            isMine: a?.id === ap.id,
          };
        }),
      };
    }),
  );

  const approvedCount = decided.filter((d) => d.status === "APPROVED").length;
  const revisionCount = decided.filter((d) => d.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-800">E-Approval Berkas Simultan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Persetujuan paralel Dosen Wali, Dosen Peneliti, dan Kaprodi — tanpa tanda tangan basah dan antre keliling kampus.
          </p>
        </div>
        <p className="rounded-lg border border-gold-300 bg-gold-50 px-3 py-2 text-xs text-navy-800">
          Peran Approval Anda: <strong className="uppercase">{role ? APPROVAL_ROLE_LABELS[role] : "—"}</strong>
          {role && <span className="block text-slate-500">Fokus: {APPROVAL_ROLE_FOCUS[role]}</span>}
        </p>
      </div>

      {sp.done && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
            sp.status === "APPROVAL_COMPLETE"
              ? "border-green-300 bg-green-50 text-green-900"
              : sp.done === "approved"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          {sp.status === "APPROVAL_COMPLETE" ? (
            <PartyPopper className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : sp.done === "approved" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Undo2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>
            {sp.done === "approved"
              ? `Berkas ${sp.name ?? "mahasiswa"} telah Anda setujui.`
              : `Berkas ${sp.name ?? "mahasiswa"} dikembalikan untuk revisi; catatan Anda tampil di akun mahasiswa.`}
            {sp.status === "APPROVAL_COMPLETE" &&
              " Ketiga pihak telah menyetujui — status APPROVAL_COMPLETE, lembar pengesahan ber-QR terbit dan berkas diteruskan ke Koordinator MBKM."}
            {sp.status === "APPROVAL_PENDING" && " Menunggu persetujuan pihak lain secara paralel."}
          </span>
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sp.error}
        </div>
      )}

      {otherRoles.map((o) => (
        <form
          key={o.role}
          action={switchRoleAction}
          className="flex flex-col gap-3 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-800 sm:flex-row sm:items-center"
        >
          <ArrowLeftRight className="size-4 shrink-0" aria-hidden />
          <p className="flex-1">
            Anda juga memiliki <strong>{o.count} berkas</strong> yang menunggu persetujuan sebagai{" "}
            <strong>{APPROVAL_ROLE_LABELS[o.role]}</strong>.
          </p>
          <input type="hidden" name="role" value={o.role} />
          <input type="hidden" name="next" value="/dashboard/approvals" />
          <button type="submit" className="font-semibold text-navy-700 hover:text-navy-900 hover:underline">
            Beralih ke peran {APPROVAL_ROLE_LABELS[o.role]} →
          </button>
        </form>
      ))}

      <section className="grid grid-cols-3 gap-4" aria-label="Ringkasan e-approval">
        {[
          { label: "Menunggu keputusan Anda", value: items.length, cls: "text-amber-600" },
          { label: "Telah Anda setujui", value: approvedCount, cls: "text-green-700" },
          { label: "Diminta revisi", value: revisionCount, cls: "text-navy-800" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold tabular-nums", s.cls)}>{s.value}</p>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Antrean Berkas Menunggu Persetujuan</h3>
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <Inbox className="size-10 text-slate-300" aria-hidden />
            <p className="mt-3 font-medium text-slate-700">Tidak ada berkas yang menunggu persetujuan Anda</p>
            <p className="mt-1 text-sm text-slate-500">Berkas baru muncul otomatis saat Dosen Peneliti menerima pelamar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <article
                key={item.approvalId}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy-800">{item.student.name}</p>
                    <span className="font-mono text-xs text-slate-500">{item.student.nim}</span>
                    <StatusBadge tone="info" dot={false}>
                      IPK {item.student.gpa}
                    </StatusBadge>
                    {item.includesKp && (
                      <StatusBadge tone="neutral" dot={false}>
                        + KP 2 SKS
                      </StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-700">{item.researchTitle}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">Rencana: {item.proposalTitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {item.parallel.map((p) => (
                      <span key={p.roleLabel} className="inline-flex items-center gap-1">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            p.status === "APPROVED" ? "bg-green-500" : p.status === "REJECTED" ? "bg-red-500" : "bg-amber-400",
                          )}
                        />
                        {p.roleLabel}
                      </span>
                    ))}
                    {waitingLabel(pending[i].application.selectionDecidedAt) && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> menunggu {waitingLabel(pending[i].application.selectionDecidedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <ReviewDialog item={item} />
              </article>
            ))}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <h3 className="border-b border-slate-100 px-5 py-4 font-semibold text-navy-800">Riwayat Keputusan Anda</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Mahasiswa</th>
                  <th className="px-3 py-3">Keputusan Anda</th>
                  <th className="px-3 py-3">Status Berkas</th>
                  <th className="px-5 py-3 text-right">Lembar Pengesahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decided.map((d) => (
                  <tr key={d.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{d.application.student.fullName}</p>
                      <p className="line-clamp-1 text-xs text-slate-500">{d.application.vacancy.title}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={d.status === "APPROVED" ? "success" : "warning"}>
                        {d.status === "APPROVED" ? "Disetujui" : "Minta revisi"}
                      </StatusBadge>
                      <p className="mt-1 text-xs text-slate-500">{d.decidedAt ? formatDate(d.decidedAt) : ""}</p>
                      {d.notes && <p className="mt-1 max-w-xs text-xs text-slate-500 italic">“{d.notes}”</p>}
                    </td>
                    <td className="px-3 py-3">
                      <ApplicationStatusBadge status={d.application.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {APPROVED_STATUSES.includes(d.application.status) ? (
                        <Link
                          href={`/dashboard/applications/${d.application.id}/pengesahan`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900"
                        >
                          <FileCheck2 className="size-3.5" /> Lihat QR
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">Belum terbit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
