"use client";

import { scaleLinear, scaleTime } from "d3-scale";
import { line } from "d3-shape";
import { motion, useReducedMotion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { duration, ease } from "@/lib/motion/tokens";
import { cumulative as runningTotal, nearestIndex, type Point } from "./chart-utils";
import { useElementWidth } from "./use-element-width";

const DAY = 24 * 3600 * 1000;

/**
 * Daily values as thin bars (e.g. precipitation, mm/day) with an optional running total on a
 * secondary axis. Days without data get a small grey tick under the axis and read "—", so a gap
 * never looks like a dry day.
 */
export function BarChart({
  points,
  unit,
  label,
  height = 220,
  cumulative,
  fractionDigits = 1,
}: {
  points: Point[];
  unit: string;
  label: string;
  height?: number;
  /** Adds a running-total line with its own axis on the right. */
  cumulative?: { label: string; unit: string };
  fractionDigits?: number;
}) {
  const [container, width] = useElementWidth<HTMLDivElement>();
  const format = useFormatter();
  const t = useTranslations("ui");
  const reduceMotion = useReducedMotion();
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const margin = { top: 20, right: cumulative ? 52 : 16, bottom: 26, left: 44 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;

  const model = useMemo(() => {
    if (points.length === 0 || innerWidth <= 0) return null;
    const first = points[0].t.getTime();
    const last = points[points.length - 1].t.getTime();
    const x = scaleTime()
      .domain([new Date(first - DAY / 2), new Date(last + DAY / 2)])
      .range([0, innerWidth]);
    const max = Math.max(1, ...points.map((p) => p.v ?? 0));
    const y = scaleLinear().domain([0, max]).nice(4).range([innerHeight, 0]);
    const totals = cumulative ? runningTotal(points) : null;
    const y2 = totals
      ? scaleLinear()
          .domain([0, Math.max(1, totals[totals.length - 1].v ?? 0)])
          .nice(4)
          .range([innerHeight, 0])
      : null;
    const totalPath =
      totals && y2
        ? (line<Point>()
            .x((p) => x(p.t))
            .y((p) => y2(p.v as number))(totals) ?? "")
        : "";
    return {
      x,
      y,
      y2,
      totals,
      totalPath,
      barWidth: Math.max(1, (innerWidth / points.length) * 0.62),
      times: points.map((p) => p.t.getTime()),
      xTicks: x.ticks(innerWidth < 420 ? 4 : 8),
    };
  }, [points, innerWidth, innerHeight, cumulative]);

  const number = (value: number) =>
    format.number(value, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

  const move = (event: PointerEvent<SVGRectElement>) => {
    if (!model) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(model.times, model.x.invert(event.clientX - bounds.left).getTime()));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!model) return;
    const last = model.times.length - 1;
    const current = active ?? last;
    const step = event.shiftKey ? 7 : 1;
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

  const activePoint = active !== null ? points[active] : null;
  const animateReveal = !reduceMotion && !revealed;

  return (
    <figure className="flex flex-col gap-2">
      <p aria-live="polite" className="flex h-5 flex-wrap items-center gap-x-3 font-mono text-2xs text-ink-muted">
        {activePoint && model ? (
          <>
            <span className="text-ink">
              {format.dateTime(activePoint.t, { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="text-ink">{activePoint.v === null ? "—" : `${number(activePoint.v)} ${unit}`}</span>
            {cumulative && model.totals ? (
              <span>
                {cumulative.label}{" "}
                <span className="text-ink">
                  {number(model.totals[active as number].v as number)} {cumulative.unit}
                </span>
              </span>
            ) : null}
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
            onFocus={() => setActive((current) => current ?? points.length - 1)}
            onBlur={() => setActive(null)}
            className="overflow-visible rounded-sm"
          >
            <defs>
              <clipPath id={clipId}>
                <motion.rect
                  x={-4}
                  y={-margin.top}
                  height={height}
                  initial={{ width: animateReveal ? 0 : innerWidth + 8 }}
                  animate={{ width: innerWidth + 8 }}
                  transition={animateReveal ? { duration: duration.slow, ease: ease.out } : { duration: 0 }}
                  onAnimationComplete={() => setRevealed(true)}
                />
              </clipPath>
            </defs>
            <g transform={`translate(${margin.left},${margin.top})`}>
              {model.y.ticks(4).map((tick) => (
                <g key={tick} transform={`translate(0,${model.y(tick)})`}>
                  <line x2={innerWidth} className="stroke-line" />
                  <text x={-10} dy="0.32em" textAnchor="end" className="fill-ink-muted font-mono text-2xs tabular">
                    {format.number(tick)}
                  </text>
                </g>
              ))}
              <text x={-10} y={-10} textAnchor="end" className="fill-ink-muted font-mono text-2xs">
                {unit}
              </text>
              {model.y2 && cumulative ? (
                <>
                  {model.y2.ticks(4).map((tick) => (
                    <text
                      key={tick}
                      x={innerWidth + 10}
                      y={model.y2!(tick)}
                      dy="0.32em"
                      className="fill-navy-900 font-mono text-2xs tabular"
                    >
                      {format.number(tick)}
                    </text>
                  ))}
                  <text x={innerWidth + 10} y={-10} className="fill-navy-900 font-mono text-2xs">
                    {cumulative.unit}
                  </text>
                </>
              ) : null}

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

              {/* Missing days: marked under the axis, never drawn as zero */}
              {points.map((p) =>
                p.v === null ? (
                  <rect
                    key={`gap-${p.t.getTime()}`}
                    x={model.x(p.t) - 1}
                    y={innerHeight + 3}
                    width={2}
                    height={4}
                    className="fill-ink-subtle"
                  />
                ) : null,
              )}

              <g clipPath={`url(#${clipId})`}>
                {points.map((p, i) =>
                  p.v === null || p.v <= 0 ? null : (
                    <rect
                      key={p.t.getTime()}
                      x={model.x(p.t) - model.barWidth / 2}
                      y={model.y(p.v)}
                      width={model.barWidth}
                      height={innerHeight - model.y(p.v)}
                      className={i === active ? "fill-navy-800" : "fill-sky-600/75"}
                    />
                  ),
                )}
                {model.totalPath ? (
                  <path d={model.totalPath} fill="none" strokeWidth={1.75} className="stroke-navy-900" />
                ) : null}
                {cumulative && model.totals && model.y2 ? (
                  <text
                    x={innerWidth - 4}
                    y={model.y2(model.totals[model.totals.length - 1].v as number) - 8}
                    textAnchor="end"
                    className="fill-navy-900 font-sans text-xs font-medium"
                  >
                    {cumulative.label}
                  </text>
                ) : null}
              </g>

              {activePoint ? (
                <line
                  x1={model.x(activePoint.t)}
                  x2={model.x(activePoint.t)}
                  y2={innerHeight}
                  className="stroke-ink"
                  strokeOpacity={0.25}
                  pointerEvents="none"
                />
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
