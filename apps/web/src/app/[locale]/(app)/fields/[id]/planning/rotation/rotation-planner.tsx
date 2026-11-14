"use client";

import { ArrowCounterClockwise, CheckCircle, CloudRain, Snowflake, Thermometer, XCircle } from "@phosphor-icons/react/ssr";
import { CROP_CODES, type Plan, type Rotation } from "@sat2soil/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { AnimatedNumber } from "@/components/data/animated-number";
import { ProvenanceFooter } from "@/components/data/provenance-footer";
import { SourceBadge } from "@/components/data/source-badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/state-panel";
import { ApiError, compareRotation, fetchRotation } from "@/lib/api";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";
import { PlanningTabs } from "../planning-tabs";

const PLAN_CROPS = CROP_CODES.filter((c) => c !== "fallow");

const FAMILY_TONE: Record<string, string> = {
  cereal: "border-amber-200 bg-amber-50",
  root: "border-red-700/20 bg-red-50",
  legume: "border-green-200 bg-green-50",
  oilseed: "border-orange-200 bg-orange-200/30",
  forage: "border-sky-200 bg-sky-200/30",
};

/** Crop rotation (Faz 5, UI_UX_DESIGN S-05, ANALYSIS_AI §2). Scores compare plans; not a yield prediction. */
export function RotationPlanner({ fieldId }: { fieldId: string }) {
  const t = useTranslations("planning.rotation");
  const tStates = useTranslations("states");
  const tUi = useTranslations("ui");
  const base = useQuery({ queryKey: ["rotation", fieldId], queryFn: () => fetchRotation(fieldId) });
  const [edited, setEdited] = useState<string[][] | null>(null);

  const plans = edited ?? base.data?.plans.map((p) => p.crops) ?? null;
  const compared = useQuery({
    queryKey: ["rotation-compare", fieldId, plans],
    queryFn: () => compareRotation(fieldId, plans as string[][]),
    enabled: edited !== null,
    placeholderData: keepPreviousData,
  });
  const data: Rotation | undefined = edited ? (compared.data ?? base.data) : base.data;

  const setCrop = (planIndex: number, yearIndex: number, crop: string) => {
    const next = (plans ?? []).map((p) => [...p]);
    next[planIndex][yearIndex] = crop;
    setEdited(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader banner title={t("title")} emphasis={t("emphasis")} description={t("description")} />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
        <PlanningTabs fieldId={fieldId} active="rotation" />
        <div className="flex items-center gap-3">
          {compared.isFetching ? <span className="text-xs text-ink-muted">{t("recalculating")}</span> : null}
          {edited ? (
            <Button variant="outline" size="sm" onClick={() => setEdited(null)}>
              <ArrowCounterClockwise aria-hidden="true" />
              {t("reset")}
            </Button>
          ) : null}
        </div>
      </div>

      {base.isPending ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : base.isError || !data ? (
        <Banner
          variant="error"
          title={base.error instanceof ApiError && base.error.status === 0 ? tStates("apiErrorTitle") : tStates("errorTitle")}
          action={
            <Button size="sm" onClick={() => base.refetch()}>
              {tUi("retry")}
            </Button>
          }
        />
      ) : (
        <RotationBody data={data} labels={edited ? ["current", "custom"] : ["current", "suggested"]} onCrop={setCrop} />
      )}
    </div>
  );
}

function RotationBody({
  data,
  labels,
  onCrop,
}: {
  data: Rotation;
  labels: string[];
  onCrop: (plan: number, year: number, crop: string) => void;
}) {
  const t = useTranslations("planning.rotation");
  const tCrops = useTranslations("crops");
  const tA = useTranslations("planning.assumptions");
  const tU = useTranslations("planning.uncertainty");
  const format = useFormatter();
  const n = (v: number | null, d = 0) => (v === null ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d }));
  const crop = (code: string) => (tCrops.has(code as never) ? tCrops(code as never) : code);
  const family = (code: string) => data.crops.find((c) => c.code === code)?.family ?? "";
  const maxEtc = Math.max(1, ...data.crops.map((c) => c.etc_mm));
  const source = data.data_sources[0];
  const fetched = format.dateTime(new Date(source.fetched_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const [current, alternative] = data.plans;
  const saving = current && alternative ? current.total_etc_mm - alternative.total_etc_mm : 0;
  const savingPct = current?.total_etc_mm ? (100 * Math.abs(saving)) / current.total_etc_mm : 0;
  const passed = (p: Plan) => p.rules.filter((r) => r.passed).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.7fr]">
      {/* Left: context */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title={t("historyTitle")} aside={<SourceBadge source="demo_sample" />} />
          <CardBody>
            <ol className="flex flex-wrap gap-2">
              {data.history.map((s) => (
                <li key={s.season_year} className={cn("rounded-lg border px-3 py-2", FAMILY_TONE[family(s.crop)] ?? "border-line bg-surface")}>
                  <span className="block font-mono text-2xs text-ink-muted">{s.season_year}</span>
                  <span className="block text-sm font-bold">{crop(s.crop)}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("conditionsTitle")} aside={<SourceBadge source={data.conditions.source_type} detail="POWER" />} />
          <CardBody>
            <dl className="grid grid-cols-3 gap-3">
              <Condition icon={<CloudRain weight="duotone" className="text-sky-600" />} label={t("annualRain")} value={`${n(data.conditions.annual_precip_mm)} mm`} />
              <Condition icon={<Thermometer weight="duotone" className="text-orange-500" />} label={t("meanTemp")} value={`${n(data.conditions.mean_temp_c, 1)} °C`} />
              <Condition icon={<Snowflake weight="duotone" className="text-navy-600" />} label={t("frostDays")} value={String(data.conditions.frost_days)} />
            </dl>
          </CardBody>
          <ProvenanceFooter items={["T2M · T2M_MIN · PRECTOTCORR", `${data.conditions.start} – ${data.conditions.end}`, fetched]} />
        </Card>

        <Card>
          <CardHeader title={t("cropsTitle")} description={t("cropsLead")} aside={<SourceBadge source="derived_indicator" detail="FAO-56" />} />
          <CardBody>
            <ul className="flex flex-col gap-2.5">
              {[...data.crops].sort((a, b) => a.etc_mm - b.etc_mm).map((c) => (
                <li key={c.code} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                  <span className="truncate font-semibold">{crop(c.code)}</span>
                  <span className="relative h-3 overflow-hidden rounded-full bg-surface-2">
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${(100 * c.etc_mm) / maxEtc}%` }}
                      transition={transition.emphasis}
                      className="absolute inset-y-0 left-0 rounded-full bg-green-600/70"
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-sky-600/80"
                      style={{ width: `${(100 * Math.min(c.precip_mm, c.etc_mm)) / maxEtc}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs">{n(c.etc_mm)} mm</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-4 text-2xs text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-green-600/70" />ETc</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-600/80" />{t("covered")}</span>
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Right: plans */}
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.plans.slice(0, 2).map((plan, planIndex) => (
            <PlanCard
              key={planIndex}
              plan={plan}
              title={planIndex === 0 ? t("current") : t("suggested")}
              lead={planIndex === 0 ? t("currentLead") : t("suggestedLead")}
              highlight={planIndex === 1 && labels[1] === "suggested"}
              onCrop={(year, value) => onCrop(planIndex, year, value)}
            />
          ))}
        </div>

        {current && alternative ? (
          <Card>
            <CardHeader title={t("whyTitle")} aside={<SourceBadge source="derived_indicator" />} />
            <CardBody>
              <ul className="flex flex-col gap-2 text-sm text-ink">
                <li>
                  {saving >= 0
                    ? t("whyWater", { pct: n(savingPct), mm: n(Math.abs(saving)) })
                    : t("whyMoreWater", { pct: n(savingPct), mm: n(Math.abs(saving)) })}
                </li>
                <li>{t("whyRules", { passed: passed(alternative), total: alternative.rules.length, current: passed(current) })}</li>
                {alternative.crops.some((c) => family(c) === "legume") ? <li>{t("whyLegume")}</li> : null}
              </ul>
              <p className="mt-4 text-xs text-ink-muted">
                {t("weights", { water: n(100 * (data.weights.water ?? 0.5)), rules: n(100 * (data.weights.rules ?? 0.5)) })}
              </p>
              <p className="mt-3 rounded-md bg-surface-2 p-3 text-sm">{tU.has(data.uncertainty_note as never) ? tU(data.uncertainty_note as never) : data.uncertainty_note}</p>
            </CardBody>
            <ProvenanceFooter
              items={[source.name, source.product, source.grid_cell, fetched]}
              method={
                <ul className="list-disc space-y-1.5 pl-4">
                  {data.assumptions.map((code) => (
                    <li key={code}>{tA.has(code as never) ? tA(code as never) : code}</li>
                  ))}
                </ul>
              }
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  title,
  lead,
  highlight,
  onCrop,
}: {
  plan: Plan;
  title: string;
  lead: string;
  highlight: boolean;
  onCrop: (year: number, crop: string) => void;
}) {
  const t = useTranslations("planning.rotation");
  const tCrops = useTranslations("crops");
  const format = useFormatter();
  const n = (v: number | null, d = 0) => (v === null ? "—" : format.number(v, { minimumFractionDigits: d, maximumFractionDigits: d }));
  const maxYear = Math.max(1, ...plan.years.map((y) => y.etc_mm ?? 0));

  return (
    <Card className={cn(highlight && "border-green-600 ring-1 ring-green-600/30")}>
      <CardHeader
        title={title}
        description={lead}
        aside={highlight ? <span className="rounded-full bg-green-600 px-2.5 py-1 text-2xs font-bold text-white">{t("suggestedTag")}</span> : null}
      />
      <CardBody className="flex flex-col gap-5">
        <ol className="flex flex-col gap-3">
          {plan.years.map((y, i) => (
            <li key={y.year} className="grid grid-cols-[3rem_1fr] items-center gap-3">
              <span className="font-mono text-xs text-ink-muted">{y.year}</span>
              <div className="flex flex-col gap-1.5">
                <Select aria-label={t("yearCrop", { year: y.year })} value={y.crop} onChange={(e) => onCrop(i, e.target.value)}>
                  {PLAN_CROPS.map((code) => (
                    <option key={code} value={code}>
                      {tCrops(code)}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-2">
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <motion.span
                      animate={{ width: `${(100 * (y.etc_mm ?? 0)) / maxYear}%` }}
                      transition={transition.emphasis}
                      className="absolute inset-y-0 left-0 rounded-full bg-green-600/70"
                    />
                  </span>
                  <span className="w-28 text-right font-mono text-2xs text-ink-muted">
                    {n(y.etc_mm)} mm · {n(y.coverage_pct)}%
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm text-ink-muted">{t("total")}</span>
          <span className="font-mono text-lg font-bold">
            <AnimatedNumber value={plan.total_etc_mm} /> mm
          </span>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">{t("score")}</span>
            <span className="font-mono text-xl font-bold">
              <AnimatedNumber value={plan.score} /> <span className="text-sm text-ink-muted">/ 100</span>
            </span>
          </div>
          <Bar label={t("waterFit")} value={plan.water_score} tone="bg-sky-600" />
          <Bar label={t("rulesFit")} value={plan.rules_score} tone="bg-green-600" />
        </div>

        <ul className="flex flex-col gap-2 border-t border-line pt-4">
          {plan.rules.map((rule) => (
            <li key={rule.code} className="flex items-start gap-2 text-sm">
              {rule.passed ? (
                <CheckCircle aria-hidden="true" weight="fill" className="mt-0.5 size-4 shrink-0 text-green-600" />
              ) : (
                <XCircle aria-hidden="true" weight="fill" className="mt-0.5 size-4 shrink-0 text-amber-700" />
              )}
              <span>
                {t(`rules.${rule.code}` as never)}
                {!rule.passed && rule.years.length ? (
                  <span className="text-ink-muted"> · {t("ruleYears", { years: rule.years.join(", ") })}</span>
                ) : null}
                <span className="sr-only">{rule.passed ? " ✓" : " ✗"}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  const format = useFormatter();
  return (
    <div className="mt-2 grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-xs">
      <span className="text-ink-muted">{label}</span>
      <span className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.span animate={{ width: `${value}%` }} transition={transition.emphasis} className={cn("absolute inset-y-0 left-0 rounded-full", tone)} />
      </span>
      <span className="text-right font-mono">{format.number(value, { maximumFractionDigits: 0 })}</span>
    </div>
  );
}

function Condition({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <span aria-hidden="true" className="[&_svg]:size-6">{icon}</span>
      <dt className="mt-1 text-2xs font-semibold text-ink-muted">{label}</dt>
      <dd className="font-mono text-base font-bold">{value}</dd>
    </div>
  );
}
