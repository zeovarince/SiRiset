"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * Pembaruan status "real-time" ringan: memuat ulang data Server Component secara berkala
 * dan setiap kali tab kembali aktif — tanpa perlu WebSocket.
 */
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setLastSync(new Date());
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastSync(new Date());
    };
    const timer = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" aria-live="off">
      <RefreshCw className="size-3" aria-hidden />
      Diperbarui otomatis
      {lastSync &&
        ` · ${lastSync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
    </span>
  );
}
