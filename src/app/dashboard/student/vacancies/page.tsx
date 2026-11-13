import Link from "next/link";
import { ArrowRight, Info, SearchX } from "lucide-react";
import { ACTIVE_STATUSES } from "@/lib/applications";
import { requireRole } from "@/lib/auth";
import { academicPeriod, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { listCatalog, listCatalogSkills } from "@/lib/vacancies";
import { catalogFilterSchema } from "@/lib/vacancy-schema";
import { CatalogFilters } from "./catalog-filters";
import { VacancyCard, type ApplyState, type CardVacancy } from "./vacancy-card";

export const metadata = { title: "Katalog Lowongan Riset" };

export default async function StudentVacanciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("MAHASISWA");
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const filter = catalogFilterSchema.parse({ q: first(raw.q), scheme: first(raw.scheme), skill: first(raw.skill) });

  const [vacancies, skills, myApplications] = await Promise.all([
    listCatalog(filter),
    listCatalogSkills(),
    prisma.application.findMany({
      where: { studentId: user.id },
      select: { vacancyId: true, status: true, vacancy: { select: { title: true } } },
    }),
  ]);

  const statusByVacancy = new Map(myApplications.map((a) => [a.vacancyId, a.status]));
  const activeElsewhere = myApplications.find((a) => (ACTIVE_STATUSES as string[]).includes(a.status));

  const cards: { v: CardVacancy; state: ApplyState }[] = vacancies.map((v) => ({
    v: {
      id: v.id,
      title: v.title,
      description: v.description,
      grantContractNumber: v.grantContractNumber,
      grantScheme: v.grantScheme,
      quota: v.quota,
      remainingQuota: v.remainingQuota,
      applicantCount: v.applicantCount,
      skills: v.skills,
      startLabel: formatDate(v.applicationStartDate),
      deadlineLabel: formatDate(v.applicationEndDate),
      daysLeft: v.daysLeft,
      isOpenForApplication: v.isOpenForApplication,
      lecturer: { fullName: v.lecturer.fullName, nimNip: v.lecturer.nimNip },
    },
    state: statusByVacancy.has(v.id)
      ? statusByVacancy.get(v.id) === "REJECTED"
        ? "rejected"
        : "applied"
      : activeElsewhere
        ? "blocked"
        : v.remainingQuota <= 0
          ? "full"
          : !v.isOpenForApplication
            ? "not-started"
            : "open",
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-gold-600 uppercase">
          Katalog Penawaran MBKM Riset · {academicPeriod().label}
        </p>
        <h2 className="mt-1 text-xl font-bold text-navy-800">Lowongan Riset Resmi Teknik Informatika</h2>
        <p className="mt-1 text-sm text-slate-500">
          Temukan proyek riset hibah dosen yang dapat dikonversi menjadi 20 SKS (MB04). Seluruh lowongan terverifikasi
          kontrak hibah LPPM UTM.
        </p>
      </div>

      {activeElsewhere && (
        <div className="flex flex-col gap-3 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-800 sm:flex-row sm:items-center">
          <Info className="size-4 shrink-0" aria-hidden />
          <p className="flex-1">
            Anda memiliki pendaftaran aktif pada riset <strong>{activeElsewhere.vacancy.title}</strong>.
          </p>
          <Link
            href="/dashboard/student/tracker"
            className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:text-navy-900"
          >
            Lihat status <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      <CatalogFilters filter={filter} skills={skills} />

      <p className="text-sm text-slate-500" aria-live="polite">
        Menampilkan <strong className="text-slate-700">{cards.length}</strong> lowongan riset yang sedang dibuka
      </p>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <SearchX className="size-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-medium text-slate-700">Tidak ada lowongan yang cocok</p>
          <p className="mt-1 text-sm text-slate-500">Coba ubah kata kunci atau hapus filter yang aktif.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {cards.map(({ v, state }) => (
            <VacancyCard key={v.id} v={v} applyState={state} />
          ))}
        </div>
      )}
    </div>
  );
}
