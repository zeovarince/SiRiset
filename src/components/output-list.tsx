import { BadgeCheck, ExternalLink, FileDown, Hourglass } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { OUTPUT_TYPES, PUBLICATION_STATUSES, type OutputTypeKey } from "@/lib/grading-schema";
import { isStoredDocument } from "@/lib/outputs";

type Output = {
  id: string;
  outputType: string;
  title: string;
  targetPublicationName: string;
  documentFileUrl: string;
  publicationStatus: string;
  isVerifiedByLecturer: boolean;
  submittedAt: Date;
};

/** Daftar luaran riset (dipakai mahasiswa & dosen). `actions` merender tombol per luaran. */
export function OutputList({ outputs, actions }: { outputs: Output[]; actions?: (o: Output) => React.ReactNode }) {
  return (
    <ul className="space-y-3">
      {outputs.map((o) => (
        <li key={o.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info" dot={false}>{OUTPUT_TYPES[o.outputType as OutputTypeKey] ?? o.outputType}</StatusBadge>
              <StatusBadge tone="neutral" dot={false}>
                {PUBLICATION_STATUSES[o.publicationStatus as keyof typeof PUBLICATION_STATUSES] ?? o.publicationStatus}
              </StatusBadge>
              {o.isVerifiedByLecturer ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                  <BadgeCheck className="size-4" /> Terverifikasi Sesuai Target
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <Hourglass className="size-3.5" /> Menunggu verifikasi dosen
                </span>
              )}
            </div>
            <p className="mt-2 font-semibold text-navy-800">{o.title}</p>
            <p className="text-xs text-slate-500">
              Target: {o.targetPublicationName} · didaftarkan {formatDate(o.submittedAt)}
            </p>
            <div className="mt-2">
              {isStoredDocument(o.documentFileUrl) ? (
                <a
                  href={`/api/outputs/${o.id}/file`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                >
                  <FileDown className="size-3.5" /> Berkas luaran
                </a>
              ) : (
                <a
                  href={o.documentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">{o.documentFileUrl.replace(/^https:\/\//, "")}</span>
                </a>
              )}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions(o)}</div>}
        </li>
      ))}
    </ul>
  );
}
