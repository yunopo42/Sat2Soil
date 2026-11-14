import { Presentation } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";

/** 56 px top bar: brand · active field · NASA data status · summary · language. */
export function TopBar({ field, nasaStatus }: { field: ReactNode; nasaStatus: ReactNode }) {
  const t = useTranslations("nav");
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <Wordmark />
      <span aria-hidden="true" className="h-6 w-px bg-line" />
      {field}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:inline-flex">{nasaStatus}</span>
        <Button variant="ghost" size="sm">
          <Presentation aria-hidden="true" />
          {t("summary")}
        </Button>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
