"use client";

import { ArrowCounterClockwise, Drop, MapTrifold, Plant, Scales } from "@phosphor-icons/react/ssr";
import {
  CROP_CODES,
  TWIN_RAIN_SCENARIOS,
  type Field as FieldRecord,
  type Twin,
  type TwinRainScenario,
  type TwinScenario,
} from "@sat2soil/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import type { BandPoint, Point } from "@/components/charts/chart-utils";
import { LineChart } from "@/components/charts/line-chart";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { FieldMap } from "@/components/map/field-map";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/state-panel";
import { ApiError, fetchTwin } from "@/lib/api";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";
import { fieldQuery } from "../field-shell";

const TWIN_CROPS = CROP_CODES.filter((c) => c !== "fallow");
const PERCENTILE = { dry: "p10", normal: "p50", wet: "p90" } as const;
const date = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** Balance colour: deficit amber → neutral → surplus blue. One colour for the whole field. */
const balanceColor = (limit: number) =>
  scaleLinear<string>().domain([-limit, 0, limit]).range(["#b66a28", "#f3efe8", "#2f6db5"]).clamp(true);

/** Digital twin (Faz 6, UI_UX_DESIGN S-06, D-026): observed season so far vs replayed past seasons. */
export function TwinView({ fieldId }: { fieldId: string }) {
  const t = useTranslations("twin");
  const tCrops = useTranslations("crops");
  const tStates = useTranslations("states");
  const tUi = useTranslations("ui");
  const field = useQuery(fieldQuery(fieldId));
  const [crops, setCrops] = useState<{ a?: string; b?: string }>({});
  const [rain, setRain] = useState<TwinRainScenario>("normal");
  const twin = useQuery({
    queryKey: ["twin", fieldId, crops.a ?? null, crops.b ?? null],
    queryFn: () => fetchTwin(fieldId, crops),
    enabled: field.isSuccess,
    placeholderData: keepPreviousData,
  });
  const data = twin.data;
  const custom = crops.a !== undefined || crops.b !== undefined;

  const cropSelect = (key: "a" | "b", scenario: TwinScenario | undefined) => (
    <div className="w-56">
      <Field
        label={`${key === "a" ? t("scenarioA") : t("scenarioB")} · ${scenario ? t(`plan.${scenario.plan}`) : ""}`}
        htmlFor={`twin-crop-${key}`}
      >
        <Select
          id={`twin-crop-${key}`}
          value={scenario?.crop ?? ""}
          disabled={!scenario}
          onChange={(event) => {
            // Only the edited side becomes "your choice"; the other keeps its plan crop.
            const value = event.target.value;
            setCrops((previous) => ({ ...previous, [key]: value }));
          }}
        >
          {TWIN_CROPS.map((code) => (
            <option key={code} value={code}>
              {tCrops(code)}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader banner title={t("title")} emphasis={t("emphasis")} description={t("description")} />

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-4">
          {cropSelect("a", data?.scenarios[0])}
          {cropSelect("b", data?.scenarios[1])}
          {custom ? (
            <Button variant="outline" size="sm" onClick={() => setCrops({})}>
              <ArrowCounterClockwise aria-hidden="true" />
              {t("reset")}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">{t("rain.label")}</span>
          <SegmentedControl
            label={t("rain.label")}
            value={rain}
            onValueChange={setRain}
            options={TWIN_RAIN_SCENARIOS.map((value) => ({ value, label: t(`rain.${value}`) }))}
          />
          {data ? (
            <span className="font-mono text-2xs text-ink-muted">
              {t("rainCaption", {
                start: data.history_start.slice(0, 4),
                end: data.history_end.slice(0, 4),
                count: Math.max(...data.scenarios.map((s) => s.analog_count)),
              })}
            </span>
          ) : null}
        </div>
      </div>

      {twin.isPending ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-[460px] rounded-lg" />
          <Skeleton className="h-[460px] rounded-lg" />
        </div>
      ) : twin.isError || !data ? (
        <Banner
          variant="error"
          title={twin.error instanceof ApiError && twin.error.status === 0 ? tStates("apiErrorTitle") : tStates("errorTitle")}
          action={
            <Button size="sm" onClick={() => twin.refetch()}>
              {tUi("retry")}
            </Button>
          }
        />
      ) : (
        <TwinBody data={data} field={field.data} rain={rain} fetching={twin.isFetching} />
      )}
    </div>
  );
}

function TwinBody({
  data,
  field,
  rain,
  fetching,
}: {
  data: Twin;
  field: FieldRecord | undefined;
  rain: TwinRainScenario;
  fetching: boolean;
}) {
  const t = useTranslations("twin");
  const tCrops = useTranslations("crops");
  const tA = useTranslations("planning.assumptions");
  const tU = useTranslations("planning.uncertainty");
  const format = useFormatter();
  const n = (v: number | null | undefined, d = 0) =>
    v === null || v === undefined ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const day = (iso: string) => format.dateTime(date(iso), { day: "numeric", month: "short", year: "numeric" });
  const crop = (code: string) => (tCrops.has(code as never) ? tCrops(code as never) : code);

  const [a, b] = data.scenarios;
  const [focusKey, setFocusKey] = useState<"a" | "b">("b");
  const focus = (focusKey === "a" ? a : b) ?? a;
  const word = t(`word.${rain}`);
  const source = data.data_sources[0];
  const fetched = format.dateTime(new Date(source.fetched_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const deficitA = a?.outcomes[rain]?.deficit_mm;
  const deficitB = b?.outcomes[rain]?.deficit_mm;
  const gap = deficitA !== undefined && deficitB !== undefined ? deficitA - deficitB : null;
  const headline =
    gap === null
      ? null
      : Math.abs(gap) < 10
        ? t("headline.same", { scenario: word })
        : t(gap > 0 ? "headline.better" : "headline.worse", {
            scenario: word,
            a: crop(a.crop),
            b: crop(b.crop),
            mm: n(Math.abs(gap)),
          });

  return (
    <div className={cn("flex flex-col gap-6 transition-opacity", fetching && "opacity-70")}>
      {headline ? (
        <Card className="border-dashed border-green-600/50 bg-green-50/60">
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-lg font-bold leading-snug text-ink">{headline}</p>
              <p className="mt-2 text-sm text-ink-muted">{t("headlineNote")}</p>
            </div>
            <SourceBadge source="scenario_estimate" />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <MapTimeline
          key={`${focus.key}-${focus.crop}`}
          scenario={focus}
          field={field}
          rain={rain}
          focusKey={focusKey}
          onFocus={setFocusKey}
          labels={{ a: `A · ${crop(a.crop)}`, b: `B · ${crop(b.crop)}` }}
          observedSource={data.observed_source_type}
        />
        <ComparisonTable a={a} b={b} rain={rain} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BalanceChart scenario={focus} rain={rain} title={`${focus.key.toUpperCase()} · ${crop(focus.crop)}`} />
        <Card>
          <CardHeader
            icon={<Plant weight="duotone" className="text-green-600" />}
            title={t("demandChart")}
            description={t("demandChartLead")}
            aside={<SourceBadge source="scenario_estimate" />}
          />
          <CardBody>
            <LineChart
              label={t("demandChart")}
              unit="mm"
              height={260}
              fractionDigits={0}
              series={data.scenarios
                .filter((s) => s.status === "ok")
                .map((s) => ({
                  id: s.key,
                  label: `${s.key.toUpperCase()} · ${crop(s.crop)}`,
                  tone: s.key === "a" ? ("scenario-alt" as const) : ("scenario" as const),
                  points: s.days.map((d) => ({ t: date(d.date), v: d.etc_cum_mm })),
                }))}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title={tA("title")} aside={<SourceBadge source="scenario_estimate" />} />
          <CardBody>
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink-muted">
              {data.assumptions.map((code) => (
                <li key={code}>{tA.has(code as never) ? tA(code as never) : code}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-surface-2 p-3 text-sm text-ink">
              {tU.has(data.uncertainty_note as never) ? tU(data.uncertainty_note as never) : data.uncertainty_note}
            </p>
          </CardBody>
          <ProvenanceFooter
            items={[`${source.name} · ${source.product}`, source.grid_cell, `${data.history_start} – ${data.history_end}`, fetched]}
            method={
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>{t("steps.s1", { start: data.history_start.slice(0, 4) })}</li>
                <li>{t("steps.s2")}</li>
                <li>{t("steps.s3")}</li>
                <li>{t("steps.s4")}</li>
              </ol>
            }
          />
        </Card>
        <Card>
          <CardHeader
            title={t("snapshotTitle")}
            aside={field?.is_sample ? <SourceBadge source="demo_sample" /> : null}
          />
          <CardBody>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-ink-muted">{t("snapshot.field")}</dt>
              <dd className="font-semibold">{field?.name ?? "—"}</dd>
              <dt className="text-ink-muted">{t("snapshot.area")}</dt>
              <dd className="font-mono">{field ? `${n(field.area_ha, 2)} ha` : "—"}</dd>
              <dt className="text-ink-muted">{t("snapshot.history")}</dt>
              <dd>
                {field?.rotation_history?.length
                  ? [...field.rotation_history]
                      .sort((x, y) => x.season_year - y.season_year)
                      .map((s) => `${s.season_year} ${crop(s.crop)}`)
                      .join(" · ")
                  : "—"}
              </dd>
              <dt className="text-ink-muted">{t("snapshot.sync")}</dt>
              <dd className="flex flex-wrap items-center gap-2 font-mono">
                {day(data.latest_observed)}
                <SourceBadge source={data.observed_source_type} detail="POWER" />
              </dd>
              <dt className="text-ink-muted">{t("snapshot.cell")}</dt>
              <dd className="font-mono">{source.grid_cell}</dd>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MapTimeline({
  scenario,
  field,
  rain,
  focusKey,
  onFocus,
  labels,
  observedSource,
}: {
  observedSource: Twin["observed_source_type"];
  scenario: TwinScenario;
  field: FieldRecord | undefined;
  rain: TwinRainScenario;
  focusKey: "a" | "b";
  onFocus: (key: "a" | "b") => void;
  labels: { a: string; b: string };
}) {
  const t = useTranslations("twin");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const day = (iso: string) => format.dateTime(date(iso), { day: "numeric", month: "short", year: "numeric" });
  const days = scenario.days;
  const lastObserved = days.findLastIndex((d) => d.observed);
  const [index, setIndex] = useState(() => (lastObserved >= 0 ? lastObserved : 0));
  const current = days[Math.min(index, days.length - 1)];
  const key = PERCENTILE[rain];
  const value = current ? (current.observed ? current.balance_mm : current[key]) : null;

  const limit = useMemo(() => {
    let max = 50;
    for (const d of days) for (const v of [d.balance_mm, d.p10, d.p90]) if (v !== null) max = Math.max(max, Math.abs(v));
    return Math.ceil(max / 50) * 50;
  }, [days]);
  const color = value === null ? null : balanceColor(limit)(value);
  const todayPct = lastObserved >= 0 && days.length > 1 ? (100 * lastObserved) / (days.length - 1) : null;
  const crop = tCrops.has(scenario.crop as never) ? tCrops(scenario.crop as never) : scenario.crop;

  return (
    <Card>
      <CardHeader
        icon={<MapTrifold weight="duotone" className="text-navy-600" />}
        title={t("mapTitle")}
        description={
          scenario.in_season && scenario.sowing && scenario.observed_until
            ? t("inSeason", { date: day(scenario.sowing), until: day(scenario.observed_until) })
            : scenario.sowing
              ? t("upcoming", { date: day(scenario.sowing) })
              : null
        }
        aside={
          <SegmentedControl
            label={t("focus")}
            value={focusKey}
            onValueChange={onFocus}
            options={[
              { value: "a", label: labels.a },
              { value: "b", label: labels.b },
            ]}
          />
        }
      />
      {scenario.status !== "ok" || !current ? (
        <CardBody>
          <Banner variant="info" title={t("noHistory", { crop })} />
        </CardBody>
      ) : (
        <>
          <div className="relative mx-6 h-[300px] overflow-hidden rounded-lg">
            {field ? (
              <FieldMap
                ariaLabel={t("mapTitle")}
                className="h-full w-full"
                fields={[{ id: field.id, boundary: field.boundary }]}
                focus={{ polygon: field.boundary, token: 1 }}
                fillColor={color}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
          <div className="mx-6 mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn("size-9 rounded-md border", current.observed ? "border-line" : "border-dashed border-green-600")}
                style={{ backgroundColor: color ?? undefined }}
              />
              <div>
                <p className="text-2xs text-ink-muted">{t("balanceOn", { date: day(current.date) })}</p>
                <p className="font-mono text-lg leading-tight font-bold">
                  {value === null ? "—" : `${value > 0 ? "+" : ""}${format.number(value, { maximumFractionDigits: 0 })} mm`}
                </p>
              </div>
              <SourceBadge
                source={current.observed ? observedSource : "scenario_estimate"}
                detail={current.observed ? "POWER" : t(`rain.${rain}`)}
              />
            </div>
            <div className="w-44">
              <div className="h-2 rounded-full bg-linear-to-r from-amber-600 via-surface-2 to-sky-600" />
              <div className="mt-1 flex justify-between font-mono text-2xs text-ink-muted">
                <span>−{limit}</span>
                <span>0</span>
                <span>+{limit} mm</span>
              </div>
              <div className="flex justify-between text-2xs text-ink-muted">
                <span>{t("legendDeficit")}</span>
                <span>{t("legendSurplus")}</span>
              </div>
            </div>
          </div>
          <p className="mx-6 mt-2 text-2xs text-ink-muted">{t("mapNote")}</p>

          <CardBody className="pt-4">
            <label htmlFor="twin-timeline" className="sr-only">
              {t("timeline")}
            </label>
            <div className="relative pt-6">
              {todayPct !== null ? (
                <>
                  <span
                    className="absolute top-0 left-0 rounded-sm bg-sky-200/60 px-1.5 text-2xs font-semibold text-navy-800"
                    style={{ width: `${todayPct}%`, minWidth: "fit-content" }}
                  >
                    {t("observedPart")}
                  </span>
                  <span
                    className="absolute top-0 right-0 rounded-sm border border-dashed border-green-600/60 px-1.5 text-right text-2xs font-semibold text-green-800"
                    style={{ width: `${100 - todayPct}%`, minWidth: "fit-content" }}
                  >
                    {t("scenarioPart")}
                  </span>
                </>
              ) : (
                <span className="absolute top-0 right-0 left-0 rounded-sm border border-dashed border-green-600/60 px-1.5 text-2xs font-semibold text-green-800">
                  {t("scenarioPart")}
                </span>
              )}
              <input
                id="twin-timeline"
                type="range"
                min={0}
                max={days.length - 1}
                value={index}
                onChange={(event) => setIndex(Number(event.target.value))}
                aria-valuetext={day(current.date)}
                className="h-2 w-full cursor-pointer accent-navy-800"
              />
              {todayPct !== null ? (
                <motion.span
                  layout
                  transition={transition.fast}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-5 h-5 w-px bg-navy-900"
                  style={{ left: `${todayPct}%` }}
                />
              ) : null}
            </div>
            <div className="mt-1 flex justify-between font-mono text-2xs text-ink-muted">
              <span>{day(days[0].date)}</span>
              {lastObserved >= 0 ? <span>{t("today", { date: day(days[lastObserved].date) })}</span> : null}
              <span>{day(days[days.length - 1].date)}</span>
            </div>
          </CardBody>
        </>
      )}
    </Card>
  );
}

function ComparisonTable({ a, b, rain }: { a: TwinScenario; b: TwinScenario; rain: TwinRainScenario }) {
  const t = useTranslations("twin");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const n = (v: number | null | undefined, d = 0) =>
    v === null || v === undefined ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const signed = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : "±"}${n(Math.abs(v))}`);
  const month = (iso: string | null) => (iso ? format.dateTime(date(iso), { month: "short", year: "numeric" }) : "—");
  const crop = (code: string) => (tCrops.has(code as never) ? tCrops(code as never) : code);
  const oa = a.outcomes[rain];
  const ob = b.outcomes[rain];
  const diff = (x?: number | null, y?: number | null) => (x === null || x === undefined || y === null || y === undefined ? null : y - x);

  const rows: { label: string; icon?: ReactNode; a: string; b: string; d: string; emphasis?: boolean }[] = [
    { label: t("rows.season"), a: `${month(a.sowing)} – ${month(a.harvest)}`, b: `${month(b.sowing)} – ${month(b.harvest)}`, d: "" },
    {
      label: t("rows.demand"),
      icon: <Plant aria-hidden="true" className="text-green-600" />,
      a: `${n(oa?.etc_mm)} mm`,
      b: `${n(ob?.etc_mm)} mm`,
      d: signed(diff(oa?.etc_mm, ob?.etc_mm)),
    },
    {
      label: t("rows.rain"),
      icon: <Drop aria-hidden="true" className="text-sky-600" />,
      a: `${n(oa?.precip_mm)} mm`,
      b: `${n(ob?.precip_mm)} mm`,
      d: signed(diff(oa?.precip_mm, ob?.precip_mm)),
    },
    {
      label: t("rows.deficit"),
      icon: <Scales aria-hidden="true" className="text-amber-700" />,
      a: `${n(oa?.deficit_mm)} mm`,
      b: `${n(ob?.deficit_mm)} mm`,
      d: signed(diff(oa?.deficit_mm, ob?.deficit_mm)),
      emphasis: true,
    },
    {
      label: t("rows.coverage"),
      a: `${n(oa?.coverage_pct)}%`,
      b: `${n(ob?.coverage_pct)}%`,
      d: "",
    },
    {
      label: t("rows.dryDeficit"),
      a: `${n(a.outcomes.dry?.deficit_mm)} mm`,
      b: `${n(b.outcomes.dry?.deficit_mm)} mm`,
      d: signed(diff(a.outcomes.dry?.deficit_mm, b.outcomes.dry?.deficit_mm)),
    },
    {
      label: t("rows.analog"),
      a: oa ? t("analogSeason", { year: oa.sowing_year }) : "—",
      b: ob ? t("analogSeason", { year: ob.sowing_year }) : "—",
      d: "",
    },
  ];

  return (
    <Card>
      <CardHeader
        title={t("tableTitle")}
        description={t("tableLead", { scenario: t(`rain.${rain}`) })}
        aside={<SourceBadge source="scenario_estimate" />}
      />
      <CardBody className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-2xs font-semibold text-ink-muted">
              <th scope="col" className="pb-3" />
              <th scope="col" className="pb-3">
                <span className="block text-xs text-ink">A · {crop(a.crop)}</span>
                {t(`plan.${a.plan}`)}
              </th>
              <th scope="col" className="pb-3">
                <span className="block text-xs text-green-800">B · {crop(b.crop)}</span>
                {t(`plan.${b.plan}`)}
              </th>
              <th scope="col" className="pb-3 text-right">
                {t("diff")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={cn("border-t border-line", row.emphasis && "bg-surface-2/60")}>
                <th scope="row" className="py-2.5 pr-3 text-left font-semibold">
                  <span className="flex items-center gap-2 [&_svg]:size-4">
                    {row.icon}
                    {row.label}
                  </span>
                </th>
                <td className="py-2.5 pr-3 font-mono text-xs">{row.a}</td>
                <td className="py-2.5 pr-3 font-mono text-xs">{row.b}</td>
                <td className="py-2.5 text-right font-mono text-xs font-bold">{row.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

function BalanceChart({ scenario, rain, title }: { scenario: TwinScenario; rain: TwinRainScenario; title: string }) {
  const t = useTranslations("twin");
  const format = useFormatter();
  const key = PERCENTILE[rain];
  const { observed, projected, band, marker } = useMemo(() => {
    const observed: Point[] = [];
    const projected: Point[] = [];
    const band: BandPoint[] = [];
    for (const d of scenario.days) {
      const at = date(d.date);
      observed.push({ t: at, v: d.observed ? d.balance_mm : null });
      projected.push({ t: at, v: d[key] });
      band.push({ t: at, lo: d.p10, hi: d.p90 });
    }
    const last = scenario.observed_until;
    return { observed, projected, band, marker: last ? date(last) : null };
  }, [scenario, key]);

  return (
    <Card>
      <CardHeader
        icon={<Scales weight="duotone" className="text-sky-600" />}
        title={`${t("balanceChart")} · ${title}`}
        description={t("balanceChartLead")}
        aside={<SourceBadge source="scenario_estimate" />}
      />
      <CardBody>
        <LineChart
          label={t("balanceChart")}
          unit="mm"
          height={260}
          fractionDigits={0}
          markers={
            marker
              ? [{ t: marker, label: format.dateTime(marker, { day: "numeric", month: "short" }) }]
              : []
          }
          series={[
            ...(scenario.in_season ? [{ id: "observed", label: t("observedSeries"), tone: "observed" as const, points: observed }] : []),
            { id: "scenario", label: t(`rain.${rain}`), tone: "scenario" as const, points: projected, band },
          ]}
        />
      </CardBody>
    </Card>
  );
}
