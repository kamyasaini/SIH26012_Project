"use client";

import { useEffect, useState } from "react";
import { Satellite, Wifi, WifiOff } from "lucide-react";
import { checkBackendHealth } from "@/lib/api";

export default function Navbar() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const ok = await checkBackendHealth();
      if (!cancelled) setBackendOnline(ok);
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2.5">
        <Satellite className="h-5 w-5 text-accent" strokeWidth={2} />
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-wide text-foreground">
            SIH26012
          </span>
          <span className="hidden text-sm text-neutral-400 sm:inline">
            AI 3D Cadastral &amp; Encroachment Engine
          </span>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs"
        title={`Backend API: ${backendOnline === null ? "checking" : backendOnline ? "connected" : "unreachable"}`}
      >
        {backendOnline === null ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-500" />
        ) : backendOnline ? (
          <Wifi className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-red-400" />
        )}
        <span className="text-neutral-300">
          {backendOnline === null
            ? "Checking backend…"
            : backendOnline
              ? "Backend connected"
              : "Backend offline"}
        </span>
      </div>
    </header>
  );
}
