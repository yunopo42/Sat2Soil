"use client";

import {
  ArrowRight,
  ChartBar,
  Copy,
  Crosshair,
  MapPin,
  MapTrifold,
  Mountains,
  PencilSimpleLine,
  PlayCircle,
  Plant,
  Ruler,
} from "@phosphor-icons/react/ssr";
import { CROP_CODES, IRRIGATION_TYPES, type Field as FieldData, type Polygon } from "@sat2soil/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { SourceBadge } from "@/components/data/source-badge";
import { FieldMap, labelAnchor, type DrawTool, type MapFocus, type MapLabel } from "@/components/map/field-map";
import { DrawToolbar, LayerMenu, MapSearch } from "@/components/map/map-controls";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, createField, fetchMyFields, fetchSampleFields } from "@/lib/api";
import { polygonStats, powerGridCell } from "@/lib/geo";
import type { Basemap } from "@/lib/map-config";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

export function FieldPicker() {
  const t = useTranslations("demo");
  const tCrops = useTranslations("crops");
  const tIrrigation = useTranslations("irrigation");
  const tStates = useTranslations("states");
  const tUnits = useTranslations("units");
  const format = useFormatter();
  const router = useRouter();

  const samples = useQuery({ queryKey: ["fields", "sample"], queryFn: fetchSampleFields });
  const mine = useQuery({ queryKey: ["fields", "mine"], queryFn: fetchMyFields });
  const sample = samples.data?.[0];

  const [tool, setTool] = useState<DrawTool>("none");
  const [shape, setShape] = useState<Polygon | null>(null);
  const [clearToken, setClearToken] = useState(0);
  const [basemap, setBasemap] = useState<Basemap>("nasa");
  const [showGrid, setShowGrid] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("");
  const [irrigation, setIrrigation] = useState("");

  const drawn = useMemo(() => (shape ? polygonStats(shape) : null), [shape]);

  const save = useMutation({
    mutationFn: () =>
      createField({
        name: name.trim() || t("form.namePlaceholder"),
        boundary: shape as Polygon,
        crop: crop || null,
        irrigation_type: (irrigation || null) as FieldData["irrigation_type"],
      }),
    onSuccess: (field) => router.push(`/fields/${field.id}`),
  });

  const number = (value: number, digits = 2) =>
    format.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  // Stats show the drawn shape (browser preview) or, before drawing, the sample field (PostGIS).
  const stats = drawn
    ? { areaHa: drawn.areaHa, areaDonum: drawn.areaDonum, perimeter: drawn.perimeterM, centre: drawn.centroid, sample: false }
    : sample
      ? {
          areaHa: sample.area_ha,
          areaDonum: sample.area_donum,
          perimeter: sample.perimeter_m,
          centre: sample.centroid,
          sample: true,
        }
      : null;
  const cell = stats ? powerGridCell(stats.centre.lat, stats.centre.lon) : null;

  const labels: MapLabel[] = [];
  if (drawn) {
    labels.push({
      id: "drawn",
      lngLat: labelAnchor(shape as Polygon),
      title: t("selected"),
      value: `${number(drawn.areaHa)} ha`,
    });
  } else if (sample) {
    labels.push({
      id: sample.id,
      lngLat: labelAnchor(sample.boundary),
      title: sample.name,
      value: `${number(sample.area_ha)} ha`,
    });
  }

  const startDrawing = () => {
    setTool("polygon");
    setClearToken((n) => n + 1);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (shape) save.mutate();
  };

  const saveError =
    save.error instanceof ApiError
      ? save.error.status === 0
        ? tStates("apiErrorBody")
        : save.error.message
      : save.error
        ? tStates("apiErrorBody")
        : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* Steps and actions */}
        <aside className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
          <ol className="flex flex-col">
            <Step index={1} active title={t("steps.select.title")} body={t("steps.select.body")} icon={<MapPin weight="duotone" className="text-green-600" />} />
            <Step index={2} title={t("steps.nasa.title")} body={t("steps.nasa.body")} icon={<ChartBar weight="duotone" className="text-navy-700" />} />
            <Step index={3} title={t("steps.results.title")} body={t("steps.results.body")} icon={<Plant weight="duotone" className="text-green-600" />} />
          </ol>

          <AnimatePresence mode="wait" initial={false}>
            {shape ? (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition.normal}
                className="flex flex-col gap-3 border-t border-line pt-4"
              >
                <Field label={t("form.name")} htmlFor="field-name">
                  <Input
                    id="field-name"
                    value={name}
                    maxLength={80}
                    placeholder={t("form.namePlaceholder")}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("form.crop")} htmlFor="field-crop">
                    <Select id="field-crop" value={crop} onChange={(event) => setCrop(event.target.value)}>
                      <option value="">{t("form.none")}</option>
                      {CROP_CODES.map((code) => (
                        <option key={code} value={code}>
                          {tCrops(code)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("form.irrigation")} htmlFor="field-irrigation">
                    <Select id="field-irrigation" value={irrigation} onChange={(event) => setIrrigation(event.target.value)}>
                      <option value="">{t("form.none")}</option>
                      {IRRIGATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {tIrrigation(type)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                {saveError ? <Banner variant="error" title={saveError} /> : null}
                <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
                  {save.isPending ? t("form.saving") : t("form.save")}
                  <ArrowRight aria-hidden="true" weight="bold" />
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition.normal}
                className="flex flex-col gap-3 border-t border-line pt-4"
              >
                <Button variant="primary" size="lg" onClick={startDrawing}>
                  <PencilSimpleLine aria-hidden="true" />
                  {t("startDrawing")}
                  <ArrowRight aria-hidden="true" weight="bold" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!sample}
                  onClick={() => sample && router.push(`/fields/${sample.id}`)}
                >
                  <PlayCircle aria-hidden="true" />
                  {t("trySample")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {mine.data && mine.data.length > 0 ? (
            <div className="border-t border-line pt-4">
              <p className="mb-2 text-xs font-bold text-ink-muted">{t("myFields")}</p>
              <ul className="flex flex-col gap-1">
                {mine.data.map((field) => (
                  <li key={field.id}>
                    <Link
                      href={`/fields/${field.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-surface-2"
                    >
                      <span className="truncate font-semibold">{field.name}</span>
                      <span className="shrink-0 font-mono text-2xs text-ink-muted">{number(field.area_ha)} ha</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        {/* Map */}
        <div className="flex flex-col gap-4">
          <FieldMap
            ariaLabel={t("title")}
            className="h-[480px] shadow-card lg:h-[540px]"
            fields={!shape && sample ? [{ id: sample.id, boundary: sample.boundary }] : []}
            labels={labels}
            basemap={basemap}
            gridCellFor={showGrid && stats ? stats.centre : null}
            tool={tool}
            clearToken={clearToken}
            focus={focus}
            onShapeChange={(polygon) => {
              setShape(polygon);
              if (polygon) setTool("select");
            }}
          >
            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
              <div className="pointer-events-auto flex-1">
                <MapSearch onLocate={(center, zoom) => setFocus({ center, zoom, token: Date.now() })} />
              </div>
              <div className="pointer-events-auto">
                <LayerMenu basemap={basemap} onBasemap={setBasemap} showGrid={showGrid} onShowGrid={setShowGrid} />
              </div>
            </div>
            <div className="absolute top-20 left-3 z-10">
              <DrawToolbar tool={tool} onTool={setTool} onClear={() => setClearToken((n) => n + 1)} />
            </div>
            {tool === "polygon" && !shape ? (
              <p className="pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full bg-navy-900/85 px-4 py-2 text-xs font-semibold text-white shadow-float">
                {t("drawingHint")}
              </p>
            ) : null}
          </FieldMap>

          {/* Stats under the map */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-3 shadow-card lg:grid-cols-4">
            <Stat
              highlight
              icon={<MapTrifold weight="duotone" className="text-green-600" />}
              label={t("stats.area")}
              value={stats ? `${number(stats.areaHa)} ha` : "—"}
              detail={stats ? `${number(stats.areaDonum, 1)} ${tUnits("donum")}` : undefined}
            />
            <Stat
              icon={<Ruler weight="duotone" className="text-green-600" />}
              label={t("stats.perimeter")}
              value={stats ? `${number(stats.perimeter, 1)} m` : "—"}
            />
            <Stat
              icon={<Crosshair weight="duotone" className="text-green-600" />}
              label={t("stats.centre")}
              value={stats ? `${number(stats.centre.lat, 5)}° ${tUnits("north")}` : "—"}
              detail={stats ? `${number(stats.centre.lon, 5)}° ${tUnits("east")}` : undefined}
              action={
                stats ? (
                  <CopyButton text={`${stats.centre.lat.toFixed(6)}, ${stats.centre.lon.toFixed(6)}`} />
                ) : null
              }
            />
            <Stat
              icon={<Mountains weight="duotone" className="text-navy-700" />}
              label={t("stats.cell")}
              value={cell ? `${number(cell.centerLat, 3)}° · ${number(cell.centerLon, 3)}°` : "—"}
              detail={`${number(0.5, 1)}° × ${number(0.625, 3)}°`}
            />
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {stats?.sample ? <SourceBadge source="demo_sample" /> : stats ? <SourceBadge source="manual_user" /> : null}
            {drawn ? t("stats.areaHint") : null}
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({
  index,
  title,
  body,
  icon,
  active = false,
}: {
  index: number;
  title: string;
  body: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex gap-3 rounded-lg p-3",
        active ? "bg-green-50 ring-1 ring-green-200" : "border-b border-line last:border-0",
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
          active ? "bg-green-600 text-white" : "bg-surface-2 text-ink-muted",
        )}
      >
        {index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{body}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 [&_svg]:size-8">
        {icon}
      </span>
    </li>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
  action,
  highlight = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  action?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-3 py-3", highlight && "bg-green-50")}>
      <span aria-hidden="true" className="shrink-0 [&_svg]:size-8">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        <p className="truncate font-mono text-lg font-bold text-ink tabular">{value}</p>
        {detail ? <p className="truncate font-mono text-2xs text-ink-muted">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
      aria-label={copied ? t("copied") : t("copy")}
      title={copied ? t("copied") : t("copy")}
      className="grid size-8 shrink-0 place-items-center rounded-md text-green-700 hover:bg-green-50"
    >
      <Copy aria-hidden="true" className="size-4" />
    </button>
  );
}
