"use client";

import UploadCard from "./UploadCard";
import ParcelStatsCard from "./ParcelStatsCard";
import TacticalControls, {
  TacticalSettings,
} from "./TacticalControls";

import type {
  EncroachmentAlertItem,
  ParcelExtractionResult,
  ParcelStats,
  UploadOrthomosaicResponse,
} from "@/lib/types";

interface SidebarProps {
  stats: ParcelStats;
  alerts: EncroachmentAlertItem[];

  onUploadComplete: (
    result: UploadOrthomosaicResponse,
  ) => void;

  onParcelsExtracted: (
    result: ParcelExtractionResult,
  ) => void;

  tacticalSettings?: TacticalSettings;

  onTacticalSettingsChange?: (
    changes: Partial<TacticalSettings>,
  ) => void;
}

const DEFAULT_SETTINGS: TacticalSettings = {
  hud: true,
  layout: "compact",
  style: "tactical",
  density: 50,
  allocation: "elastic",
  fade: 100,
};

export default function Sidebar({
  stats,
  onUploadComplete,
  onParcelsExtracted,
  tacticalSettings,
  onTacticalSettingsChange,
}: SidebarProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-surface/60 p-3">
      {/* EXISTING UPLOAD + SAMPLE SECTION */}
      <UploadCard
        onUploadComplete={
          onUploadComplete
        }
        onParcelsExtracted={
          onParcelsExtracted
        }
      />

      {/* TACTICAL CONTROLS */}
      <TacticalControls
        settings={
          tacticalSettings ??
          DEFAULT_SETTINGS
        }
        onChange={
          onTacticalSettingsChange
        }
      />

      {/* EXISTING PARCEL STATS */}
      <ParcelStatsCard
        stats={stats}
      />

      {/* EXISTING INTELLIGENCE INFO */}
      <div className="rounded-lg border border-white/5 bg-black/10 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          Intelligence
        </div>

        <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">
          Use the map controls to switch
          between alerts, seismic screening
          and future encroachment forecasting.
        </p>
      </div>
    </aside>
  );
}