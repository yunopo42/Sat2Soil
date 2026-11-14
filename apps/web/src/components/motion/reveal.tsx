"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fadeUp, staggerChildren } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

/** Staggered entrance for a group of cards (60 ms apart). Plays once when scrolled into view. */
export function RevealGroup({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol" | "section";
}) {
  const Component = motion[as];
  return (
    <Component
      className={cn(className)}
      variants={staggerChildren}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </Component>
  );
}

/** One item inside a RevealGroup: fades in and rises 8 px. */
export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const Component = motion[as];
  return (
    <Component className={cn(className)} variants={fadeUp}>
      {children}
    </Component>
  );
}
