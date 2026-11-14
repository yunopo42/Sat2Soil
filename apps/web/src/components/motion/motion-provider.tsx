"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Respects the OS "reduce motion" setting for every Motion animation in the app:
 * transform and layout animations are disabled, opacity changes remain.
 * Animations that are not transforms (e.g. chart path drawing) also check useReducedMotion().
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
