"use client";

import {
  Bluetooth,
  Camera,
  ChartBar,
  CheckCircle,
  CloudRain,
  Cpu,
  Drop,
  FileText,
  GlobeHemisphereEast,
  Leaf,
  Lightbulb,
  Lightning,
  MapPin,
  Play,
  Plant,
  Question,
  Scan,
  Stack,
  Target,
  ThermometerSimple,
  Thermometer,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import {
  SPRAY_CARD_VARIANTS,
  type AgriSpray,
  type CheckStatus,
  type Field,
  type SprayCard,
  type SprayCardVariant,
} from "@sat2soil/contracts";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { FieldMap, type MapPoint } from "@/components/map/field-map";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/state-panel";
import { Tabs } from "@/components/ui/tabs";
import { ApiError, fetchAgriSpray, fetchSprayCard } from "@/lib/api";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";
import deviceImage from "../../../../../../../public/images/agrispray-device.webp";
import { fieldQuery } from "../field-shell";

const SCAN_MS = 1100; // ≤ 1.2 s (MOTION_STORYBOARD M17)
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/**
 * AgriSpray (Faz 7 → D-030): the team's physical prototype in front, every device value still
 * simulated (`simulated_device`, `mock`). Layout follows the user's design; the parts that would
 * break the honesty rules (NASA logo, AI analysis, dose advice, efficacy) are adapted, see D-030.
 */
export function AgriSprayView({ fieldId }: { fieldId: string }) {
  const t = useTranslations("spray");
  const tStates = useTranslations("states");
  const tUi = useTranslations("ui");
  const field = useQuery(fieldQuery(fieldId));
  const data = useQuery({ queryKey: ["agrispray", fieldId], queryFn: () => fetchAgriSpray(fieldId) });

  // The card analysis feeds the scan, the summary and the details, so it lives here.
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
    <div className="flex flex-col gap-6 pb-8">
      <Hero />
      <Banner variant="simulated" title={t("bannerTitle")}>
        {t("bannerBody")}
      </Banner>

      {data.isPending ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
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
          <div className="grid gap-6 xl:grid-cols-3">
            <PointsCard data={data.data} field={field.data} />
            <ScanCard
              variant={variant}
              onVariant={setVariant}
              result={analysed}
              running={card.isFetching}
              error={card.isError}
              onRun={() => setRun({ variant, token: Date.now() })}
            />
            <ReadingsCard data={data.data} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
            <NasaCard data={data.data} />
            <SummaryBlock data={data.data} card={analysed} />
          </div>
          <Details data={data.data} card={analysed} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  const t = useTranslations("spray");
  const features: { icon: Icon; label: string }[] = [
    { icon: Target, label: t("hero.f1") },
    { icon: Stack, label: t("hero.f2") },
    { icon: Leaf, label: t("hero.f3") },
  ];
  const steps: { icon: Icon; text: string; planned?: boolean }[] = [
    { icon: MapPin, text: t("how.s1") },
    { icon: Bluetooth, text: t("how.s2"), planned: true },
    { icon: GlobeHemisphereEast, text: t("how.s3") },
    { icon: ChartBar, text: t("how.s4") },
  ];

  return (
    <section
      aria-labelledby="agrispray-title"
      className="relative overflow-hidden rounded-xl border border-line bg-linear-to-br from-green-50 via-surface to-surface p-6 shadow-card sm:p-8"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_auto_1fr] 2xl:grid-cols-[1.25fr_auto_1fr_1.15fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
            <Leaf aria-hidden="true" weight="fill" className="size-4" />
            {t("hero.module")}
          </p>
          <h1 id="agrispray-title" className="mt-4 text-2xl leading-tight font-extrabold tracking-tight text-ink sm:text-[2.6rem]">
            {t("hero.title")} <em className="text-green-700">{t("hero.emphasis")}</em>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">{t("hero.lead")}</p>
          <ul className="mt-6 grid max-w-xl grid-cols-3 gap-3 border-t border-line pt-5">
            {features.map(({ icon: FeatureIcon, label }) => (
              <li key={label} className="flex flex-col gap-2 text-sm font-semibold text-ink">
                <FeatureIcon aria-hidden="true" weight="duotone" className="size-7 text-green-600" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center">
          <Image
            src={deviceImage}
            alt={t("device.alt")}
            priority
            sizes="160px"
            className="h-72 w-auto drop-shadow-[0_24px_24px_rgba(15,27,45,0.22)] sm:h-80"
          />
        </div>

        <div>
          <p className="inline-flex rounded-full border border-orange-500/40 bg-orange-200/40 px-3 py-1 text-xs font-bold text-amber-700">
            {t("device.chip")}
          </p>
          <h2 className="mt-3 text-xl font-extrabold text-ink">{t("device.title")}</h2>
          <p className="mt-2 font-mono text-xs font-semibold text-ink">{t("device.spec")}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("device.body")}</p>
          <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs font-semibold text-amber-700">
            <span aria-hidden="true" className="size-2 rounded-full bg-amber-600" />
            {t("device.status")}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 lg:col-span-3 2xl:col-span-1">
          <h2 className="text-base font-extrabold text-ink">{t("how.title")}</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {steps.map(({ icon: StepIcon, text, planned }, i) => (
              <li key={text} className="grid grid-cols-[1.75rem_2rem_1fr] items-start gap-2 text-sm">
                <span className="grid size-7 place-items-center rounded-full bg-green-600 text-xs font-bold text-white">{i + 1}</span>
                <StepIcon aria-hidden="true" weight="duotone" className="mt-0.5 size-6 text-green-700" />
                <span className="text-ink">
                  {text}
                  {planned ? (
                    <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-bold text-ink-muted">{t("how.planned")}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ row 1 */

function PointsCard({ data, field }: { data: AgriSpray; field: Field | undefined }) {
  const t = useTranslations("spray.points");
  const format = useFormatter();
  const points: MapPoint[] = useMemo(
    () => data.points.map((p) => ({ id: p.code, lngLat: [p.lon, p.lat], label: p.code })),
    [data.points],
  );
  const focus = useMemo(() => (field ? { polygon: field.boundary, token: 1 } : null), [field]);
  const fields = useMemo(() => (field ? [{ id: field.id, boundary: field.boundary }] : []), [field]);
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<MapPin weight="duotone" className="text-green-600" />}
        title={t("title")}
        aside={<SourceBadge source="simulated_device" />}
      />
      <CardBody className="flex flex-1 flex-col gap-3 pt-0">
        <div className="h-60 overflow-hidden rounded-lg">
          {field ? (
            <FieldMap ariaLabel={t("title")} className="h-full w-full" fields={fields} focus={focus} points={points} />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <span aria-hidden="true" className="size-3 rounded-full border-2 border-white bg-orange-500 shadow" />
          {t("legend", { count: data.points.length, area: field ? format.number(field.area_ha, { maximumFractionDigits: 1 }) : "—" })}
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-2xs text-ink-muted sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {data.points.map((p) => (
            <li key={p.code}>
              <span className="font-bold text-ink">{p.code}</span> · {t("moisture", { value: format.number(p.soil_moisture_pct, { maximumFractionDigits: 1 }) })}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function ScanCard({
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
  const t = useTranslations("spray");
  const tStates = useTranslations("states");
  const [showMask, setShowMask] = useState(false);
  // The synthetic card is shown before analysis too (same cached endpoint).
  const preview = useQuery({ queryKey: ["spray-card-preview", variant], queryFn: () => fetchSprayCard(variant), staleTime: Infinity });
  const card = result ?? preview.data;
  const cardMm = card?.card_mm ?? [76, 26];

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<Scan weight="duotone" className="text-green-600" />}
        title={t("scan.title")}
        aside={<SourceBadge source="simulated_device" />}
      />
      <CardBody className="flex flex-1 flex-col gap-3 pt-0">
        <SegmentedControl
          label={t("card.variantLabel")}
          value={variant}
          onValueChange={(v) => {
            setShowMask(false);
            onVariant(v);
          }}
          options={SPRAY_CARD_VARIANTS.map((v) => ({ value: v, label: t(`card.variants.${v}`) }))}
        />
        <figure>
          <figcaption className="mb-1.5 text-xs font-semibold text-ink-muted">{t("scan.before")}</figcaption>
          <div className="overflow-hidden rounded-md border border-line">
            <CardImage width={cardMm[0]} height={cardMm[1]} stains={[]} />
          </div>
        </figure>
        <figure>
          <figcaption className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-ink-muted">
            {t("scan.after")}
            {result ? (
              <button type="button" onClick={() => setShowMask((v) => !v)} className="font-bold text-green-700 hover:underline">
                {showMask ? t("scan.showCard") : t("scan.showMask")}
              </button>
            ) : null}
          </figcaption>
          <div className="relative overflow-hidden rounded-md border border-line bg-navy-900">
            {card ? (
              result && showMask ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.mask_png} alt={t("card.mask")} className="block aspect-[76/26] w-full [image-rendering:pixelated]" />
              ) : (
                <CardImage width={cardMm[0]} height={cardMm[1]} stains={card.stains} />
              )
            ) : (
              <Skeleton className="aspect-[76/26] w-full" />
            )}
            <ScanLine active={running} />
          </div>
        </figure>
        {error ? <p className="text-xs text-red-700">{tStates("errorTitle")}</p> : null}
        <Button onClick={onRun} disabled={running} className="mt-auto">
          <Play aria-hidden="true" weight="fill" />
          {running ? t("card.running") : result ? t("card.rerun") : t("card.run")}
        </Button>
      </CardBody>
    </Card>
  );
}

function ReadingsCard({ data }: { data: AgriSpray }) {
  const t = useTranslations("spray");
  const format = useFormatter();
  const now = data.device.readings;
  const before = data.device.previous;
  const tiles: { key: string; icon: Icon; tone: string; value: number | null; previous: number | null; unit: string; digits: number }[] = [
    { key: "soil_moisture", icon: Drop, tone: "text-sky-600", value: now.soil_moisture_pct, previous: before.soil_moisture_pct, unit: "%", digits: 1 },
    { key: "soil_temp", icon: ThermometerSimple, tone: "text-orange-500", value: now.soil_temp_c, previous: before.soil_temp_c, unit: "°C", digits: 1 },
    { key: "soil_ec", icon: Lightning, tone: "text-green-600", value: now.soil_ec_ds_m, previous: before.soil_ec_ds_m, unit: "dS/m", digits: 2 },
    { key: "air_rh", icon: Drop, tone: "text-sky-600", value: now.air_rh_pct, previous: before.air_rh_pct, unit: "%", digits: 0 },
  ];
  const stamp = `${data.device.device_id} · ${format.dateTime(new Date(data.device.recorded_at), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<Cpu weight="duotone" className="text-amber-700" />}
        title={t("readings.title")}
        aside={<SourceBadge source="simulated_device" />}
      />
      <CardBody className="flex flex-1 flex-col gap-3 pt-0">
        <ul className="grid grid-cols-2 gap-3">
          {tiles.map(({ key, icon: TileIcon, tone, value, previous, unit, digits }) => {
            const delta = value !== null && previous !== null ? value - previous : null;
            const shown = delta === null ? null : Number(delta.toFixed(digits));
            return (
              <li key={key} className="hatch-amber flex flex-col gap-1.5 rounded-lg border border-amber-600/25 p-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <TileIcon aria-hidden="true" weight="duotone" className={cn("size-5", tone)} />
                  {t(`sensors.${key}` as never)}
                </span>
                <span className="font-mono text-lg font-bold whitespace-nowrap">
                  {value === null ? "—" : `${format.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`}
                </span>
                {/* Change chips are neutral: a rise is not "good" or "bad" by itself (D-020). */}
                <span className="w-fit rounded-full bg-surface px-2 py-0.5 font-mono text-2xs text-ink-muted">
                  {shown === null || shown === 0
                    ? t("readings.noChange")
                    : `${shown > 0 ? "+" : "−"}${format.number(Math.abs(shown), { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${unit}`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto font-mono text-2xs text-ink-muted">
          {stamp} · {t("readings.change")}
        </p>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ row 2 */

function NasaCard({ data }: { data: AgriSpray }) {
  const t = useTranslations("spray.nasa");
  const tRegional = useTranslations("spray.regional");
  const tStatus = useTranslations("landing.status");
  const format = useFormatter();
  const regional = data.regional;
  const source = data.data_sources[0];
  const stats = useMemo(() => {
    if (!regional) return null;
    const pick = (key: "precip_mm" | "rh_pct" | "wind_ms") =>
      regional.days.map((d) => d[key]).filter((v): v is number => v !== null);
    const rain = pick("precip_mm");
    const rh = pick("rh_pct");
    const wind = pick("wind_ms");
    const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
    return {
      rain: rain.length ? rain.reduce((a, b) => a + b, 0) : null,
      rh: mean(rh),
      wind: mean(wind),
      points: regional.days.map((d) => ({ t: day(d.date), v: d.wind_ms })),
    };
  }, [regional]);
  const n = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d }));

  const planned: { key: "gpm" | "smap"; name: string; icon: Icon }[] = [
    { key: "gpm", name: "GPM IMERG", icon: CloudRain },
    { key: "smap", name: "SMAP", icon: Stack },
  ];
  return (
    <Card className="flex flex-col">
      <CardHeader icon={<GlobeHemisphereEast weight="duotone" className="text-navy-600" />} title={t("title")} description={t("lead")} />
      <CardBody className="flex flex-col gap-3 pt-0">
        <div className="rounded-lg border border-navy-200 bg-navy-50/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-extrabold text-navy-900">
              NASA POWER <span className="font-semibold text-ink-muted">· {t("power")}</span>
            </p>
            {regional ? <SourceBadge source={regional.source_type} detail="POWER" /> : <SourceBadge source="unavailable" />}
          </div>
          {stats ? (
            <>
              <p className="mt-2 text-sm text-ink">{t("powerBody", { rain: n(stats.rain), rh: n(stats.rh), wind: n(stats.wind, 1) })}</p>
              <div className="mt-2">
                <LineChart label={tRegional("series")} unit="m/s" height={120} series={[{ id: "ws", label: "WS2M", tone: "observed", points: stats.points }]} />
              </div>
              <p className="text-2xs text-ink-muted">{tRegional("note")}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">{tRegional("unavailable")}</p>
          )}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {planned.map(({ key, name, icon: SourceIcon }) => (
            <li key={key} className="rounded-lg border border-line p-3">
              <p className="flex items-center justify-between gap-2 text-sm font-extrabold">
                <span className="flex items-center gap-2">
                  <SourceIcon aria-hidden="true" weight="duotone" className="size-5 text-sky-600" />
                  {name}
                </span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-bold text-ink-muted">{tStatus("planned")}</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                <span className="font-semibold text-ink">{t(key)}</span> · {t(`${key}Body`)}
              </p>
            </li>
          ))}
        </ul>
      </CardBody>
      {source && regional ? (
        <ProvenanceFooter items={[`${source.name} · ${source.product}`, "WS2M · RH2M · PRECTOTCORR", source.grid_cell, `${regional.start} – ${regional.end}`]} />
      ) : null}
    </Card>
  );
}

const STATUS: Record<CheckStatus, { icon: Icon; className: string }> = {
  within: { icon: CheckCircle, className: "bg-green-100 text-green-800" },
  caution: { icon: WarningCircle, className: "bg-amber-50 text-amber-700" },
  outside: { icon: XCircle, className: "bg-red-50 text-red-700" },
  unknown: { icon: Question, className: "bg-surface-2 text-ink-muted" },
};

function SummaryBlock({ data, card }: { data: AgriSpray; card: SprayCard | undefined }) {
  const t = useTranslations("spray");
  const format = useFormatter();
  const n = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d }));
  const deltaT = data.checks.find((c) => c.code === "delta_t");
  const [before, after] = data.plant_log;
  const advice = !card
    ? null
    : card.coverage_pct < 10
      ? t("summary.adviceLow")
      : card.denser_side
        ? t("summary.adviceSide", { side: t(`summary.${card.denser_side}`) })
        : t("summary.adviceEven");

  const columns: { icon: Icon; tone: string; title: string; body: ReactNode }[] = [
    {
      icon: Target,
      tone: "text-green-600",
      title: t("summary.coverage"),
      body: card ? (
        t("summary.coverageValue", { pct: n(card.coverage_pct), density: n(card.regions_per_cm2) })
      ) : (
        <span className="text-ink-muted">{t("summary.coverageEmpty")}</span>
      ),
    },
    {
      icon: Thermometer,
      tone: "text-orange-500",
      title: t("summary.environment"),
      body: (
        <>
          {t("summary.environmentValue", {
            dt: n(deltaT?.value),
            temp: n(data.device.readings.air_temp_c),
            rh: n(data.device.readings.air_rh_pct, 0),
          })}
          {deltaT ? (
            <span className={cn("mt-2 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold", STATUS[deltaT.status].className)}>
              {t(`checks.status.${deltaT.status}`)}
            </span>
          ) : null}
        </>
      ),
    },
    {
      icon: Plant,
      tone: "text-green-700",
      title: t("summary.plant"),
      body:
        before && after
          ? t("summary.plantValue", { before: before.leaves_with_spots, after: after.leaves_with_spots, checked: after.leaves_checked })
          : "—",
    },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader icon={<FileText weight="duotone" className="text-green-600" />} title={t("summary.title")} aside={<SourceBadge source="simulated_device" />} />
      <CardBody className="grid flex-1 gap-4 pt-0 md:grid-cols-[1fr_1fr_1fr_1.25fr]">
        {columns.map(({ icon: ColumnIcon, tone, title, body }) => (
          <div key={title} className="flex flex-col gap-2 border-line md:border-r md:pr-4">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <ColumnIcon aria-hidden="true" weight="duotone" className={cn("size-6", tone)} />
              {title}
            </p>
            <div className="text-sm text-ink">{body}</div>
          </div>
        ))}
        <div className="flex flex-col gap-2 rounded-lg bg-orange-200/30 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold">
            <Lightbulb aria-hidden="true" weight="duotone" className="size-6 text-amber-700" />
            {t("summary.advice")}
          </p>
          <p className="text-sm text-ink">{advice ?? <span className="text-ink-muted">{t("summary.coverageEmpty")}</span>}</p>
          <p className="mt-auto text-2xs text-ink-muted">{t("summary.adviceNote")}</p>
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ details */

function Details({ data, card }: { data: AgriSpray; card: SprayCard | undefined }) {
  const t = useTranslations("spray");
  const tA = useTranslations("planning.assumptions");
  const tU = useTranslations("planning.uncertainty");
  return (
    <section aria-labelledby="spray-details" className="flex flex-col gap-4">
      <h2 id="spray-details" className="text-lg font-bold">
        {t("details.title")}
      </h2>
      <Card>
        <CardBody>
          <Tabs
            label={t("tabs.label")}
            defaultValue="card"
            items={[
              { value: "card", label: t("tabs.card"), content: <CardDetails card={card} /> },
              { value: "soil", label: t("tabs.soil"), content: <SoilPanel data={data} /> },
              { value: "plant", label: t("tabs.plant"), content: <PlantPanel data={data} /> },
            ]}
          />
        </CardBody>
      </Card>
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

function CardDetails({ card }: { card: SprayCard | undefined }) {
  const t = useTranslations("spray.card");
  const tSummary = useTranslations("spray.summary");
  const format = useFormatter();
  const n = (v: number, d = 1) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  if (!card) return <p className="pt-5 text-sm text-ink-muted">{tSummary("coverageEmpty")}</p>;
  return (
    <div className="grid gap-4 pt-5 lg:grid-cols-[1fr_1fr_1.2fr]">
      <dl className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <Metric label={t("coverage")} value={`${n(card.coverage_pct)} %`} />
        <Metric label={t("density")} value={n(card.regions_per_cm2)} />
        <Metric
          label={t("uniformity")}
          value={`${t(`uniformityValue.${card.uniformity}`)}${card.denser_side ? ` · ${t(`denser.${card.denser_side}`)}` : ""}`}
          note={`${t("cv", { cv: n(card.uniformity_cv_pct) })} · ${t("halves", { left: n(card.left_coverage_pct), right: n(card.right_coverage_pct) })}`}
        />
      </dl>
      <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <p className="text-xs font-semibold text-ink-muted">{t("zonesTitle")}</p>
        <Zones zones={card.zone_coverage} />
        <p className="text-2xs text-ink-muted">{t("merging", { generated: card.generated_stains, regions: card.regions })}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <p className="text-xs font-semibold text-ink-muted">{t("histTitle")}</p>
        <Histogram bins={card.histogram} />
        <p className="text-2xs text-ink-muted">{t("histNote")}</p>
      </div>
      <p className="rounded-md bg-surface-2 p-3 text-xs text-ink lg:col-span-3">{t("guidance")}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

/** A water-sensitive paper card drawn to scale from its stain list (mm units). */
function CardImage({ width, height, stains }: { width: number; height: number; stains: SprayCard["stains"] }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block aspect-[76/26] w-full" role="img" aria-label="Water-sensitive paper">
      <rect width={width} height={height} fill="#f2d43c" />
      <g fill="#1d4fae" fillOpacity={0.88}>
        {stains.map((s, i) => (
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
  const moisture = useMemo(() => data.device.history.map((p) => ({ t: new Date(p.at), v: p.soil_moisture_pct })), [data.device.history]);
  const temperature = useMemo(() => data.device.history.map((p) => ({ t: new Date(p.at), v: p.soil_temp_c })), [data.device.history]);
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
                {t(o.stage, { date: format.dateTime(day(o.date), { day: "numeric", month: "short" }) })} · {t("plantTag", { tag: o.plant_tag })}
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
