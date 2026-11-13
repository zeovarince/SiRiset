"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Cetak / Simpan PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 print:hidden"
    >
      <Printer className="size-4" /> {label}
    </button>
  );
}
