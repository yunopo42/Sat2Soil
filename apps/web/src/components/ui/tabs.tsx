"use client";

import { AnimatePresence, motion } from "motion/react";
import { Tabs as RadixTabs } from "radix-ui";
import { useId, useState, type ReactNode } from "react";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

export type TabItem = { value: string; label: ReactNode; content: ReactNode };

/** Underline tabs. The indicator slides in 180 ms; panels cross-fade without shifting layout. */
export function Tabs({
  items,
  defaultValue,
  label,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  label: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? items[0]?.value ?? "");
  const indicatorId = useId();

  return (
    <RadixTabs.Root value={value} onValueChange={setValue} className={className}>
      <RadixTabs.List aria-label={label} className="flex gap-6 border-b border-line">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "relative -mb-px pb-3 text-sm font-medium transition-colors duration-150",
              item.value === value ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
            {item.value === value ? (
              <motion.span
                layoutId={indicatorId}
                transition={{ ...transition.indicator, duration: 0.18 }}
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-green-600"
              />
            ) : null}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      <AnimatePresence mode="wait" initial={false}>
        {items
          .filter((item) => item.value === value)
          .map((item) => (
            <RadixTabs.Content key={item.value} value={item.value} forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition.fast}
                className="pt-5"
              >
                {item.content}
              </motion.div>
            </RadixTabs.Content>
          ))}
      </AnimatePresence>
    </RadixTabs.Root>
  );
}
