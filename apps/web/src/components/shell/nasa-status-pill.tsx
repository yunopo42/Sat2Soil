import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/** Top-bar indicator of the field's NASA data: live (filled dot), cached (hollow dot) or never synced. */
export function NasaStatusPill({ state, time }: { state: "live" | "cached" | "never"; time?: string }) {
  const t = useTranslations("shell");
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 font-mono text-2xs",
        state === "never" ? "border-line text-ink-muted" : "border-navy-200 bg-navy-50 text-navy-900",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          state === "live" && "bg-navy-900",
          state === "cached" && "border-[1.5px] border-navy-600",
          state === "never" && "bg-ink-subtle",
        )}
      />
      {state === "never" || !time
        ? t("nasaNotSynced")
        : state === "cached"
          ? t("nasaCached", { time })
          : t("nasaSynced", { time })}
    </span>
  );
}
