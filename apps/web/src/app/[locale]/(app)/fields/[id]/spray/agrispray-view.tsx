"use client";

import {
  ArrowRight,
  Camera,
  CheckCircle,
  Cpu,
  DeviceMobile,
  Drop,
  Lightning,
  Play,
  Question,
  Thermometer,
  ThermometerSimple,
  WarningCircle,
  Wind,
  XCircle,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import {
  SPRAY_CARD_VARIANTS,
  type AgriSpray,
  type CheckStatus,
  type SprayCard,
  type SprayCardVariant,
} from "@sat2soil/contracts";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/state-panel";
import { Tabs } from "@/components/ui/tabs";
import { ApiError, fetchAgriSpray, fetchSprayCard } from "@/lib/api";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

const SCAN_MS = 1100; // ≤ 1.2 s (MOTION_STORYBOARD M17)
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/** AgriSpray concept (Faz 7, UI_UX_DESIGN S-07, D-027). Everything from the device is simulated. */
export function AgriSprayView({ fieldId }: { fieldId: string }) {
  const t = useTranslations("spray");
  const tStates = useTranslations("states");
  const tUi = useTranslations("ui");
  const data = useQuery({ queryKey: ["agrispray", fieldId], queryFn: () => fetchAgriSpray(fieldId) });

  // The card analysis feeds both the "Spray card" tab and the report below, so it lives here.
  const [variant, setVariant] = useState<SprayCardVariant>("uneven");
  const [run, setRun] = useState<{ variant: SprayCardVariant; token: number } | null>(null);
  const card = useQuery({
    queryKey: ["spray-card", run?.variant, run?.token],
    queryFn: async () => {
      const [result] = await Promise.all([
        fetchSprayCard(run!.variant),
        new Promise((resolve) => setTimeout(resolve, SCAN_MS)), // let the scan line finish
      ]);
      return result;
    },
    enabled: run !== null,
    staleTime: Infinity,
  });
  const analysed = run && run.variant === variant ? card.data : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader banner title={t("title")} emphasis={t("emphasis")} description={t("description")} />
      <Banner variant="simulated" title={t("bannerTitle")}>
        {t("bannerBody")}
      </Banner>

      {data.isPending ? (
        <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : data.isError || !data.data ? (
        <Banner
          variant="error"
          title={data.error instanceof ApiError && data.error.status === 0 ? tStates("apiErrorTitle") : tStates("errorTitle")}
          action={
            <Button size="sm" onClick={() => data.refetch()}>
              {tUi("retry")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
            <ConceptCard />
            <SensorGrid data={data.data} />
          </div>

          <Card>
            <CardBody>
              <Tabs
                label={t("tabs.label")}
                defaultValue="card"
                items={[
                  {
                    value: "card",
                    label: t("tabs.card"),
                    content: (
                      <SprayCardPanel
                        variant={variant}
                        onVariant={setVariant}
                        result={analysed}
                        running={card.isFetching}
                        error={card.isError}
                        onRun={() => setRun({ variant, token: Date.now() })}
                      />
                    ),
                  },
                  { value: "soil", label: t("tabs.soil"), content: <SoilPanel data={data.data} /> },
                  { value: "plant", label: t("tabs.plant"), content: <PlantPanel data={data.data} /> },
                ]}
              />
            </CardBody>
          </Card>

          <Report data={data.data} card={analysed} />
        </>
      )}
    </div>
  );
}

function ConceptCard() {
  const t = useTranslations("spray.concept");
  const steps: { icon: Icon; label: string }[] = [
    { icon: Cpu, label: t("device") },
    { icon: DeviceMobile, label: t("phone") },
    { icon: Lightning, label: t("api") },
  ];
  return (
    <Card>
      <CardHeader title={t("title")} aside={<SourceBadge source="simulated_device" />} />
      <CardBody className="flex flex-col gap-5">
        <figure className="flex flex-col items-center gap-2">
          <div className="hatch-amber w-full rounded-lg border border-amber-600/40 p-3">
            <Image
              src="/images/agrispray-concept.webp"
              alt={t("caption")}
              width={308}
              height={328}
              className="mx-auto h-auto w-full max-w-[280px] rounded-md"
            />
          </div>
          <figcaption className="text-center text-2xs text-ink-muted">{t("caption")}</figcaption>
        </figure>
        <div>
          <p className="text-xs font-semibold text-ink-muted">{t("flowTitle")}</p>
          <ol className="mt-2 flex flex-wrap items-center gap-2">
            {steps.map(({ icon: StepIcon, label }, i) => (
              <li key={label} className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md border border-dashed border-line-strong bg-surface-2 px-2.5 py-1.5 text-xs font-semibold">
                  <StepIcon aria-hidden="true" className="size-4 text-ink-muted" />
                  {label}
                </span>
                {i < steps.length - 1 ? (
                  <span className="flex items-center gap-1 text-2xs font-semibold text-amber-700">
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                    {t("planned")}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </CardBody>
    </Card>
  );
}

function SensorGrid({ data }: { data: AgriSpray }) {
  const t = useTranslations("spray.sensors");
  const format = useFormatter();
  const r = data.device.readings;
  const stamp = `${data.device.device_id} · ${format.dateTime(new Date(data.device.recorded_at), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
  const sensors: { key: string; icon: Icon; tone: string; value: number | null; unit: string; digits: number }[] = [
    { key: "soil_moisture", icon: Drop, tone: "text-sky-600", value: r.soil_moisture_pct, unit: "%", digits: 1 },
    { key: "soil_temp", icon: ThermometerSimple, tone: "text-orange-500", value: r.soil_temp_c, unit: "°C", digits: 1 },
    { key: "soil_ec", icon: Lightning, tone: "text-green-600", value: r.soil_ec_ds_m, unit: "dS/m", digits: 2 },
    { key: "air_temp", icon: Thermometer, tone: "text-orange-500", value: r.air_temp_c, unit: "°C", digits: 1 },
    { key: "air_rh", icon: Drop, tone: "text-sky-600", value: r.air_rh_pct, unit: "%", digits: 0 },
    { key: "wind", icon: Wind, tone: "text-ink-muted", value: r.wind_ms, unit: "m/s", digits: 1 },
  ];
  return (
    <Card>
      <CardHeader title={t("title")} aside={<SourceBadge source="simulated_device" detail="mock" />} />
      <CardBody>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sensors.map(({ key, icon: SensorIcon, tone, value, unit, digits }) => (
            <li
              key={key}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-4",
                value === null ? "border-line bg-surface-2" : "hatch-amber border-amber-600/30",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <SensorIcon aria-hidden="true" weight="duotone" className={cn("size-5", tone)} />
                  {t(key as never)}
                </span>
                {value === null ? <SourceBadge source="unavailable" /> : null}
              </span>
              <span className="font-mono text-xl font-bold">
                {value === null
                  ? "—"
                  : `${format.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`}
              </span>
              <span className="font-mono text-2xs text-ink-muted">{value === null ? t("noSensor") : stamp}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function SprayCardPanel({
  variant,
  onVariant,
  result,
  running,
  error,
  onRun,
}: {
  variant: SprayCardVariant;
  onVariant: (v: SprayCardVariant) => void;
  result: SprayCard | undefined;
  running: boolean;
  error: boolean;
  onRun: () => void;
}) {
  const t = useTranslations("spray.card");
  const tStates = useTranslations("states");
  const format = useFormatter();
  const n = (v: number, d = 1) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  // The original card is shown before analysis too, so fetch it quietly (same cached endpoint).
  const preview = useQuery({ queryKey: ["spray-card-preview", variant], queryFn: () => fetchSprayCard(variant), staleTime: Infinity });
  const card = result ?? preview.data;

  return (
    <div className="flex flex-col gap-5 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="text-base font-bold">{t("title")}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label={t("variantLabel")}
            value={variant}
            onValueChange={onVariant}
            options={SPRAY_CARD_VARIANTS.map((v) => ({ value: v, label: t(`variants.${v}`) }))}
          />
          <Button onClick={onRun} disabled={running}>
            <Play aria-hidden="true" weight="fill" />
            {running ? t("running") : result ? t("rerun") : t("run")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <figure>
          <figcaption className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-muted">
            {t("original")}
            <SourceBadge source="simulated_device" detail={t("example")} />
          </figcaption>
          <div className="relative overflow-hidden rounded-md border border-line">
            {card ? <CardImage card={card} /> : <Skeleton className="aspect-[76/26] w-full" />}
            <ScanLine active={running} />
          </div>
        </figure>
        <figure>
          <figcaption className="mb-2 text-xs font-semibold text-ink-muted">{t("mask")}</figcaption>
          <div className="relative flex aspect-[76/26] items-center justify-center overflow-hidden rounded-md border border-line bg-navy-900">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.img
                  key={result.variant}
                  src={result.mask_png}
                  alt={t("mask")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={transition.normal}
                  className="h-full w-full [image-rendering:pixelated]"
                />
              ) : (
                <p className="px-6 text-center text-xs text-white/70">{error ? tStates("errorTitle") : t("notRun")}</p>
              )}
            </AnimatePresence>
          </div>
        </figure>
      </div>

      {result ? (
        <motion.div
          key={`${result.variant}-results`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition.normal}
          className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]"
        >
          <dl className="flex flex-col gap-3 rounded-lg border border-line p-4">
            <Metric label={t("coverage")} value={`${n(result.coverage_pct)} %`} />
            <Metric label={t("density")} value={n(result.regions_per_cm2)} />
            <Metric
              label={t("uniformity")}
              value={`${t(`uniformityValue.${result.uniformity}`)}${result.denser_side ? ` · ${t(`denser.${result.denser_side}`)}` : ""}`}
              note={`${t("cv", { cv: n(result.uniformity_cv_pct) })} · ${t("halves", { left: n(result.left_coverage_pct), right: n(result.right_coverage_pct) })}`}
            />
          </dl>
          <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
            <p className="text-xs font-semibold text-ink-muted">{t("zonesTitle")}</p>
            <Zones zones={result.zone_coverage} />
            <p className="text-2xs text-ink-muted">{t("merging", { generated: result.generated_stains, regions: result.regions })}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
            <p className="text-xs font-semibold text-ink-muted">{t("histTitle")}</p>
            <Histogram bins={result.histogram} />
            <p className="text-2xs text-ink-muted">{t("histNote")}</p>
          </div>
          <p className="rounded-md bg-surface-2 p-3 text-xs text-ink lg:col-span-3">{t("guidance")}</p>
        </motion.div>
      ) : null}
    </div>
  );
}

/** The synthetic card drawn from its stain list (mm units, so it is to scale). */
function CardImage({ card }: { card: SprayCard }) {
  const [w, h] = card.card_mm;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block aspect-[76/26] w-full" role="img" aria-label="Synthetic water-sensitive paper">
      <rect width={w} height={h} fill="#f2d43c" />
      <g fill="#1d4fae" fillOpacity={0.88}>
        {card.stains.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.d / 2000} />
        ))}
      </g>
    </svg>
  );
}

function ScanLine({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  if (!active || reduce) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 w-0.5 bg-green-600 shadow-[0_0_12px_2px_rgba(75,122,34,0.55)]"
      initial={{ left: "0%" }}
      animate={{ left: "100%" }}
      transition={{ duration: SCAN_MS / 1000, ease: "linear" }}
    />
  );
}

function Zones({ zones }: { zones: number[][] }) {
  const format = useFormatter();
  const max = Math.max(1, ...zones.flat());
  return (
    <div className="grid grid-cols-6 gap-1">
      {zones.flat().map((v, i) => (
        <span
          key={i}
          className="flex h-9 items-center justify-center rounded-sm font-mono text-2xs"
          style={{
            backgroundColor: `color-mix(in srgb, #1d4fae ${Math.round((85 * v) / max)}%, #f3efe8)`,
            color: v / max > 0.55 ? "white" : "#0b1f3a",
          }}
        >
          {format.number(v, { maximumFractionDigits: 0 })}
        </span>
      ))}
    </div>
  );
}

function Histogram({ bins }: { bins: SprayCard["histogram"] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <ul className="flex flex-col gap-1.5">
      {bins.map((b) => (
        <li key={b.from_um} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 font-mono text-2xs">
          <span className="text-ink-muted">{b.to_um === null ? `≥ ${b.from_um} µm` : `${b.from_um}–${b.to_um} µm`}</span>
          <span className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${(100 * b.count) / max}%` }}
              transition={transition.emphasis}
              className="absolute inset-y-0 left-0 rounded-full bg-[#1d4fae]"
            />
          </span>
          <span className="text-right">{b.count}</span>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="font-mono text-lg font-bold">{value}</dd>
      {note ? <dd className="text-2xs text-ink-muted">{note}</dd> : null}
    </div>
  );
}

function SoilPanel({ data }: { data: AgriSpray }) {
  const t = useTranslations("spray.soil");
  const format = useFormatter();
  const moisture = useMemo(
    () => data.device.history.map((p) => ({ t: new Date(p.at), v: p.soil_moisture_pct })),
    [data.device.history],
  );
  const temperature = useMemo(
    () => data.device.history.map((p) => ({ t: new Date(p.at), v: p.soil_temp_c })),
    [data.device.history],
  );
  return (
    <div className="flex flex-col gap-5 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">{t("title")}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
        </div>
        <SourceBadge source="simulated_device" detail="mock" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart label={t("moisture")} unit="%" height={220} series={[{ id: "m", label: t("moisture"), tone: "simulated", points: moisture }]} />
        <LineChart label={t("temperature")} unit="°C" height={220} series={[{ id: "t", label: t("temperature"), tone: "simulated", points: temperature }]} />
      </div>
      <p className="text-xs text-ink-muted">
        {t("ec", { value: format.number(data.device.readings.soil_ec_ds_m ?? 0, { minimumFractionDigits: 2 }) })}
      </p>
    </div>
  );
}

function PlantPanel({ data }: { data: AgriSpray }) {
  const t = useTranslations("spray.plant");
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-5 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">{t("title")}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t("lead")}</p>
        </div>
        <SourceBadge source="simulated_device" detail="mock" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.plant_log.map((o) => (
          <figure key={o.stage} className="flex flex-col gap-2">
            <div className="hatch-amber flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-amber-600/50 text-amber-700">
              <Camera aria-hidden="true" weight="duotone" className="size-9" />
              <span className="text-xs font-semibold">{t("photoSlot")}</span>
            </div>
            <figcaption className="flex flex-col gap-0.5 text-sm">
              <span className="font-bold">
                {t(o.stage, { date: format.dateTime(day(o.date), { day: "numeric", month: "short" }) })} ·{" "}
                {t("plantTag", { tag: o.plant_tag })}
              </span>
              <span className="font-mono text-xs">{t("leaves", { spots: o.leaves_with_spots, checked: o.leaves_checked })}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="rounded-md bg-surface-2 p-3 text-sm">{t("disclaimer")}</p>
    </div>
  );
}

const STATUS: Record<CheckStatus, { icon: Icon; className: string }> = {
  within: { icon: CheckCircle, className: "bg-green-100 text-green-800" },
  caution: { icon: WarningCircle, className: "bg-amber-50 text-amber-700" },
  outside: { icon: XCircle, className: "bg-red-50 text-red-700" },
  unknown: { icon: Question, className: "bg-surface-2 text-ink-muted" },
};

function Report({ data, card }: { data: AgriSpray; card: SprayCard | undefined }) {
  const t = useTranslations("spray");
  const tA = useTranslations("planning.assumptions");
  const tU = useTranslations("planning.uncertainty");
  const format = useFormatter();
  const n = (v: number | null, d = 1) => (v === null ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d }));
  const [before, after] = data.plant_log;
  const regional = data.regional;
  const source = data.data_sources[0];
  const wind = useMemo(
    () => (regional ? regional.days.map((d) => ({ t: day(d.date), v: d.wind_ms })) : []),
    [regional],
  );

  return (
    <section aria-labelledby="spray-report" className="flex flex-col gap-4">
      <h2 id="spray-report" className="text-lg font-bold">
        {t("report.title")}
      </h2>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title={t("report.quality")} aside={<SourceBadge source="simulated_device" />} />
          <CardBody>
            {card ? (
              <dl className="flex flex-col gap-3">
                <Metric label={t("card.coverage")} value={`${n(card.coverage_pct)} %`} />
                <Metric label={t("card.density")} value={n(card.regions_per_cm2)} />
                <Metric
                  label={t("card.uniformity")}
                  value={t(`card.uniformityValue.${card.uniformity}`)}
                  note={card.denser_side ? t(`card.denser.${card.denser_side}`) : undefined}
                />
              </dl>
            ) : (
              <p className="text-sm text-ink-muted">{t("report.qualityEmpty")}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("report.environment")} aside={<SourceBadge source="simulated_device" />} />
          <CardBody className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {data.checks.map((c) => {
                const { icon: StatusIcon, className } = STATUS[c.status];
                return (
                  <li key={c.code} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex flex-col">
                      <span className="font-semibold">{t(`checks.${c.code}` as never)}</span>
                      <span className="font-mono text-2xs text-ink-muted">
                        {c.value === null ? "—" : `${n(c.value)} ${c.unit}`}
                      </span>
                    </span>
                    <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold", className)}>
                      <StatusIcon aria-hidden="true" weight="fill" className="size-3.5" />
                      {t(`checks.status.${c.status}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-2xs text-ink-muted">{t("checks.note")}</p>

            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">{t("regional.title")}</p>
                {regional ? <SourceBadge source={regional.source_type} detail="POWER" /> : null}
              </div>
              {regional ? (
                <>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <Stat label={t("regional.mean")} value={`${n(regional.mean_wind_ms)} m/s`} />
                    <Stat label={t("regional.max")} value={`${n(regional.max_wind_ms)} m/s`} />
                    <Stat label={t("regional.windy", { threshold: regional.windy_threshold_ms })} value={String(regional.windy_days)} />
                  </dl>
                  <div className="mt-2">
                    <LineChart label={t("regional.series")} unit="m/s" height={150} series={[{ id: "ws", label: "WS2M", tone: "observed", points: wind }]} />
                  </div>
                  <p className="text-2xs text-ink-muted">{t("regional.note")}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">{t("regional.unavailable")}</p>
              )}
            </div>
          </CardBody>
          {source ? (
            <ProvenanceFooter
              items={[`${source.name} · ${source.product}`, "WS2M · T2M_MAX · RH2M", source.grid_cell, `${regional?.start} – ${regional?.end}`]}
            />
          ) : null}
        </Card>

        <Card>
          <CardHeader title={t("report.plantObs")} aside={<SourceBadge source="simulated_device" />} />
          <CardBody className="flex flex-col gap-3">
            {before && after ? (
              <p className="text-sm">
                {t("report.plantSummary", {
                  before: before.leaves_with_spots,
                  after: after.leaves_with_spots,
                  checked: after.leaves_checked,
                  tag: after.plant_tag,
                })}
              </p>
            ) : null}
            <p className="rounded-md bg-surface-2 p-3 text-xs">{t("plant.disclaimer")}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={tA("title")} aside={<SourceBadge source="simulated_device" detail="mock" />} />
        <CardBody>
          <ul className="grid list-disc gap-x-8 gap-y-1.5 pl-4 text-sm text-ink-muted md:grid-cols-2">
            {[...data.assumptions, ...(card?.assumptions ?? [])]
              .filter((code, i, all) => all.indexOf(code) === i)
              .map((code) => (
                <li key={code}>{tA.has(code as never) ? tA(code as never) : code}</li>
              ))}
          </ul>
          <p className="mt-4 rounded-md bg-surface-2 p-3 text-sm text-ink">
            {tU.has(data.uncertainty_note as never) ? tU(data.uncertainty_note as never) : data.uncertainty_note}
          </p>
        </CardBody>
        {card ? <ProvenanceFooter items={[card.method]} /> : null}
      </Card>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-2">
      <dt className="text-2xs text-ink-muted">{label}</dt>
      <dd className="font-mono text-sm font-bold">{value}</dd>
    </div>
  );
}
