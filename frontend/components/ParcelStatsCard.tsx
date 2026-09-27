import { LandPlot, Ruler, TriangleAlert, ListChecks } from "lucide-react";
import type { ParcelStats } from "@/lib/types";

interface ParcelStatsCardProps {
  stats: ParcelStats;
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LandPlot;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface-raised p-2.5">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="truncate text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-sm font-semibold text-neutral-100">{value}</p>
      </div>
    </div>
  );
}

export default function ParcelStatsCard({ stats }: ParcelStatsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Parcel Statistics
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <StatTile icon={LandPlot} label="Parcels" value={stats.totalParcels.toLocaleString()} />
        <StatTile
          icon={Ruler}
          label="Total Area"
          value={`${stats.totalAreaSqm.toLocaleString()} m²`}
        />
        <StatTile
          icon={TriangleAlert}
          label="Encroached Area"
          value={`${stats.totalEncroachedAreaSqm.toLocaleString()} m²`}
        />
        <StatTile icon={ListChecks} label="Active Alerts" value={stats.activeAlerts.toString()} />
      </div>
      {stats.totalParcels === 0 && (
        <p className="mt-2.5 text-[10px] text-neutral-500">
          Populates once the AI segmentation pipeline extracts parcels from an uploaded orthomosaic.
        </p>
      )}
    </div>
  );
}
