"use client";

import {
  ArrowRight,
  ArrowsClockwise,
  CloudRain,
  CubeFocus,
  Drop,
  Leaf,
  SprayBottle,
  Thermometer,
  Wind,
} from "@phosphor-icons/react/ssr";
import type { PowerDaily } from "@sat2soil/contracts";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { MetricCard } from "@/components/data/metric-card";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { FieldMap, labelAnchor, type MapFocus } from "@/components/map/field-map";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/state-panel";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { relativeChange, seriesOf, toBand, toPoints, windowStat } from "@/lib/climate";
import { boundsToPolygon, powerGridCell } from "@/lib/geo";
import { cn } from "@/lib/cn";
import { fieldQuery, powerQuery } from "./field-shell";

export function FieldOverview({ fieldId }: { fieldId: string }) {
  const t = useTranslations("field");
  const tCrops = useTranslations("crops");
  const tIrrigation = useTranslations("irrigation");
  const tNav = useTranslations("nav");
  const tStates = useTranslations("states");
  const tCommon = useTranslations("common");
  const tUnits = useTranslations("units");
  const format = useFormatter();
  const field = useQuery(fieldQuery(fieldId));
  const power = useQuery({ ...powerQuery(fieldId), enabled: field.isSuccess });
  const [view, setView] = useState<"field" | "cell">("field");
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const f = field.data;
  // Stable references so the map does not refit or rebuild labels on unrelated re-renders.
  const initialFocus = useMemo<MapFocus | null>(() => (f ? { polygon: f.boundary, token: 1 } : null), [f]);
  const mapFields = useMemo(() => (f ? [{ id: f.id, boundary: f.boundary }] : []), [f]);
  const cell = f ? powerGridCell(f.centroid.lat, f.centroid.lon) : null;
  const num = (value: number, digits = 1) =>
    format.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const crop = (code: string | null) =>
    code ? ((tCrops.has(code as never) ? tCrops(code as never) : code) as string) : "—";

  const switchView = (next: "field" | "cell") => {
    setView(next);
    if (!f || !cell) return;
    setFocus({ polygon: next === "cell" ? boundsToPolygon(cell) : f.boundary, token: Date.now() });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        banner
        title={t("title")}
        emphasis={t("emphasis")}
        description={t("description")}
        aside={f ? <SourceBadge source={f.source_type} /> : null}
      />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* Map */}
        <Card>
          <CardHeader
            icon={<Leaf weight="duotone" className="text-green-600" />}
            title={t("mapTitle")}
            description={t("mapLead")}
            aside={
              <SegmentedControl
                label={t("mapTitle")}
                value={view}
                onValueChange={switchView}
                options={[
                  { value: "field", label: t("title") },
                  { value: "cell", label: "POWER" },
                ]}
              />
            }
          />
          <CardBody className="pt-4">
            {f ? (
              <FieldMap
                ariaLabel={t("mapTitle")}
                className="h-[360px]"
                fields={mapFields}
                labels={
                  view === "field"
                    ? [
                        {
                          id: f.id,
                          lngLat: labelAnchor(f.boundary),
                          title: f.name,
                          value: `${num(f.area_ha, 2)} ha`,
                        },
                      ]
                    : []
                }
                gridCellFor={view === "cell" ? f.centroid : null}
                focus={focus ?? initialFocus}
              />
            ) : (
              <Skeleton className="h-[360px] w-full rounded-xl" />
            )}
            {view === "cell" ? <p className="mt-3 text-xs text-ink-muted">{t("gridCaption")}</p> : null}
          </CardBody>
        </Card>

        {/* Field details */}
        <Card>
          <CardHeader
            icon={<CubeFocus weight="duotone" className="text-navy-700" />}
            title={t("infoTitle")}
            aside={f ? <SourceBadge source={f.source_type} /> : null}
          />
          <CardBody>
            {f ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                <Detail label={t("area")} value={`${num(f.area_ha, 2)} ha`} sub={`${num(f.area_donum, 1)} ${tUnits("donum")}`} />
                <Detail label={t("perimeter")} value={`${num(f.perimeter_m, 0)} m`} />
                <Detail
                  label={t("centre")}
                  value={`${num(f.centroid.lat, 4)}°, ${num(f.centroid.lon, 4)}°`}
                  sub={cell ? `POWER ${num(cell.centerLat, 3)}°, ${num(cell.centerLon, 3)}°` : undefined}
                />
                <Detail label={t("crop")} value={crop(f.crop)} />
                <Detail
                  label={t("irrigation")}
                  value={f.irrigation_type ? tIrrigation(f.irrigation_type) : "—"}
                />
                <div className="col-span-2">
                  <dt className="text-xs font-semibold text-ink-muted">{t("history")}</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {f.rotation_history.length ? (
                      f.rotation_history.map((season) => (
                        <span key={season.season_year} className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs">
                          <span className="font-mono text-ink-muted">{season.season_year}</span>{" "}
                          <span className="font-bold text-ink">{crop(season.crop)}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-ink-muted">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <ClimateSection power={power.data} error={power.error} loading={power.isPending} retry={() => power.refetch()} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card className="border-dashed">
          <CardHeader
            icon={<Leaf weight="duotone" className="text-ink-muted" />}
            title={t("ndviTitle")}
            aside={<span className="rounded-full bg-surface-2 px-2.5 py-1 text-2xs font-bold text-ink-muted">{tCommon("soon")}</span>}
          />
          <CardBody>
            <p className="text-sm leading-relaxed text-ink-muted">{t("ndviBody")}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("nextTitle")} />
          <CardBody>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["water", "/planning/water", Drop, "text-sky-600"],
                  ["rotation", "/planning/rotation", ArrowsClockwise, "text-green-600"],
                  ["twin", "/twin", CubeFocus, "text-navy-700"],
                  ["spray", "/spray", SprayBottle, "text-green-700"],
                ] as const
              ).map(([key, path, ItemIcon, tone]) => (
                <li key={key}>
                  <Link
                    href={`/fields/${fieldId}${path}`}
                    className="flex items-center gap-3 rounded-lg border border-line px-3 py-3 transition-colors hover:bg-surface-2"
                  >
                    <ItemIcon aria-hidden="true" weight="duotone" className={cn("size-6 shrink-0", tone)} />
                    <span className="flex-1 text-sm font-bold">{tNav(key)}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-bold text-ink-muted">
                      {tCommon("soon")}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {power.error && !(power.error instanceof ApiError) ? <Banner variant="error" title={tStates("errorTitle")} /> : null}
    </div>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-1 truncate font-mono text-base font-bold text-ink">{value}</dd>
      {sub ? <dd className="truncate font-mono text-2xs text-ink-muted">{sub}</dd> : null}
    </div>
  );
}

function ClimateSection({
  power,
  error,
  loading,
  retry,
}: {
  power: PowerDaily | undefined;
  error: Error | null;
  loading: boolean;
  retry: () => void;
}) {
  const t = useTranslations("field");
  const tStates = useTranslations("states");
  const tUi = useTranslations("ui");
  const tUnits = useTranslations("units");
  const format = useFormatter();

  const derived = useMemo(() => {
    if (!power) return null;
    const rain = seriesOf(power, "PRECTOTCORR");
    const temp = seriesOf(power, "T2M");
    return {
      rain,
      temp,
      rainStat: windowStat(rain, "sum"),
      tempStat: windowStat(temp, "mean"),
      rhStat: windowStat(seriesOf(power, "RH2M"), "mean"),
      windStat: windowStat(seriesOf(power, "WS2M"), "mean"),
      tempPoints: toPoints(temp),
      tempBand: toBand(seriesOf(power, "T2M_MIN"), seriesOf(power, "T2M_MAX")),
      rainPoints: toPoints(rain),
    };
  }, [power]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }
  if (error || !power || !derived) {
    const unreachable = error instanceof ApiError && (error.status === 0 || error.code === "network");
    return (
      <Banner
        variant="error"
        title={unreachable ? tStates("apiErrorTitle") : tStates("errorTitle")}
        action={
          <Button size="sm" onClick={retry}>
            {tUi("retry")}
          </Button>
        }
      >
        {unreachable ? tStates("apiErrorBody") : tStates("errorBody")}
      </Banner>
    );
  }

  const fetched = new Date(power.provenance.fetched_at);
  const fetchedText = format.dateTime(fetched, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const latest = derived.temp?.latest_available;
  const latestText = latest ? format.dateTime(new Date(`${latest}T12:00:00Z`), { day: "numeric", month: "long", year: "numeric" }) : "—";
  const cellText = `${format.number(power.grid_cell.center_lat, { maximumFractionDigits: 3 })}°, ${format.number(power.grid_cell.center_lon, { maximumFractionDigits: 3 })}°`;
  const source = power.source_type;
  const detail = source === "live_nasa" ? "POWER" : fetchedText;

  /**
   * Change against the previous 30 days. Percent only for precipitation (a ratio scale);
   * temperature and humidity show absolute differences, since "−30 %" of a Celsius value is
   * meaningless. Chips stay neutral: a change in climate is information, not a verdict.
   */
  const trend = (value: number | null, previous: number | null, mode: "percent" | "absolute", unit = "") => {
    const change = mode === "percent" ? relativeChange(value, previous) : value !== null && previous !== null ? value - previous : null;
    if (change === null) return null;
    const up = change >= 0;
    const magnitude = format.number(Math.abs(change), { maximumFractionDigits: 1 });
    const delta = `${up ? "+" : "−"}${magnitude}${mode === "percent" ? "%" : ` ${unit}`}`;
    return (
      <span
        title={t("metrics.vsPrevious", { delta })}
        className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-2xs font-bold text-ink-muted"
      >
        <span aria-hidden="true">{up ? "↗" : "↘"} </span>
        {delta}
        <span className="sr-only"> · {t("metrics.vsPrevious", { delta })}</span>
      </span>
    );
  };

  const period = (stat: { from: string; to: string; missing: number }) => {
    if (!stat.from || !stat.to) return "";
    const range = `${format.dateTime(new Date(`${stat.from}T12:00:00Z`), { day: "numeric", month: "short" })} – ${format.dateTime(new Date(`${stat.to}T12:00:00Z`), { day: "numeric", month: "short" })}`;
    return stat.missing > 0 ? `${range} · ${t("metrics.missingDays", { count: stat.missing })}` : range;
  };

  const method = (
    <div className="space-y-2">
      <p>
        {power.provenance.product} · {power.provenance.upstream_sources.join(", ")} · {power.provenance.time_standard} ·{" "}
        {format.number(power.provenance.elevation_m, { maximumFractionDigits: 0 })} m
      </p>
      <p>{t("gridCaption")}</p>
      <p>{t("notPublished")}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {power.provenance.stale ? (
        <Banner variant="cached" title={tStates("cachedTitle")}>
          {tStates("cachedBody", { time: fetchedText })}
        </Banner>
      ) : null}

      <RevealGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem>
          <MetricCard
            icon={<CloudRain weight="duotone" className="text-sky-600" />}
            label={t("metrics.rain")}
            note={t("metrics.rainNote")}
            value={derived.rainStat.value}
            fractionDigits={1}
            unit="mm"
            source={source}
            sourceDetail={detail}
            trend={trend(derived.rainStat.value, derived.rainStat.previous, "percent")}
            provenance={["PRECTOTCORR", "mm", period(derived.rainStat)]}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            icon={<Thermometer weight="duotone" className="text-orange-500" />}
            label={t("metrics.temp")}
            note={t("metrics.tempNote")}
            value={derived.tempStat.value}
            fractionDigits={1}
            unit="°C"
            source={source}
            sourceDetail={detail}
            trend={trend(derived.tempStat.value, derived.tempStat.previous, "absolute", "°C")}
            provenance={["T2M", "°C", period(derived.tempStat)]}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            icon={<Drop weight="duotone" className="text-sky-600" />}
            label={t("metrics.humidity")}
            note={t("metrics.humidityNote")}
            value={derived.rhStat.value}
            fractionDigits={0}
            unit="%"
            source={source}
            sourceDetail={detail}
            trend={trend(derived.rhStat.value, derived.rhStat.previous, "absolute", tUnits("pp"))}
            provenance={["RH2M", "%", period(derived.rhStat)]}
          />
        </RevealItem>
        <RevealItem>
          <MetricCard
            icon={<Wind weight="duotone" className="text-navy-600" />}
            label={t("metrics.wind")}
            note={t("metrics.windNote")}
            value={derived.windStat.value}
            fractionDigits={1}
            unit="m/s"
            source={source}
            sourceDetail={detail}
            provenance={["WS2M", "m/s", period(derived.windStat)]}
          />
        </RevealItem>
      </RevealGroup>

      <Card>
        <CardHeader
          icon={<Thermometer weight="duotone" className="text-orange-500" />}
          title={t("climateTitle")}
          description={`${t("climateLead")} ${t("latest", { date: latestText })}`}
          aside={<SourceBadge source={source} detail={detail} />}
        />
        <CardBody className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-bold">{t("tempChart")}</p>
            <LineChart
              label={t("tempChart")}
              unit="°C"
              series={[{ id: "t2m", label: t("mean"), tone: "temperature", points: derived.tempPoints, band: derived.tempBand }]}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-bold">{t("rainChart")}</p>
            <BarChart
              label={t("rainChart")}
              unit={tUnits("mmPerDay")}
              points={derived.rainPoints}
              cumulative={{ label: t("cumulative"), unit: "mm" }}
            />
          </div>
        </CardBody>
        <ProvenanceFooter
          items={[
            "NASA POWER",
            "T2M · T2M_MIN · T2M_MAX · PRECTOTCORR",
            "daily",
            `grid ${power.grid_cell.resolution}`,
            cellText,
            `${power.start} – ${power.end}`,
            fetchedText,
          ]}
          method={method}
        />
      </Card>
    </div>
  );
}
