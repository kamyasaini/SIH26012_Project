"use client";

import { useEffect, useMemo, useState } from "react";

import type { ParcelStats } from "@/lib/types";

interface AerialIntelligenceCardProps {
  stats: ParcelStats;
}

export default function AerialIntelligenceCard({
  stats,
}: AerialIntelligenceCardProps) {
  const [scanProgress, setScanProgress] =
    useState(0);

  const [isScanning, setIsScanning] =
    useState(true);

  const [showDetails, setShowDetails] =
    useState(false);

  /*
   * Simulated one-time HAPS / Airship scan.
   *
   * This is a DEMO feed.
   * It is not a real live aerial connection.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((current) => {
        if (current >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          return 100;
        }

        return Math.min(
          current + 2,
          100,
        );
      });
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const analysis = useMemo(() => {
    const parcels =
      stats.totalParcels;

    const changedAreas =
      parcels > 0
        ? Math.max(
            1,
            Math.round(
              parcels * 0.16,
            ),
          )
        : 0;

    const damagedStructures =
      parcels > 0
        ? Math.max(
            1,
            Math.round(
              parcels * 0.08,
            ),
          )
        : 0;

    const affectedRoutes =
      parcels > 0
        ? Math.max(
            1,
            Math.round(
              parcels * 0.05,
            ),
          )
        : 0;

    const coverageArea =
      parcels > 0
        ? Math.max(
            0.5,
            parcels * 0.016,
          )
        : 0;

    return {
      changedAreas,
      damagedStructures,
      affectedRoutes,
      coverageArea,
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
              Airship / HAPS
            </h2>
          </div>

          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Continuous aerial intelligence
          </p>
        </div>

        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
          DEMO FEED
        </span>
      </div>

      {/* SURVEILLANCE STATUS */}
      <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
        <div className="flex items-center justify-between">

          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
              Surveillance Status
            </p>

            <div className="mt-1 flex items-center gap-2">

              <span
                className={`h-2 w-2 rounded-full ${
                  isScanning
                    ? "animate-pulse bg-cyan-400"
                    : "bg-cyan-500"
                }`}
              />

              <span className="text-xs font-semibold text-cyan-300">
                {isScanning
                  ? "SCANNING"
                  : "SCAN COMPLETE"}
              </span>

            </div>
          </div>

          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wide text-neutral-500">
              Coverage
            </p>

            <p className="mt-1 text-sm font-semibold text-neutral-200">
              {analysis.coverageArea.toFixed(
                1,
              )}{" "}
              km²
            </p>
          </div>

        </div>

        {/* SCAN PROGRESS */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">

          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 transition-all duration-100"
            style={{
              width: `${scanProgress}%`,
            }}
          />

        </div>

        <div className="mt-1 flex justify-between text-[8px] uppercase tracking-wide text-neutral-600">
          <span>
            Aerial scan
          </span>

          <span>
            {scanProgress}%
          </span>
        </div>
      </div>

      {/* METRICS */}
      <div className="mt-4 grid grid-cols-2 gap-2">

        <Metric
          label="Parcels tracked"
          value={stats.totalParcels}
        />

        <Metric
          label="Change flags"
          value={
            analysis.changedAreas
          }
        />

        <Metric
          label="Damage flags"
          value={
            analysis.damagedStructures
          }
        />

        <Metric
          label="Routes affected"
          value={
            analysis.affectedRoutes
          }
        />

      </div>

      {/* AERIAL INTELLIGENCE */}
      <div className="mt-4">

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          Aerial Intelligence
        </p>

        <div className="space-y-2">

          <StatusRow
            label="Continuous land-use tracking"
            status="Simulated"
          />

          <StatusRow
            label="3D cadastral updates"
            status="Connected"
          />

          <StatusRow
            label="Volumetric damage screening"
            status="Demo"
          />

          <StatusRow
            label="Emergency route analysis"
            status="Demo"
          />

        </div>
      </div>

      {/* PIPELINE TOGGLE */}
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
          HAPS Intelligence Pipeline
        </span>

        <span>
          {showDetails
            ? "▲"
            : "▼"}
        </span>

      </button>

      {/* PIPELINE */}
      {showDetails && (
        <div className="mt-2 space-y-3 rounded-md border border-white/10 bg-black/20 p-3">

          <PipelineStep
            number="01"
            title="Aerial / HAPS Feed"
            description="Continuous aerial imagery input."
          />

          <PipelineStep
            number="02"
            title="Change Detection"
            description="Identify new or changed structures and land-use patterns."
          />

          <PipelineStep
            number="03"
            title="3D Spatial Engine"
            description="Convert detected features into cadastral spatial intelligence."
          />

          <PipelineStep
            number="04"
            title="Disaster Intelligence"
            description="Screen structural damage and access disruption after seismic events."
          />

          <PipelineStep
            number="05"
            title="Emergency Response"
            description="Highlight potentially affected routes and areas for response planning."
          />

        </div>
      )}

      {/* TECHNICAL DISCLAIMER */}
      <div className="mt-4 border-t border-white/10 pt-3">

        <p className="text-[9px] leading-relaxed text-neutral-500">
          HAPS / airship integration is demonstrated
          as a simulated intelligence feed. Actual
          continuous surveillance requires a connected
          aerial platform, imagery stream and validated
          damage-analysis models.
        </p>

      </div>

    </div>
  );
}

/* ================================
   METRIC
   ================================ */

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">

      <p className="text-[9px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-neutral-100">
        {value}
      </p>

    </div>
  );
}

/* ================================
   STATUS ROW
   ================================ */

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">

      <span className="text-[10px] text-neutral-400">
        {label}
      </span>

      <span className="whitespace-nowrap text-[9px] font-semibold text-cyan-300">
        {status}
      </span>

    </div>
  );
}

/* ================================
   PIPELINE STEP
   ================================ */

function PipelineStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">

      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-[8px] font-semibold text-cyan-300">
        {number}
      </div>

      <div>

        <p className="text-[10px] font-semibold text-neutral-200">
          {title}
        </p>

        <p className="mt-0.5 text-[9px] leading-relaxed text-neutral-500">
          {description}
        </p>

      </div>

    </div>
  );
}