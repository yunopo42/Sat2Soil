"use client";

import { animate, useReducedMotion } from "motion/react";
import { useFormatter } from "next-intl";
import { useEffect, useRef } from "react";
import { duration, ease } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

/**
 * Locale-formatted number that counts to its new value in 300 ms when it changes
 * (e.g. after switching a scenario). First render shows the final value, so nothing
 * "counts up" on page load and server HTML is already correct.
 */
export function AnimatedNumber({
  value,
  fractionDigits = 0,
  className,
}: {
  value: number;
  fractionDigits?: number;
  className?: string;
}) {
  const format = useFormatter();
  const reduceMotion = useReducedMotion();
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  const options = { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits };

  useEffect(() => {
    const element = node.current;
    const from = previous.current;
    previous.current = value;
    if (!element || from === value) return;

    const render = (current: number) => {
      element.textContent = format.number(current, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
    };

    if (reduceMotion) {
      render(value);
      return;
    }
    const controls = animate(from, value, {
      duration: duration.fast * 2,
      ease: ease.out,
      onUpdate: render,
    });
    return () => controls.stop();
  }, [value, fractionDigits, format, reduceMotion]);

  return (
    <span ref={node} className={cn("tabular", className)}>
      {format.number(value, options)}
    </span>
  );
}
