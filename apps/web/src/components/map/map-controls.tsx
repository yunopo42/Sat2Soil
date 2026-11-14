"use client";

import { Check, Cursor, MagnifyingGlass, Polygon as PolygonIcon, Square, Stack, Trash } from "@phosphor-icons/react/ssr";
import { useLocale, useTranslations } from "next-intl";
import { Popover } from "radix-ui";
import { useState, type FormEvent } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { parseCoordinates } from "@/lib/geo";
import { GIBS_HLS_DATE, type Basemap } from "@/lib/map-config";
import { cn } from "@/lib/cn";
import type { DrawTool } from "./field-map";

/** Vertical drawing toolbar (approved design P02). */
export function DrawToolbar({
  tool,
  onTool,
  onClear,
}: {
  tool: DrawTool;
  onTool: (tool: DrawTool) => void;
  onClear: () => void;
}) {
  const t = useTranslations("demo.tools");
  const items = [
    { key: "select", icon: Cursor },
    { key: "polygon", icon: PolygonIcon },
    { key: "rectangle", icon: Square },
  ] as const;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-float">
      {items.map(({ key, icon: ToolIcon }) => (
        <Tooltip key={key} content={t(key)}>
          <button
            type="button"
            aria-label={t(key)}
            aria-pressed={tool === key}
            onClick={() => onTool(tool === key ? "none" : key)}
            className={cn(
              "grid size-9 place-items-center rounded-md transition-colors",
              tool === key ? "bg-green-100 text-green-700" : "text-ink hover:bg-surface-2",
            )}
          >
            <ToolIcon aria-hidden="true" className="size-5" weight={tool === key ? "fill" : "regular"} />
          </button>
        </Tooltip>
      ))}
      <span aria-hidden="true" className="mx-1.5 my-0.5 h-px bg-line" />
      <Tooltip content={t("delete")}>
        <button
          type="button"
          aria-label={t("delete")}
          onClick={onClear}
          className="grid size-9 place-items-center rounded-md text-ink hover:bg-red-50 hover:text-red-700"
        >
          <Trash aria-hidden="true" className="size-5" />
        </button>
      </Tooltip>
    </div>
  );
}

/** Place search (Nominatim, only on submit) or "lat, lon" coordinates. */
export function MapSearch({ onLocate }: { onLocate: (center: [number, number], zoom: number) => void }) {
  const t = useTranslations("demo");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const coordinates = parseCoordinates(query);
    if (coordinates) {
      onLocate([coordinates.lon, coordinates.lat], 15);
      return;
    }
    if (!query.trim()) return;
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${locale}&q=${encodeURIComponent(query)}`;
      const results = (await (await fetch(url)).json()) as { lat: string; lon: string; type?: string }[];
      if (results[0]) onLocate([Number(results[0].lon), Number(results[0].lat)], 13);
      else setError(t("searchNotFound"));
    } catch {
      setError(t("searchNotFound"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} role="search" className="w-full max-w-md">
      <div className="flex h-11 items-center gap-2 rounded-lg border border-line bg-surface pr-1 pl-3 shadow-float">
        <MagnifyingGlass aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-9 rounded-md bg-surface-2 px-3 text-xs font-bold text-ink hover:bg-line disabled:opacity-50"
        >
          {t("search")}
        </button>
      </div>
      {error ? <p className="mt-1.5 rounded-sm bg-surface px-2 py-1 text-xs text-amber-700 shadow-card">{error}</p> : null}
    </form>
  );
}

/** "Harita Katmanı" menu: NASA basemap first, a labelled non-NASA alternative, grid cell overlay. */
export function LayerMenu({
  basemap,
  onBasemap,
  showGrid,
  onShowGrid,
}: {
  basemap: Basemap;
  onBasemap: (basemap: Basemap) => void;
  showGrid: boolean;
  onShowGrid: (show: boolean) => void;
}) {
  const t = useTranslations("demo.layers");
  const options = [
    { key: "nasa", label: t("gibs"), note: t("gibsNote", { date: GIBS_HLS_DATE }) },
    { key: "s2", label: t("s2"), note: t("s2Note") },
  ] as const;

  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm font-bold text-ink shadow-float hover:bg-surface-2">
        <Stack aria-hidden="true" className="size-5" />
        {t("title")}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-72 rounded-lg border border-line bg-surface p-2 text-sm shadow-float"
        >
          <fieldset>
            <legend className="sr-only">{t("title")}</legend>
            {options.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 hover:bg-surface-2"
              >
                <input
                  type="radio"
                  name="basemap"
                  checked={basemap === option.key}
                  onChange={() => onBasemap(option.key)}
                  className="mt-1 accent-green-600"
                />
                <span>
                  <span className="block font-semibold text-ink">{option.label}</span>
                  <span className="block font-mono text-2xs text-ink-muted">{option.note}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <span aria-hidden="true" className="my-1 block h-px bg-line" />
          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 hover:bg-surface-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(event) => onShowGrid(event.target.checked)}
              className="accent-green-600"
            />
            <span className="font-semibold text-ink">{t("grid")}</span>
          </label>
          <p className="flex items-center justify-between gap-3 px-2.5 py-2 text-ink-muted">
            <span>{t("ndvi")}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-bold">{t("planned")}</span>
          </p>
          <p className="flex items-center gap-1.5 px-2.5 pt-1 pb-1.5 text-2xs text-ink-muted">
            <Check aria-hidden="true" className="size-3" />
            NASA GIBS · EOX · OpenStreetMap
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
