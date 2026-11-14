import type { Transition, Variants } from "motion/react";

/**
 * Motion tokens (docs/UI_UX_DESIGN.md "Motion sistemi", docs/MOTION_STORYBOARD.md).
 * Every animation in the app takes its timing from here. Motion explains a change; it never decorates.
 */

/** Seconds, as Motion expects. fast 150 · normal 250 · emphasis 450 · slow 700 ms. */
export const duration = {
  fast: 0.15,
  normal: 0.25,
  emphasis: 0.45,
  slow: 0.7,
} as const;

export const ease = {
  /** Default for anything entering or settling. */
  out: [0.22, 1, 0.36, 1],
  /** For elements moving between two resting positions. */
  inOut: [0.65, 0, 0.35, 1],
} as const;

/** Displacement in px: small for cards and text, medium for panels. */
export const distance = {
  sm: 8,
  md: 16,
} as const;

export const stagger = 0.06;

export const transition = {
  fast: { duration: duration.fast, ease: ease.out },
  normal: { duration: duration.normal, ease: ease.out },
  emphasis: { duration: duration.emphasis, ease: ease.out },
  /** Sliding indicators (tabs, segmented controls, nav rail). */
  indicator: { type: "spring", stiffness: 520, damping: 42, mass: 0.9 },
  /** Panels and drawers (220 ms per UI_UX_DESIGN S-03). */
  panel: { duration: 0.22, ease: ease.out },
} as const satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: distance.sm },
  visible: { opacity: 1, y: 0, transition: transition.emphasis },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.normal },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
};
