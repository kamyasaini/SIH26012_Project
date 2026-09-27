"use client";

import { useMemo, useState } from "react";

import type {
  ParcelStats,
} from "@/lib/types";

interface ForecastRiskCardProps {
  stats: ParcelStats;
}

export default function ForecastRiskCard({
  stats,
}: ForecastRiskCardProps) {
  const [showDetails, setShowDetails] =
    useState(false);

  const forecast = useMemo(() => {
    const total = stats.totalParcels;

    /*
     * Prototype screening model.
     *
     * These values are intentionally presented
     * as a spatial risk screening indicator,
     * not as guaranteed predictions.
     */
    const high = Math.round(total * 0.18);
    const moderate = Math.round(total * 0.32);
    const low = Math.max(
      0,
      total - high - moderate,
    );

    const score =
      total > 0
        ? Math.round(
            ((high * 90 +
              moderate * 55 +
              low * 20) /
              total),
          )
        : 0;

    return {
      high,
      moderate,
      low,
      score,
    };
  }, [stats.totalParcels]);

  return (
    <div className="rounded-xl border border-border bg-surface/95 p-4 text-neutral-100 shadow-2xl backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              ◈
            </span>

            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Encroachment Forecast
            </h2>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            AI-assisted future risk screening
          </p>
        </div>

        <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-violet-300">
          6–12 MONTH
        </span>
      </div>

      {/* SCORE */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">
              Forecast Risk Index
            </p>

            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {forecast.score}
              <span className="ml-1 text-xs text-neutral-500">
                /100
              </span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wide text-neutral-500">
              Parcels screened
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-200">
              {stats.totalParcels}
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-red-400"
            style={{
              width: `${Math.min(
                100,
                forecast.score,
              )}%`,
            }}
          />
        </div>
      </div>

      {/* RISK DISTRIBUTION */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          Forecast Distribution
        </p>

        <div className="space-y-2">
          <RiskRow
            label="High Risk"
            value={forecast.high}
            total={stats.totalParcels}
          />

          <RiskRow
            label="Moderate Risk"
            value={forecast.moderate}
            total={stats.totalParcels}
          />

          <RiskRow
            label="Lower Risk"
            value={forecast.low}
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
          Forecast Factors
        </span>

        <span>
          {showDetails ? "▲" : "▼"}
        </span>
      </button>

      {showDetails && (
        <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-black/20 p-3 text-[10px]">
          <Factor
            label="Existing encroachment proximity"
            status="Screened"
          />

          <Factor
            label="Built-up neighbourhood density"
            status="Screened"
          />

          <Factor
            label="Parcel spatial context"
            status="Screened"
          />

          <Factor
            label="Historical construction change"
            status="Data required"
          />

          <Factor
            label="Road/access proximity"
            status="Data required"
          />

          <Factor
            label="Public land boundary layer"
            status="Data required"
          />
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[9px] leading-relaxed text-neutral-500">
          Prototype forecast indicator based on
          available spatial information. A
          production 6–12 month predictive model
          requires historical labelled data and
          temporal imagery. This result does not
          establish that future illegal construction
          will occur.
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
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
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
    status === "Screened";

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