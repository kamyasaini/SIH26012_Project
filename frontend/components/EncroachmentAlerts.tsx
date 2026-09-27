import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { EncroachmentAlertItem, EncroachmentSeverity } from "@/lib/types";

interface EncroachmentAlertsProps {
  alerts: EncroachmentAlertItem[];
}

const SEVERITY_STYLES: Record<EncroachmentSeverity, string> = {
  none: "border-neutral-700 bg-neutral-800/40 text-neutral-300",
  minor: "border-amber-900/50 bg-amber-950/30 text-amber-300",
  moderate: "border-orange-900/50 bg-orange-950/30 text-orange-300",
  severe: "border-red-900/50 bg-red-950/30 text-red-300",
};

export default function EncroachmentAlerts({ alerts }: EncroachmentAlertsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface p-3.5">
      <h2 className="mb-2.5 shrink-0 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Encroachment Alerts
      </h2>

      {alerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <ShieldCheck className="h-6 w-6 text-neutral-600" />
          <p className="max-w-[16rem] text-xs text-neutral-500">
            No encroachments detected yet. Alerts will appear here once the diff engine compares
            extracted parcels against registry records.
          </p>
        </div>
      ) : (
        <ul className="flex-1 space-y-1.5 overflow-y-auto">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-md border p-2 text-xs ${SEVERITY_STYLES[alert.severity]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  {alert.parcelCode}
                </span>
                <span className="shrink-0 uppercase tracking-wide">{alert.severity}</span>
              </div>
              <p className="mt-1 text-neutral-400">
                {alert.encroachedAreaSqm.toLocaleString()} m² ·{" "}
                {alert.encroachmentPercentage.toFixed(1)}% of parcel
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
