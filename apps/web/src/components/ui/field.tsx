import { CaretDown } from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 " +
  "placeholder:text-ink-muted hover:border-line-strong focus-visible:border-green-600 " +
  "aria-invalid:border-amber-600 disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** Shown instead of the hint; explains how to fix the input. */
  error?: ReactNode;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-amber-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <CaretDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-ink-muted"
        weight="bold"
      />
    </div>
  );
}
