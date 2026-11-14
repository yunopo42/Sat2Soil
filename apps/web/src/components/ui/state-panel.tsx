import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Empty and error placeholders inside a card: an invitation or a calm explanation, never an alarm. */
export function StatePanel({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-full border border-line bg-bg text-ink-muted [&_svg]:size-5"
      >
        {icon}
      </span>
      <p className="mt-4 text-sm font-medium text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-xs text-sm text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Loading placeholder. Pulses only when the user allows motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-sm bg-surface-2 motion-safe:animate-pulse", className)} />;
}
