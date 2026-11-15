"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  CloudRain,
  DownloadSimple,
  Drop,
  Leaf,
  Mountains,
  Sun,
  Thermometer,
  Wind,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { PowerDaily } from "@sat2soil/contracts";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { FieldMap } from "@/components/map/field-map";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/state-panel";
import { ApiError, fetchFieldPower } from "@/lib/api";
import { periodSummary, seriesOf, toBand, toCsv, toPoints } from "@/lib/climate";
import { boundsToPolygon, powerGridCell } from "@/lib/geo";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";
import { fieldQuery } from "../field-shell";

type Range = "d90" | "d365" | "d1095";
const RANGE_DAYS: Record<Range, number> = { d90: 90, d365: 365, d1095: 1095 };

type SourceKey = "power" | "gpm" | "smap" | "landsat" | "ecostress" | "srtm";
const SOURCES: { key: SourceKey; name: string; icon: Icon; tone: string }[] = [
  { key: "power", name: "POWER", icon: Sun, tone: "text-orange-500" },
  { key: "gpm", name: "GPM / IMERG", icon: CloudRain, tone: "text-sky-600" },
  { key: "smap", name: "SMAP", icon: Drop, tone: "text-sky-600" },
  { key: "landsat", name: "Landsat", icon: Leaf, tone: "text-green-600" },
  { key: "ecostress", name: "ECOSTRESS", icon: Thermometer, tone: "text-red-700" },
  { key: "srtm", name: "SRTM", icon: Mountains, tone: "text-amber-700" },
];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** NASA data center (Faz 4, UI_UX_DESIGN S-04, approved design P04 without unconnected sources). */
export function ClimateCenter({ fieldId }: { fieldId: string }) {
  const t = useTranslations("climate");
  const tLanding = useTranslations("landing");
  const tStates = useTranslations("states");
  const [range, setRange] = useState<Range>("d365");
  const [source, setSource] = useState<SourceKey>("power");
  const field = useQuery(fieldQuery(fieldId));
  const start = isoDaysAgo(RANGE_DAYS[range] - 1);
  const power = useQuery({
    queryKey: ["power", fieldId, range],
    queryFn: () => fetchFieldPower(fieldId, { start }),
    enabled: field.isSuccess,
  });

  const unreachable = power.error instanceof ApiError && power.error.status === 0;

  const download = () => {
    if (!power.data) return;
    const blob = new Blob([toCsv(power.data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `sat2soil-nasa-power-${power.data.start}_${power.data.end}.csv`,
    });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader banner title={t("title")} emphasis={t("emphasis")} description={t("description")} />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-ink">{t("range")}</span>
          <SegmentedControl
            label={t("range")}
            value={range}
            onValueChange={setRange}
            options={(Object.keys(RANGE_DAYS) as Range[]).map((value) => ({ value, label: t(`ranges.${value}`) }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="md" onClick={download} disabled={!power.data}>
            <DownloadSimple aria-hidden="true" />
            {t("download")}
          </Button>
          <Button variant="primary" size="md" onClick={() => power.refetch()} disabled={power.isFetching}>
            <ArrowClockwise aria-hidden="true" className={cn(power.isFetching && "motion-safe:animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      <nav aria-label={t("sourcesLabel")} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {SOURCES.map(({ key, name, icon: SourceIcon, tone }) => {
          const live = key === "power";
          const active = key === source;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setSource(key)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                active ? "border-green-600 bg-green-50 shadow-card" : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <SourceIcon aria-hidden="true" weight="duotone" className={cn("size-7 shrink-0", tone)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-ink">{name}</span>
                <span
                  className={cn(
                    "mt-0.5 inline-block rounded-full px-2 py-0.5 text-2xs font-bold",
                    live ? "bg-green-600 text-white" : "bg-surface-2 text-ink-muted",
                  )}
                >
                  {live ? tLanding("status.live") : tLanding("status.planned")}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={source}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={transition.normal}
        >
          {source === "power" ? (
            power.isPending || field.isPending ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-72 rounded-lg" />
                <Skeleton className="h-72 rounded-lg" />
              </div>
            ) : power.isError || !power.data || !field.data ? (
              <Banner
                variant="error"
                title={unreachable ? tStates("apiErrorTitle") : tStates("errorTitle")}
                action={
                  <Button size="sm" onClick={() => power.refetch()}>
                    {t("refresh")}
                  </Button>
                }
              >
                {unreachable ? tStates("apiErrorBody") : tStates("errorBody")}
              </Banner>
            ) : (
              <PowerPanel data={power.data} centroid={field.data.centroid} fieldName={field.data.name} />
            )
          ) : (
            <PlannedSource source={source} name={SOURCES.find((s) => s.key === source)?.name ?? ""} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PowerPanel({
  data,
  centroid,
  fieldName,
}: {
  data: PowerDaily;
  centroid: { lat: number; lon: number };
  fieldName: string;
}) {
  const t = useTranslations("climate");
  const tStates = useTranslations("states");
  const tUnits = useTranslations("units");
  const tField = useTranslations("field");
  const format = useFormatter();

  const view = useMemo(() => {
    const rain = seriesOf(data, "PRECTOTCORR");
    const temp = seriesOf(data, "T2M");
    return {
      rain: periodSummary(rain),
      temp: periodSummary(temp),
      tmax: periodSummary(seriesOf(data, "T2M_MAX")),
      tmin: periodSummary(seriesOf(data, "T2M_MIN")),
      tempPoints: toPoints(temp),
      tempBand: toBand(seriesOf(data, "T2M_MIN"), seriesOf(data, "T2M_MAX")),
      rainPoints: toPoints(rain),
      humidity: toPoints(seriesOf(data, "RH2M")),
      wind: toPoints(seriesOf(data, "WS2M")),
      solar: toPoints(seriesOf(data, "ALLSKY_SFC_SW_DWN")),
      latest: temp?.latest_available ?? null,
    };
  }, [data]);

  const cell = powerGridCell(centroid.lat, centroid.lon);
  const cellFocus = useMemo(() => ({ polygon: boundsToPolygon(cell), token: 1 }), [cell.centerLat, cell.centerLon]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = (value: number | null | undefined, digits = 1) =>
    value === null || value === undefined
      ? "—"
      : format.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const day = (iso: string) => format.dateTime(new Date(`${iso}T12:00:00Z`), { day: "numeric", month: "short", year: "numeric" });
  const fetched = format.dateTime(new Date(data.provenance.fetched_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const detail = data.source_type === "live_nasa" ? "POWER" : fetched;
  const solarSeries = seriesOf(data, "ALLSKY_SFC_SW_DWN");
  const footer = (parameter: string, unit: string) => [
    "NASA POWER",
    parameter,
    unit,
    t("daily"),
    `${day(data.start)} – ${day(data.end)}`,
    fetched,
  ];

  return (
    <div className="flex flex-col gap-6">
      {data.provenance.stale ? (
        <Banner variant="cached" title={tStates("cachedTitle")}>
          {tStates("cachedBody", { time: fetched })}
        </Banner>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-4 shadow-card md:grid-cols-5">
        <Summary icon={<CloudRain weight="duotone" className="text-sky-600" />} label={t("summary.rain")} value={`${n(view.rain.sum)} mm`} />
        <Summary icon={<Thermometer weight="duotone" className="text-orange-500" />} label={t("summary.temp")} value={`${n(view.temp.mean)} °C`} />
        <Summary
          label={t("summary.max")}
          value={`${n(view.tmax.max?.value)} °C`}
          sub={view.tmax.max ? day(view.tmax.max.date) : undefined}
        />
        <Summary
          label={t("summary.min")}
          value={`${n(view.tmin.min?.value)} °C`}
          sub={view.tmin.min ? day(view.tmin.min.date) : undefined}
        />
        <Summary label={t("summary.gaps")} value={String(view.temp.missing)} sub={view.latest ? tField("latest", { date: day(view.latest) }) : undefined} />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <ChartCard title={t("charts.temp")} icon={<Thermometer weight="duotone" className="text-orange-500" />} detail={detail} source={data.source_type} footer={footer("T2M · T2M_MIN · T2M_MAX", "°C")}>
            <LineChart
              label={t("charts.temp")}
              unit="°C"
              series={[{ id: "t2m", label: tField("mean"), tone: "temperature", points: view.tempPoints, band: view.tempBand }]}
            />
          </ChartCard>
          <ChartCard title={t("charts.rain")} icon={<CloudRain weight="duotone" className="text-sky-600" />} detail={detail} source={data.source_type} footer={footer("PRECTOTCORR", tUnits("mmPerDay"))}>
            <BarChart
              label={t("charts.rain")}
              unit={tUnits("mmPerDay")}
              points={view.rainPoints}
              cumulative={{ label: tField("cumulative"), unit: "mm" }}
            />
          </ChartCard>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title={t("charts.humidity")} icon={<Drop weight="duotone" className="text-sky-600" />} detail={detail} source={data.source_type} footer={footer("RH2M", "%")}>
              <LineChart label={t("charts.humidity")} unit="%" height={200} fractionDigits={0} series={[{ id: "rh", label: "RH2M", tone: "observed", points: view.humidity }]} />
            </ChartCard>
            <ChartCard title={t("charts.wind")} icon={<Wind weight="duotone" className="text-navy-600" />} detail={detail} source={data.source_type} footer={footer("WS2M", "m/s")}>
              <LineChart label={t("charts.wind")} unit="m/s" height={200} series={[{ id: "ws", label: "WS2M", tone: "reference", points: view.wind }]} />
            </ChartCard>
          </div>
          <ChartCard
            title={t("charts.solar")}
            icon={<Sun weight="duotone" className="text-orange-500" />}
            detail={detail}
            source={data.source_type}
            footer={[...footer("ALLSKY_SFC_SW_DWN", "MJ/m²/day"), solarSeries?.spatial_resolution ?? ""]}
          >
            <LineChart label={t("charts.solar")} unit="MJ/m²" height={200} series={[{ id: "sw", label: "SW↓", tone: "temperature", points: view.solar }]} />
          </ChartCard>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title={t("cellTitle")} icon={<Mountains weight="duotone" className="text-navy-700" />} />
            <CardBody>
              <FieldMap
                ariaLabel={t("cellTitle")}
                className="h-72"
                gridCellFor={centroid}
                focus={cellFocus}
                labels={[{ id: "centre", lngLat: [centroid.lon, centroid.lat], title: fieldName }]}
              />
              <p className="mt-3 text-sm text-ink-muted">{t("cellBody")}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("aboutTitle")} aside={<SourceBadge source={data.source_type} detail={detail} />} />
            <CardBody>
              <dl className="divide-y divide-line text-sm">
                <About label={t("about.source")} value="NASA POWER (Langley Research Center)" />
                <About label={t("about.product")} value={`${data.provenance.product} · community ${data.provenance.community}`} />
                <About label={t("about.inputs")} value={data.provenance.upstream_sources.join(", ")} />
                <About label={t("about.temporal")} value={`${t("daily")} · ${data.provenance.time_standard}`} />
                <About label={t("about.spatial")} value={data.grid_cell.resolution} />
                <About label={t("about.solar")} value={solarSeries?.spatial_resolution ?? "—"} />
                <About label={t("about.centre")} value={`${n(data.grid_cell.center_lat, 3)}°, ${n(data.grid_cell.center_lon, 3)}°`} />
                <About label={t("about.elevation")} value={`${n(data.provenance.elevation_m, 0)} m`} />
                <About label={t("about.period")} value={`${day(data.start)} – ${day(data.end)}`} />
                <About label={t("about.latest")} value={view.latest ? day(view.latest) : "—"} />
                <About label={t("about.fetched")} value={fetched} />
              </dl>
              <a
                href={data.provenance.provenance_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
              >
                {t("about.request")}
                <ArrowSquareOut aria-hidden="true" className="size-4" />
              </a>
              <p className="mt-4 text-xs leading-relaxed text-ink-muted">{tField("notPublished")}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon,
  detail,
  source,
  footer,
  children,
}: {
  title: string;
  icon: ReactNode;
  detail: string;
  source: PowerDaily["source_type"];
  footer: string[];
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} icon={icon} aside={<SourceBadge source={source} detail={detail} />} />
      <CardBody>{children}</CardBody>
      <ProvenanceFooter items={footer.filter(Boolean)} />
    </Card>
  );
}

function Summary({ icon, label, value, sub }: { icon?: ReactNode; label: string; value: string; sub?: string }) {
  return (
    // One <div> per dt/dd group: the only wrapper a <dl> allows (axe definition-list / dlitem).
    <div className="min-w-0 rounded-lg px-2 py-2">
      <dt className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
        {icon ? <span aria-hidden="true" className="shrink-0 [&_svg]:size-5">{icon}</span> : null}
        {label}
      </dt>
      <dd className="font-mono text-lg font-bold text-ink tabular">{value}</dd>
      {sub ? <dd className="truncate font-mono text-2xs text-ink-muted">{sub}</dd> : null}
    </div>
  );
}

function About({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-mono text-xs text-ink">{value}</dd>
    </div>
  );
}

function PlannedSource({ source, name }: { source: Exclude<SourceKey, "power">; name: string }) {
  const t = useTranslations("climate");
  return (
    <Card className="border-dashed">
      <CardHeader
        title={t("plannedTitle", { name })}
        aside={<SourceBadge source="unavailable" />}
        description={t("plannedBody")}
      />
      <CardBody>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["measures", "resolution", "revisit", "use"] as const).map((key) => (
            <div key={key} className="rounded-lg bg-surface-2 p-4">
              <dt className="text-xs font-semibold text-ink-muted">{t(`spec.${key}`)}</dt>
              <dd className="mt-1 text-sm font-bold text-ink">{t(`planned.${source}.${key}`)}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}
