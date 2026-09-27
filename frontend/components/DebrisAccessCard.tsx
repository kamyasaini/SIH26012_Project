"use client";

import { useMemo, useState } from "react";

import type { ParcelStats } from "@/lib/types";

interface DebrisAccessCardProps {
  stats: ParcelStats;
}

export default function DebrisAccessCard({
  stats,
}: DebrisAccessCardProps) {
  const [showDetails, setShowDetails] =
    useState(false);

  const analysis = useMemo(() => {
    const total = stats.totalParcels;

    /*
     * Prototype screening distribution.
     *
     * This is a route-access screening indicator,
     * not a guaranteed collapse prediction.
     */
    const highBlockage =
      Math.round(total * 0.18);

    const moderate =
      Math.round(total * 0.32);

    const accessible = Math.max(
      0,
      total -
        highBlockage -
        moderate,
    );

    const blockageIndex =
      total > 0
        ? Math.round(
            ((highBlockage * 90 +
              moderate * 55 +
              accessible * 15) /
              total),
          )
        : 0;

    return {
      highBlockage,
      moderate,
      accessible,
      blockageIndex,
    };
  }, [stats.totalParcels]);

  return (
    <div className="rounded-xl border border-border bg-surface/95 p-4 text-neutral-100 shadow-2xl backdrop-blur-xl">
      {/* HEADER */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              ◫
            </span>

            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Access & Debris
            </h2>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Post-quake route blockage screening
          </p>
        </div>

        <span className="rounded-full border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-orange-300">
          POST-QUAKE
        </span>
      </div>

      {/* BLOCKAGE INDEX */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">
              Route Blockage Index
            </p>

            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {analysis.blockageIndex}

              <span className="ml-1 text-xs text-neutral-500">
                /100
              </span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wide text-neutral-500">
              Structures screened
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-200">
              {stats.totalParcels}
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-orange-400 to-red-500"
            style={{
              width: `${Math.min(
                100,
                analysis.blockageIndex,
              )}%`,
            }}
          />
        </div>
      </div>

      {/* DISTRIBUTION */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          Access Screening
        </p>

        <div className="space-y-2">
          <RiskRow
            label="High blockage"
            value={
              analysis.highBlockage
            }
            total={
              stats.totalParcels
            }
          />

          <RiskRow
            label="Moderate blockage"
            value={
              analysis.moderate
            }
            total={
              stats.totalParcels
            }
          />

          <RiskRow
            label="Potentially accessible"
            value={
              analysis.accessible
            }
            total={
              stats.totalParcels
            }
          />
        </div>
      </div>

      {/* FACTORS */}
      <button
        type="button"
        onClick={() =>
          setShowDetails(
            (value) => !value,
          )
        }
        className="mt-4 flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 transition hover:bg-white/[0.06]"
      >
        <span>
          Route Risk Factors
        </span>

        <span>
          {showDetails
            ? "▲"
            : "▼"}
        </span>
      </button>

      {showDetails && (
        <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-black/20 p-3 text-[10px]">
          <Factor
            label="Building footprint proximity"
            status="Screened"
          />

          <Factor
            label="Building height"
            status="Screened"
          />

          <Factor
            label="Existing encroachment"
            status="Screened"
          />

          <Factor
            label="Road width"
            status="Data required"
          />

          <Factor
            label="Road network"
            status="Data required"
          />

          <Factor
            label="Structural collapse model"
            status="Data required"
          />

          <Factor
            label="Emergency route network"
            status="Data required"
          />
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[9px] leading-relaxed text-neutral-500">
          Prototype route-access screening
          indicator. Actual post-earthquake
          blockage analysis requires road-network,
          road-width, structural vulnerability and
          debris modelling data.
        </p>
      </div>
    </div>
  );
}

/* ========================================= */
/* RISK ROW                                  */
/* ========================================= */

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
      ? Math.round(
          (value / total) * 100,
        )
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
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-orange-400"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ========================================= */
/* FACTOR                                    */
/* ========================================= */

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