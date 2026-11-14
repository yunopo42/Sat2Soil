import { RocketLaunch } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  ["how", "#how"],
  ["solutions", "#solutions"],
  ["data", "#data"],
  ["about", "#about"],
] as const;

/** Marketing header (approved design P01): logo · section links · language · primary CTA. */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const t = useTranslations("site");
  return (
    <header
      className={cn(
        "z-30",
        overlay ? "absolute inset-x-0 top-0" : "relative border-b border-line/70 bg-bg/95 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-8 px-4 sm:px-8">
        <Link href="/" className="shrink-0 rounded-sm">
          {overlay ? (
            <span className="block rounded-full bg-white/95 px-3 pt-1 pb-0.5 shadow-card">
              <Wordmark size="sm" />
            </span>
          ) : (
            <Wordmark size="md" />
          )}
        </Link>
        <nav aria-label={t("home")} className="hidden flex-1 justify-center gap-8 lg:flex">
          {LINKS.map(([key, href]) => (
            <a
              key={key}
              href={href}
              className={cn(
                "text-sm font-semibold transition-colors",
                overlay ? "text-white/85 hover:text-white" : "text-ink/80 hover:text-ink",
              )}
            >
              {t(key)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <LocaleSwitcher className="hidden sm:flex" />
          <Button asChild variant="primary" size="md">
            <Link href="/demo">
              <RocketLaunch aria-hidden="true" weight="fill" />
              {t("cta")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
