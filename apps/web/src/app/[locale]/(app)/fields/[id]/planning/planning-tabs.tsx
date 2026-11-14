"use client";

import { ArrowsClockwise, Drop } from "@phosphor-icons/react/ssr";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

/** Water | Rotation switch (UI_UX_DESIGN S-05): two linkable pages under Planning (D-003). */
export function PlanningTabs({ fieldId, active }: { fieldId: string; active: "water" | "rotation" }) {
  const t = useTranslations("planning.tabs");
  const items = [
    { key: "water", href: `/fields/${fieldId}/planning/water`, icon: Drop },
    { key: "rotation", href: `/fields/${fieldId}/planning/rotation`, icon: ArrowsClockwise },
  ] as const;
  return (
    <nav className="inline-flex rounded-md border border-line bg-surface-2 p-1">
      {items.map(({ key, href, icon: TabIcon }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? "page" : undefined}
          className={cn(
            "relative flex h-9 items-center gap-2 rounded-[10px] px-4 text-sm font-bold",
            key === active ? "text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {key === active ? (
            <motion.span
              layoutId="planning-tab"
              transition={transition.indicator}
              className="absolute inset-0 rounded-[10px] border border-line bg-surface shadow-card"
            />
          ) : null}
          <TabIcon aria-hidden="true" className="relative size-4" />
          <span className="relative">{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}
