"use client";

import {
  ArrowRight,
  ArrowsClockwise,
  CubeFocus,
  Drop,
  GlobeHemisphereEast,
  MapTrifold,
  Presentation,
  Printer,
  SprayBottle,
} from "@phosphor-icons/react/ssr";
import type { Field, DataSource } from "@sat2soil/contracts";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import type { Point } from "@/components/charts/chart-utils";
import { LineChart } from "@/components/charts/line-chart";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { setDemoTour } from "@/components/shell/demo-tour";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/state-panel";
import { Link, useRouter } from "@/i18n/navigation";
import { fetchRotation, fetchSprayCard, fetchTwin, fetchWaterBalance } from "@/lib/api";
import { periodSummary, seriesOf, toPoints } from "@/lib/climate";
import { fieldQuery, powerQuery } from "../field-shell";

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/** Field boundary as an SVG path in a 100 × 100 box (equirectangular, corrected for latitude). */
function outline(field: Field): string {
  const ring = field.boundary.coordinates[0];
  const cos = Math.cos((field.centroid.lat * Math.PI) / 180);
  const xs = ring.map(([lon]) => lon * cos);
  const ys = ring.map(([, lat]) => -lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const pad = (v: number, min: number, size: number) => 8 + ((v - min) / span) * 84 + (84 - (size / span) * 84) / 2;
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  return ring.map((_, i) => `${i ? "L" : "M"}${pad(xs[i], minX, w).toFixed(1)} ${pad(ys[i], minY, h).toFixed(1)}`).join(" ") + " Z";
}

/** Jury summary (Faz 9, UI_UX_DESIGN S-08, STITCH P09): one printable page, every value with its source. */
export function SummaryView({ fieldId }: { fieldId: string }) {
  const t = useTranslations("summary");
  const format = useFormatter();
  const router = useRouter();
  const field = useQuery(fieldQuery(fieldId));
  const base = `/fields/${fieldId}`;

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <PageHeader
        title={field.data ? `${field.data.name} ·` : t("title")}
        emphasis={t("emphasis")}
        description={
          <>
            {t("description")}{" "}
            <span className="font-mono text-xs">{t("date", { date: format.dateTime(new Date(), { day: "numeric", month: "long", year: "numeric" }) })}</span>
          </>
        }
        aside={
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button
              variant="primary"
              onClick={() => {
                setDemoTour(true);
                router.push(base);
              }}
            >
              <Presentation aria-hidden="true" weight="fill" />
              {t("showDemo")}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              {t("print")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-3">
        <FieldCard field={field.data} href={base} />
        <ClimateCard fieldId={fieldId} href={`${base}/climate`} />
        <WaterCard fieldId={fieldId} field={field.data} href={`${base}/planning/water`} />
        <RotationCard fieldId={fieldId} href={`${base}/planning/rotation`} />
        <TwinCard fieldId={fieldId} href={`${base}/twin`} />
        <SprayCard href={`${base}/spray`} />
      </div>

      <MethodsTable />
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  source,
  sourceDetail,
  href,
  children,
  footer,
}: {
  icon: ReactNode;
  title: string;
  source: DataSource;
  sourceDetail?: string;
  href: string;
  children: ReactNode;
  footer?: string[];
}) {
  const t = useTranslations("summary");
  return (
    <Card className="print-avoid-break flex flex-col print:shadow-none">
      <CardHeader icon={icon} title={title} aside={<SourceBadge source={source} detail={sourceDetail} />} />
      <CardBody className="flex flex-1 flex-col gap-3 pt-0">
        {children}
        <Link
          href={href}
          className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-bold text-green-700 hover:underline print:hidden"
        >
          {t("open")} <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardBody>
      {footer ? <ProvenanceFooter items={footer} /> : null}
    </Card>
  );
}

function Loading() {
  return <Skeleton className="h-28 w-full rounded-md" />;
}

function FieldCard({ field, href }: { field: Field | undefined; href: string }) {
  const t = useTranslations("summary.field");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const path = useMemo(() => (field ? outline(field) : ""), [field]);
  return (
    <SummaryCard icon={<MapTrifold weight="duotone" className="text-green-600" />} title={t("title")} source="demo_sample" href={href}>
      {field ? (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="size-28 shrink-0 rounded-md bg-surface-2" role="img" aria-label={t("outline")}>
            <path d={path} fill="rgba(75,122,34,0.22)" stroke="#4b7a22" strokeWidth={2.5} strokeLinejoin="round" />
          </svg>
          <dl className="grid gap-1.5 text-sm">
            <div>
              <dt className="sr-only">{field.name}</dt>
              <dd className="font-bold">{field.name}</dd>
            </div>
            <dd className="font-mono">{format.number(field.area_ha, { maximumFractionDigits: 2 })} ha</dd>
            <div>
              <dt className="text-2xs text-ink-muted">{t("crop")}</dt>
              <dd>{field.crop && tCrops.has(field.crop as never) ? tCrops(field.crop as never) : "—"}</dd>
            </div>
            <div>
              <dt className="text-2xs text-ink-muted">{t("centre")}</dt>
              <dd className="font-mono text-xs">
                {field.centroid.lat.toFixed(4)}°, {field.centroid.lon.toFixed(4)}°
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <Loading />
      )}
    </SummaryCard>
  );
}

function ClimateCard({ fieldId, href }: { fieldId: string; href: string }) {
  const t = useTranslations("summary.climate");
  const format = useFormatter();
  const power = useQuery(powerQuery(fieldId));
  const data = power.data;
  const charts = useMemo(() => {
    if (!data) return null;
    const rain = seriesOf(data, "PRECTOTCORR");
    const temp = seriesOf(data, "T2M");
    return { rain: toPoints(rain), temp: toPoints(temp), rainSum: periodSummary(rain).sum, tempMean: periodSummary(temp).mean };
  }, [data]);
  const n = (v: number | null, d = 0) => (v === null ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d }));
  return (
    <SummaryCard
      icon={<GlobeHemisphereEast weight="duotone" className="text-navy-600" />}
      title={t("title")}
      source={data?.source_type ?? "cached_nasa"}
      sourceDetail="POWER"
      href={href}
      footer={data ? ["PRECTOTCORR · T2M", `${data.start} – ${data.end}`, `${data.grid_cell.center_lat}, ${data.grid_cell.center_lon}`] : undefined}
    >
      {charts ? (
        <>
          <p className="flex flex-wrap gap-x-4 text-sm font-semibold">
            <span>{t("rain", { mm: n(charts.rainSum) })}</span>
            <span>{t("temp", { c: n(charts.tempMean, 1) })}</span>
          </p>
          <BarChart label={t("rainChart")} unit="mm" height={96} points={charts.rain as Point[]} />
          <LineChart
            label={t("tempChart")}
            unit="°C"
            height={96}
            series={[{ id: "t2m", label: "T2M", tone: "temperature", points: charts.temp }]}
          />
        </>
      ) : (
        <Loading />
      )}
    </SummaryCard>
  );
}

function WaterCard({ fieldId, field, href }: { fieldId: string; field: Field | undefined; href: string }) {
  const t = useTranslations("summary.water");
  const tWater = useTranslations("planning.water");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const crop = field?.crop && tCrops.has(field.crop as never) && field.crop !== "fallow" ? field.crop : "winter_wheat";
  const water = useQuery({
    queryKey: ["water", fieldId, crop, "last"],
    queryFn: () => fetchWaterBalance(fieldId, crop, "last"),
    enabled: field !== undefined,
  });
  const data = water.data;
  const chart = useMemo(() => {
    if (!data) return null;
    let rain = 0;
    let demand = 0;
    const r: Point[] = [];
    const e: Point[] = [];
    for (const d of data.days) {
      if (d.etc !== null && d.precip !== null) {
        rain += d.precip;
        demand += d.etc;
      }
      r.push({ t: day(d.date), v: rain });
      e.push({ t: day(d.date), v: demand });
    }
    return { r, e };
  }, [data]);
  const period =
    data?.sowing && data.covered_until
      ? `${format.dateTime(day(data.sowing), { month: "short", year: "numeric" })} – ${format.dateTime(day(data.covered_until), { month: "short", year: "numeric" })}`
      : "";
  return (
    <SummaryCard
      icon={<Drop weight="duotone" className="text-sky-600" />}
      title={t("title")}
      source="derived_indicator"
      sourceDetail="FAO-56"
      href={href}
      footer={data ? ["NASA POWER", "FAO-56", period] : undefined}
    >
      {!data ? (
        <Loading />
      ) : data.totals?.coverage_pct == null || !chart ? (
        <p className="text-sm text-ink-muted">{t("none")}</p>
      ) : (
        <>
          <p className="text-sm font-semibold leading-snug">
            {tWater("coverage", {
              period,
              pct: format.number(data.totals.coverage_pct, { maximumFractionDigits: 0 }),
              crop: tCrops(crop as never),
            })}
          </p>
          <LineChart
            label={tWater("chartTitle")}
            unit="mm"
            height={120}
            fractionDigits={0}
            series={[
              { id: "rain", label: tWater("rainSeries"), tone: "observed", points: chart.r },
              { id: "etc", label: "ETc", tone: "derived", points: chart.e },
            ]}
          />
        </>
      )}
    </SummaryCard>
  );
}

function RotationCard({ fieldId, href }: { fieldId: string; href: string }) {
  const t = useTranslations("summary.rotation");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const rotation = useQuery({ queryKey: ["rotation", fieldId], queryFn: () => fetchRotation(fieldId) });
  const plans = rotation.data?.plans.slice(0, 2) ?? [];
  return (
    <SummaryCard
      icon={<ArrowsClockwise weight="duotone" className="text-green-600" />}
      title={t("title")}
      source="derived_indicator"
      href={href}
    >
      {!rotation.data ? (
        <Loading />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-2xs text-ink-muted">
              <th scope="col" className="pb-2 font-semibold" />
              <th scope="col" className="pr-3 pb-2 text-right font-semibold whitespace-nowrap">{t("water")}</th>
              <th scope="col" className="pb-2 text-right font-semibold">{t("score")}</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, i) => (
              <tr key={i} className="border-t border-line align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  <span className="block text-xs font-bold">{i === 0 ? t("current") : t("suggested")}</span>
                  <span className="text-2xs text-ink-muted">{plan.crops.map((c) => tCrops(c as never)).join(" → ")}</span>
                </th>
                <td className="py-2 pr-3 text-right font-mono text-xs whitespace-nowrap">{format.number(plan.total_etc_mm, { maximumFractionDigits: 0 })} mm</td>
                <td className="py-2 text-right font-mono text-sm font-bold">{format.number(plan.score, { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SummaryCard>
  );
}

function TwinCard({ fieldId, href }: { fieldId: string; href: string }) {
  const t = useTranslations("summary.twin");
  const tTwin = useTranslations("twin");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const twin = useQuery({ queryKey: ["twin", fieldId, null, null], queryFn: () => fetchTwin(fieldId) });
  const [a, b] = twin.data?.scenarios ?? [];
  const dryA = a?.outcomes.dry?.deficit_mm;
  const dryB = b?.outcomes.dry?.deficit_mm;
  const gap = dryA !== undefined && dryB !== undefined ? dryA - dryB : null;
  const sentence =
    gap === null
      ? null
      : Math.abs(gap) < 10
        ? tTwin("headline.same", { scenario: tTwin("word.dry") })
        : tTwin(gap > 0 ? "headline.better" : "headline.worse", {
            scenario: tTwin("word.dry"),
            a: tCrops(a.crop as never),
            b: tCrops(b.crop as never),
            mm: format.number(Math.abs(gap), { maximumFractionDigits: 0 }),
          });
  return (
    <SummaryCard
      icon={<CubeFocus weight="duotone" className="text-green-700" />}
      title={t("title")}
      source="scenario_estimate"
      href={href}
      footer={twin.data ? ["NASA POWER", `${twin.data.history_start.slice(0, 4)}–${twin.data.history_end.slice(0, 4)}`, "P10 / P50 / P90"] : undefined}
    >
      {!twin.data ? <Loading /> : sentence ? <p className="text-sm font-semibold leading-snug">{sentence}</p> : <p className="text-sm text-ink-muted">{t("none")}</p>}
      {twin.data ? <p className="text-2xs text-ink-muted">{tTwin("headlineNote")}</p> : null}
    </SummaryCard>
  );
}

function SprayCard({ href }: { href: string }) {
  const t = useTranslations("summary.spray");
  const tCard = useTranslations("spray.card");
  const format = useFormatter();
  const card = useQuery({ queryKey: ["spray-card-preview", "uneven"], queryFn: () => fetchSprayCard("uneven"), staleTime: Infinity });
  return (
    <SummaryCard
      icon={<SprayBottle weight="duotone" className="text-amber-700" />}
      title={t("title")}
      source="simulated_device"
      sourceDetail="mock"
      href={href}
    >
      {!card.data ? (
        <Loading />
      ) : (
        <>
          <p className="text-sm font-semibold leading-snug">
            {t("line", {
              coverage: format.number(card.data.coverage_pct, { maximumFractionDigits: 1 }),
              density: format.number(card.data.regions_per_cm2, { maximumFractionDigits: 1 }),
              uniformity: tCard(`uniformityValue.${card.data.uniformity}`).toLowerCase(),
            })}
          </p>
          <p className="hatch-amber w-fit rounded-full border border-amber-600/50 px-3 py-1 text-2xs font-bold text-amber-700">
            {tCard("example")}
          </p>
        </>
      )}
    </SummaryCard>
  );
}

const METHOD_ROWS: { key: string; source: DataSource; detail?: string }[] = [
  { key: "climate", source: "live_nasa", detail: "POWER" },
  { key: "imagery", source: "live_nasa", detail: "GIBS" },
  { key: "water", source: "derived_indicator" },
  { key: "rotation", source: "derived_indicator" },
  { key: "twin", source: "scenario_estimate" },
  { key: "spray", source: "simulated_device" },
  { key: "boundary", source: "demo_sample" },
];

function MethodsTable() {
  const t = useTranslations("summary.methods");
  return (
    <Card className="print-avoid-break print:shadow-none">
      <CardHeader title={t("title")} />
      <CardBody className="overflow-x-auto pt-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted">
              <th scope="col" className="py-2 pr-4 font-semibold">{t("value")}</th>
              <th scope="col" className="py-2 pr-4 font-semibold">{t("source")}</th>
              <th scope="col" className="py-2 pr-4 font-semibold">{t("method")}</th>
              <th scope="col" className="py-2 font-semibold">{t("limitation")}</th>
            </tr>
          </thead>
          <tbody>
            {METHOD_ROWS.map(({ key, source, detail }) => (
              <tr key={key} className="border-t border-line align-top">
                <th scope="row" className="py-2.5 pr-4 text-left font-semibold">{t(`rows.${key}.value` as never)}</th>
                <td className="py-2.5 pr-4">
                  <SourceBadge source={source} detail={detail} />
                </td>
                <td className="py-2.5 pr-4 text-ink-muted">{t(`rows.${key}.method` as never)}</td>
                <td className="py-2.5 text-ink-muted">{t(`rows.${key}.limitation` as never)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
