import { redirect } from "next/navigation";
import { demoLoginAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { getCurrentUser, isDemoMode } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_ACCOUNTS, DEMO_ROLES, ROLE_LABELS } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; demo?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next, demo } = await searchParams;

  const demoMode = isDemoMode();
  const demoUsers = demoMode
    ? await prisma.user.findMany({
        where: { nimNip: { in: Object.values(DEMO_ACCOUNTS) } },
        select: { nimNip: true, fullName: true },
      })
    : [];
  const nameOf = new Map(demoUsers.map((u) => [u.nimNip, u.fullName]));

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy-800 p-12 text-white lg:flex">
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gold-500" aria-hidden />
        <BrandMark />
        <div>
          <h1 className="text-4xl leading-tight font-bold tracking-tight">
            Satu pintu untuk seluruh siklus <span className="text-gold-400">MBKM Riset</span>.
          </h1>
          <p className="mt-4 max-w-md text-navy-100">
            Lowongan riset hibah, pendaftaran, e-approval simultan, logbook mingguan, monev LPPM, hingga konversi
            nilai 20 SKS — terintegrasi tanpa berkas kertas.
          </p>
        </div>
        <p className="text-xs text-navy-300">
          Program Studi Teknik Informatika · Fakultas Teknik · Universitas Trunodjoyo Madura
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <BrandMark inverted={false} className="mb-8 lg:hidden" />
          <h2 className="text-2xl font-bold text-navy-800">Masuk ke SiRiset</h2>
          <p className="mt-1 mb-6 text-sm text-slate-500">Gunakan NIM (mahasiswa) atau NIP (dosen/tendik).</p>

          <LoginForm next={next} />

          {demoMode && (
            <div className="mt-8 rounded-xl border border-gold-200 bg-gold-50/60 p-4">
              <p className="text-xs font-semibold text-navy-800">
                <span className="mr-2 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] text-navy-900">DEMO</span>
                Masuk cepat sebagai
              </p>
              {demo === "missing" && (
                <p className="mt-2 text-xs text-red-700">Akun demo belum tersedia. Jalankan `npm run db:seed`.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_ROLES.map((role) => {
                  const name = nameOf.get(DEMO_ACCOUNTS[role]);
                  return (
                    <form key={role} action={demoLoginAction}>
                      <input type="hidden" name="role" value={role} />
                      <button
                        type="submit"
                        disabled={!name}
                        title={name}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs transition hover:border-navy-300 hover:bg-navy-50 disabled:opacity-50"
                      >
                        <span className="block font-semibold text-navy-800">{ROLE_LABELS[role]}</span>
                        <span className="block truncate text-slate-500">{name ?? "—"}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">Password default seluruh akun seed: password123</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
