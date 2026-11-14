"use client";

import { CaretDown } from "@phosphor-icons/react/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Collapsible } from "radix-ui";
import { Fragment, useState, type ReactNode } from "react";
import { transition } from "@/lib/motion/tokens";

/**
 * The one-line "figure caption" every data card ends with: source · parameter · unit · resolution ·
 * period · fetched time. `method` adds the "How was this calculated?" panel (UI_UX_DESIGN: technical
 * detail lives behind this disclosure, not in the main text).
 */
export function ProvenanceFooter({ items, method }: { items: string[]; method?: ReactNode }) {
  const t = useTranslations("ui");
  const [open, setOpen] = useState(false);

  const line = (
    <p className="min-w-0 font-mono text-2xs text-ink-muted">
      {items.map((item, index) => (
        <Fragment key={`${index}-${item}`}>
          {/* Separator outside the no-wrap span so the line can break between items. */}
          {index > 0 ? " · " : null}
          <span className="whitespace-nowrap">{item}</span>
        </Fragment>
      ))}
    </p>
  );

  if (!method) {
    return <footer className="border-t border-line bg-bg px-5 py-2.5">{line}</footer>;
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <footer className="border-t border-line bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5">
          {line}
          <Collapsible.Trigger className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-green-700 hover:text-green-800">
            {open ? t("hideDetails") : t("howCalculated")}
            <motion.span
              aria-hidden="true"
              animate={{ rotate: open ? 180 : 0 }}
              transition={transition.fast}
              className="inline-flex"
            >
              <CaretDown className="size-3" weight="bold" />
            </motion.span>
          </Collapsible.Trigger>
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <Collapsible.Content forceMount asChild>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={transition.panel}
                className="overflow-hidden"
              >
                <div className="border-t border-line px-5 py-4 text-sm leading-relaxed text-ink-muted">
                  {method}
                </div>
              </motion.div>
            </Collapsible.Content>
          ) : null}
        </AnimatePresence>
      </footer>
    </Collapsible.Root>
  );
}
