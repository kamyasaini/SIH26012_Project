"use client";

import { useMemo, useState } from "react";

import type {
  EncroachmentAlertItem,
  ExtractedParcelResponse,
  ParcelStats,
} from "@/lib/types";

type IntelligenceMode =
  | "alerts"
  | "seismic"
  | "forecast"
  | "debris"
  | "aerial";

interface SelectedParcelIntelligenceProps {
  mode: IntelligenceMode;
  parcel: ExtractedParcelResponse | null;
  stats: ParcelStats;
  alerts: EncroachmentAlertItem[];
}

export default function SelectedParcelIntelligence({
  mode,
  parcel,
  stats,
  alerts,
}: SelectedParcelIntelligenceProps) {
  if (!parcel) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface/95 p-5 text-neutral-100 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            ◎
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Spatial Intelligence
            </h2>

            <p className="mt-1 text-[10px] text-neutral-500">
              Waiting for parcel selection
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-4 text-center">
          <div className="text-2xl text-cyan-300">
            ⌖
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-200">
            Select a parcel
          </p>

          <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
            Click any 3D parcel on the map to activate
            parcel-specific intelligence.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniInfo
            label="Parcels available"
            value={stats.totalParcels}
          />

          <MiniInfo
            label="Active alerts"
            value={stats.activeAlerts}
          />
        </div>
      </div>
    );
  }

  switch (mode) {
    case "alerts":
      return (
        <AlertsPanel
          parcel={parcel}
          alerts={alerts}
        />
      );

    case "seismic":
      return (
        <SeismicPanel
          parcel={parcel}
        />
      );

    case "forecast":
      return (
        <ForecastPanel
          parcel={parcel}
        />
      );

    case "debris":
      return (
        <AccessPanel
          parcel={parcel}
        />
      );

    case "aerial":
      return (
        <AerialPanel
          parcel={parcel}
        />
      );

    default:
      return null;
  }
}

/* =========================================
   ALERTS PANEL
   ========================================= */

function AlertsPanel({
  parcel,
  alerts,
}: {
  parcel: ExtractedParcelResponse;
  alerts: EncroachmentAlertItem[];
}) {
  const alert = alerts.find(
    (item) => item.id === parcel.id,
  );

  const hasAlert =
    parcel.severity !== "none" ||
    parcel.encroachment_area_sqm > 0;

  return (
    <PanelShell
      title="Encroachment Alert"
      subtitle="Selected parcel analysis"
      badge={
        hasAlert
          ? "ALERT"
          : "CLEAR"
      }
    >
      <ParcelIdentity
        parcel={parcel}
      />

      <div
        className={`mt-4 rounded-lg border p-4 ${
          hasAlert
            ? "border-orange-400/20 bg-orange-400/[0.05]"
            : "border-cyan-400/20 bg-cyan-400/[0.05]"
        }`}
      >
        <p className="text-[9px] uppercase tracking-wide text-neutral-500">
          Encroachment Status
        </p>

        <p
          className={`mt-1 text-lg font-semibold ${
            hasAlert
              ? "text-orange-300"
              : "text-cyan-300"
          }`}
        >
          {hasAlert
            ? "ENCROACHMENT DETECTED"
            : "NO ACTIVE ALERT"}
        </p>

        {alert && (
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
            This parcel appears in the current
            encroachment alert set.
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric
          label="Encroached area"
          value={`${parcel.encroachment_area_sqm.toFixed(2)} m²`}
        />

        <Metric
          label="Encroachment"
          value={`${parcel.encroachment_percentage.toFixed(2)}%`}
        />
      </div>

      <DataNote>
        Alert status is derived from the selected
        parcel&apos;s existing cadastral extraction data.
      </DataNote>
    </PanelShell>
  );
}

/* =========================================
   SEISMIC PANEL
   ========================================= */

function SeismicPanel({
  parcel,
}: {
  parcel: ExtractedParcelResponse;
}) {
  const vulnerabilityIndex = useMemo(() => {
    const height =
      parcel.extruded_height_m;

    const area =
      parcel.area_sqm;

    let score = 30;

    if (height >= 12) {
      score += 20;
    } else if (height >= 8) {
      score += 12;
    } else if (height >= 5) {
      score += 6;
    }

    if (area > 500) {
      score += 10;
    }

    if (
      parcel.encroachment_percentage >=
      20
    ) {
      score += 10;
    }

    return Math.min(100, score);
  }, [parcel]);

  return (
    <PanelShell
      title="Seismic Screening"
      subtitle="Selected structure vulnerability"
      badge="SCREENING"
    >
      <ParcelIdentity
        parcel={parcel}
      />

      <ScoreCard
        label="Vulnerability Index"
        score={vulnerabilityIndex}
      />

      <div className="mt-4 space-y-2">
        <Factor
          label="Building height"
          value={`${parcel.extruded_height_m.toFixed(2)} m`}
        />

        <Factor
          label="Footprint area"
          value={`${parcel.area_sqm.toFixed(2)} m²`}
        />

        <Factor
          label="Base elevation"
          value={`${parcel.base_elevation_m.toFixed(2)} m`}
        />

        <Factor
          label="Encroachment"
          value={`${parcel.encroachment_percentage.toFixed(2)}%`}
        />
      </div>

      <DataNote>
        This is a screening indicator based on
        currently available spatial attributes. It is
        not a certified structural-safety or earthquake
        collapse prediction.
      </DataNote>
    </PanelShell>
  );
}

/* =========================================
   FORECAST PANEL
   ========================================= */

function ForecastPanel({
  parcel,
}: {
  parcel: ExtractedParcelResponse;
}) {
  const forecastIndex = useMemo(() => {
    let score = 20;

    if (
      parcel.encroachment_percentage > 0
    ) {
      score += Math.min(
        40,
        parcel.encroachment_percentage,
      );
    }

    if (
      parcel.encroachment_area_sqm > 50
    ) {
      score += 15;
    }

    if (
      parcel.severity === "severe"
    ) {
      score += 20;
    } else if (
      parcel.severity === "moderate"
    ) {
      score += 10;
    }

    return Math.min(
      100,
      Math.round(score),
    );
  }, [parcel]);

  return (
    <PanelShell
      title="Encroachment Forecast"
      subtitle="Selected parcel future-risk screening"
      badge="6–12 MONTH"
    >
      <ParcelIdentity
        parcel={parcel}
      />

      <ScoreCard
        label="Forecast Risk Index"
        score={forecastIndex}
      />

      <div className="mt-4 space-y-2">
        <Factor
          label="Current encroachment"
          value={`${parcel.encroachment_percentage.toFixed(2)}%`}
        />

        <Factor
          label="Encroached area"
          value={`${parcel.encroachment_area_sqm.toFixed(2)} m²`}
        />

        <Factor
          label="Current severity"
          value={parcel.severity}
        />

        <Factor
          label="Parcel area"
          value={`${parcel.area_sqm.toFixed(2)} m²`}
        />
      </div>

      <DataNote>
        This is a parcel-level screening indicator.
        A validated 6–12 month forecast would require
        historical temporal imagery and labelled change
        data.
      </DataNote>
    </PanelShell>
  );
}

/* =========================================
   ACCESS / DEBRIS PANEL
   ========================================= */

function AccessPanel({
  parcel,
}: {
  parcel: ExtractedParcelResponse;
}) {
  const blockageIndex = useMemo(() => {
    let score = 20;

    if (
      parcel.encroachment_percentage >=
      10
    ) {
      score += 20;
    }

    if (
      parcel.encroachment_percentage >=
      25
    ) {
      score += 20;
    }

    if (
      parcel.extruded_height_m >=
      10
    ) {
      score += 15;
    }

    if (
      parcel.area_sqm >= 500
    ) {
      score += 10;
    }

    return Math.min(
      100,
      score,
    );
  }, [parcel]);

  return (
    <PanelShell
      title="Access & Debris"
      subtitle="Selected parcel post-quake screening"
      badge="POST-QUAKE"
    >
      <ParcelIdentity
        parcel={parcel}
      />

      <ScoreCard
        label="Route Blockage Index"
        score={blockageIndex}
      />

      <div className="mt-4 space-y-2">
        <Factor
          label="Building height"
          value={`${parcel.extruded_height_m.toFixed(2)} m`}
        />

        <Factor
          label="Footprint area"
          value={`${parcel.area_sqm.toFixed(2)} m²`}
        />

        <Factor
          label="Existing encroachment"
          value={`${parcel.encroachment_percentage.toFixed(2)}%`}
        />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-[9px] uppercase tracking-wide text-neutral-500">
          Additional data required
        </p>

        <div className="mt-2 space-y-1 text-[10px] text-neutral-500">
          <p>• Road width</p>
          <p>• Road network</p>
          <p>• Structural vulnerability</p>
          <p>• Debris model</p>
          <p>• Emergency routes</p>
        </div>
      </div>

      <DataNote>
        This is a route-access screening indicator,
        not a guaranteed post-earthquake blockage
        prediction.
      </DataNote>
    </PanelShell>
  );
}

/* =========================================
   AERIAL / HAPS PANEL
   ========================================= */

function AerialPanel({
  parcel,
}: {
  parcel: ExtractedParcelResponse;
}) {
  const [scanComplete] =
    useState(true);

  return (
    <PanelShell
      title="HAPS / Airship Intelligence"
      subtitle="Selected parcel aerial intelligence"
      badge="SIMULATED FEED"
    >
      <ParcelIdentity
        parcel={parcel}
      />

      <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />

          <span className="text-xs font-semibold text-cyan-300">
            {scanComplete
              ? "SIMULATION COMPLETE"
              : "SIMULATION ACTIVE"}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400" />
        </div>

        <p className="mt-2 text-[9px] text-neutral-500">
          Aerial observation context loaded for
          selected parcel.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric
          label="Parcel area"
          value={`${parcel.area_sqm.toFixed(1)} m²`}
        />

        <Metric
          label="Building height"
          value={`${parcel.extruded_height_m.toFixed(1)} m`}
        />

        <Metric
          label="Change flag"
          value={
            parcel.encroachment_area_sqm >
            0
              ? "YES"
              : "NO"
          }
        />

        <Metric
          label="Damage context"
          value={
            parcel.severity ===
            "none"
              ? "LOW"
              : parcel.severity.toUpperCase()
          }
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          Intelligence Pipeline
        </p>

        <div className="space-y-2">
          <PipelineStep
            number="01"
            text="Aerial / HAPS imagery"
          />

          <PipelineStep
            number="02"
            text="Change detection"
          />

          <PipelineStep
            number="03"
            text="3D cadastral engine"
          />

          <PipelineStep
            number="04"
            text="Damage screening"
          />

          <PipelineStep
            number="05"
            text="Emergency response"
          />
        </div>
      </div>

      <DataNote>
        Current HAPS / airship input is simulated.
        A live aerial platform and imagery stream would
        be required for continuous surveillance.
      </DataNote>
    </PanelShell>
  );
}

/* =========================================
   SHARED COMPONENTS
   ========================================= */

function PanelShell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/95 p-4 text-neutral-100 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {title}
          </h2>

          <p className="mt-1 text-[10px] text-neutral-500">
            {subtitle}
          </p>
        </div>

        <span className="whitespace-nowrap rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-cyan-300">
          {badge}
        </span>
      </div>

      {children}
    </div>
  );
}

function ParcelIdentity({
  parcel,
}: {
  parcel: ExtractedParcelResponse;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] uppercase tracking-wide text-neutral-500">
        Selected Parcel
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {parcel.parcel_code}
      </p>

      <p className="mt-1 break-all text-[9px] text-neutral-600">
        ID: {parcel.id}
      </p>
    </div>
  );
}

function ScoreCard({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-neutral-500">
            {label}
          </p>

          <p className="mt-1 text-3xl font-semibold">
            {score}
            <span className="ml-1 text-xs text-neutral-500">
              /100
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-orange-400 to-red-500"
          style={{
            width: `${score}%`,
          }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-neutral-100">
        {value}
      </p>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function Factor({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-black/10 px-3 py-2">
      <span className="text-[10px] text-neutral-500">
        {label}
      </span>

      <span className="text-[10px] font-semibold capitalize text-neutral-200">
        {value}
      </span>
    </div>
  );
}

function PipelineStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-[8px] font-semibold text-cyan-300">
        {number}
      </span>

      <span className="text-[10px] text-neutral-300">
        {text}
      </span>
    </div>
  );
}

function DataNote({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <p className="text-[9px] leading-relaxed text-neutral-500">
        {children}
      </p>
    </div>
  );
}