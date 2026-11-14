import { cn } from "@/lib/cn";

/** Logo mark: a field (green) under an orbit (navy). Text stays live for accessibility and i18n. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-6">
        <circle cx="16" cy="18" r="8" className="fill-green-600" />
        <path d="M5 13c4-6 18-6 22 0" fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-navy-900" />
        <circle cx="24.5" cy="9.8" r="2.1" className="fill-navy-900" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Sat2Soil</span>
    </span>
  );
}
