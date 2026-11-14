import {
  CheckCircle,
  ClockCounterClockwise,
  CloudSlash,
  Cpu,
  Info,
  WarningCircle,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "info" | "cached" | "simulated" | "warning" | "error" | "success";

const variants: Record<Variant, { className: string; icon: ReactNode; iconClass: string }> = {
  info: { className: "border-line bg-surface", icon: <Info />, iconClass: "text-ink-muted" },
  cached: {
    className: "border-navy-200 bg-navy-50",
    icon: <ClockCounterClockwise />,
    iconClass: "text-navy-600",
  },
  simulated: { className: "hatch-amber border-amber-600/60", icon: <Cpu />, iconClass: "text-amber-700" },
  warning: { className: "border-amber-200 bg-amber-50", icon: <WarningCircle />, iconClass: "text-amber-700" },
  // Errors stay calm: a failed NASA request is expected sometimes and the user's data is safe.
  error: { className: "border-line-strong bg-surface", icon: <CloudSlash />, iconClass: "text-ink" },
  success: { className: "border-green-200 bg-green-50", icon: <CheckCircle />, iconClass: "text-green-700" },
};

export function Banner({
  variant = "info",
  title,
  children,
  action,
  className,
}: {
  variant?: Variant;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const style = variants[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border px-4 py-3", style.className, className)}
    >
      <span aria-hidden="true" className={cn("mt-0.5 [&_svg]:size-4.5", style.iconClass)}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {children ? <div className="mt-0.5 text-sm text-ink-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
