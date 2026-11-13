import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, Hourglass, ShieldAlert, Users } from "lucide-react";
import { NavIcon } from "@/components/nav-icon";
import { countPendingApprovals } from "@/lib/approvals";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, navItemsForRole } from "@/lib/roles";

export const metadata = { title: "Beranda" };

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const user = await requireUser();

  const [publishedVacancies, totalApplications, activeParticipants, pendingApprovals] = await Promise.all([
    prisma.researchVacancy.count({ where: { status: "PUBLISHED" } }),
    prisma.application.count(),
    prisma.application.count({ where: { status: "IN_PROGRESS" } }),
    countPendingApprovals(user),
  ]);

  const stats = [
    { label: "Lowongan riset dibuka", value: publishedVacancies, icon: Briefcase },
    { label: "Total pendaftaran", value: totalApplications, icon: Users },
    { label: "Peserta riset aktif", value: activeParticipants, icon: BadgeCheck },
    { label: "Menunggu approval Anda", value: pendingApprovals, icon: Hourglass },
  ];

  const modules = navItemsForRole(user.activeRole);

  return (
    <div className="space-y-6">
      {denied && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Halaman tersebut tidak dapat diakses oleh peran <strong>{ROLE_LABELS[user.activeRole]}</strong>. Ganti
            peran melalui Role Switcher bila Anda memiliki akses lain.
          </p>
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-navy-800 px-6 py-7 text-white sm:px-8">
        <div className="absolute inset-y-0 right-0 w-1.5 bg-gold-500" aria-hidden />
        <p className="text-sm font-medium text-gold-400">Selamat datang kembali,</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{user.fullName}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-gold-500 px-3 py-0.5 font-semibold text-navy-900">
            {ROLE_LABELS[user.activeRole]}
          </span>
          <span className="text-navy-200">
            {user.nimNip.length > 12 ? "NIP" : "NIM"} {user.nimNip}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-navy-100">{ROLE_DESCRIPTIONS[user.activeRole]}</p>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Ringkasan">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <s.icon className="size-4 text-navy-400" aria-hidden />
            </div>
            <p className="mt-2 text-3xl font-bold text-navy-800 tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Modul untuk peran {ROLE_LABELS[user.activeRole]}</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-navy-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-navy-50 text-navy-700">
                  <NavIcon name={m.icon} className="size-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  Fase {m.phase}
                </span>
              </div>
              <p className="mt-4 font-semibold text-navy-800">{m.label}</p>
              <p className="mt-1 flex-1 text-sm text-slate-500">{m.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy-600 group-hover:text-navy-800">
                Buka modul <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
