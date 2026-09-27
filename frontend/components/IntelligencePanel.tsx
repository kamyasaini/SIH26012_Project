"use client";

import SelectedParcelIntelligence from "./SelectedParcelIntelligence";

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

interface IntelligencePanelProps {
  mode: IntelligenceMode;
  stats: ParcelStats;
  alerts: EncroachmentAlertItem[];
  selectedParcel: ExtractedParcelResponse | null;
}

export default function IntelligencePanel({
  mode,
  stats,
  alerts,
  selectedParcel,
}: IntelligencePanelProps) {
  return (
    <div
      className="
        pointer-events-auto
        absolute
        right-4
        top-[116px]
        z-[70]
        w-[340px]
        max-w-[calc(100%-2rem)]
        max-h-[calc(100%-132px)]
        overflow-y-auto
        overscroll-contain
        pr-1
      "
    >
      <SelectedParcelIntelligence
        mode={mode}
        stats={stats}
        alerts={alerts}
        parcel={selectedParcel}
      />
    </div>
  );
}