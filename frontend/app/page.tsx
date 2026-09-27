"use client";

import { useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ComparisonViewer from "@/components/ComparisonViewer";
import CinematicIntro from "@/components/CinematicIntro";

import type {
  EncroachmentAlertItem,
  ParcelExtractionResult,
  ParcelStats,
  UploadOrthomosaicResponse,
} from "@/lib/types";

import type {
  TacticalSettings,
} from "@/components/TacticalControls";

const DEFAULT_TACTICAL_SETTINGS: TacticalSettings = {
  hud: true,
  layout: "compact",
  style: "tactical",
  density: 50,
  allocation: "elastic",
  fade: 100,
};

export default function Home() {
  /* UPLOAD RESULT */
  const [uploadResult, setUploadResult] =
    useState<UploadOrthomosaicResponse | null>(
      null,
    );

  /* PARCEL RESULT */
  const [parcelResult, setParcelResult] =
    useState<ParcelExtractionResult | null>(
      null,
    );

  /* INTRO */
  const [showIntro, setShowIntro] =
    useState(true);

  /* TACTICAL SETTINGS */
  const [
    tacticalSettings,
    setTacticalSettings,
  ] = useState<TacticalSettings>(
    DEFAULT_TACTICAL_SETTINGS,
  );

  /* PARCEL STATS */
  const stats: ParcelStats = useMemo(
    () => ({
      totalParcels:
        parcelResult?.parcel_count ?? 0,

      totalAreaSqm:
        Math.round(
          parcelResult?.total_area_sqm ?? 0,
        ),

      totalEncroachedAreaSqm:
        Math.round(
          parcelResult?.total_encroached_area_sqm ??
            0,
        ),

      activeAlerts:
        parcelResult?.active_alerts ?? 0,
    }),
    [parcelResult],
  );

  /* ALERTS */
  const alerts: EncroachmentAlertItem[] =
    useMemo(
      () =>
        (parcelResult?.parcels ?? [])
          .filter(
            (parcel) =>
              parcel.severity !==
              "none",
          )
          .sort(
            (a, b) =>
              b.encroachment_percentage -
              a.encroachment_percentage,
          )
          .map((parcel) => ({
            id: parcel.id,

            parcelCode:
              parcel.parcel_code,

            encroachedAreaSqm:
              parcel.encroachment_area_sqm,

            encroachmentPercentage:
              parcel.encroachment_percentage,

            severity:
              parcel.severity,

            detectedAt:
              parcel.created_at,
          })),
      [parcelResult],
    );

  /* TACTICAL CONTROL HANDLER */
  const handleTacticalSettingsChange = (
    changes: Partial<TacticalSettings>,
  ) => {
    setTacticalSettings(
      (current) => ({
        ...current,
        ...changes,
      }),
    );
  };

  return (
    <>
      {/* CINEMATIC INTRO */}
      {showIntro && (
        <CinematicIntro
          onComplete={() =>
            setShowIntro(false)
          }
        />
      )}

      {/* MAIN APPLICATION */}
      <div className="flex h-screen flex-col bg-background">
        <Navbar />

        <div className="flex min-h-0 flex-1">
          {/* SIDEBAR */}
          <Sidebar
            stats={stats}
            alerts={alerts}
            onUploadComplete={
              setUploadResult
            }
            onParcelsExtracted={
              setParcelResult
            }
            tacticalSettings={
              tacticalSettings
            }
            onTacticalSettingsChange={
              handleTacticalSettingsChange
            }
          />

          {/* VIEWER */}
          <main className="relative flex-1 bg-black">
            <ComparisonViewer
              uploadResult={
                uploadResult
              }
              parcels={
                parcelResult?.parcels
              }
              stats={stats}
              alerts={alerts}
              tacticalSettings={
                tacticalSettings
              }
            />
          </main>
        </div>
      </div>
    </>
  );
}