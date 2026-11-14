"use client";

import { scaleLinear, scaleTime } from "d3-scale";
import { area, line } from "d3-shape";
import { motion, useReducedMotion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { duration, ease } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";
import {
  lastDefined,
  nearestIndex,
  paddedDomain,
  spreadLabels,
  timeExtent,
  valueExtent,
  type BandPoint,
  type LineSeries,
  type Point,
  type SeriesTone,
} from "./chart-utils";
import { useElementWidth } from "./use-element-width";

const tone: Record<SeriesTone, { line: string; band: string; dash?: string; dot: string; label: string }> = {
  observed: { line: "stroke-navy-600", band: "fill-navy-200/45", dot: "fill-navy-600", label: "fill-navy-900" },
  derived: { line: "stroke-green-600", band: "fill-green-200/40", dot: "fill-green-600", label: "fill-green-800" },
  scenario: {
    line: "stroke-green-600",
    band: "fill-green-200/35",
    dash: "6 5",
    dot: "fill-green-600",
    label: "fill-green-800",
  },
  reference: { line: "stroke-ink-muted", band: "fill-surface-2", dot: "fill-ink-muted", label: "fill-ink-muted" },
};

const MARGIN = { top: 20, right: 116, bottom: 26, left: 44 };

export type ChartMarker = { t: Date; label: string };

/**
 * Time-series line chart styled as a scientific figure: thin straight segments (no smoothing that
 * would invent values), gaps where data is missing, units on the axis, direct labels instead of a
 * legend. Draws itself left to right once (450–700 ms) when data first arrives; off with reduced motion.
 * Pointer and keyboard (← → Home End) both move the value readout.
 */
export function LineChart({
  series,
  unit,
  label,
  height = 240,
  markers = [],
  fractionDigits = 1,
  yDomain,
}: {
  series: LineSeries[];
  unit: string;
  /** Accessible summary of what the chart shows. */
  label: string;
  height?: number;
  markers?: ChartMarker[];
  fractionDigits?: number;
  yDomain?: [number, number];
}) {
  const [container, width] = useElementWidth<HTMLDivElement>();
  const format = useFormatter();
  const t = useTranslations("ui");
  const reduceMotion = useReducedMotion();
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const model = useMemo(() => {
    const times = timeExtent(series);
    const values = valueExtent(series);
    if (!times || !values || innerWidth <= 0) return null;

    const x = scaleTime().domain(times).range([0, innerWidth]);
    const y = scaleLinear()
      .domain(yDomain ?? paddedDomain(values))
      .nice(5)
      .range([innerHeight, 0]);

    const toLine = line<Point>()
      .defined((p) => p.v !== null)
      .x((p) => x(p.t))
      .y((p) => y(p.v as number));
    const toArea = area<BandPoint>()
      .defined((b) => b.lo !== null && b.hi !== null)
      .x((b) => x(b.t))
      .y0((b) => y(b.lo as number))
      .y1((b) => y(b.hi as number));

    const reference = series.reduce((a, b) => (b.points.length > a.points.length ? b : a));
    // Direct labels: a series that reaches the right edge is labelled in the right margin; one that
    // stops earlier (e.g. "Observed" at "Today") is labelled where its line ends, so the label never
    // points at empty space.
    const ends = series.map((s) => lastDefined(s.points));
    const endXs = ends.map((p) => (p ? x(p.t) : innerWidth));
    const atEdge = endXs.map((ex) => ex >= innerWidth - 1);
    const edgeYs = spreadLabels(
      ends.filter((_, i) => atEdge[i]).map((p) => (p ? y(p.v as number) : innerHeight)),
      14,
      0,
      innerHeight,
    );
    let edgeIndex = 0;
    const labels = ends.map((p, i) => {
      const py = p ? y(p.v as number) : innerHeight;
      if (atEdge[i]) return { x: innerWidth + 10, y: edgeYs[edgeIndex++], anchor: "start" as const };
      return { x: endXs[i] - 6, y: Math.max(8, py - 12), anchor: "end" as const };
    });

    return {
      x,
      y,
      paths: series.map((s) => ({ line: toLine(s.points) ?? "", band: s.band ? (toArea(s.band) ?? "") : "" })),
      times: reference.points.map((p) => p.t.getTime()),
      seriesTimes: series.map((s) => s.points.map((p) => p.t.getTime())),
      labels,
      yTicks: y.ticks(5),
      xTicks: x.ticks(innerWidth < 420 ? 4 : 8),
    };
  }, [series, innerWidth, innerHeight, yDomain]);

  const number = (value: number) =>
    format.number(value, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

  const activeTime = model && active !== null ? model.times[active] : null;
  const readout =
    model && activeTime !== null
      ? series.map((s, i) => {
          const index = nearestIndex(model.seriesTimes[i], activeTime);
          const point = s.points[index];
          const close = point && Math.abs(point.t.getTime() - activeTime) < 36 * 3600 * 1000;
          return { series: s, value: close ? point.v : null };
        })
      : null;

  const move = (event: PointerEvent<SVGRectElement>) => {
    if (!model) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const time = model.x.invert(event.clientX - bounds.left).getTime();
    setActive(nearestIndex(model.times, time));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!model) return;
    const last = model.times.length - 1;
    const step = event.shiftKey ? 7 : 1;
    const current = active ?? last;
    const next =
      event.key === "ArrowLeft"
        ? Math.max(0, current - step)
        : event.key === "ArrowRight"
          ? Math.min(last, current + step)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  const animateReveal = !reduceMotion && !revealed;

  return (
    <figure className="flex flex-col gap-2">
      <p aria-live="polite" className="flex h-5 flex-wrap items-center gap-x-3 font-mono text-2xs text-ink-muted">
        {readout && activeTime !== null ? (
          <>
            <span className="text-ink">
              {format.dateTime(new Date(activeTime), { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {readout.map(({ series: s, value }) => (
              <span key={s.id}>
                {s.label}{" "}
                <span className="text-ink">{value === null ? "—" : `${number(value)} ${unit}`}</span>
              </span>
            ))}
          </>
        ) : (
          <span>{t("chartHint")}</span>
        )}
      </p>

      <div ref={container} style={{ height }} className="w-full">
        {model ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onFocus={() => setActive((current) => current ?? model.times.length - 1)}
            onBlur={() => setActive(null)}
            className="overflow-visible rounded-sm"
          >
            <defs>
              <clipPath id={clipId}>
                <motion.rect
                  x={-4}
                  y={-MARGIN.top}
                  height={height}
                  initial={{ width: animateReveal ? 0 : innerWidth + MARGIN.right }}
                  animate={{ width: innerWidth + MARGIN.right }}
                  transition={
                    animateReveal ? { duration: duration.slow, ease: ease.out } : { duration: 0 }
                  }
                  onAnimationComplete={() => setRevealed(true)}
                />
              </clipPath>
            </defs>

            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Grid and y axis */}
              {model.yTicks.map((tick) => (
                <g key={tick} transform={`translate(0,${model.y(tick)})`}>
                  <line x2={innerWidth} className="stroke-line" strokeWidth={1} />
                  <text x={-10} dy="0.32em" textAnchor="end" className="fill-ink-muted font-mono text-2xs tabular">
                    {format.number(tick)}
                  </text>
                </g>
              ))}
              <text x={-10} y={-10} textAnchor="end" className="fill-ink-muted font-mono text-2xs">
                {unit}
              </text>

              {/* X axis */}
              <line y1={innerHeight} y2={innerHeight} x2={innerWidth} className="stroke-line-strong" />
              {model.xTicks.map((tick) => (
                <text
                  key={tick.getTime()}
                  x={model.x(tick)}
                  y={innerHeight + 18}
                  textAnchor="middle"
                  className="fill-ink-muted font-mono text-2xs"
                >
                  {format.dateTime(tick, tick.getMonth() === 0 ? { month: "short", year: "2-digit" } : { month: "short" })}
                </text>
              ))}

              {/* Event markers such as "Today" */}
              {markers.map((marker) => {
                const mx = model.x(marker.t);
                if (mx < 0 || mx > innerWidth) return null;
                return (
                  <g key={marker.label} transform={`translate(${mx},0)`}>
                    <line y1={-4} y2={innerHeight} className="stroke-ink-muted" strokeDasharray="2 3" />
                    <text y={-8} textAnchor="middle" className="fill-ink font-mono text-2xs">
                      {marker.label}
                    </text>
                  </g>
                );
              })}

              {/* Data */}
              <g clipPath={`url(#${clipId})`}>
                {series.map((s, i) =>
                  model.paths[i].band ? (
                    <path key={`${s.id}-band`} d={model.paths[i].band} className={tone[s.tone].band} />
                  ) : null,
                )}
                {series.map((s, i) => (
                  <path
                    key={s.id}
                    d={model.paths[i].line}
                    fill="none"
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={tone[s.tone].dash}
                    className={tone[s.tone].line}
                  />
                ))}
                {series.map((s, i) => (
                  <text
                    key={`${s.id}-label`}
                    x={model.labels[i].x}
                    y={model.labels[i].y}
                    textAnchor={model.labels[i].anchor}
                    dy="0.32em"
                    className={cn("font-sans text-xs font-medium", tone[s.tone].label)}
                  >
                    {s.label}
                  </text>
                ))}
              </g>

              {/* Readout cursor */}
              {readout && activeTime !== null ? (
                <g pointerEvents="none">
                  <line
                    x1={model.x(new Date(activeTime))}
                    x2={model.x(new Date(activeTime))}
                    y2={innerHeight}
                    className="stroke-ink"
                    strokeOpacity={0.35}
                  />
                  {readout.map(({ series: s, value }) =>
                    value === null ? null : (
                      <circle
                        key={s.id}
                        cx={model.x(new Date(activeTime))}
                        cy={model.y(value)}
                        r={3.5}
                        className={cn("stroke-white", tone[s.tone].dot)}
                        strokeWidth={1.5}
                      />
                    ),
                  )}
                </g>
              ) : null}

              <rect
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onPointerMove={move}
                onPointerLeave={() => setActive(null)}
              />
            </g>
          </svg>
        ) : null}
      </div>
    </figure>
  );
}
