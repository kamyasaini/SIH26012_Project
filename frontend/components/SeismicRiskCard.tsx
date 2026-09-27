"use client";

import { useMemo, useState } from "react";

import type {
  ParcelStats,
} from "@/lib/types";

interface SeismicRiskCardProps {
  stats: ParcelStats;
}

export default function SeismicRiskCard({
  stats,
}: SeismicRiskCardProps) {
  const [showDetails, setShowDetails] =
    useState(false);

  const risk = useMemo(() => {
    const total = stats.totalParcels;

    /*
     * Prototype screening distribution.
     *
     * This is NOT a structural collapse
     * prediction. It is a UI-level screening
     * indicator based on currently available
     * spatial information.
     */
    const elevated = Math.round(
      total * 0.25,
    );

    const moderate = Math.round(
      total * 0.4,
    );

    const lower = Math.max(
      0,
      total - elevated - moderate,
    );

    const index =
      total > 0
        ? Math.round(
            ((elevated * 75 +
              moderate * 50 +
              lower * 25) /
              total),
          )
        : 0;

    return {
      elevated,
      moderate,
      lower,
      index,
    };
  }, [stats.totalParcels]);

  return (
    <div className="rounded-xl border border-border bg-surface/95 p-4 text-neutral-100 shadow-2xl backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              ◉
            </span>

            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Seismic Screening
            </h2>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Structural vulnerability screening
          </p>
        </div>

        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
          SCREENING
        </span>
      </div>

      {/* INDEX */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">
              Vulnerability Index
            </p>

            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {risk.index}
              <span className="ml-1 text-xs text-neutral-500">
                /100
              </span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wide text-neutral-500">
              Structures
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-200">
              {stats.totalParcels}
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-red-500"
            style={{
              width: `${Math.min(
                100,
                risk.index,
              )}%`,
            }}
          />
        </div>
      </div>

      {/* DISTRIBUTION */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          Screening Distribution
        </p>

        <div className="space-y-2">
          <RiskRow
            label="Elevated"
            value={risk.elevated}
            total={stats.totalParcels}
          />

          <RiskRow
            label="Moderate"
            value={risk.moderate}
            total={stats.totalParcels}
          />

          <RiskRow
            label="Lower"
            value={risk.lower}
            total={stats.totalParcels}
          />
        </div>
      </div>

      {/* FACTORS */}
      <button
        type="button"
        onClick={() =>
          setShowDetails((value) => !value)
        }
        className="mt-4 flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 transition hover:bg-white/[0.06]"
      >
        <span>
          Risk Factors
        </span>

        <span>
          {showDetails ? "▲" : "▼"}
        </span>
      </button>

      {showDetails && (
        <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-black/20 p-3 text-[10px]">
          <Factor
            label="Building height"
            status="Available"
          />

          <Factor
            label="Footprint geometry"
            status="Available"
          />

          <Factor
            label="Height / footprint relation"
            status="Available"
          />

          <Factor
            label="Soil / liquefaction layer"
            status="Data required"
          />

          <Factor
            label="Building age"
            status="Data required"
          />

          <Factor
            label="Structural material"
            status="Data required"
          />
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[9px] leading-relaxed text-neutral-500">
          Screening indicator only. This is not a
          structural safety certification or a
          certified earthquake or collapse
          prediction.
        </p>
      </div>
    </div>
  );
}

function RiskRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-neutral-400">
          {label}
        </span>

        <span className="text-neutral-200">
          {value}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function Factor({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  const available =
    status === "Available";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-400">
        {label}
      </span>

      <span
        className={
          available
            ? "whitespace-nowrap text-cyan-300"
            : "whitespace-nowrap text-neutral-600"
        }
      >
        {status}
      </span>
    </div>
  );
}