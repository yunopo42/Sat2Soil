"use client";

import { motion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useId, type ReactNode } from "react";
import { transition } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

export type SegmentOption<T extends string> = { value: T; label: ReactNode };

/** Mutually exclusive choice (e.g. Water | Rotation, Dry | Normal | Wet). The thumb slides to the selection. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** Accessible name for the group. */
  label: string;
  className?: string;
}) {
  const indicatorId = useId();

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      aria-label={label}
      className={cn("inline-flex rounded-md border border-line bg-surface-2 p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className={cn(
              "relative h-8 rounded-[10px] px-3 text-sm font-medium transition-colors duration-150",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={indicatorId}
                transition={transition.indicator}
                className="absolute inset-0 rounded-[10px] border border-line bg-surface"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
