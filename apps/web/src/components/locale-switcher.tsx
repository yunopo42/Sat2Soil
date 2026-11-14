"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const current = useLocale();
  const pathname = usePathname();
  const tLocale = useTranslations("locale");
  const tCommon = useTranslations("common");

  return (
    <nav
      aria-label={tCommon("languageSwitcher")}
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 font-mono text-xs"
    >
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            lang={locale}
            title={tLocale(locale)}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-ink px-2.5 py-1 text-white"
                : "rounded-full px-2.5 py-1 text-ink-muted transition-colors hover:text-ink"
            }
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
