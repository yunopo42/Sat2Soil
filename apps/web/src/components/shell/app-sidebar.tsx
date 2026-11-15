"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwise,
  CubeFocus,
  Drop,
  GlobeHemisphereEast,
  PencilSimpleLine,
  Presentation,
  SprayBottle,
  SquaresFour,
} from "@phosphor-icons/react/ssr";
import { motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";
import hero from "../../../public/images/hero-satellite-to-soil.webp";

export type NavKey = "overview" | "nasa" | "water" | "rotation" | "twin" | "spray" | "summary";

// Flat list as in the approved designs (D-020); routes keep the planning grouping (D-003).
export const NAV_ITEMS: { key: NavKey; path: string; icon: Icon }[] = [
  { key: "overview", path: "", icon: SquaresFour },
  { key: "nasa", path: "/climate", icon: GlobeHemisphereEast },
  { key: "water", path: "/planning/water", icon: Drop },
  { key: "rotation", path: "/planning/rotation", icon: ArrowsClockwise },
  { key: "twin", path: "/twin", icon: CubeFocus },
  { key: "spray", path: "/spray", icon: SprayBottle },
  { key: "summary", path: "/summary", icon: Presentation },
];

export function activeNavKey(pathname: string, base: string): NavKey | null {
  if (!pathname.startsWith(base)) return null;
  const rest = pathname.slice(base.length);
  if (rest === "" || rest === "/") return "overview";
  return NAV_ITEMS.find((item) => item.path && rest.startsWith(item.path))?.key ?? null;
}

/** Left navigation, 240 px. The active pill slides between items (MOTION_STORYBOARD M04). */
export function AppSidebar({
  fieldBase,
  active,
  onSelect,
  className,
}: {
  fieldBase: string;
  active?: NavKey;
  /** Preview mode (style guide): intercepts navigation. */
  onSelect?: (key: NavKey) => void;
  className?: string;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const indicatorId = useId();
  const current = active ?? activeNavKey(pathname, fieldBase);

  return (
    <nav aria-label={t("main")} className={cn("flex w-60 shrink-0 flex-col gap-6 px-3 py-6", className)}>
      <div>
        <p className="px-3 pb-2 text-xs font-semibold text-ink-muted">{t("section")}</p>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === current;
            const ItemIcon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={`${fieldBase}${item.path}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={
                    onSelect
                      ? (event) => {
                          event.preventDefault();
                          onSelect(item.key);
                        }
                      : undefined
                  }
                  className={cn(
                    "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
                    isActive ? "font-bold text-ink" : "font-medium text-ink/80 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId={indicatorId}
                      transition={transition.indicator}
                      className="absolute inset-0 rounded-md bg-green-100"
                    />
                  ) : null}
                  <ItemIcon
                    aria-hidden="true"
                    weight={isActive ? "fill" : "regular"}
                    className={cn("relative size-5 shrink-0", isActive ? "text-green-600" : "text-ink/70")}
                  />
                  <span className="relative truncate">{t(item.key)}</span>
                  {item.key === "spray" ? (
                    <span className="relative ml-auto rounded-full border border-orange-500/40 bg-orange-200/40 px-2 py-0.5 text-2xs font-bold text-amber-700">
                      {t("prototype")}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div className="relative h-24">
          <Image src={hero} alt="" fill sizes="240px" className="object-cover object-[35%_30%]" />
        </div>
        <div className="p-4">
          <p className="text-sm font-bold leading-snug text-ink">{t("promoTitle")}</p>
          <Button asChild variant="primary" size="sm" className="mt-3 w-full">
            <Link href="/demo">
              <PencilSimpleLine aria-hidden="true" />
              {t("promoCta")}
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}

/** Compact horizontal navigation for screens below the sidebar breakpoint. */
export function AppTabs({ fieldBase }: { fieldBase: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const current = activeNavKey(pathname, fieldBase);
  return (
    <nav aria-label={t("main")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">
      <ul className="flex gap-2 pb-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <Link
              href={`${fieldBase}${item.path}`}
              aria-current={item.key === current ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold",
                item.key === current ? "border-green-200 bg-green-100 text-ink" : "border-line bg-surface text-ink-muted",
              )}
            >
              <item.icon aria-hidden="true" className="size-4" />
              {t(item.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
