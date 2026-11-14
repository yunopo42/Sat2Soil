import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Placeholder until phase 3 (field selection: sample field in the Konya Plain or draw your own).
export default async function DemoPage() {
  const t = await getTranslations("demo");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 sm:px-8">
      <p className="font-mono text-xs text-ink-muted">{tCommon("devPreview")}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-4 leading-relaxed text-ink-muted">{t("comingSoon")}</p>
      <Link href="/" className="mt-8 w-fit text-sm font-medium text-green-600 underline-offset-4 hover:underline">
        <span aria-hidden="true">← </span>
        {tCommon("backHome")}
      </Link>
    </main>
  );
}
