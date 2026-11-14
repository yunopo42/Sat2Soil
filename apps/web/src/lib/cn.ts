import { clsx, type ClassValue } from "clsx";

/** Joins class names. Components expose `className` for placement only, not for restyling. */
export function cn(...values: ClassValue[]): string {
  return clsx(values);
}
