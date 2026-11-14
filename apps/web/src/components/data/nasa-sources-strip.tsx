import { CloudRain, Drop, Leaf, Sun, Thermometer } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const SOURCES = [
  { name: "POWER", key: "power", icon: Sun, tone: "text-orange-500", live: true },
  { name: "GPM", key: "gpm", icon: CloudRain, tone: "text-sky-600", live: false },
  { name: "SMAP", key: "smap", icon: Drop, tone: "text-sky-600", live: false },
  { name: "Landsat", key: "landsat", icon: Leaf, tone: "text-green-600", live: false },
  { name: "ECOSTRESS", key: "ecostress", icon: Thermometer, tone: "text-red-700", live: false },
] as const;

/**
 * NASA data sources strip (approved design P02) with an honest status per source:
 * only POWER is connected today; the others are labelled "Planned", never shown as live.
 */
export function NasaSourcesStrip() {
  const t = useTranslations("demo.sources");
  const tLanding = useTranslations("landing");
  const what: Record<(typeof SOURCES)[number]["key"], string> = {
    power: tLanding("sources.power"),
    gpm: tLanding("sources.gpm"),
    smap: tLanding("sources.smap"),
    landsat: tLanding("sources.landsat"),
    ecostress: "LST",
  };

  return (
    <section
      aria-labelledby="nasa-sources-title"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card lg:flex-row lg:items-center"
    >
      <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-800 font-mono text-[11px] font-bold tracking-wider text-white">
          NASA
        </span>
        <div>
          <h2 id="nasa-sources-title" className="text-base font-extrabold text-ink">
            {t("title")}
          </h2>
          <p className="text-xs text-ink-muted">{t("lead")}</p>
        </div>
      </div>
      <ul className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SOURCES.map(({ name, key, icon: SourceIcon, tone, live }) => (
          <li
            key={key}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5",
              live ? "border-green-200 bg-green-50" : "border-line bg-surface",
            )}
          >
            <SourceIcon aria-hidden="true" weight="duotone" className={cn("size-6 shrink-0", tone)} />
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-ink">{name}</span>
              <span className="block truncate text-2xs text-ink-muted">{what[key]}</span>
            </span>
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold",
                live ? "bg-green-600 text-white" : "bg-surface-2 text-ink-muted",
              )}
            >
              {live ? tLanding("status.live") : tLanding("status.planned")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
