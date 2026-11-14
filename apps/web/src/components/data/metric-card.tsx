import type { DataSource } from "@sat2soil/contracts";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "./animated-number";
import { ProvenanceFooter } from "./provenance-footer";
import { SourceBadge } from "./source-badge";

/**
 * A single headline value. A missing value renders "—" with a "No data" badge rather than a zero,
 * so a gap in NASA data can never read as a real measurement.
 */
export function MetricCard({
  label,
  value,
  unit,
  fractionDigits = 0,
  source,
  sourceDetail,
  provenance,
  note,
  method,
}: {
  label: string;
  value: number | null;
  unit: string;
  fractionDigits?: number;
  source: DataSource;
  sourceDetail?: string;
  provenance: string[];
  note?: ReactNode;
  method?: ReactNode;
}) {
  const missing = value === null;

  return (
    <Card>
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-ink-muted">{label}</p>
          <SourceBadge source={missing ? "unavailable" : source} detail={missing ? undefined : sourceDetail} />
        </div>
        <p className="mt-4 flex items-baseline gap-1.5 font-mono text-ink">
          {missing ? (
            <span className="text-xl text-ink-muted">—</span>
          ) : (
            <AnimatedNumber value={value} fractionDigits={fractionDigits} className="text-xl" />
          )}
          <span className="text-sm text-ink-muted">{unit}</span>
        </p>
        {note ? <p className="mt-2 text-xs text-ink-muted">{note}</p> : null}
      </div>
      <ProvenanceFooter items={provenance} method={method} />
    </Card>
  );
}
