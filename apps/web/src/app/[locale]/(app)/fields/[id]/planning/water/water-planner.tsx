"use client";

import { CloudRain, Drop, Plant, Scales, Sun } from "@phosphor-icons/react/ssr";
import { CROP_CODES, type WaterBalance } from "@sat2soil/contracts";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { Point } from "@/components/charts/chart-utils";
import { LineChart } from "@/components/charts/line-chart";
import { MetricCard } from "@/components/data/metric-card";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/state-panel";
import { ApiError, fetchWaterBalance } from "@/lib/api";
import { fieldQuery } from "../../field-shell";
import { PlanningTabs } from "../planning-tabs";

const WATER_CROPS = CROP_CODES.filter((c) => c !== "fallow");
const date = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** Water management (Faz 5, UI_UX_DESIGN S-05, ANALYSIS_AI §1). Derived indicator, not a prescription. */
export function WaterPlanner({ fieldId }: { fieldId: string }) {
  const t = useTranslations("planning.water");
  const tCrops = useTranslations("crops");
  const tStates = useTranslations("states");
  const tUi = useTranslations("ui");
  const field = useQuery(fieldQuery(fieldId));
  const defaultCrop = field.data?.crop && (WATER_CROPS as readonly string[]).includes(field.data.crop) ? field.data.crop : "winter_wheat";
  const [cropChoice, setCrop] = useState<string | null>(null);
  const [season, setSeason] = useState<"last" | "current">("last");
  const crop = cropChoice ?? defaultCrop;

  const balance = useQuery({
    queryKey: ["water", fieldId, crop, season],
    queryFn: () => fetchWaterBalance(fieldId, crop, season),
    enabled: field.isSuccess,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader banner title={t("title")} emphasis={t("emphasis")} description={t("description")} />

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
        <PlanningTabs fieldId={fieldId} active="water" />
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-52">
            <Field label={t("crop")} htmlFor="water-crop">
              <Select id="water-crop" value={crop} onChange={(event) => setCrop(event.target.value)}>
                {WATER_CROPS.map((code) => (
                  <option key={code} value={code}>
                    {tCrops(code)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <SegmentedControl
            label={t("season")}
            value={season}
            onValueChange={setSeason}
            options={[
              { value: "last", label: t("seasons.last") },
              { value: "current", label: t("seasons.current") },
            ]}
          />
        </div>
      </div>

      {balance.isPending ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : balance.isError || !balance.data ? (
        <Banner
          variant="error"
          title={balance.error instanceof ApiError && balance.error.status === 0 ? tStates("apiErrorTitle") : tStates("errorTitle")}
          action={
            <Button size="sm" onClick={() => balance.refetch()}>
              {tUi("retry")}
            </Button>
          }
        />
      ) : (
        <WaterResult data={balance.data} cropLabel={tCrops(crop as (typeof WATER_CROPS)[number])} />
      )}
    </div>
  );
}

function WaterResult({ data, cropLabel }: { data: WaterBalance; cropLabel: string }) {
  const t = useTranslations("planning.water");
  const tA = useTranslations("planning.assumptions");
  const tU = useTranslations("planning.uncertainty");
  const tField = useTranslations("field");
  const format = useFormatter();
  const n = (v: number, d = 0) => format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d });
  const day = (iso: string) => format.dateTime(date(iso), { day: "numeric", month: "short", year: "numeric" });

  const chart = useMemo(() => {
    let rain = 0;
    let demand = 0;
    const rainPoints: Point[] = [];
    const etcPoints: Point[] = [];
    const kcPoints: Point[] = [];
    for (const d of data.days) {
      if (d.etc !== null && d.precip !== null) {
        rain += d.precip;
        demand += d.etc;
      }
      rainPoints.push({ t: date(d.date), v: rain });
      etcPoints.push({ t: date(d.date), v: demand });
      kcPoints.push({ t: date(d.date), v: d.kc });
    }
    return { rainPoints, etcPoints, kcPoints };
  }, [data]);

  if (data.status === "season_not_active" || !data.totals || !data.sowing) {
    const sowing = new Date(Date.UTC(2026, data.crop_params.sowing_month - 1, data.crop_params.sowing_day));
    return (
      <Banner variant="info" title={t("notActive", { crop: cropLabel, date: format.dateTime(sowing, { day: "numeric", month: "long" }) })} />
    );
  }

  const totals = data.totals;
  const source = data.data_sources[0];
  const fetched = format.dateTime(new Date(source.fetched_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const period = `${day(data.sowing)} – ${day(data.covered_until ?? data.sowing)}`;
  const [ini, dev, mid, late] = data.crop_params.stages;
  const provenance = [`NASA POWER · ${source.product}`, `${source.grid_cell}`, "FAO-56", fetched];

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-green-200 bg-green-50/60">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-lg font-bold leading-snug text-ink">
              {totals.coverage_pct === null
                ? "—"
                : t("coverage", { period, pct: n(totals.coverage_pct), crop: cropLabel })}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              {totals.deficit_mm < 0 ? t("surplus", { mm: n(-totals.deficit_mm) }) : t("shortfall", { mm: n(totals.deficit_mm) })}{" "}
              <strong className="font-semibold text-ink">{t("notPrescription")}</strong>
            </p>
          </div>
          <SourceBadge source="derived_indicator" detail="FAO-56" />
        </div>
      </Card>

      <RevealGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem>
          <MetricCard icon={<CloudRain weight="duotone" className="text-sky-600" />} label={t("metrics.rain")} note={t("metrics.rainNote")} value={totals.precip_mm} unit="mm" source={source.source_type} sourceDetail="POWER" provenance={["PRECTOTCORR", period]} />
        </RevealItem>
        <RevealItem>
          <MetricCard icon={<Sun weight="duotone" className="text-orange-500" />} label={t("metrics.et0")} note={t("metrics.et0Note")} value={totals.et0_mm} unit="mm" source="derived_indicator" provenance={["T2M_MAX/MIN · RH2M · WS2M · ALLSKY", period]} />
        </RevealItem>
        <RevealItem>
          <MetricCard icon={<Plant weight="duotone" className="text-green-600" />} label={t("metrics.etc")} note={t("metrics.etcNote")} value={totals.etc_mm} unit="mm" source="derived_indicator" provenance={[`Kc ${data.crop_params.kc_ini}–${data.crop_params.kc_mid}–${data.crop_params.kc_end}`, period]} />
        </RevealItem>
        <RevealItem>
          <MetricCard icon={<Scales weight="duotone" className="text-amber-700" />} label={t("metrics.deficit")} note={t("metrics.deficitNote")} value={totals.deficit_mm} unit="mm" source="derived_indicator" provenance={data.missing_days ? [period, tField("metrics.missingDays", { count: data.missing_days })] : [period]} />
        </RevealItem>
      </RevealGroup>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            icon={<Drop weight="duotone" className="text-sky-600" />}
            title={t("chartTitle")}
            description={t("period", { sowing: day(data.sowing), harvest: day(data.harvest ?? data.sowing), until: day(data.covered_until ?? data.sowing) })}
            aside={<SourceBadge source="derived_indicator" />}
          />
          <CardBody>
            <LineChart
              label={t("chartTitle")}
              unit="mm"
              height={300}
              fractionDigits={0}
              series={[
                { id: "rain", label: t("rainSeries"), tone: "observed", points: chart.rainPoints },
                { id: "etc", label: t("etcSeries"), tone: "derived", points: chart.etcPoints },
              ]}
            />
          </CardBody>
          <ProvenanceFooter
            items={provenance}
            method={
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>{t("steps.s1")}</li>
                <li>{t("steps.s2")}</li>
                <li>{t("steps.s3")}</li>
                <li>{t("steps.s4")}</li>
              </ol>
            }
          />
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title={t("kcTitle")} description={t("stages", { ini, dev, mid, late })} />
            <CardBody>
              <LineChart
                label={t("kcTitle")}
                unit="Kc"
                height={180}
                fractionDigits={2}
                yDomain={[0, 1.4]}
                series={[{ id: "kc", label: "Kc", tone: "reference", points: chart.kcPoints }]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tA("title")} />
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
          </Card>
        </div>
      </div>
    </div>
  );
}
