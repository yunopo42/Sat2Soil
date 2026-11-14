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
  trend,
  icon,
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
  /** Small comparison chip, e.g. "+12% vs previous 30 days". */
  trend?: ReactNode;
  /** Coloured line icon shown before the label (approved designs). */
  icon?: ReactNode;
  method?: ReactNode;
}) {
  const missing = value === null;

  return (
    <Card>
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon ? <span aria-hidden="true" className="shrink-0 [&_svg]:size-7">{icon}</span> : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{label}</p>
              {note ? <p className="truncate text-2xs text-ink-muted">{note}</p> : null}
            </div>
          </div>
          <SourceBadge source={missing ? "unavailable" : source} detail={missing ? undefined : sourceDetail} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="flex items-baseline gap-1.5 font-mono text-ink">
            {missing ? (
              <span className="text-xl text-ink-muted">—</span>
            ) : (
              <AnimatedNumber value={value} fractionDigits={fractionDigits} className="text-xl font-bold" />
            )}
            <span className="text-sm text-ink-muted">{unit}</span>
          </p>
          {trend && !missing ? trend : null}
        </div>
      </div>
      <ProvenanceFooter items={provenance} method={method} />
    </Card>
  );
}
