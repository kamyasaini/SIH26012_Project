"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import type {
  EncroachmentAlertItem,
  ExtractedParcelResponse,
  ParcelStats,
  UploadOrthomosaicResponse,
} from "@/lib/types";

import { rasterPreviewUrl } from "@/lib/api";

import IntelligencePanel from "./IntelligencePanel";
import type { TacticalSettings } from "./TacticalControls";

const CesiumViewer = dynamic(
  () => import("./CesiumViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black text-sm text-neutral-500">
        Loading 3D viewer…
      </div>
    ),
  },
);

type IntelligenceMode =
  | "alerts"
  | "seismic"
  | "forecast"
  | "debris"
  | "aerial";

interface ComparisonViewerProps {
  uploadResult?: UploadOrthomosaicResponse | null;
  parcels?: ExtractedParcelResponse[];
  stats: ParcelStats;
  alerts: EncroachmentAlertItem[];
  tacticalSettings?: TacticalSettings;
}

const DEFAULT_TACTICAL_SETTINGS: TacticalSettings = {
  hud: true,
  layout: "compact",
  style: "tactical",
  density: 50,
  allocation: "elastic",
  fade: 100,
};

export default function ComparisonViewer({
  uploadResult,
  parcels = [],
  stats,
  alerts,
  tacticalSettings,
}: ComparisonViewerProps) {
  const settings =
    tacticalSettings ??
    DEFAULT_TACTICAL_SETTINGS;

  /* ================================================= */
  /* VIEW MODE                                         */
  /* ================================================= */

  const [viewMode, setViewMode] =
    useState<"2d" | "3d">("3d");

  /* ================================================= */
  /* INTELLIGENCE MODE                                */
  /* ================================================= */

  const [
    intelligenceMode,
    setIntelligenceMode,
  ] = useState<IntelligenceMode | null>(
    "alerts",
  );

  /* ================================================= */
  /* SELECTED PARCEL                                  */
  /* ================================================= */

  const [selectedParcel, setSelectedParcel] =
    useState<ExtractedParcelResponse | null>(
      null,
    );

  /* ================================================= */
  /* RASTER URL                                       */
  /* ================================================= */

  const rasterUrl = useMemo(() => {
    if (!uploadResult) {
      return null;
    }

    return rasterPreviewUrl(
      uploadResult.preview_url,
    );
  }, [uploadResult]);

  /* ================================================= */
  /* BOUNDS                                           */
  /* ================================================= */

  const bounds = useMemo(() => {
    return (
      uploadResult?.raster_metadata
        .wgs84_bounding_box ?? null
    );
  }, [uploadResult]);

  /* ================================================= */
  /* RASTER OVERLAY                                   */
  /* ================================================= */

  const rasterOverlay = useMemo(() => {
    if (!uploadResult || !rasterUrl) {
      return null;
    }

    return {
      url: rasterUrl,
      bounds:
        uploadResult.raster_metadata
          .wgs84_bounding_box,
    };
  }, [uploadResult, rasterUrl]);

  /* ================================================= */
  /* INTELLIGENCE MODE HANDLER                        */
  /* ================================================= */

  const handleIntelligenceMode = (
    mode: IntelligenceMode,
  ) => {
    setIntelligenceMode((current) =>
      current === mode ? null : mode,
    );
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-black ${
        settings.style === "dense"
          ? "contrast-110"
          : ""
      }`}
    >
      {/* ================================================= */}
      {/* 2D VIEW                                           */}
      {/* ================================================= */}

      <div
        className={`absolute inset-0 ${
          viewMode === "2d"
            ? "z-10"
            : "z-0 pointer-events-none opacity-0"
        }`}
      >
        {rasterUrl ? (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <img
              src={rasterUrl}
              alt="Drone orthomosaic"
              className="h-full w-full object-contain"
              style={{
                opacity:
                  settings.fade / 100,
              }}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
            Load an orthomosaic to view the
            2D map.
          </div>
        )}

        {settings.hud && (
          <div className="absolute left-4 top-4 z-40 rounded-md border border-white/10 bg-black/75 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur">
            2D ORTHOMOSAIC
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* 3D VIEW                                           */}
      {/* ================================================= */}

      <div
        className={`absolute inset-0 ${
          viewMode === "3d"
            ? "z-20"
            : "z-0 pointer-events-none opacity-0"
        }`}
      >
        <CesiumViewer
          flyToBounds={bounds}
          flyToKey={
            uploadResult?.upload_id
          }
          rasterOverlay={rasterOverlay}
          parcels={parcels}
          onParcelSelect={
            setSelectedParcel
          }
          tacticalSettings={settings}
        />

        {settings.hud && (
          <div className="pointer-events-none absolute left-4 top-4 z-40 rounded-md border border-white/10 bg-black/75 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur">
            3D CADASTRAL MODEL
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* TOP RIGHT CONTROLS                                */}
      {/* ================================================= */}

      <div
        className={`absolute right-4 top-4 z-[100] flex max-w-[calc(100%-2rem)] flex-col items-end gap-2 transition-all ${
          settings.layout === "wide"
            ? "scale-105 origin-top-right"
            : ""
        }`}
      >
        {/* ================================================= */}
        {/* 2D / 3D                                          */}
        {/* ================================================= */}

        <div className="flex overflow-hidden rounded-lg border border-white/10 bg-black/90 p-1 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() =>
              setViewMode("2d")
            }
            className={`px-4 py-2 text-xs font-semibold transition ${
              viewMode === "2d"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            2D
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode("3d")
            }
            className={`px-4 py-2 text-xs font-semibold transition ${
              viewMode === "3d"
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            3D
          </button>
        </div>

        {/* ================================================= */}
        {/* INTELLIGENCE BUTTONS                              */}
        {/* ================================================= */}

        <div className="flex flex-wrap justify-end overflow-hidden rounded-lg border border-white/10 bg-black/90 p-1 shadow-xl backdrop-blur">
          <IntelligenceButton
            label="Alerts"
            active={
              intelligenceMode ===
              "alerts"
            }
            onClick={() =>
              handleIntelligenceMode(
                "alerts",
              )
            }
          />

          <IntelligenceButton
            label="Seismic"
            active={
              intelligenceMode ===
              "seismic"
            }
            onClick={() =>
              handleIntelligenceMode(
                "seismic",
              )
            }
          />

          <IntelligenceButton
            label="Forecast"
            active={
              intelligenceMode ===
              "forecast"
            }
            onClick={() =>
              handleIntelligenceMode(
                "forecast",
              )
            }
          />

          <IntelligenceButton
            label="Access"
            active={
              intelligenceMode ===
              "debris"
            }
            onClick={() =>
              handleIntelligenceMode(
                "debris",
              )
            }
          />

          <IntelligenceButton
            label="Aerial"
            active={
              intelligenceMode ===
              "aerial"
            }
            onClick={() =>
              handleIntelligenceMode(
                "aerial",
              )
            }
          />
        </div>
      </div>

      {/* ================================================= */}
      {/* INTELLIGENCE PANEL                                */}
      {/* ================================================= */}

      {intelligenceMode && (
        <IntelligencePanel
          mode={intelligenceMode}
          stats={stats}
          alerts={alerts}
          selectedParcel={
            selectedParcel
          }
        />
      )}
    </div>
  );
}

/* ================================================= */
/* INTELLIGENCE BUTTON                              */
/* ================================================= */

function IntelligenceButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${
        active
          ? "bg-white text-black"
          : "text-neutral-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}