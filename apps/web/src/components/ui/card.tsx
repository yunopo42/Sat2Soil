import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Surfaces are separated by a 1 px border, never by a shadow. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("flex flex-col overflow-hidden rounded-lg border border-line bg-surface", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  eyebrow,
  description,
  aside,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Usually a SourceBadge or a small action. */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 font-mono text-2xs text-ink-muted">{eyebrow}</p> : null}
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs text-ink-muted">{description}</p> : null}
      </div>
      {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 px-5 py-4", className)} {...props} />;
}
