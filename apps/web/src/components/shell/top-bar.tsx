import { Presentation } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** App top bar: brand · active field · NASA data status · summary · language. */
export function TopBar({
  field,
  nasaStatus,
  summaryHref,
}: {
  field?: ReactNode;
  nasaStatus?: ReactNode;
  summaryHref?: string;
}) {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur print:hidden">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <Link href="/" className="shrink-0 rounded-sm">
          <Wordmark size="sm" />
        </Link>
        {field ? (
          <>
            <span aria-hidden="true" className="hidden h-8 w-px bg-line sm:block" />
            <div className="min-w-0">{field}</div>
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {nasaStatus ? <span className="hidden md:inline-flex">{nasaStatus}</span> : null}
          {summaryHref ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href={summaryHref}>
                <Presentation aria-hidden="true" />
                {t("summary")}
              </Link>
            </Button>
          ) : null}
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
