import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

// Placeholder landing for phases 0–7. The cinematic landing replaces it in phase 8 (D-017).
const STEPS = ["data", "decide", "device"] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <span className="text-[15px] font-semibold tracking-tight">{tCommon("brand")}</span>
        <LocaleSwitcher />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8">
        <section className="py-20 sm:py-28">
          <p className="font-mono text-xs text-navy-600">{t("eyebrow")}</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">{t("lead")}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
            >
              {t("ctaPrimary")}
            </Link>
            <a
              href="#how"
              className="rounded-xl border border-line bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-ink-muted"
            >
              {t("ctaSecondary")}
            </a>
          </div>

          <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-muted">
            <span className="size-1.5 rounded-full bg-amber-600" aria-hidden="true" />
            {tCommon("devPreview")}
          </p>
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-8 border-t border-line py-16">
          <h2 id="how-title" className="text-xl font-semibold tracking-tight">
            {t("howTitle")}
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step} className="rounded-2xl border border-line bg-surface p-6">
                <span className="font-mono text-xs text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-semibold">{t(`steps.${step}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`steps.${step}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
