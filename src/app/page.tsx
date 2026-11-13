import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-navy-800 text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <Link
          href="/login"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          Masuk
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-sm font-semibold tracking-wider text-gold-400 uppercase">
          Sistem Informasi MBKM Riset Terpadu
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Riset dosen, pengalaman mahasiswa, <span className="text-gold-400">satu platform</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-navy-100">
          SiRiset menghubungkan mahasiswa Teknik Informatika UTM dengan riset hibah LPPM — dari pendaftaran dan
          e-approval hingga logbook, monev, dan konversi nilai 20 SKS.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-900 shadow-sm hover:bg-gold-400"
          >
            Masuk ke SiRiset <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      <footer className="h-1.5 bg-gold-500" aria-hidden />
    </div>
  );
}
