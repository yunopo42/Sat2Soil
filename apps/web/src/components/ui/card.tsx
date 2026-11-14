import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** White card with a hairline border and a soft shadow (approved designs). */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  eyebrow,
  description,
  aside,
  icon,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Usually a SourceBadge or a small action. */
  aside?: ReactNode;
  /** Optional coloured line icon shown before the title. */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="mt-0.5 shrink-0 [&_svg]:size-6">{icon}</span> : null}
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 font-mono text-2xs text-ink-muted">{eyebrow}</p> : null}
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 px-5 py-4", className)} {...props} />;
}
