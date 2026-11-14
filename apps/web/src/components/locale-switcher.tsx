"use client";

import { Globe } from "@phosphor-icons/react/ssr";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function LocaleSwitcher({ className }: { className?: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const tLocale = useTranslations("locale");
  const tCommon = useTranslations("common");

  return (
    <nav
      aria-label={tCommon("languageSwitcher")}
      className={cn("flex h-10 items-center gap-1 rounded-full border border-line bg-surface pr-1 pl-3 text-xs shadow-card", className)}
    >
      <Globe aria-hidden="true" className="mr-1 size-4 text-ink-muted" />
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
            className={cn(
              "rounded-full px-2.5 py-1.5 font-bold transition-colors",
              active ? "bg-navy-800 text-white" : "text-ink-muted hover:text-ink",
            )}
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
