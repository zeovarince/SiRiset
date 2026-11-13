import { CheckCircle2, ExternalLink, FileImage, GitCommitHorizontal, MessageSquareText, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { isGraceSubmission, type WeekWindow } from "@/lib/logbook-schedule";
import type { LogbookWithReviews } from "@/lib/logbooks";

/** Isi logbook satu minggu (dibaca mahasiswa & dosen). */
export function LogbookEntry({ logbook, window }: { logbook: LogbookWithReviews; window: WeekWindow }) {
  const grace = isGraceSubmission(window, logbook.submittedAt);
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Pelaksanaan {formatDate(logbook.activityDate)}</span>
        <span>·</span>
        <span className="font-semibold text-navy-800">{logbook.durationHours} jam</span>
        <span>·</span>
        <span>Diisi {formatDateTime(logbook.submittedAt)}</span>
        {logbook.isLate ? (
          <StatusBadge tone="danger">Terlambat</StatusBadge>
        ) : grace ? (
          <StatusBadge tone="warning">Masa tenggang</StatusBadge>
        ) : (
          <StatusBadge tone="success">Tepat waktu</StatusBadge>
        )}
      </div>

      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Aktivitas Riset</dt>
          <dd className="mt-0.5 whitespace-pre-line text-slate-800">{logbook.activityDescription}</dd>
        </div>
        {logbook.challengesFaced && (
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Kendala</dt>
            <dd className="mt-0.5 whitespace-pre-line text-slate-800">{logbook.challengesFaced}</dd>
          </div>
        )}
        {logbook.solutionsImplemented && (
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Upaya / Solusi</dt>
            <dd className="mt-0.5 whitespace-pre-line text-slate-800">{logbook.solutionsImplemented}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap gap-2">
        {logbook.evidenceFileUrl && (
          <a
            href={`/api/logbooks/${logbook.id}/evidence`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
          >
            <FileImage className="size-3.5" /> Berkas Bukti
          </a>
        )}
        {logbook.repositoryLink && (
          <a
            href={logbook.repositoryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
          >
            <GitCommitHorizontal className="size-3.5 shrink-0" />
            <span className="truncate">{logbook.repositoryLink.replace(/^https:\/\//, "")}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        )}
      </div>

      <ReviewThread reviews={logbook.reviews} />
    </div>
  );
}

/** Riwayat catatan bimbingan dosen (inline feedback dari tabel logbook_reviews). */
export function ReviewThread({ reviews }: { reviews: LogbookWithReviews["reviews"] }) {
  if (reviews.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <MessageSquareText className="size-3.5" /> Catatan Arahan Bimbingan
      </p>
      <ol className="space-y-2">
        {reviews.map((r) => {
          const approved = r.reviewStatus === "APPROVED";
          return (
            <li
              key={r.id}
              className={
                approved
                  ? "rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                  : "rounded-lg border border-orange-200 bg-orange-50 px-3 py-2"
              }
            >
              <p className="flex flex-wrap items-center gap-1.5 text-xs">
                {approved ? (
                  <CheckCircle2 className="size-3.5 text-green-600" />
                ) : (
                  <RotateCcw className="size-3.5 text-orange-600" />
                )}
                <strong className={approved ? "text-green-800" : "text-orange-800"}>
                  {approved ? "Divalidasi" : "Minta revisi"}
                </strong>
                <span className="text-slate-500">
                  · {r.reviewer.fullName} · {formatDateTime(r.reviewedAt)}
                </span>
              </p>
              {r.feedbackNotes && <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{r.feedbackNotes}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
