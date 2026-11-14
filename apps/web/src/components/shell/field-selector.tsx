import { CaretDown, MapPin } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { SourceBadge } from "@/components/data/source-badge";
import { Link } from "@/i18n/navigation";

/** Active field pill in the top bar. Opens the field selection page. */
export function FieldSelector({ name, detail, sample }: { name: string; detail?: string; sample?: boolean }) {
  const t = useTranslations("shell");
  return (
    <Link
      href="/demo"
      title={t("changeField")}
      className="flex h-10 min-w-0 items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 shadow-card transition-colors duration-150 hover:border-line-strong"
    >
      <MapPin aria-hidden="true" weight="fill" className="size-4 shrink-0 text-green-600" />
      <span className="min-w-0 truncate text-sm font-semibold text-ink">
        {name}
        {detail ? <span className="font-medium text-ink-muted"> ({detail})</span> : null}
      </span>
      {sample ? <SourceBadge source="demo_sample" className="hidden sm:inline-flex" /> : null}
      <CaretDown aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted" weight="bold" />
      <span className="sr-only">{t("changeField")}</span>
    </Link>
  );
}
