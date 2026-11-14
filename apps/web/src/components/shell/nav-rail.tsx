"use client";

import {
  ArrowsClockwise,
  CubeFocus,
  Drop,
  GlobeHemisphereEast,
  MapTrifold,
  Plant,
  SprayBottle,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

export type NavKey = "field" | "nasa" | "water" | "rotation" | "twin" | "spray";

type Item = { key: NavKey | "planning"; path?: string; icon: Icon; children?: Item[] };

// Max five top-level entries (UI_UX_DESIGN). Water and rotation live under Planning (D-003).
const ITEMS: Item[] = [
  { key: "field", path: "", icon: MapTrifold },
  { key: "nasa", path: "/climate", icon: GlobeHemisphereEast },
  {
    key: "planning",
    icon: Plant,
    children: [
      { key: "water", path: "/planning/water", icon: Drop },
      { key: "rotation", path: "/planning/rotation", icon: ArrowsClockwise },
    ],
  },
  { key: "twin", path: "/twin", icon: CubeFocus },
  { key: "spray", path: "/spray", icon: SprayBottle },
];

function activeFromPath(pathname: string, base: string): NavKey | null {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : null;
  if (rest === null) return null;
  for (const item of ITEMS.flatMap((i) => [i, ...(i.children ?? [])])) {
    if (item.path === undefined) continue;
    if (item.path === "" ? rest === "" || rest === "/" : rest.startsWith(item.path)) return item.key as NavKey;
  }
  return null;
}

/**
 * Left navigation rail, 224 px. The active background slides between items so the user sees
 * where they moved from (UI_UX_DESIGN S-03). `active` overrides path detection (style guide preview).
 */
export function NavRail({
  fieldBase,
  active,
  onSelect,
}: {
  fieldBase: string;
  active?: NavKey;
  /** Preview mode: intercepts navigation and reports the chosen item instead. */
  onSelect?: (key: NavKey) => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const indicatorId = useId();
  const current = active ?? activeFromPath(pathname, fieldBase);

  const row = (item: Item, nested = false) => {
    const isActive = item.key === current;
    const Icon = item.icon;
    return (
      <li key={item.key}>
        <Link
          href={`${fieldBase}${item.path ?? ""}`}
          aria-current={isActive ? "page" : undefined}
          onClick={
            onSelect
              ? (event) => {
                  event.preventDefault();
                  onSelect(item.key as NavKey);
                }
              : undefined
          }
          className={cn(
            "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
            nested && "pl-9",
            isActive ? "font-medium text-ink" : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
          )}
        >
          {isActive ? (
            <motion.span
              layoutId={indicatorId}
              transition={transition.indicator}
              className="absolute inset-0 rounded-md border border-line bg-surface"
            />
          ) : null}
          <Icon
            aria-hidden="true"
            weight={isActive ? "fill" : "regular"}
            className={cn("relative size-4.5 shrink-0", isActive ? "text-green-600" : "")}
          />
          <span className="relative truncate">{t(item.key)}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={t("main")} className="flex w-56 shrink-0 flex-col border-r border-line bg-bg px-3 py-4">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map((item) =>
          item.children ? (
            <li key={item.key} className="mt-2 mb-1">
              <p className="flex h-8 items-center gap-3 px-3 text-xs font-medium text-ink-muted">
                <item.icon aria-hidden="true" className="size-4.5" />
                {t(item.key)}
              </p>
              <ul className="relative flex flex-col gap-0.5 before:absolute before:top-1 before:bottom-1 before:left-[1.3rem] before:w-px before:bg-line">
                {item.children.map((child) => row(child, true))}
              </ul>
            </li>
          ) : (
            row(item)
          ),
        )}
      </ul>
    </nav>
  );
}
