import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONES: Record<Tone, string> = {
  success: "bg-green-50 text-green-700 ring-green-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/25",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
  info: "bg-navy-50 text-navy-700 ring-navy-600/20",
};

const DOTS: Record<Tone, string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-slate-400",
  info: "bg-navy-500",
};

/** Badge status semantik (Traffic Light UI). */
export function StatusBadge({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden />}
      {children}
    </span>
  );
}

const VACANCY_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draf", tone: "neutral" },
  PUBLISHED: { label: "Dibuka", tone: "success" },
  CLOSED: { label: "Ditutup", tone: "danger" },
  COMPLETED: { label: "Selesai", tone: "info" },
};

export function VacancyStatusBadge({ status }: { status: string }) {
  const s = VACANCY_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

export const APPLICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  SUBMITTED: { label: "Menunggu Seleksi", tone: "warning" },
  DOSEN_ACCEPTED: { label: "Diterima Dosen", tone: "success" },
  APPROVAL_PENDING: { label: "E-Approval Berjalan", tone: "info" },
  REVISION_REQUIRED: { label: "Perlu Revisi", tone: "warning" },
  APPROVAL_COMPLETE: { label: "E-Approval Lengkap", tone: "success" },
  IN_PROGRESS: { label: "Riset Aktif", tone: "success" },
  COMPLETED: { label: "Selesai", tone: "neutral" },
  REJECTED: { label: "Ditolak", tone: "danger" },
};

export function ApplicationStatusBadge({ status }: { status: string }) {
  const s = APPLICATION_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

/** "3 Tersisa / Kuota 4" — hijau bila lega, kuning bila tinggal 1, merah bila penuh. */
export function QuotaBadge({ remaining, quota, className }: { remaining: number; quota: number; className?: string }) {
  const tone: Tone = remaining <= 0 ? "danger" : remaining === 1 ? "warning" : "success";
  return (
    <StatusBadge tone={tone} className={className}>
      {remaining <= 0 ? "Kuota Penuh" : `${remaining} Tersisa`} / Kuota {quota}
    </StatusBadge>
  );
}
