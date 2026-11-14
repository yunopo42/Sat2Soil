import { CaretUpDown } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { SourceBadge } from "@/components/data/source-badge";

/** Shows the active field. Opens the field switcher from phase 3 on. */
export function FieldSelector({ name, region, sample }: { name: string; region: string; sample?: boolean }) {
  const t = useTranslations("shell");
  return (
    <button
      type="button"
      title={t("changeField")}
      className="flex h-9 min-w-0 items-center gap-2.5 rounded-md px-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{name}</span>
        <span className="block truncate text-2xs text-ink-muted">{region}</span>
      </span>
      {sample ? <SourceBadge source="demo_sample" /> : null}
      <CaretUpDown aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" weight="bold" />
      <span className="sr-only">{t("changeField")}</span>
    </button>
  );
}
