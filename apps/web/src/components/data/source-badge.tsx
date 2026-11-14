import { ChartLine, Cpu, Flask, MathOperations, PencilSimple, Prohibit } from "@phosphor-icons/react/ssr";
import type { DataSource } from "@sat2soil/contracts";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Provenance badge (D-001). Each source differs by colour AND a second cue (dot shape, icon, hatch,
 * dashed border) so the distinction survives colour blindness and greyscale printing.
 */
const styles: Record<DataSource, { className: string; mark: ReactNode }> = {
  live_nasa: {
    className: "bg-navy-50 text-navy-900",
    mark: <span className="size-2 rounded-full bg-navy-900" />,
  },
  cached_nasa: {
    className: "border border-navy-200 bg-surface text-navy-900",
    mark: <span className="size-2 rounded-full border-[1.5px] border-navy-600" />,
  },
  demo_sample: {
    className: "bg-surface-2 text-ink",
    mark: <Flask weight="bold" />,
  },
  manual_user: {
    className: "border border-line bg-surface text-ink",
    mark: <PencilSimple weight="bold" />,
  },
  simulated_device: {
    className: "hatch-amber border border-amber-600/60 text-amber-700",
    mark: <Cpu weight="bold" />,
  },
  derived_indicator: {
    className: "bg-green-50 text-green-800",
    mark: <MathOperations weight="bold" />,
  },
  scenario_estimate: {
    className: "border border-dashed border-green-600 bg-surface text-green-800",
    mark: <ChartLine weight="bold" />,
  },
  unavailable: {
    className: "bg-surface-2 text-ink-muted",
    mark: <Prohibit weight="bold" />,
  },
};

export function SourceBadge({
  source,
  detail,
  className,
}: {
  source: DataSource;
  /** Product or time, e.g. "POWER" → "NASA • POWER", "14:02" → "Cached • 14:02". */
  detail?: string;
  className?: string;
}) {
  const t = useTranslations("dataSource");
  const tHint = useTranslations("dataSourceHint");
  const style = styles[source];

  return (
    <span
      title={tHint(source)}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-mono text-2xs",
        "[&_svg]:size-3",
        style.className,
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex items-center">
        {style.mark}
      </span>
      <span>
        {t(source)}
        {detail ? ` • ${detail}` : null}
      </span>
      <span className="sr-only">. {tHint(source)}</span>
    </span>
  );
}
